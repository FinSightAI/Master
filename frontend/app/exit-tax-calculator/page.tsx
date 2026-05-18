'use client';

/**
 * Israeli Exit Tax Calculator — Section 100A (deemed-sale on emigration).
 *
 * When an Israeli tax resident becomes non-resident, the Income Tax Ordinance
 * treats their capital assets as if sold the day before. Unrealized gains
 * become a one-time capital-gains liability. Most "should I relocate?"
 * calculators ignore this — and it can wipe out years of relocation savings.
 *
 * This calculator: user enters assets + cost basis, we apply Section 100A
 * with reasonable assumptions, and tie the result back to the 10-year
 * relocation savings shown on /relocation-analyzer.
 *
 * ⚠️ This is SIMPLIFIED — real Section 100A has carve-outs (principal
 * residence, partial Keren Hishtalmut, treaty overrides, controlling-
 * shareholder rules). Heavy disclaimer in the UI. Not a substitute for a
 * CPA who knows your file.
 */

import { useState, useMemo, useEffect } from 'react';

type Lang = 'he' | 'en' | 'pt' | 'es';

type AssetClass = {
  key: 'israeli_stocks' | 'foreign_stocks' | 'foreign_real_estate' | 'options_rsu' | 'crypto' | 'principal_residence';
  flag: string;
  name: Record<Lang, string>;
  /** Base capital-gains rate. Israeli rules: 25% standard, 30% for >10% shareholder. */
  baseRate: number;
  /** Whether this asset class has full or partial exemption from Section 100A */
  exemptionNote: Record<Lang, string>;
  /** Detailed note on the asset class */
  notes: Record<Lang, string>;
};

const ASSETS: AssetClass[] = [
  {
    key: 'israeli_stocks', flag: '📈',
    name: { he: 'מניות + ני״ע סחירים בישראל', en: 'Israeli securities (stocks, ETFs, bonds)', pt: 'Valores mobiliários israelenses', es: 'Valores israelíes' },
    baseRate: 25,
    exemptionNote: { he: 'ללא פטור', en: 'No exemption', pt: 'Sem isenção', es: 'Sin exención' },
    notes: {
      he: '25% רווח הון. בעל מניות שליטה (>10%) — 30%. ניתן לדחות עד מימוש אמיתי, אבל הריבית מצטברת.',
      en: '25% capital gains. Controlling shareholder (>10%) — 30%. Can defer until actual sale, but interest accrues.',
      pt: '25% ganhos de capital. Acionista controlador — 30%.',
      es: '25% ganancias de capital. Accionista controlador — 30%.',
    },
  },
  {
    key: 'foreign_stocks', flag: '🌍',
    name: { he: 'מניות + ני״ע סחירים בחו״ל', en: 'Foreign securities (foreign brokerage)', pt: 'Valores mobiliários estrangeiros', es: 'Valores extranjeros' },
    baseRate: 25,
    exemptionNote: { he: 'ללא פטור', en: 'No exemption', pt: 'Sem isenção', es: 'Sin exención' },
    notes: {
      he: 'אותה הוראה — תיק IBKR / Schwab / Fidelity חייב במס יציאה. גם USD-denominated.',
      en: 'Same Section 100A — IBKR / Schwab / Fidelity portfolio subject to exit tax. Even USD-denominated.',
      pt: 'Mesma regra — portfólio IBKR/Schwab/Fidelity sujeito a imposto de saída.',
      es: 'Misma regla — cartera IBKR/Schwab/Fidelity sujeta a impuesto de salida.',
    },
  },
  {
    key: 'foreign_real_estate', flag: '🏠',
    name: { he: 'נדל״ן בחו״ל', en: 'Real estate abroad', pt: 'Imóveis no exterior', es: 'Inmuebles en el extranjero' },
    baseRate: 25,
    exemptionNote: { he: 'יתכנו קיזוזי מס ממדינת הנכס', en: 'May offset against tax in property country', pt: 'Pode compensar com imposto local', es: 'Puede compensar con impuesto local' },
    notes: {
      he: 'אמנת מס דו-צדדית עוזרת — אבל לא תמיד. דירה בליסבון/דובאי חייבת כל הרווח. נכסים שנרכשו לפני עלייה — חישוב מיוחד.',
      en: 'Bilateral tax treaty may help — not always. Apartment in Lisbon/Dubai owes the full gain. Pre-aliyah assets get a special calc.',
      pt: 'Tratado bilateral pode ajudar — nem sempre.',
      es: 'Tratado bilateral puede ayudar — no siempre.',
    },
  },
  {
    key: 'options_rsu', flag: '🪙',
    name: { he: 'אופציות / RSU', en: 'Options / RSU (employee equity)', pt: 'Opções / RSU', es: 'Opciones / RSU' },
    baseRate: 47,
    exemptionNote: { he: 'מס שולי (לא רווח הון)', en: 'Marginal rate (not capital gains)', pt: 'Taxa marginal', es: 'Tasa marginal' },
    notes: {
      he: 'אופציות נסחרות/RSU נחשבות הכנסה ממקור עבודה — מס שולי, לא 25%. תכנון 102 יכול להציל חלק. רוב המבני מתעדכים בעת ה-vest.',
      en: 'Options/RSU treated as employment income — marginal rate, NOT 25%. Section 102 planning can save some. Most structures realize at vest.',
      pt: 'Opções/RSU tratadas como renda de trabalho — taxa marginal.',
      es: 'Opciones/RSU tratadas como renta de trabajo — tasa marginal.',
    },
  },
  {
    key: 'crypto', flag: '₿',
    name: { he: 'מטבעות קריפטו', en: 'Cryptocurrencies', pt: 'Criptomoedas', es: 'Criptomonedas' },
    baseRate: 25,
    exemptionNote: { he: 'ללא פטור', en: 'No exemption', pt: 'Sem isenção', es: 'Sin exención' },
    notes: {
      he: 'רשות המסים סיווגה כ-"נכס" ב-2018 — 25% רווח הון. חישוב לפי FIFO. חסונים: צריך הוכחות רכישה.',
      en: 'Israeli Tax Authority classified as "asset" in 2018 — 25% capital gains. FIFO accounting. Bring purchase proofs.',
      pt: 'Autoridade Fiscal classificou como "ativo" — 25% ganho de capital.',
      es: 'Autoridad Fiscal clasificó como "activo" — 25% ganancia de capital.',
    },
  },
  {
    key: 'principal_residence', flag: '🏡',
    name: { he: 'דירה ראשית בישראל', en: 'Principal residence (Israel)', pt: 'Residência principal (Israel)', es: 'Residencia principal (Israel)' },
    baseRate: 0,
    exemptionNote: { he: '✓ פטור (לרוב)', en: '✓ Usually exempt', pt: '✓ Geralmente isento', es: '✓ Generalmente exento' },
    notes: {
      he: 'דירה יחידה בישראל בדרך כלל פטורה מ-100A — אבל יש מגבלות (זמן בעלות, "דירה יחידה" סטטוס).',
      en: 'Sole apartment in Israel usually exempt — limits apply (holding period, "single dwelling" status).',
      pt: 'Apartamento único em Israel geralmente isento.',
      es: 'Apartamento único en Israel generalmente exento.',
    },
  },
];

const TR = {
  he: {
    title: 'מחשבון מס יציאה ישראלי',
    sub: 'סעיף 100A — חישוב מס חד-פעמי על נכסים בעת ניתוק תושבות. כלי מידע בלבד.',
    inputT: 'נכסים והרווח עליהם',
    inputSub: 'הזן את הערך הנוכחי + עלות הרכישה לכל קטגוריה. הרווח (current - cost) חייב במס יציאה.',
    lblCurrent: 'ערך נוכחי ($)',
    lblBasis: 'עלות רכישה ($)',
    lblGain: 'רווח',
    lblRate: 'שיעור',
    lblTax: 'מס יציאה',
    optShare: 'בעל מניות שליטה (>10%)',
    optShareSub: 'משנה את שיעור המס ל-30% במניות בלבד',
    btnCalc: 'חשב מס יציאה',
    resultT: 'מס יציאה חד-פעמי משוער',
    breakdownT: 'פירוט לפי סוג נכס',
    payNowT: 'תשלום מיידי',
    payNowSub: 'משלם עכשיו, אין חיובים נוספים. הכי פשוט.',
    deferT: 'דחייה עד מימוש אמיתי',
    deferSub: 'דוחה עד מכירה, אבל מצטברת ריבית ~4-6%/שנה. נדרשת ערבות בנקאית או נדל״ן ערובה.',
    tieBackT: 'איך זה משפיע על החיסכון מ-WizeLife?',
    tieBackSub: 'הזן את החיסכון המצטבר שלך מ-/relocation-analyzer לקבל את הנטו האמיתי:',
    lblSavings: 'חיסכון 10-שנתי מהרילוקיישן ($)',
    netT: 'תועלת אמיתית אחרי מס יציאה',
    netSub: 'חיסכון רילוקיישן − מס יציאה = ההפרש האמיתי שתרוויח',
    disclaimerT: '⚠️ הבהרות חשובות',
    disclaimers: [
      'זה כלי מידע — לא ייעוץ מס מורשה. הכלל המסודר נמצא בסעיף 100A לפקודת מס הכנסה.',
      'חישוב מס יציאה מורכב — יש פטורים (דירה ראשית, חלק מקרן השתלמות), פטורים חלקיים (תכנון 102 לאופציות), והבדל לעולים חדשים שהיו בארץ פחות מ-10 שנים.',
      'אמנות מס דו-צדדיות יכולות לבטל / להפחית את החבות (פורטוגל, גרמניה, בריטניה — כן; ארה״ב — לרוב לא).',
      'WizeTax Pro בונה תוכנית אישית כולל timing אופטימלי (האם להאיץ מימושים? לחכות עוד שנה?). תהליך עם רו״ח/יועץ מס חיוני לפני החלטה.',
    ],
    ctaT: 'רוצה ניתוח מעמיק עם רו״ח?',
    ctaSub: 'WizeTax Pro: מודל אישי + תכנון מס יציאה + חיזוי 10 שנים לכל יעד.',
    ctaBtn: 'פתח חשבון WizeTax Pro ←',
    backToReloc: '← חזור ל-/relocation-analyzer',
  },
  en: {
    title: 'Israeli Exit Tax Calculator',
    sub: 'Section 100A — one-time tax on assets when terminating Israeli tax residency. Info tool only.',
    inputT: 'Assets and their gain',
    inputSub: 'Enter current value + cost basis per category. The gain (current − cost) is what gets taxed on exit.',
    lblCurrent: 'Current value ($)',
    lblBasis: 'Cost basis ($)',
    lblGain: 'Gain',
    lblRate: 'Rate',
    lblTax: 'Exit tax',
    optShare: 'Controlling shareholder (>10%)',
    optShareSub: 'Changes rate to 30% on stocks only',
    btnCalc: 'Calculate exit tax',
    resultT: 'Estimated one-time exit tax',
    breakdownT: 'Breakdown by asset class',
    payNowT: 'Pay immediately',
    payNowSub: 'Pay now, no further charges. Simplest path.',
    deferT: 'Defer until actual sale',
    deferSub: 'Defer until sale, but interest accrues ~4-6%/yr. Requires bank guarantee or property collateral.',
    tieBackT: 'How does this affect your WizeLife savings?',
    tieBackSub: 'Enter your cumulative savings from /relocation-analyzer to see the real net:',
    lblSavings: '10-year relocation savings ($)',
    netT: 'Real benefit after exit tax',
    netSub: 'Relocation savings − exit tax = the actual difference you\'ll capture',
    disclaimerT: '⚠️ Important caveats',
    disclaimers: [
      'This is an information tool — not licensed tax advice. The full rule is in Section 100A of the Income Tax Ordinance.',
      'Real exit-tax calc is complex — exemptions (principal residence, partial Keren Hishtalmut), partial relief (Section 102 for options), and different treatment for olim chadashim under 10 years.',
      'Bilateral tax treaties can override / reduce liability (Portugal, Germany, UK — yes; US — usually not).',
      'WizeTax Pro builds personalized plan including optimal timing (accelerate realizations? wait another year?). A CPA / tax advisor is essential before any decision.',
    ],
    ctaT: 'Want a CPA-grade deep analysis?',
    ctaSub: 'WizeTax Pro: personal model + exit-tax planning + 10-year forecast per destination.',
    ctaBtn: 'Open WizeTax Pro account →',
    backToReloc: '← Back to /relocation-analyzer',
  },
  pt: {
    title: 'Calculadora de Imposto de Saída Israelense',
    sub: 'Seção 100A — imposto único sobre ativos ao terminar a residência fiscal israelense.',
    inputT: 'Ativos e seus ganhos',
    inputSub: 'Insira valor atual + base de custo por categoria.',
    lblCurrent: 'Valor atual ($)',
    lblBasis: 'Base de custo ($)',
    lblGain: 'Ganho',
    lblRate: 'Taxa',
    lblTax: 'Imposto de saída',
    optShare: 'Acionista controlador (>10%)',
    optShareSub: 'Muda taxa para 30%',
    btnCalc: 'Calcular imposto',
    resultT: 'Imposto de saída único estimado',
    breakdownT: 'Detalhamento por classe',
    payNowT: 'Pagar imediatamente',
    payNowSub: 'Pague agora, sem cobranças extras.',
    deferT: 'Adiar até venda real',
    deferSub: 'Juros se acumulam ~4-6%/ano.',
    tieBackT: 'Como isso afeta sua economia?',
    tieBackSub: 'Insira sua economia acumulada de /relocation-analyzer:',
    lblSavings: 'Economia 10-anos ($)',
    netT: 'Benefício real após imposto',
    netSub: 'Economia − imposto = diferença real',
    disclaimerT: '⚠️ Ressalvas importantes',
    disclaimers: [
      'Ferramenta de informação — não é consultoria fiscal licenciada.',
      'Cálculo real é complexo — exceções, isenções parciais, tratados.',
      'Tratados bilaterais podem reduzir ou anular a obrigação.',
      'WizeTax Pro constrói plano personalizado. Consultor fiscal é essencial.',
    ],
    ctaT: 'Quer análise profunda com contador?',
    ctaSub: 'WizeTax Pro: modelo personalizado + planejamento imposto de saída.',
    ctaBtn: 'Abrir conta WizeTax Pro →',
    backToReloc: '← Voltar ao /relocation-analyzer',
  },
  es: {
    title: 'Calculadora de Impuesto de Salida Israelí',
    sub: 'Sección 100A — impuesto único sobre activos al terminar residencia fiscal.',
    inputT: 'Activos y sus ganancias',
    inputSub: 'Ingresa valor actual + base de costo por categoría.',
    lblCurrent: 'Valor actual ($)',
    lblBasis: 'Base de costo ($)',
    lblGain: 'Ganancia',
    lblRate: 'Tasa',
    lblTax: 'Impuesto de salida',
    optShare: 'Accionista controlador (>10%)',
    optShareSub: 'Cambia tasa a 30%',
    btnCalc: 'Calcular impuesto',
    resultT: 'Impuesto de salida único estimado',
    breakdownT: 'Desglose por clase',
    payNowT: 'Pagar inmediatamente',
    payNowSub: 'Paga ahora, sin cargos adicionales.',
    deferT: 'Diferir hasta venta real',
    deferSub: 'Intereses se acumulan ~4-6%/año.',
    tieBackT: '¿Cómo afecta tu ahorro?',
    tieBackSub: 'Ingresa tu ahorro acumulado de /relocation-analyzer:',
    lblSavings: 'Ahorro 10 años ($)',
    netT: 'Beneficio real tras impuesto',
    netSub: 'Ahorro − impuesto = diferencia real',
    disclaimerT: '⚠️ Advertencias importantes',
    disclaimers: [
      'Herramienta informativa — no asesoría fiscal licenciada.',
      'Cálculo real es complejo — excepciones, exenciones parciales, tratados.',
      'Tratados bilaterales pueden reducir o anular la obligación.',
      'WizeTax Pro construye plan personalizado. Asesor fiscal es esencial.',
    ],
    ctaT: '¿Quieres análisis profundo con contador?',
    ctaSub: 'WizeTax Pro: modelo personalizado + planificación.',
    ctaBtn: 'Abrir cuenta WizeTax Pro →',
    backToReloc: '← Volver a /relocation-analyzer',
  },
};

function fmtUSD(n: number): string {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + Math.round(n).toLocaleString();
  return '$' + Math.round(Math.max(0, n));
}

export default function ExitTaxCalculator() {
  const [lang, setLang] = useState<Lang>('he');
  const [controlling, setControlling] = useState(false);
  const [savings10y, setSavings10y] = useState(500000);
  // Per-asset state: { current, basis }
  const [values, setValues] = useState<Record<string, { current: number; basis: number }>>(
    Object.fromEntries(ASSETS.map(a => [a.key, { current: 0, basis: 0 }]))
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem('wl_lang') as Lang | null;
      if (saved && ['he','en','pt','es'].includes(saved)) setLang(saved);
    } catch {}
  }, []);

  const t = TR[lang];
  const isRtl = lang === 'he';

  const breakdown = useMemo(() => {
    return ASSETS.map(a => {
      const v = values[a.key];
      const gain = Math.max(0, (v.current || 0) - (v.basis || 0));
      // Adjust rate for controlling shareholder (stocks only)
      let rate = a.baseRate;
      if (controlling && (a.key === 'israeli_stocks' || a.key === 'foreign_stocks')) rate = 30;
      // Principal residence: 0% (assumed exempt — simplification)
      const tax = a.key === 'principal_residence' ? 0 : (gain * rate) / 100;
      return { ...a, ...v, gain, rate, tax };
    });
  }, [values, controlling]);

  const totalTax = breakdown.reduce((s, b) => s + b.tax, 0);
  const realNet = savings10y - totalTax;

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ maxWidth: 1100, margin: '0 auto', padding: '18px 14px 60px', fontFamily: 'Inter,-apple-system,sans-serif', color: '#eef2ff' }}>
      <a href="/relocation-analyzer" style={{ color: '#a5b4fc', textDecoration: 'none', fontSize: 12, fontWeight: 600, display: 'inline-block', marginBottom: 10 }}>{t.backToReloc}</a>

      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <h1 style={{ fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', fontWeight: 900, fontSize: 26, margin: '0 0 8px', letterSpacing: '-.6px', background: 'linear-gradient(135deg,#fca5a5,#fcd34d)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {t.title}
        </h1>
        <p style={{ color: '#9ca3af', fontSize: 14, margin: 0, maxWidth: 640, marginInline: 'auto', lineHeight: 1.55 }}>{t.sub}</p>
      </div>

      {/* Input grid */}
      <div style={{ background: '#11142a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 4px', fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', fontWeight: 800, fontSize: 14, color: '#a5b4fc' }}>{t.inputT}</h3>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: '#9ca3af', lineHeight: 1.55 }}>{t.inputSub}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ASSETS.map(a => {
            const v = values[a.key];
            const isExempt = a.key === 'principal_residence';
            return (
              <div key={a.key} style={{ background: isExempt ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.025)', border: '1px solid ' + (isExempt ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'), borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{a.flag}</span>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>{a.name[lang]}</span>
                  <span style={{ marginInlineStart: 'auto', fontSize: 11, color: isExempt ? '#6ee7b7' : '#9ca3af', fontWeight: 600 }}>{a.exemptionNote[lang]} · {a.baseRate}%</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '.3px', marginBottom: 4 }}>{t.lblCurrent}</label>
                    <input type="number" value={v.current || ''} placeholder="0" min={0} onChange={e => setValues(s => ({ ...s, [a.key]: { ...s[a.key], current: parseFloat(e.target.value) || 0 } }))}
                      style={inputStyle} disabled={isExempt} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '.3px', marginBottom: 4 }}>{t.lblBasis}</label>
                    <input type="number" value={v.basis || ''} placeholder="0" min={0} onChange={e => setValues(s => ({ ...s, [a.key]: { ...s[a.key], basis: parseFloat(e.target.value) || 0 } }))}
                      style={inputStyle} disabled={isExempt} />
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>{a.notes[lang]}</div>
              </div>
            );
          })}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, cursor: 'pointer' }}>
          <input type="checkbox" checked={controlling} onChange={e => setControlling(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#6366f1' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{t.optShare}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{t.optShareSub}</div>
          </div>
        </label>
      </div>

      {/* Total + breakdown */}
      <div style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(245,158,11,0.08))', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 14, padding: 22, marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#fca5a5', letterSpacing: 1, textTransform: 'uppercase' }}>{t.resultT}</div>
        <div style={{ margin: '8px 0', fontSize: 44, fontWeight: 900, fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', background: 'linear-gradient(135deg,#fca5a5,#fcd34d)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{fmtUSD(totalTax)}</div>
      </div>

      {/* Breakdown table */}
      <div style={{ background: '#11142a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18, marginBottom: 16, overflowX: 'auto' }}>
        <h3 style={{ margin: '0 0 12px', fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', fontWeight: 800, fontSize: 14, color: '#a5b4fc' }}>{t.breakdownT}</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480, fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(99,102,241,0.10)' }}>
              <th style={th}>Asset</th>
              <th style={th}>{t.lblGain}</th>
              <th style={th}>{t.lblRate}</th>
              <th style={th}>{t.lblTax}</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.filter(b => b.current > 0 || b.basis > 0 || b.key === 'principal_residence').map(b => (
              <tr key={b.key} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <td style={td}><span style={{ marginInlineEnd: 6 }}>{b.flag}</span>{b.name[lang]}</td>
                <td style={{ ...td, fontFamily: 'JetBrains Mono,monospace' }}>{fmtUSD(b.gain)}</td>
                <td style={{ ...td, fontFamily: 'JetBrains Mono,monospace' }}>{b.rate}%</td>
                <td style={{ ...td, fontFamily: 'JetBrains Mono,monospace', color: b.tax > 0 ? '#fca5a5' : '#6ee7b7', fontWeight: 700 }}>{b.tax > 0 ? fmtUSD(b.tax) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pay-now vs defer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10, marginBottom: 16 }}>
        <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6ee7b7', letterSpacing: '.5px', textTransform: 'uppercase' }}>{t.payNowT}</div>
          <div style={{ margin: '6px 0', fontSize: 20, fontWeight: 800, fontFamily: 'JetBrains Mono,monospace' }}>{fmtUSD(totalTax)}</div>
          <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>{t.payNowSub}</div>
        </div>
        <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#fcd34d', letterSpacing: '.5px', textTransform: 'uppercase' }}>{t.deferT}</div>
          <div style={{ margin: '6px 0', fontSize: 20, fontWeight: 800, fontFamily: 'JetBrains Mono,monospace' }}>{fmtUSD(totalTax * 1.27)} <span style={{ fontSize: 12, color: '#9ca3af' }}>~5yr @5%</span></div>
          <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>{t.deferSub}</div>
        </div>
      </div>

      {/* Tie-back to relocation savings */}
      <div style={{ background: '#11142a', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 14, padding: 18, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 4px', fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', fontWeight: 800, fontSize: 14, color: '#a5b4fc' }}>{t.tieBackT}</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#9ca3af', lineHeight: 1.55 }}>{t.tieBackSub}</p>
        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '.3px', marginBottom: 4 }}>{t.lblSavings}</label>
        <input type="number" value={savings10y} min={0} step={10000} onChange={e => setSavings10y(parseFloat(e.target.value) || 0)} style={{ ...inputStyle, maxWidth: 280, marginBottom: 14 }} />
        <div style={{ background: realNet >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: '1px solid ' + (realNet >= 0 ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'), borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: realNet >= 0 ? '#6ee7b7' : '#fca5a5', textTransform: 'uppercase', letterSpacing: 1 }}>{t.netT}</div>
          <div style={{ margin: '6px 0', fontSize: 30, fontWeight: 900, fontFamily: 'JetBrains Mono,monospace', color: realNet >= 0 ? '#6ee7b7' : '#fca5a5' }}>{realNet >= 0 ? '+' : '−'}{fmtUSD(Math.abs(realNet))}</div>
          <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>{t.netSub} — <strong>{fmtUSD(savings10y)} − {fmtUSD(totalTax)} = {fmtUSD(realNet)}</strong></div>
        </div>
      </div>

      {/* Disclaimers */}
      <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: '#fcd34d', marginBottom: 6 }}>{t.disclaimerT}</div>
        <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 12, color: '#cbd5e1', lineHeight: 1.7 }}>
          {t.disclaimers.map((d, i) => <li key={i}>{d}</li>)}
        </ul>
      </div>

      {/* Final CTA */}
      <div style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(168,85,247,0.10))', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 14, padding: 18, textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 6px', fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', fontWeight: 800, fontSize: 15, color: '#fcd34d' }}>{t.ctaT}</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.55 }}>{t.ctaSub}</p>
        <a href="https://wizelife.ai/auth.html" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#f59e0b,#a855f7)', color: '#fff', textDecoration: 'none', padding: '11px 22px', borderRadius: 99, fontWeight: 800, fontSize: 13 }}>{t.ctaBtn}</a>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '9px 12px',
  color: '#eef2ff',
  fontSize: 15,
  fontWeight: 600,
  outline: 'none',
  fontFamily: 'JetBrains Mono,Menlo,monospace',
};
const th: React.CSSProperties = {
  padding: '10px 12px',
  fontWeight: 700,
  fontSize: 11.5,
  textTransform: 'uppercase',
  letterSpacing: '.4px',
  color: '#a5b4fc',
  textAlign: 'start',
};
const td: React.CSSProperties = {
  padding: '12px',
  verticalAlign: 'top',
  fontSize: 13,
};
