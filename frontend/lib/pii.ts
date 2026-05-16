/**
 * PII-stripping helper for AI requests. Removes identity fields BEFORE the
 * deal/profile object is shipped to a third-party model (Gemini, Claude,
 * OpenRouter, Tavily). Numerical state — prices, square metres, ROI,
 * exchange rates — is kept so AI answers stay accurate.
 *
 * Mirrors the canonical JS at https://wizelife.ai/js/wize-pii.js so the
 * stripping rules stay identical across vanilla-JS apps and Next.js apps.
 *
 * --- CONTEXTUAL STRIPPING (added 2026-05-15) ---
 *
 * The original version stripped EVERY key named `name`, `displayName`,
 * `firstName`, etc. That was too aggressive: domain labels like
 * `deal.name = "Apartment Botafogo R$ 980k"` or `property.name` are NOT
 * PII — they are labels needed for the AI to give a useful answer.
 *
 * Behaviour for the "ambiguous identity" keys (name / displayName /
 * firstName / lastName / fullname / nick / nickname):
 *
 *   1. SAFE_KEYS (label, title, description, category, etc.) → ALWAYS KEEP.
 *   2. Otherwise inspect VALUE — KEEP if it contains a digit, currency
 *      symbol, "label hint" word, or is >60 chars.
 *   3. Otherwise (2–4 short tokens, no digits, no hint) → STRIP.
 *
 * Hard-strip keys (email/phone/address/IDs/IBAN/card numbers) remain
 * unconditional — they are never labels.
 */

// Always-strip keys (true PII — value never looks label-like).
const HARD_STRIP_KEYS = new Set([
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

// Ambiguous keys — sometimes a person name, sometimes a label. We inspect
// the value before deciding.
const AMBIGUOUS_KEYS = new Set([
  'name', 'displayname', 'firstname', 'lastname', 'fullname',
  'nick', 'nickname',
]);

// Safe-key allowlist — even if the lowercased form is name-like
// semantically, these are domain labels and ALWAYS KEPT.
const SAFE_KEYS = new Set([
  'goalname', 'fundname', 'accountname', 'accountlabel', 'label',
  'title', 'description', 'category', 'subcategory', 'bankname',
  'loanname', 'cardlabel', 'holdingname', 'stockname', 'companyname',
  'productname',
]);

// Words that strongly suggest the value is a financial / domain label
// rather than a person name.
const LABEL_HINT_RE = /(fund|plan|account|loan|mortgage|goal|stock|etf|card|bank|savings|pension|insurance|deposit|portfolio|holding|transfer|bond|crypto|retirement|budget|expense|income|debt|asset)/i;

// Currency symbols (₪ NIS, $ USD, € EUR, £ GBP, ¥ JPY/CNY, R$ BRL).
const CURRENCY_RE = /[₪$€£¥]|R\$/;

// String-content patterns that look like identifiers even when the key is
// unrelated (e.g. user typed their ID into a free-text "notes" field).
//
// Each entry is [regex, replacement, guarded?]. Ordered MOST specific → LEAST
// specific. `guarded: true` patterns are skipped when a currency token sits
// adjacent (so financial amounts like "150000000 ש\"ח" are NOT redacted).
const CURRENCY_GUARD_BEFORE = /(?:[₪$€£¥]|R\$|NIS|USD|EUR|GBP|BRL|ILS|JPY|CNY)\s*$/i;
const CURRENCY_GUARD_AFTER  = /^\s*(?:[₪$€£¥]|R\$|NIS|USD|EUR|GBP|BRL|ILS|JPY|CNY|ש["׳]ח|שח|שקל|שקלים|reais|euros?|dollars?|pounds?|[.,]0{2}\b)/i;

function guardedReplace(str: string, regex: RegExp, replacement: string): string {
  return str.replace(regex, (match: string, ...rest: unknown[]) => {
    const offset = rest[rest.length - 2] as number;
    const full = rest[rest.length - 1] as string;
    const before = full.slice(Math.max(0, offset - 8), offset);
    const after  = full.slice(offset + match.length, offset + match.length + 12);
    if (CURRENCY_GUARD_BEFORE.test(before)) return match;
    if (CURRENCY_GUARD_AFTER.test(after)) return match;
    return replacement;
  });
}

const VALUE_PATTERNS: Array<[RegExp, string, boolean]> = [
  // 1. Email
  [/\b[\w.-]+@[\w.-]+\.\w{2,}\b/g, '[redacted-email]', false],
  // 2. GPS coordinates
  [/\b-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\b/g, '[redacted-gps]', false],
  // 3. IBAN
  [/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g, '[redacted-iban]', false],
  // 4. Formatted credit card (separators required)
  [/\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4}\b/g, '[redacted-cc]', false],
  // 5. Brazilian RG
  [/\b\d{2}\.\d{3}\.\d{3}-[\dxX]\b/g, '[redacted-id]', false],
  // 6. Israeli bank account
  [/\b\d{2}-\d{3,4}-\d{6,9}\b/g, '[redacted-acct]', false],
  // 7. US SSN
  [/\b\d{3}-\d{2}-\d{4}\b/g, '[redacted-ssn]', false],
  // 8. Spanish DNI
  [/\b\d{8}[A-HJ-NP-TV-Z]\b/g, '[redacted-id]', false],
  // 9. International phone (with leading +)
  [/\+\d{1,3}[\s.\-]?\(?\d{2,4}\)?[\s.\-]?\d{3,4}[\s.\-]?\d{3,4}\b/g, '[redacted-phone]', false],
  // 10. Israeli mobile (05X with separator)
  [/\b0?5\d[\s\-]\d{3}[\s\-]?\d{4}\b/g, '[redacted-phone]', false],
  // 11. Hebrew address
  [/(רחוב|רח['׳]|שדרות|שד['׳]|דרך|סמטת|כביש)\s+[א-ת]+(?:\s+[א-ת]+){0,4}\s+\d{1,4}\b/g, '[redacted-address]', false],
  // 12. English address
  [/\b\d{1,5}\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3}\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Way|Court|Ct\.?|Place|Pl\.?)\b/g, '[redacted-address]', false],
  // 13. Portuguese address (BR)
  [/\b(?:Rua|Av\.?|Avenida|Praça|Travessa|Alameda|Estrada)\s+[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+){0,4},?\s+\d{1,5}\b/g, '[redacted-address]', false],
  // 14. Spanish address
  [/\b(?:Calle|Avda\.?|Avenida|Plaza|Paseo|Carretera)\s+[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+){0,4},?\s+\d{1,5}\b/g, '[redacted-address]', false],
  // 15. CPF (11 bare digits) — guarded against currency
  [/\b\d{11}\b/g, '[redacted-id]', true],
  // 16. Israeli ת.ז / Portuguese NIF (9 bare digits) — guarded against currency
  [/\b\d{9}\b/g, '[redacted-id]', true],
];

function scrubString(s: string): string {
  if (typeof s !== 'string' || s.length < 5) return s;
  let out = s;
  for (const [pat, repl, guarded] of VALUE_PATTERNS) {
    pat.lastIndex = 0;
    out = guarded ? guardedReplace(out, pat, repl) : out.replace(pat, repl);
  }
  return out;
}

/**
 * Decide whether a value sitting under an AMBIGUOUS key looks like a
 * label (KEEP) vs a person name (STRIP).
 */
function looksLikeLabel(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v !== 'string') return true;
  if (v.length > 60) return true;
  if (/\d/.test(v)) return true;
  if (CURRENCY_RE.test(v)) return true;
  if (LABEL_HINT_RE.test(v)) return true;
  return false;
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
      const lk = k.toLowerCase();
      if (HARD_STRIP_KEYS.has(lk)) continue;
      if (SAFE_KEYS.has(lk)) {
        out[k] = stripIdentity((obj as Record<string, unknown>)[k]);
        continue;
      }
      if (AMBIGUOUS_KEYS.has(lk)) {
        const v = (obj as Record<string, unknown>)[k];
        if (looksLikeLabel(v)) {
          out[k] = stripIdentity(v);
        }
        continue;
      }
      out[k] = stripIdentity((obj as Record<string, unknown>)[k]);
    }
    return out as unknown as T;
  }
  if (typeof obj === 'string') return scrubString(obj) as unknown as T;
  return obj;
}

export { scrubString };
