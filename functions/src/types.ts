export type ConditionType = 'ANY' | 'EXACT' | 'CONTAINS' | 'REGEX';

export interface RuleCondition {
  type: ConditionType;
  value?: string;
}

export interface RegexExtractor {
  key: string;
  pattern: string;
}

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  isActive: boolean;
  stopOnMatch: boolean;
  senderCondition: RuleCondition;
  bodyCondition: RuleCondition;
  regexExtractors: RegexExtractor[];
  targetUrl: string;
  httpMethod: 'POST' | 'PUT' | 'GET';
  customHeaders: string; // JSON string or raw key-value headers
  payloadTemplate: string;
}

export interface SmsPayload {
  sender: string;
  body: string;
  timestamp: number;
  deviceId: string;
}

export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  targetUrl: string;
  httpMethod: string;
  dispatchedPayload: string;
  httpStatus: number;
  responseBody: string;
  latencyMs: number;
  success: boolean;
  error: string | null;
}

export interface SmsGroup {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  colorTone: 'brand' | 'success' | 'warning' | 'info' | 'neutral' | 'danger';
  isDefault: boolean;
  order: number;
  autoMatchKeywords: string[];
  createdAt: number;
  updatedAt: number;
}

export interface SmsLogDocument {
  id?: string;
  receivedAt: number;
  deviceId: string;
  sender: string;
  body: string;
  matchedRules: RuleExecutionResult[];
  status: 'PROCESSED' | 'PARTIAL_FAILURE' | 'NO_MATCH' | 'INVALID_SIGNATURE' | 'AUTH_ERROR';
  groupId?: string | null;
  groupName?: string | null;
  isRead?: boolean;
  deleted?: boolean;
  deletedAt?: number | null;
}

export interface SecuritySettings {
  apiKey: string;
  hmacSecret: string;
  updatedAt?: number;
}
