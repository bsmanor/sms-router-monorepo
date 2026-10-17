import { onRequest } from 'firebase-functions/v2/https';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import axios, { Method } from 'axios';
import {
  RoutingRule,
  SmsPayload,
  RuleExecutionResult,
  SmsLogDocument,
  SecuritySettings
} from './types';
import { evaluateRule } from './ruleEngine';

admin.initializeApp();
const db = admin.firestore();

/**
 * Dispatches an HTTP request with custom headers, payload, 10s timeout, and up to 2 retries.
 */
async function dispatchWebhookWithRetry(
  targetUrl: string,
  method: string,
  customHeadersStr: string,
  payload: string,
  maxRetries = 2
): Promise<{ status: number; body: string; latencyMs: number; success: boolean; error: string | null }> {
  // Parse custom headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'SMS-Router-Gateway/1.0'
  };

  if (customHeadersStr && customHeadersStr.trim().length > 0) {
    try {
      const parsed = JSON.parse(customHeadersStr);
      Object.assign(headers, parsed);
    } catch {
      // Fallback for newline-delimited Key: Value headers
      const lines = customHeadersStr.split('\n');
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const val = line.substring(colonIndex + 1).trim();
          if (key) headers[key] = val;
        }
      }
    }
  }

  const httpMethod = (method || 'POST').toUpperCase() as Method;
  let attempt = 0;
  let lastError: Error | null = null;
  let lastStatus = 0;
  let lastBody = '';

  while (attempt <= maxRetries) {
    attempt++;
    const startTime = Date.now();
    try {
      const response = await axios({
        url: targetUrl,
        method: httpMethod,
        headers,
        data: httpMethod !== 'GET' ? payload : undefined,
        params: httpMethod === 'GET' ? { payload } : undefined,
        timeout: 10000,
        transformResponse: [(data) => data] // Keep raw body string
      });

      const latencyMs = Date.now() - startTime;
      const respBodyStr = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

      return {
        status: response.status,
        body: respBodyStr.substring(0, 1000), // Cap response snippet
        latencyMs,
        success: response.status >= 200 && response.status < 300,
        error: null
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      lastError = err;
      if (err.response) {
        lastStatus = err.response.status;
        const errData = typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data || '');
        lastBody = errData.substring(0, 1000);
      } else {
        lastStatus = 0;
        lastBody = err.message || 'Network Timeout / Error';
      }

      // If client error (4xx), do not retry
      if (lastStatus >= 400 && lastStatus < 500) {
        return {
          status: lastStatus,
          body: lastBody,
          latencyMs,
          success: false,
          error: `HTTP ${lastStatus}: ${err.message}`
        };
      }

      // Short delay before retry on 5xx or connection drop
      if (attempt <= maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  return {
    status: lastStatus,
    body: lastBody,
    latencyMs: 10000,
    success: false,
    error: lastError ? lastError.message : 'Unknown execution failure after retries'
  };
}

/**
 * HTTPS endpoint: Ingest SMS from Android client
 */
export const ingestSms = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  const receivedApiKey = req.headers['x-api-key'] as string | undefined;
  const receivedSig = req.headers['x-signature'] as string | undefined;

  // 1. Fetch Security Settings from Firestore
  let security: SecuritySettings | undefined;
  try {
    const secDoc = await db.doc('settings/security').get();
    if (secDoc.exists) {
      security = secDoc.data() as SecuritySettings;
    }
  } catch (err: any) {
    console.error('Error reading settings/security:', err);
    res.status(500).json({ error: 'Internal configuration error' });
    return;
  }

  if (!security || !security.apiKey || !security.hmacSecret) {
    res.status(500).json({
      error: 'Security credentials not configured. Please open Web Admin and generate keys.'
    });
    return;
  }

  // 2. Validate API Key
  if (!receivedApiKey || receivedApiKey !== security.apiKey) {
    res.status(401).json({ error: 'Invalid or missing X-API-Key header' });
    return;
  }

  // 3. Validate HMAC-SHA256 Signature using rawBody
  if (!receivedSig) {
    res.status(401).json({ error: 'Missing X-Signature header' });
    return;
  }

  const rawBody = req.rawBody ? req.rawBody : Buffer.from(JSON.stringify(req.body));
  const computedHmac = crypto.createHmac('sha256', security.hmacSecret).update(rawBody).digest('hex');

  const sigBuffer = Buffer.from(receivedSig.toLowerCase(), 'utf8');
  const compBuffer = Buffer.from(computedHmac.toLowerCase(), 'utf8');

  if (sigBuffer.length !== compBuffer.length || !crypto.timingSafeEqual(sigBuffer, compBuffer)) {
    console.warn('HMAC verification failed. Received:', receivedSig, 'Computed:', computedHmac);
    res.status(403).json({ error: 'Invalid HMAC signature' });
    return;
  }

  // 4. Parse SMS Payload
  let sms: SmsPayload;
  try {
    sms = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!sms.sender || !sms.body) {
      res.status(400).json({ error: 'Payload missing required fields: sender, body' });
      return;
    }
  } catch (err: any) {
    res.status(400).json({ error: 'Malformed JSON payload: ' + err.message });
    return;
  }

  const receivedAt = Date.now();
  const matchedResults: RuleExecutionResult[] = [];

  // 5. Query Active Rules ordered by Priority
  let rules: RoutingRule[] = [];
  try {
    const snapshot = await db.collection('rules')
      .where('isActive', '==', true)
      .orderBy('priority', 'asc')
      .get();

    rules = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    } as RoutingRule));
  } catch (err: any) {
    console.error('Error fetching routing rules:', err);
  }

  // 6. Evaluate and Execute Rules
  for (const rule of rules) {
    const evalResult = evaluateRule(rule, sms);
    if (!evalResult.matches) {
      continue;
    }

    // Dispatch webhook
    const dispatchResult = await dispatchWebhookWithRetry(
      rule.targetUrl,
      rule.httpMethod,
      rule.customHeaders,
      evalResult.renderedPayload
    );

    matchedResults.push({
      ruleId: rule.id,
      ruleName: rule.name,
      targetUrl: rule.targetUrl,
      httpMethod: rule.httpMethod,
      dispatchedPayload: evalResult.renderedPayload,
      httpStatus: dispatchResult.status,
      responseBody: dispatchResult.body,
      latencyMs: dispatchResult.latencyMs,
      success: dispatchResult.success,
      error: dispatchResult.error
    });

    if (rule.stopOnMatch) {
      break;
    }
  }

  // 7. Determine Overall Status
  let overallStatus: SmsLogDocument['status'] = 'NO_MATCH';
  if (matchedResults.length > 0) {
    const allSucceeded = matchedResults.every((r) => r.success);
    overallStatus = allSucceeded ? 'PROCESSED' : 'PARTIAL_FAILURE';
  }

  // 8. Persist Log to Firestore
  const logDoc: SmsLogDocument = {
    receivedAt,
    deviceId: sms.deviceId || 'UNKNOWN_DEVICE',
    sender: sms.sender,
    body: sms.body,
    matchedRules: matchedResults,
    status: overallStatus
  };

  let logId = '';
  try {
    const logRef = await db.collection('sms_logs').add(logDoc);
    logId = logRef.id;
  } catch (err) {
    console.error('Failed to write log to Firestore:', err);
  }

  res.status(200).json({
    success: true,
    logId,
    status: overallStatus,
    matchedCount: matchedResults.length
  });
});

/**
 * Callable Function: Simulate rule execution without modifying logs
 */
export const simulateRules = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to simulate rules');
  }

  const { sender, body, liveDispatch } = request.data as {
    sender: string;
    body: string;
    liveDispatch?: boolean;
  };

  if (!sender || !body) {
    throw new HttpsError('invalid-argument', 'Must provide sender and body');
  }

  const sms: SmsPayload = {
    sender,
    body,
    timestamp: Date.now(),
    deviceId: 'SIMULATOR'
  };

  const snapshot = await db.collection('rules')
    .where('isActive', '==', true)
    .orderBy('priority', 'asc')
    .get();

  const rules = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  } as RoutingRule));

  const results: Array<{
    ruleId: string;
    ruleName: string;
    matches: boolean;
    matchReasons: string[];
    extracted: Record<string, string>;
    renderedPayload: string;
    dispatchResult?: {
      status: number;
      body: string;
      latencyMs: number;
      success: boolean;
      error: string | null;
    };
  }> = [];

  for (const rule of rules) {
    const evalResult = evaluateRule(rule, sms);
    let dispatchResult;

    if (evalResult.matches && liveDispatch) {
      dispatchResult = await dispatchWebhookWithRetry(
        rule.targetUrl,
        rule.httpMethod,
        rule.customHeaders,
        evalResult.renderedPayload
      );
    }

    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      matches: evalResult.matches,
      matchReasons: evalResult.matchReasons,
      extracted: evalResult.extracted,
      renderedPayload: evalResult.renderedPayload,
      dispatchResult
    });

    if (evalResult.matches && rule.stopOnMatch) {
      break;
    }
  }

  return {
    success: true,
    totalRulesEvaluated: rules.length,
    results
  };
});

/**
 * Callable Function: Replay a specific webhook from an existing log entry
 */
export const replayWebhook = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to replay webhooks');
  }

  const { logId, ruleId } = request.data as { logId: string; ruleId?: string };
  if (!logId) {
    throw new HttpsError('invalid-argument', 'Missing logId parameter');
  }

  const logRef = db.collection('sms_logs').doc(logId);
  const logDoc = await logRef.get();

  if (!logDoc.exists) {
    throw new HttpsError('not-found', `Log with ID "${logId}" not found`);
  }

  const logData = logDoc.data() as SmsLogDocument;
  const targetMatchIndex = logData.matchedRules.findIndex((r) => !ruleId || r.ruleId === ruleId);

  if (targetMatchIndex === -1) {
    throw new HttpsError('not-found', 'No matching rule execution found in this log');
  }

  const targetMatch = logData.matchedRules[targetMatchIndex];

  // Re-fetch rule configuration to get latest headers if possible, or use log data
  let customHeadersStr = '';
  try {
    const ruleDoc = await db.collection('rules').doc(targetMatch.ruleId).get();
    if (ruleDoc.exists) {
      const r = ruleDoc.data() as RoutingRule;
      customHeadersStr = r.customHeaders;
    }
  } catch {
    // Ignore and proceed with empty headers
  }

  const replayResult = await dispatchWebhookWithRetry(
    targetMatch.targetUrl,
    targetMatch.httpMethod,
    customHeadersStr,
    targetMatch.dispatchedPayload
  );

  // Update log document in Firestore
  logData.matchedRules[targetMatchIndex] = {
    ...targetMatch,
    httpStatus: replayResult.status,
    responseBody: replayResult.body,
    latencyMs: replayResult.latencyMs,
    success: replayResult.success,
    error: replayResult.error
  };

  const allSucceeded = logData.matchedRules.every((r) => r.success);
  logData.status = allSucceeded ? 'PROCESSED' : 'PARTIAL_FAILURE';

  await logRef.update({
    matchedRules: logData.matchedRules,
    status: logData.status
  });

  return {
    success: replayResult.success,
    httpStatus: replayResult.status,
    responseBody: replayResult.body,
    latencyMs: replayResult.latencyMs,
    error: replayResult.error
  };
});
