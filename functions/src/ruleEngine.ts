import { RoutingRule, SmsPayload, RuleCondition } from './types';

export interface EvaluationResult {
  matches: boolean;
  matchReasons: string[];
  extracted: Record<string, string>;
  renderedPayload: string;
}

/**
 * Escapes a string so it can be safely interpolated into an existing JSON string literal
 * without breaking formatting or syntax (escapes double quotes, newlines, control chars).
 */
export function escapeJsonStringValue(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }
  const stringified = JSON.stringify(input);
  // Remove the opening and closing double quotes added by JSON.stringify
  return stringified.substring(1, stringified.length - 1);
}

/**
 * Evaluates whether a given text matches the specified condition.
 */
export function checkCondition(condition: RuleCondition | undefined, text: string): boolean {
  if (!condition || condition.type === 'ANY') {
    return true;
  }

  const val = condition.value || '';

  switch (condition.type) {
    case 'EXACT':
      return text.trim().toLowerCase() === val.trim().toLowerCase();

    case 'CONTAINS':
      return text.toLowerCase().includes(val.toLowerCase());

    case 'REGEX':
      try {
        const regex = new RegExp(val, 'i');
        return regex.test(text);
      } catch (err) {
        console.error(`Invalid regex condition "${val}":`, err);
        return false;
      }

    default:
      return false;
  }
}

/**
 * Pure function to evaluate a routing rule against an incoming SMS message.
 */
export function evaluateRule(rule: RoutingRule, sms: SmsPayload): EvaluationResult {
  const matchReasons: string[] = [];

  // 1. Evaluate Sender Condition
  const senderMatches = checkCondition(rule.senderCondition, sms.sender);
  if (!senderMatches) {
    return {
      matches: false,
      matchReasons: [`Sender condition failed: ${rule.senderCondition?.type} "${rule.senderCondition?.value || ''}"`],
      extracted: {},
      renderedPayload: ''
    };
  }
  matchReasons.push('Sender condition satisfied');

  // 2. Evaluate Body Condition
  const bodyMatches = checkCondition(rule.bodyCondition, sms.body);
  if (!bodyMatches) {
    return {
      matches: false,
      matchReasons: [`Body condition failed: ${rule.bodyCondition?.type} "${rule.bodyCondition?.value || ''}"`],
      extracted: {},
      renderedPayload: ''
    };
  }
  matchReasons.push('Body condition satisfied');

  // 3. Dynamic Regex Extraction
  const extracted: Record<string, string> = {};
  if (Array.isArray(rule.regexExtractors)) {
    for (const extractor of rule.regexExtractors) {
      if (!extractor.key || !extractor.pattern) continue;
      try {
        const regex = new RegExp(extractor.pattern, 'i');
        const match = regex.exec(sms.body);
        if (match) {
          // Use capture group 1 if present, otherwise full match
          extracted[extractor.key] = match[1] !== undefined ? match[1] : match[0];
          matchReasons.push(`Extracted "${extractor.key}": "${extracted[extractor.key]}"`);
        } else {
          extracted[extractor.key] = '';
        }
      } catch (err) {
        console.error(`Failed to execute regex for key "${extractor.key}":`, err);
        extracted[extractor.key] = '';
      }
    }
  }

  // 4. Render Payload Template
  let template = rule.payloadTemplate || '{"sender":"{{sender}}","body":"{{body}}"}';

  // Replace base variables
  template = template.replace(/\{\{sender\}\}/g, escapeJsonStringValue(sms.sender));
  template = template.replace(/\{\{body\}\}/g, escapeJsonStringValue(sms.body));
  template = template.replace(/\{\{deviceId\}\}/g, escapeJsonStringValue(sms.deviceId));
  template = template.replace(/\{\{timestamp\}\}/g, String(sms.timestamp));

  // Replace dynamic extracted variables
  for (const [key, value] of Object.entries(extracted)) {
    const pattern = new RegExp(`\\{\\{extracted\\.${key}\\}\\}`, 'g');
    template = template.replace(pattern, escapeJsonStringValue(value));
  }

  // Replace any leftover unmatched {{extracted.*}} with empty string
  template = template.replace(/\{\{extracted\.[a-zA-Z0-9_-]+\}\}/g, '');

  return {
    matches: true,
    matchReasons,
    extracted,
    renderedPayload: template
  };
}
