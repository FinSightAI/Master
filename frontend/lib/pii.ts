/**
 * PII-stripping helper for AI requests. Removes identity fields BEFORE the
 * profile/context object is shipped to a third-party model (Gemini, Claude,
 * OpenRouter, Tavily). Numerical state — income, balances, medical values,
 * holdings — is kept so AI answers stay accurate.
 *
 * Mirrors the canonical JS at https://wizelife.ai/js/wize-pii.js so the
 * stripping rules stay identical across vanilla-JS apps and Next.js apps.
 */

const STRIP_KEYS = new Set([
  // Identity
  'name', 'displayname', 'firstname', 'lastname', 'fullname', 'nick', 'nickname',
  // Contact
  'email', 'emails', 'phone', 'phonenumber', 'mobile', 'tel', 'whatsapp',
  // Address
  'address', 'streetaddress', 'street', 'postalcode', 'zip', 'zipcode', 'apartment',
  // Government IDs
  'id', 'idnumber', 'ssn', 'cpf', 'rg', 'tz', 'passport', 'passportnumber',
  'nationalid', 'taxid', 'vatid', 'nif', 'nie', 'dni',
  // Financial identifiers (IDs, not amounts)
  'bankaccount', 'accountnumber', 'iban', 'swift', 'routing', 'bankid',
  'creditcard', 'cardnumber', 'cvv', 'cardholder',
  // Internal
  'uid', 'userid', 'firebaseuid', 'customerid', 'authuid',
]);

// String-content patterns that look like identifiers even when the key is
// unrelated (e.g. user typed their ID into a free-text "notes" field).
const VALUE_PATTERNS: RegExp[] = [
  /\b\d{9}\b/g,                     // Israeli ת.ז
  /\b\d{3}-\d{2}-\d{4}\b/g,         // US SSN
  /\b\d{11}\b/g,                    // Brazilian CPF
  /\b[\w.-]+@[\w.-]+\.\w{2,}\b/g,   // Email anywhere
];

function scrubString(s: string): string {
  if (typeof s !== 'string' || s.length < 5) return s;
  let out = s;
  for (const pat of VALUE_PATTERNS) out = out.replace(pat, '[redacted]');
  return out;
}

/**
 * Returns a deep-cloned object with identity fields removed. Does not mutate input.
 */
export function stripIdentity<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(stripIdentity) as unknown as T;
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj as Record<string, unknown>)) {
      if (STRIP_KEYS.has(k.toLowerCase())) continue;
      out[k] = stripIdentity((obj as Record<string, unknown>)[k]);
    }
    return out as unknown as T;
  }
  if (typeof obj === 'string') return scrubString(obj) as unknown as T;
  return obj;
}

export { scrubString };
