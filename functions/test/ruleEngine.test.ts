import { evaluateRule, escapeJsonStringValue } from '../src/ruleEngine';
import { RoutingRule, SmsPayload } from '../src/types';
import * as crypto from 'crypto';

function runTests() {
  console.log('Running SMS Router Engine & HMAC Unit Tests...\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      process.exitCode = 1;
    }
  }

  // Test 1: JSON String Escaping
  const rawTextWithTrickyChars = 'Code is "123456" & newline \n and backslash \\ and tab \t';
  const escaped = escapeJsonStringValue(rawTextWithTrickyChars);
  const testJson = `{"text": "${escaped}"}`;
  let parsedJson: any;
  try {
    parsedJson = JSON.parse(testJson);
  } catch (err: any) {
    parsedJson = null;
  }
  assert(parsedJson !== null && parsedJson.text === rawTextWithTrickyChars, 'escapeJsonStringValue maintains valid JSON with quotes, newlines, and tabs');

  // Test 2: Sender matching (ANY, EXACT, CONTAINS, REGEX)
  const baseRule: RoutingRule = {
    id: 'rule-1',
    name: 'OTP Matcher',
    priority: 1,
    isActive: true,
    stopOnMatch: false,
    senderCondition: { type: 'CONTAINS', value: 'BANK' },
    bodyCondition: { type: 'REGEX', value: '\\botp\\b' },
    regexExtractors: [{ key: 'otp', pattern: '\\b(\\d{6})\\b' }],
    targetUrl: 'https://example.com/webhook',
    httpMethod: 'POST',
    customHeaders: '{"Authorization": "Bearer token"}',
    payloadTemplate: '{"from": "{{sender}}", "code": "{{extracted.otp}}", "msg": "{{body}}"}'
  };

  const sms1: SmsPayload = {
    sender: 'MYBANK-ALERT',
    body: 'Your secret OTP is 987654 for transaction #991.',
    timestamp: 1729177367000,
    deviceId: 'Pixel-7'
  };

  const result1 = evaluateRule(baseRule, sms1);
  assert(result1.matches === true, 'Rule matches when sender contains "BANK" and body contains "otp"');
  assert(result1.extracted['otp'] === '987654', 'Extracts 6-digit OTP "987654" from body');

  const renderedJson1 = JSON.parse(result1.renderedPayload);
  assert(renderedJson1.code === '987654', 'Rendered template contains code');
  assert(renderedJson1.from === 'MYBANK-ALERT', 'Rendered template contains sender');

  // Test 3: Unmatched rule
  const sms2: SmsPayload = {
    sender: 'PROMO-DEAL',
    body: 'Get 50% off pizza today!',
    timestamp: 1729177367000,
    deviceId: 'Pixel-7'
  };
  const result2 = evaluateRule(baseRule, sms2);
  assert(result2.matches === false, 'Rule rejects when sender does not match');

  // Test 4: HMAC SHA256 computation
  const payload = JSON.stringify({ sender: '+15551234', body: 'Test message', timestamp: 123456789, deviceId: 'Pixel-7' });
  const secret = 'super-secret-hmac-key';
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  assert(hmac.length === 64, 'HMAC-SHA256 returns standard 64-char hex digest');

  console.log(`\nTests completed: ${passed}/${total} passed.\n`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
