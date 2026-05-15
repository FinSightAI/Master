/**
 * PII-stripping helper for AI requests. Removes identity fields BEFORE the
 * profile/context object is shipped to a third-party model (Gemini, Claude,
 * OpenRouter, Tavily). Numerical state — income, balances, medical values,
 * holdings — is kept so AI answers stay accurate.
 *
 * Mirrors the canonical JS at https://wizelife.ai/js/wize-pii.js so the
 * stripping rules stay identical across vanilla-JS apps and Next.js apps.
 *
 * --- CONTEXTUAL STRIPPING (added 2026-05-15) ---
 *
 * The original version stripped EVERY key named `name`, `displayName`,
 * `firstName`, etc. That was too aggressive: financial labels like
 * `goal.name = "Mortgage Tel Aviv"` or `fund.name = "Pension Plus"` are
 * NOT PII — they are labels needed for the AI to give a good answer.
 *
 * Behaviour for the "ambiguous identity" keys (name / displayName /
 * firstName / lastName / fullname / nick / nickname):
 *
 *   1. SAFE_KEYS (goalName, fundName, label, title, description, etc.)
 *      → ALWAYS KEEP. These are never person names.
 *   2. Otherwise inspect VALUE — KEEP if it contains a digit, a currency
 *      symbol, a "label hint" word, or is >60 chars.
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
 * Decide whether a value sitting under an AMBIGUOUS key looks like a
 * label (KEEP) vs a person name (STRIP).
 */
function looksLikeLabel(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v !== 'string') {
    // Non-strings under name keys are weird; keep them (the recursive
    // walker will still strip identity inside any nested object).
    return true;
  }
  if (v.length > 60) return true;       // person names aren't this long
  if (/\d/.test(v)) return true;         // any digit → label
  if (CURRENCY_RE.test(v)) return true;  // currency symbol → label
  if (LABEL_HINT_RE.test(v)) return true; // financial keyword → label
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
      // Hard-strip categories: always remove.
      if (HARD_STRIP_KEYS.has(lk)) continue;
      // Domain-label allowlist: always keep, recurse for nested PII.
      if (SAFE_KEYS.has(lk)) {
        out[k] = stripIdentity((obj as Record<string, unknown>)[k]);
        continue;
      }
      // Ambiguous keys: decide by value shape.
      if (AMBIGUOUS_KEYS.has(lk)) {
        const v = (obj as Record<string, unknown>)[k];
        if (looksLikeLabel(v)) {
          out[k] = stripIdentity(v);
        }
        // else: looks like a person name → strip (skip).
        continue;
      }
      // Everything else: keep, recurse.
      out[k] = stripIdentity((obj as Record<string, unknown>)[k]);
    }
    return out as unknown as T;
  }
  if (typeof obj === 'string') return scrubString(obj) as unknown as T;
  return obj;
}

export { scrubString };
