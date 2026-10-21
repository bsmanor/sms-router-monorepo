/**
 * Extracts possible verification / OTP codes from SMS text
 */
export function extractOtpCode(text: string): string | null {
  if (!text) return null;

  // Patterns for OTP / verification codes:
  // 1. "is 123456", "code: 123456", "code is 123456", "קוד: 123456"
  const patterns = [
    /(?:code|otp|pin|verification|passcode|קוד|סיסמה)[\s:=]+([A-Z0-9-]{4,8})\b/i,
    /\b([0-9]{4,8})\b\s*(?:is your|is the|לכניסה|לאימות)/i,
    /\b([0-9]{4,8})\b/ // fallback for standalone 4-8 digit numbers
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Avoid matching years like 2024, 2025, 2026 if standalone
      const val = match[1];
      if (/^(19\d\d|20\d\d)$/.test(val) && !text.toLowerCase().includes('code')) {
        continue;
      }
      return val;
    }
  }

  return null;
}
