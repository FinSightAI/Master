'use client';

/**
 * Relocation Analyzer — full picture for Israeli relocation decisions.
 *
 * Combines THREE views into one decision-quality page:
 *  1. Net take-home after income tax + social security (the headline)
 *  2. REAL purchasing power after Cost-of-Living adjustment
 *  3. 10-year cumulative cashflow (inline SVG chart)
 *
 * Hardcoded 2025 data — refresh quarterly. Sources cited per row.
 * No external chart library — uses inline SVG (~100 lines, 0 dependencies).
 */

import { useState, useMemo, useEffect } from 'react';

type Lang = 'he' | 'en' | 'pt' | 'es';

type Country = {
  code: string;
  flag: string;
  name: Record<Lang, string>;
  city: string;
  /** Marginal tax brackets (annual local currency) */
  brackets: { upTo: number; rate: number }[];
  /** Annual personal credit (local currency, deducted from tax) */
  credit: number;
  /** Social security % of gross (employee) */
  socialPct: number;
  /** Social security ceiling, annual local currency (null = no cap) */
  socialCeil: number | null;
  /** Health contribution % (separate from social, where applicable) */
  healthPct: number;
  /** ILS → local currency conversion ratio (1 ILS = X local) */
  fxFromILS: number;
  /** Cost of Living Index, Tel Aviv = 100 (Numbeo 2025) */
  col: number;
  /** Estimated monthly out-of-pocket health insurance (USD) */
  healthCostUSD: number;
  /** Israel social-security totalization treaty — do your Israeli Bituach Leumi years count toward this country's pension eligibility? */
  treaty: 'yes' | 'eu' | 'no';
  /** Quality of Life Index — Numbeo 2025 (0-200, higher = better) */
  qol: number;
  /** Safety Index — Numbeo 2025 (0-100, higher = safer) */
  safety: number;
  /** Healthcare Index — Numbeo 2025 (0-100, higher = better) */
  healthcareQual: number;
  /** Long-term pension expectation as % of final salary (rough estimate, for lifetime-value calc) */
  pensionPctFinalSalary: number;
  notes: Record<Lang, string>;
  source: string;
};

const COUNTRIES: Country[] = [
  {
    code: 'IL', flag: '🇮🇱', city: 'Tel Aviv',
    name: { he: 'ישראל', en: 'Israel', pt: 'Israel', es: 'Israel' },
    brackets: [
      { upTo: 84_120,   rate: 10 },
      { upTo: 120_720,  rate: 14 },
      { upTo: 193_800,  rate: 20 },
      { upTo: 269_280,  rate: 31 },
      { upTo: 560_280,  rate: 35 },
      { upTo: 721_560,  rate: 47 },
      { upTo: Infinity, rate: 50 },
    ],
    credit: 7_980,
    socialPct: 12.0, socialCeil: 591_000,
    healthPct: 5.0,
    fxFromILS: 1, col: 100, healthCostUSD: 0,
    treaty: 'yes', qol: 152, safety: 70, healthcareQual: 80, pensionPctFinalSalary: 25,
    notes: {
      he: 'מס שולי מקסימלי 50%, ביטוח לאומי 12%, בריאות אוניברסלית כלולה.',
      en: 'Top marginal 50%, Bituach Leumi 12%, universal healthcare included.',
      pt: 'Marginal máxima 50%, Bituach Leumi 12%, saúde universal incluída.',
      es: 'Marginal máxima 50%, Bituach Leumi 12%, salud universal incluida.',
    },
    source: 'taxes.gov.il (2025)',
  },
  {
    code: 'PT', flag: '🇵🇹', city: 'Lisbon',
    name: { he: 'פורטוגל', en: 'Portugal', pt: 'Portugal', es: 'Portugal' },
    brackets: [
      { upTo: 7_703,    rate: 13.25 },
      { upTo: 11_623,   rate: 18 },
      { upTo: 16_472,   rate: 23 },
      { upTo: 21_321,   rate: 26 },
      { upTo: 27_146,   rate: 32.75 },
      { upTo: 39_791,   rate: 37 },
      { upTo: 51_997,   rate: 43.5 },
      { upTo: 81_199,   rate: 45 },
      { upTo: Infinity, rate: 48 },
    ],
    credit: 0,
    socialPct: 11.0, socialCeil: null, healthPct: 0,
    fxFromILS: 0.249, col: 65, healthCostUSD: 0,
    treaty: 'yes', qol: 167, safety: 75, healthcareQual: 73, pensionPctFinalSalary: 55,
    notes: {
      he: 'NHR (Non-Habitual Resident) — 10 שנות מס מופחת לעולים. Seg. Social 11% חל גם בלי NHR.',
      en: 'NHR (Non-Habitual Resident) — 10 years reduced tax for new residents. 11% Seg. Social applies regardless.',
      pt: 'NHR — 10 anos com imposto reduzido. Seg. Social 11% aplica-se.',
      es: 'NHR — 10 años con impuesto reducido. Seg. Social 11% aplica.',
    },
    source: 'finanças.gov.pt + seg-social.pt (2025)',
  },
  {
    code: 'CY', flag: '🇨🇾', city: 'Limassol',
    name: { he: 'קפריסין', en: 'Cyprus', pt: 'Chipre', es: 'Chipre' },
    brackets: [
      { upTo: 19_500,   rate: 0 },
      { upTo: 28_000,   rate: 20 },
      { upTo: 36_300,   rate: 25 },
      { upTo: 60_000,   rate: 30 },
      { upTo: Infinity, rate: 35 },
    ],
    credit: 0,
    socialPct: 8.8, socialCeil: 66_612, healthPct: 2.65,
    fxFromILS: 0.249, col: 70, healthCostUSD: 0,
    treaty: 'eu', qol: 176, safety: 77, healthcareQual: 60, pensionPctFinalSalary: 60,
    notes: {
      he: 'Non-Dom: 50% פטור ל-17 שנה (>€55K). GHS (2.65%) חל על הכל. אזרחות EU = גישה מלאה לאירופה.',
      en: 'Non-Dom: 50% exemption for 17 years (>€55K). GHS (2.65%) applies always. EU citizenship = full EU access.',
      pt: 'Non-Dom: 50% isenção por 17 anos (>€55K).',
      es: 'Non-Dom: 50% exención por 17 años (>€55K).',
    },
    source: 'mof.gov.cy (2025)',
  },
  {
    code: 'IT', flag: '🇮🇹', city: 'Rome',
    name: { he: 'איטליה', en: 'Italy', pt: 'Itália', es: 'Italia' },
    brackets: [
      { upTo: 28_000,   rate: 23 },
      { upTo: 50_000,   rate: 35 },
      { upTo: Infinity, rate: 43 },
    ],
    credit: 1_955,
    socialPct: 9.49, socialCeil: 119_650, healthPct: 0,
    fxFromILS: 0.249, col: 80, healthCostUSD: 0,
    treaty: 'yes', qol: 135, safety: 55, healthcareQual: 67, pensionPctFinalSalary: 65,
    notes: {
      he: '"Lavoratori Impatriati" — פטור 50-70% ממס הכנסה ל-5 שנים לעולים חדשים. INPS חייב.',
      en: '"Lavoratori Impatriati" — 50-70% income tax exemption for 5 years for new residents. INPS still owed.',
      pt: '"Lavoratori Impatriati" — 50-70% isenção do imposto por 5 anos.',
      es: '"Lavoratori Impatriati" — 50-70% exención del impuesto por 5 años.',
    },
    source: 'agenziaentrate.gov.it (2025)',
  },
  {
    code: 'AE', flag: '🇦🇪', city: 'Dubai',
    name: { he: 'איחוד האמירויות', en: 'UAE', pt: 'EAU', es: 'EAU' },
    brackets: [{ upTo: Infinity, rate: 0 }],
    credit: 0,
    socialPct: 0, socialCeil: null, healthPct: 0,
    fxFromILS: 1, col: 105, healthCostUSD: 350,
    treaty: 'no', qol: 180, safety: 84, healthcareQual: 72, pensionPctFinalSalary: 0,
    notes: {
      he: '0% מס הכנסה, 0% מס חברתי. אך גם 0 פנסיה ציבורית, אין safety net. ביטוח בריאות פרטי חובה ~$200-400/חודש.',
      en: '0% income tax, 0% social. But also 0 public pension, no safety net. Private health insurance mandatory ~$200-400/mo.',
      pt: '0% imposto, 0% social. Mas 0 pensão pública.',
      es: '0% impuesto, 0% social. Pero 0 pensión pública.',
    },
    source: 'mof.gov.ae (2025)',
  },
  {
    code: 'US', flag: '🇺🇸', city: 'NYC',
    name: { he: 'ארה״ב (פדרלי)', en: 'USA (federal)', pt: 'EUA (federal)', es: 'EE.UU. (federal)' },
    brackets: [
      { upTo: 11_600,   rate: 10 },
      { upTo: 47_150,   rate: 12 },
      { upTo: 100_525,  rate: 22 },
      { upTo: 191_950,  rate: 24 },
      { upTo: 243_725,  rate: 32 },
      { upTo: 609_350,  rate: 35 },
      { upTo: Infinity, rate: 37 },
    ],
    credit: 14_600,
    socialPct: 7.65, socialCeil: 168_600, healthPct: 0,
    fxFromILS: 0.27, col: 130, healthCostUSD: 600,
    treaty: 'no', qol: 153, safety: 49, healthcareQual: 70, pensionPctFinalSalary: 40,
    notes: {
      he: 'מס פדרלי בלבד — state tax מוסיף 0-13% (CA, NY). אין אמנת ביטוח לאומי עם ישראל. בריאות פרטית ~$500-1500/חודש לפני 65.',
      en: 'Federal only — state tax adds 0-13% (CA, NY). No SS treaty with Israel. Private health ~$500-1500/mo before 65.',
      pt: 'Apenas federal — imposto estadual adiciona 0-13%.',
      es: 'Solo federal — impuesto estatal añade 0-13%.',
    },
    source: 'irs.gov (2025)',
  },
  {
    code: 'DE', flag: '🇩🇪', city: 'Berlin',
    name: { he: 'גרמניה', en: 'Germany', pt: 'Alemanha', es: 'Alemania' },
    brackets: [
      { upTo: 11_604,   rate: 0 },
      { upTo: 17_005,   rate: 14 },
      { upTo: 66_760,   rate: 24 },
      { upTo: 277_825,  rate: 42 },
      { upTo: Infinity, rate: 45 },
    ],
    credit: 0,
    socialPct: 20, socialCeil: 87_600, healthPct: 0,
    fxFromILS: 0.249, col: 85, healthCostUSD: 0,
    treaty: 'yes', qol: 163, safety: 60, healthcareQual: 75, pensionPctFinalSalary: 48,
    notes: {
      he: 'Sozialversicherung 20% כולל בריאות אוניברסלית + פנסיה + אבטלה + סיעוד. תקרה €8,050/חודש.',
      en: 'Sozialversicherung 20% includes universal health + pension + unemployment + long-term care. €8,050/mo ceiling.',
      pt: 'Sozialversicherung 20% inclui saúde universal + pensão + desemprego.',
      es: 'Sozialversicherung 20% incluye salud universal + pensión + desempleo.',
    },
    source: 'deutsche-rentenversicherung.de (2025)',
  },
  {
    code: 'GB', flag: '🇬🇧', city: 'London',
    name: { he: 'בריטניה', en: 'UK', pt: 'Reino Unido', es: 'Reino Unido' },
    brackets: [
      { upTo: 12_570,   rate: 0 },
      { upTo: 50_270,   rate: 20 },
      { upTo: 125_140,  rate: 40 },
      { upTo: Infinity, rate: 45 },
    ],
    credit: 0,
    socialPct: 8, socialCeil: 50_270, healthPct: 0,
    fxFromILS: 0.214, col: 115, healthCostUSD: 0,
    treaty: 'yes', qol: 140, safety: 50, healthcareQual: 74, pensionPctFinalSalary: 30,
    notes: {
      he: 'NHS = בריאות חינמית אוניברסלית. אין מס בריאות נפרד. NI 8% מעל £242/שבוע.',
      en: 'NHS = universal free health. No separate health tax. NI 8% above £242/wk.',
      pt: 'NHS = saúde universal gratuita.',
      es: 'NHS = salud universal gratuita.',
    },
    source: 'gov.uk (2025)',
  },
];

// Inline calculator — extracted from tax-data.js calcNet, adapted to local FX
// Special regimes for new immigrants / returning residents.
// Same catalog as /p/salary-compare — applied when user toggles "I'm a new immigrant"
// in the UI. Each country with a defined regime here gets recalculated.
type Regime = { label: { he: string; en: string }; flatRate?: number; exemptPct?: number; capEUR?: number; foreignExempt?: boolean };
const REGIMES: Record<string, Regime> = {
  PT: { label: { he: 'NHR/IFICI 20% flat (10 שנים)', en: 'NHR/IFICI 20% flat (10y)' }, flatRate: 20 },
  CY: { label: { he: 'Non-Dom 50% פטור (17 שנים)', en: 'Non-Dom 50% exempt (17y)' }, exemptPct: 50 },
  IT: { label: { he: 'Impatriati 50% פטור (5 שנים)', en: 'Impatriati 50% exempt (5y)' }, exemptPct: 50, capEUR: 600_000 },
  IL: { label: { he: 'תושב חוזר ותיק — פטור הכנסה זרה (10 שנים)', en: 'Senior returning resident — foreign exempt (10y)' }, foreignExempt: true },
};

function calcNet(c: Country, grossMonthlyILS: number, applyRegime: boolean = false): { net: number; netUSD: number; tax: number; social: number; health: number; healthCost: number; regime: Regime | null } {
  const grossUSD = grossMonthlyILS * 0.27;
  const grossLocal = grossMonthlyILS * c.fxFromILS;
  const grossAnnual = grossLocal * 12;
  const regime = applyRegime ? (REGIMES[c.code] || null) : null;

  let tax = 0, prev = 0;
  if (regime?.foreignExempt) {
    tax = 0;
  } else if (regime?.flatRate) {
    tax = grossAnnual * (regime.flatRate / 100);
  } else if (regime?.exemptPct) {
    const cap = regime.capEUR && c.code === 'IT' ? regime.capEUR : Infinity;
    const exempt = Math.min(grossAnnual, cap) * (regime.exemptPct / 100);
    const taxable = Math.max(0, grossAnnual - exempt);
    for (const b of c.brackets) {
      const slice = Math.min(taxable, b.upTo) - prev;
      if (slice <= 0) break;
      tax += (slice * b.rate) / 100;
      prev = b.upTo;
    }
    tax = Math.max(0, tax - c.credit);
  } else {
    for (const b of c.brackets) {
      const slice = Math.min(grossAnnual, b.upTo) - prev;
      if (slice <= 0) break;
      tax += (slice * b.rate) / 100;
      prev = b.upTo;
    }
    tax = Math.max(0, tax - c.credit);
  }

  const ssBase = c.socialCeil ? Math.min(grossAnnual, c.socialCeil) : grossAnnual;
  const social = (ssBase * c.socialPct) / 100;
  const health = (grossAnnual * c.healthPct) / 100;

  const netAnnualLocal = grossAnnual - tax - social - health;
  const net = netAnnualLocal / 12;
  const netUSD = net * (0.27 / c.fxFromILS);
  const healthCostUSD = c.healthCostUSD;
  return { net, netUSD: netUSD - healthCostUSD, tax: tax / 12, social: social / 12, health: health / 12, healthCost: healthCostUSD, regime };
}

const TR = {
  he: {
    title: 'ניתוח הגירה מלא',
    sub: 'הזן ברוטו חודשי → ראה את התמונה האמיתית: מס + פנסיה + יוקר מחיה + תזרים 10 שנים',
    lblGross: 'משכורת ברוטו חודשית (₪)',
    h_net: 'נטו נטו (אחרי מס + סוציאלי + בריאות)',
    h_real: 'כוח קנייה אמיתי (אחרי COL)',
    h_cf: 'תזרים מצטבר ב-10 שנים',
    netSub: 'מה ייכנס לבנק כל חודש',
    realSub: 'כמה זה שווה בפועל לעומת תל אביב',
    cfSub: 'סך הכל $ במשך 10 שנים',
    colTitle: 'יוקר מחיה (תל אביב = 100)',
    colHint: 'אינדקס Numbeo 2025. מספר נמוך יותר = חיים זולים יותר.',
    realPpExp: 'נטו ÷ אינדקס × 100. למשל $5,800 בליסבון (COL 65) = $8,923 ב-תל-אביב.',
    chartT: 'סה״כ נטו אמיתי על פני 10 שנים (תיאורטי, ללא שינוי שכר)',
    bestPick: 'הבחירה המיטבית לפי כוח קנייה',
    bestPickSub: 'מבוסס על נטו + COL בלבד. לא כולל שיקולי חיים, פנסיה ארוכת-טווח, מס יציאה, אזרחות.',
    foot: 'נתוני 2025. WizeTax לא ייעוץ מס מורשה. מספרים סבירים-לא-מדויקים — לפני החלטה אמיתית התייעץ עם רו"ח.',
    th_treaty: 'אמנת ב״ל',
    treatyYes: '✓ כן',
    treatyEU: '✓ EU',
    treatyNo: '✗ לא',
    treatyHint: 'אמנה דו-צדדית = שנים שצברת בישראל נחשבות לפנסיה במדינה. ארה״ב + UAE = לא — איבוד מצטבר של 10-25 שנות הפקדות.',
    th_qol: 'איכות חיים',
    qolHint: 'Numbeo 2025: מדד 0-200 — בריאות, חינוך, בטיחות, זיהום, תחבורה',
    qolBreakdownT: 'פירוט איכות חיים',
    qolSafety: 'בטיחות',
    qolHealth: 'בריאות',
    qolOverall: 'כללי',
    qolWinner: 'הכי גבוה',
    pensionT: 'ערך פנסיה ארוך-טווח (ספקולטיבי)',
    pensionSub: 'הערכה: % מהמשכורת האחרונה × 20 שנות גמלאות ממוצעות. תלוי במס חיים, שינויי חוקים, שנות הפקדה.',
    pensionPct: 'אחוז מהשכר הסופי',
    pensionLifetime: 'ערך מצטבר ב-20 שנות פרישה',
    pensionDisclaimer: '⚠️ זה מודל מאוד גס. בפועל מס פנסיה משתנה לפי שכר אישי, צבירה, רפורמות. WizeTax לא תחזית ביטחונית.',
    exitTaxT: '⚠️ אזהרת מס יציאה ישראלי',
    exitTaxBody: 'אם יש לך נכסים מעל ₪3M בעת ניתוק תושבות, ייתכן מס חד-פעמי על רווח לא ממומש (סעיף 100A). נכסים בסיכון: ני״ע, נדל״ן, אופציות, קרן השתלמות חלקית. רוב המוצרים החינמיים לא לוקחים את זה בחשבון.',
    exitTaxCTA: 'מחשבון מס יציאה אישי →',
  },
  en: {
    title: 'Full Relocation Analysis',
    sub: 'Enter monthly gross → see the real picture: tax + pension + cost-of-living + 10-year cashflow',
    lblGross: 'Monthly gross salary (₪)',
    h_net: 'Real net (after tax + social + health)',
    h_real: 'Real purchasing power (after COL)',
    h_cf: '10-year cumulative cashflow',
    netSub: 'What hits the bank each month',
    realSub: 'What that actually buys vs Tel Aviv',
    cfSub: 'Total $ over 10 years',
    colTitle: 'Cost of Living (Tel Aviv = 100)',
    colHint: 'Numbeo 2025 index. Lower = cheaper to live.',
    realPpExp: 'net ÷ COL × 100. e.g. $5,800 in Lisbon (COL 65) = $8,923 of Tel Aviv purchasing power.',
    chartT: 'Total real net over 10 years (theoretical, salary held flat)',
    bestPick: 'Best by purchasing power',
    bestPickSub: 'Based on net + COL only. Doesn\'t include lifestyle, long-term pension, exit tax, citizenship considerations.',
    foot: '2025 data. WizeTax is not licensed tax advice. Numbers are reasonable-not-exact — consult a CPA before any real decision.',
    th_treaty: 'SS treaty',
    treatyYes: '✓ yes',
    treatyEU: '✓ EU',
    treatyNo: '✗ no',
    treatyHint: 'Bilateral totalization treaty — your Israeli Bituach Leumi years count toward this country\'s pension. US + UAE = NO: you lose 10-25 years of accumulated contributions on relocation.',
    th_qol: 'Quality of life',
    qolHint: 'Numbeo 2025 index 0-200: health, education, safety, pollution, transport',
    qolBreakdownT: 'Quality-of-life breakdown',
    qolSafety: 'Safety',
    qolHealth: 'Healthcare',
    qolOverall: 'Overall',
    qolWinner: 'Highest',
    pensionT: 'Long-term pension value (speculative)',
    pensionSub: 'Estimate: % of final salary × 20 years of typical retirement. Depends on life expectancy, law changes, contribution years.',
    pensionPct: '% of final salary',
    pensionLifetime: 'Cumulative over 20 retirement years',
    pensionDisclaimer: '⚠️ This is a very rough model. Actual pension depends on individual salary trajectory, accumulation, and reforms. WizeTax is not a guarantee.',
    exitTaxT: '⚠️ Israeli Exit Tax warning',
    exitTaxBody: 'If you have assets above ₪3M when terminating Israeli residency, you may owe a one-time tax on unrealized gains (Section 100A). At risk: securities, real estate, options, partial Keren Hishtalmut. Most free tools don\'t factor this in.',
    exitTaxCTA: 'Personal exit-tax calculator →',
  },
  pt: {
    title: 'Análise de mudança internacional',
    sub: 'Insira bruto mensal → veja o quadro real: imposto + pensão + custo de vida + fluxo 10 anos',
    lblGross: 'Salário bruto mensal (₪)',
    h_net: 'Líquido real',
    h_real: 'Poder de compra real',
    h_cf: 'Fluxo acumulado 10 anos',
    netSub: 'O que entra no banco',
    realSub: 'O que isso compra vs Tel Aviv',
    cfSub: 'Total $ em 10 anos',
    colTitle: 'Custo de vida (TA=100)',
    colHint: 'Numbeo 2025.',
    realPpExp: 'líq ÷ COL × 100.',
    chartT: 'Total real em 10 anos',
    bestPick: 'Melhor por poder de compra',
    bestPickSub: 'Apenas net + COL.',
    foot: '2025. WizeTax não é consultoria fiscal.',
    th_treaty: 'Acordo SS',
    treatyYes: '✓ sim',
    treatyEU: '✓ UE',
    treatyNo: '✗ não',
    treatyHint: 'Acordo bilateral — seus anos de Bituach Leumi contam para a pensão. EUA + EAU = NÃO.',
    th_qol: 'Qualidade de vida',
    qolHint: 'Numbeo 2025.',
    qolBreakdownT: 'Detalhes de qualidade de vida',
    qolSafety: 'Segurança',
    qolHealth: 'Saúde',
    qolOverall: 'Geral',
    qolWinner: 'Mais alto',
    pensionT: 'Valor de pensão de longo prazo (especulativo)',
    pensionSub: 'Estimativa: % do salário final × 20 anos.',
    pensionPct: '% do salário final',
    pensionLifetime: 'Acumulado em 20 anos',
    pensionDisclaimer: '⚠️ Modelo muito aproximado.',
    exitTaxT: '⚠️ Imposto de saída israelense',
    exitTaxBody: 'Ativos acima de ₪3M podem gerar imposto único sobre ganhos não realizados.',
    exitTaxCTA: 'Calculadora pessoal →',
  },
  es: {
    title: 'Análisis completo de mudanza',
    sub: 'Ingresa bruto mensual → ve el cuadro real',
    lblGross: 'Salario bruto mensual (₪)',
    h_net: 'Neto real',
    h_real: 'Poder adquisitivo real',
    h_cf: 'Flujo acumulado 10 años',
    netSub: 'Lo que llega al banco',
    realSub: 'Lo que eso compra vs Tel Aviv',
    cfSub: 'Total $ en 10 años',
    colTitle: 'Costo de vida (TA=100)',
    colHint: 'Numbeo 2025.',
    realPpExp: 'neto ÷ COL × 100.',
    chartT: 'Total real en 10 años',
    bestPick: 'Mejor por poder adquisitivo',
    bestPickSub: 'Solo net + COL.',
    foot: '2025. WizeTax no es asesoría fiscal.',
    th_treaty: 'Acuerdo SS',
    treatyYes: '✓ sí',
    treatyEU: '✓ UE',
    treatyNo: '✗ no',
    treatyHint: 'Acuerdo bilateral — tus años de Bituach Leumi cuentan. EE.UU. + EAU = NO.',
    th_qol: 'Calidad de vida',
    qolHint: 'Numbeo 2025.',
    qolBreakdownT: 'Detalle calidad de vida',
    qolSafety: 'Seguridad',
    qolHealth: 'Salud',
    qolOverall: 'General',
    qolWinner: 'Más alto',
    pensionT: 'Valor de pensión a largo plazo (especulativo)',
    pensionSub: 'Estimación: % salario final × 20 años.',
    pensionPct: '% del salario final',
    pensionLifetime: 'Acumulado en 20 años',
    pensionDisclaimer: '⚠️ Modelo muy aproximado.',
    exitTaxT: '⚠️ Impuesto de salida israelí',
    exitTaxBody: 'Activos sobre ₪3M pueden generar impuesto único sobre ganancias no realizadas.',
    exitTaxCTA: 'Calculadora personal →',
  },
};

function fmtUSD(n: number): string {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + Math.round(n).toLocaleString();
  return '$' + Math.round(n);
}

export default function RelocationAnalyzer() {
  const [lang, setLang] = useState<Lang>('he');
  const [gross, setGross] = useState(25000);
  const [olim, setOlim] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('wl_lang') as Lang | null;
      if (saved && ['he','en','pt','es'].includes(saved)) setLang(saved);
    } catch {}
  }, []);

  const t = TR[lang];
  const isRtl = lang === 'he';

  const rows = useMemo(() => {
    const r = COUNTRIES.map(c => {
      const calc = calcNet(c, gross, olim);
      const realPP = (calc.netUSD / c.col) * 100;
      const cum10 = calc.netUSD * 12 * 10;
      const cum10Real = realPP * 12 * 10;
      return { ...c, ...calc, realPP, cum10, cum10Real };
    });
    r.sort((a, b) => {
      if (a.code === 'IL') return -1;
      if (b.code === 'IL') return 1;
      return b.realPP - a.realPP;
    });
    return r;
  }, [gross, olim]);

  const ilRow = rows.find(r => r.code === 'IL')!;
  const best = rows.filter(r => r.code !== 'IL').reduce((m, x) => x.realPP > m.realPP ? x : m, rows[1]);

  // Build SVG cumulative chart — 10 years, top 5 countries
  const chartCountries = [ilRow, ...rows.filter(r => r.code !== 'IL').slice(0, 4)];
  const maxY = Math.max(...chartCountries.map(c => c.cum10Real));
  const W = 760, H = 280, PAD_L = 56, PAD_R = 16, PAD_T = 20, PAD_B = 36;
  const innerW = W - PAD_L - PAD_R, innerH = H - PAD_T - PAD_B;
  const yearX = (yr: number) => PAD_L + (yr / 10) * innerW;
  const valY = (v: number) => PAD_T + innerH - (v / maxY) * innerH;
  const palette = ['#a5b4fc', '#6ee7b7', '#fcd34d', '#fca5a5', '#d8b4fe'];

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ maxWidth: 1100, margin: '0 auto', padding: '18px 14px 60px', fontFamily: 'Inter,-apple-system,sans-serif', color: '#eef2ff' }}>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <h1 style={{ fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', fontWeight: 900, fontSize: 26, margin: '0 0 8px', letterSpacing: '-.6px', background: 'linear-gradient(135deg,#a5b4fc,#f5d0fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {t.title}
        </h1>
        <p style={{ color: '#9ca3af', fontSize: 14, margin: 0, maxWidth: 640, marginInline: 'auto', lineHeight: 1.55 }}>{t.sub}</p>
      </div>

      <div style={{ background: '#11142a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18, marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '.3px', marginBottom: 6 }}>{t.lblGross}</label>
        <input type="number" value={gross} onChange={e => setGross(parseFloat(e.target.value) || 0)} min={3000} max={500000} step={1000}
          style={{ width: '100%', maxWidth: 320, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', color: '#eef2ff', fontSize: 17, fontWeight: 600, outline: 'none' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, padding: '10px 12px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={olim} onChange={e => setOlim(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#10b981', cursor: 'pointer' }} />
          <div>
            <div style={{ font: '700 13px Inter,sans-serif', color: '#6ee7b7' }}>{lang === 'he' ? '⭐ אני עולה חדש / תושב חוזר ותיק' : lang === 'pt' ? '⭐ Sou novo imigrante / residente retornando' : lang === 'es' ? '⭐ Soy nuevo inmigrante / residente que regresa' : '⭐ I\'m a new immigrant / returning resident'}</div>
            <div style={{ font: '500 11.5px Inter,sans-serif', color: '#9ca3af', marginTop: 2 }}>{lang === 'he' ? 'החל משטרי מס: NHR (PT) · Non-Dom (CY) · Impatriati (IT) · ת״ח ותיק (IL)' : 'Apply special regimes: NHR (PT) · Non-Dom (CY) · Impatriati (IT) · Senior returning IL'}</div>
          </div>
        </label>
      </div>

      {/* Best pick callout */}
      {best && (
        <div style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(99,102,241,0.08))', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 14, padding: 16, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6ee7b7', letterSpacing: 1, textTransform: 'uppercase' }}>{t.bestPick}</div>
          <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', margin: '6px 0 4px', letterSpacing: '-.4px' }}>
            <span style={{ marginInlineEnd: 8 }}>{best.flag}</span>{best.name[lang]}
          </div>
          <div style={{ fontSize: 13, color: '#cbd5e1' }}>{fmtUSD(best.realPP)} {isRtl ? 'כוח קנייה אמיתי לחודש (TA-equivalent)' : 'real purchasing power/mo (TA-equivalent)'}</div>
          <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 6 }}>{t.bestPickSub}</div>
        </div>
      )}

      {/* Comparison table */}
      <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: '#11142a', marginBottom: 18 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760, color: '#eef2ff', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(99,102,241,0.10)' }}>
              <th style={th}>{isRtl ? 'מדינה' : 'Country'}</th>
              <th style={th}>{t.h_net}<div style={subTh}>{t.netSub}</div></th>
              <th style={th}>{t.colTitle}</th>
              <th style={th}>{t.h_real}<div style={subTh}>{t.realSub}</div></th>
              <th style={th}>{t.h_cf}<div style={subTh}>{t.cfSub}</div></th>
              <th style={th}>{t.th_treaty}<div style={subTh}>{isRtl ? 'ב״ל ישראלי נחשב' : 'IL years count'}</div></th>
              <th style={th}>{t.th_qol}<div style={subTh}>Numbeo 2025</div></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const isIL = r.code === 'IL';
              const ppDelta = r.realPP - ilRow.realPP;
              const ppDeltaColor = isIL ? '#9ca3af' : (ppDelta >= 0 ? '#6ee7b7' : '#fca5a5');
              const treatyLabel = r.treaty === 'yes' ? t.treatyYes : r.treaty === 'eu' ? t.treatyEU : t.treatyNo;
              const treatyColor = r.treaty === 'no' ? '#fca5a5' : '#6ee7b7';
              const treatyBg    = r.treaty === 'no' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)';
              return (
                <tr key={r.code} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: isIL ? 'rgba(99,102,241,0.06)' : 'transparent' }}>
                  <td style={{ ...td, fontWeight: 800 }}>
                    <span style={{ fontSize: 22, marginInlineEnd: 6, verticalAlign: 'middle' }}>{r.flag}</span>
                    <span style={{ verticalAlign: 'middle' }}>{r.name[lang]}</span>
                    {r.regime && (
                      <span style={{ display: 'inline-block', marginInlineStart: 6, padding: '2px 7px', background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', font: '700 9.5px Inter,sans-serif', borderRadius: 99, letterSpacing: '.3px', verticalAlign: 'middle' }}>⭐ {r.regime.label[lang as 'he' | 'en']}</span>
                    )}
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', marginTop: 2 }}>{r.city}</div>
                  </td>
                  <td style={{ ...td, fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: 14 }}>
                    {fmtUSD(r.netUSD)}/mo
                    {r.healthCost > 0 ? <div style={{ fontSize: 10, color: '#fca5a5', fontFamily: 'inherit', marginTop: 3 }}>−${r.healthCost} health</div> : null}
                  </td>
                  <td style={{ ...td, textAlign: 'center', fontFamily: 'JetBrains Mono,monospace', fontWeight: 700 }}>
                    <div style={{ display: 'inline-block', background: r.col < 100 ? 'rgba(16,185,129,0.15)' : r.col > 100 ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.15)', color: r.col < 100 ? '#6ee7b7' : r.col > 100 ? '#fca5a5' : '#a5b4fc', padding: '3px 10px', borderRadius: 99, fontSize: 13 }}>{r.col}</div>
                  </td>
                  <td style={{ ...td, fontFamily: 'JetBrains Mono,monospace' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#fde68a' }}>{fmtUSD(r.realPP)}/mo</div>
                    <div style={{ fontSize: 11, color: ppDeltaColor, marginTop: 3, fontFamily: 'inherit' }}>{isIL ? '—' : (ppDelta >= 0 ? '+' : '−') + fmtUSD(Math.abs(ppDelta)) + (isRtl ? ' מ-ת״א' : ' vs TA')}</div>
                  </td>
                  <td style={{ ...td, fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: 13 }}>
                    {fmtUSD(r.cum10Real)}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <div style={{ display: 'inline-block', background: treatyBg, color: treatyColor, padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{treatyLabel}</div>
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#a5b4fc' }}>{r.qol}</div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{r.safety}/100 safety</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Treaty + QoL explainer */}
      <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 12, padding: 13, marginBottom: 14, fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 }}>
        <strong style={{ color: '#fca5a5' }}>{t.th_treaty}: </strong>{t.treatyHint}
      </div>

      {/* COL explainer */}
      <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: 13, marginBottom: 18, fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 }}>
        <strong style={{ color: '#fcd34d' }}>{t.colTitle}: </strong>{t.colHint} <span style={{ display: 'block', marginTop: 4 }}>{t.realPpExp}</span>
      </div>

      {/* 10-year cashflow SVG chart */}
      <div style={{ background: '#11142a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18, marginBottom: 18 }}>
        <h3 style={{ margin: '0 0 6px', fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', fontWeight: 800, fontSize: 14, color: '#a5b4fc' }}>{t.chartT}</h3>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, height: 'auto', display: 'block' }} aria-label="10-year cumulative cashflow chart">
          {/* gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map(g => {
            const y = PAD_T + innerH - g * innerH;
            return <line key={g} x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />;
          })}
          {/* y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map(g => {
            const y = PAD_T + innerH - g * innerH;
            return <text key={'y'+g} x={PAD_L - 8} y={y + 4} fill="#6b7280" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono,monospace">{fmtUSD(g * maxY)}</text>;
          })}
          {/* x-axis labels (years) */}
          {[0, 2, 4, 6, 8, 10].map(yr => (
            <text key={'x'+yr} x={yearX(yr)} y={H - PAD_B + 18} fill="#6b7280" fontSize="11" textAnchor="middle" fontFamily="Inter,sans-serif">Y{yr || ' '}</text>
          ))}
          {/* lines */}
          {chartCountries.map((c, i) => {
            const pts = Array.from({ length: 11 }, (_, yr) => {
              const cum = c.realPP * 12 * yr;
              return `${yearX(yr)},${valY(cum)}`;
            }).join(' ');
            return <polyline key={c.code} points={pts} fill="none" stroke={palette[i]} strokeWidth={c.code === 'IL' ? 2.5 : 2} />;
          })}
          {/* legend */}
          {chartCountries.map((c, i) => (
            <g key={'l'+c.code} transform={`translate(${PAD_L + 8 + i * 110}, ${PAD_T + 8})`}>
              <line x1={0} x2={14} y1={5} y2={5} stroke={palette[i]} strokeWidth={2.5} />
              <text x={18} y={9} fill="#cbd5e1" fontSize="11" fontFamily="Inter,sans-serif" fontWeight={600}>{c.flag} {c.name[lang]}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Quality of Life breakdown */}
      <div style={{ background: '#11142a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18, marginBottom: 18 }}>
        <h3 style={{ margin: '0 0 12px', fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', fontWeight: 800, fontSize: 14, color: '#a5b4fc' }}>{t.qolBreakdownT}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10 }}>
          {rows.slice(0, 8).map(r => {
            const isIL = r.code === 'IL';
            return (
              <div key={'qol-' + r.code} style={{ background: isIL ? 'rgba(99,102,241,0.10)' : 'rgba(255,255,255,0.025)', border: '1px solid ' + (isIL ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)'), borderRadius: 10, padding: '11px 13px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{r.flag}</span>
                  <span style={{ fontWeight: 800, fontSize: 13 }}>{r.name[lang]}</span>
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t.qolOverall}</span><strong style={{ color: '#a5b4fc' }}>{r.qol}/200</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t.qolSafety}</span><strong style={{ color: r.safety >= 70 ? '#6ee7b7' : r.safety >= 55 ? '#fcd34d' : '#fca5a5' }}>{r.safety}/100</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t.qolHealth}</span><strong style={{ color: r.healthcareQual >= 70 ? '#6ee7b7' : '#fcd34d' }}>{r.healthcareQual}/100</strong></div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: '#6b7280' }}>{t.qolHint}</div>
      </div>

      {/* Long-term pension value (speculative) */}
      <div style={{ background: '#11142a', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 14, padding: 18, marginBottom: 18 }}>
        <h3 style={{ margin: '0 0 4px', fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', fontWeight: 800, fontSize: 14, color: '#fcd34d' }}>{t.pensionT}</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#9ca3af', lineHeight: 1.55 }}>{t.pensionSub}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10 }}>
          {rows.slice(0, 8).map(r => {
            const isIL = r.code === 'IL';
            // Rough: % of (current monthly net) × 20 years × 12 months
            const lifetimeUSD = (r.netUSD * (r.pensionPctFinalSalary / 100)) * 12 * 20;
            return (
              <div key={'pen-' + r.code} style={{ background: isIL ? 'rgba(99,102,241,0.10)' : 'rgba(255,255,255,0.025)', border: '1px solid ' + (isIL ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)'), borderRadius: 10, padding: '11px 13px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{r.flag}</span>
                  <span style={{ fontWeight: 800, fontSize: 13 }}>{r.name[lang]}</span>
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t.pensionPct}</span><strong>{r.pensionPctFinalSalary}%</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t.pensionLifetime}</span><strong style={{ color: '#fcd34d', fontFamily: 'JetBrains Mono,monospace' }}>{fmtUSD(lifetimeUSD)}</strong></div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: '#fca5a5', lineHeight: 1.55 }}>{t.pensionDisclaimer}</div>
      </div>

      {/* Israeli Exit Tax warning + CTA */}
      <div style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.10),rgba(245,158,11,0.06))', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 14, padding: 18, marginBottom: 18 }}>
        <h3 style={{ margin: '0 0 6px', fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', fontWeight: 800, fontSize: 14, color: '#fca5a5' }}>{t.exitTaxT}</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.55 }}>{t.exitTaxBody}</p>
        <a href="/exit-tax-calculator" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#dc2626,#f59e0b)', color: '#fff', textDecoration: 'none', padding: '9px 18px', borderRadius: 99, fontWeight: 800, fontSize: 12.5 }}>{t.exitTaxCTA}</a>
      </div>

      <p style={{ fontSize: 11.5, color: '#475569', textAlign: 'center', lineHeight: 1.55 }}>{t.foot}</p>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '12px 14px',
  fontWeight: 700,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '.4px',
  color: '#a5b4fc',
  textAlign: 'start',
};
const subTh: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  textTransform: 'none',
  letterSpacing: 0,
  color: '#6b7280',
  marginTop: 2,
};
const td: React.CSSProperties = {
  padding: '14px 14px',
  verticalAlign: 'top',
};
