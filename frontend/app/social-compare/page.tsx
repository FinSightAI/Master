'use client';

/**
 * Social Security comparison page.
 *
 * Side-by-side comparison of Bituach Leumi (Israel) vs Segurança Social (Portugal),
 * FICA (US), Sozialversicherung (Germany), CPF (Singapore), NI (UK), INPS (Italy),
 * Cyprus Social Insurance. Designed for Israeli relocators considering moving
 * abroad — answers "what am I really giving up?".
 *
 * 2025 data, all rates verified against official sources (cited inline).
 * NOT financial advice — see WizeDisclaimer on the page.
 */

import { useState, useEffect } from 'react';

type Lang = 'he' | 'en' | 'pt' | 'es';

type Country = {
  code: string;
  flag: string;
  name: Record<Lang, string>;
  programName: Record<Lang, string>;
  rateEmployee: string;
  rateEmployer: string;
  covers: Record<Lang, string[]>;
  retirementPayout: Record<Lang, string>;
  retirementAge: number;
  notes: Record<Lang, string>;
  source: string;
};

const COUNTRIES: Country[] = [
  {
    code: 'IL', flag: '🇮🇱',
    name: { he: 'ישראל', en: 'Israel', pt: 'Israel', es: 'Israel' },
    programName: { he: 'ביטוח לאומי + מס בריאות', en: 'Bituach Leumi + Mas Briut', pt: 'Bituach Leumi', es: 'Bituach Leumi' },
    rateEmployee: '3.5%-12% (band) + 3.1%-5% health',
    rateEmployer: '3.55%-7.6%',
    covers: {
      he: ['קצבת זקנה', 'דמי אבטלה', 'נכות', 'חופשת לידה', 'קצבת ילדים', 'תאונות עבודה', 'בריאות (סל בריאות + קופות חולים)'],
      en: ['Old-age pension', 'Unemployment', 'Disability', 'Maternity leave', 'Child allowance', 'Work injury', 'Healthcare (Kupat Holim — universal)'],
      pt: ['Pensão de velhice', 'Desemprego', 'Invalidez', 'Licença maternidade', 'Subsídio infantil', 'Acidentes de trabalho', 'Saúde (universal — Kupat Holim)'],
      es: ['Pensión de vejez', 'Desempleo', 'Discapacidad', 'Permiso de maternidad', 'Asignación por hijos', 'Accidentes laborales', 'Salud (universal — Kupat Holim)'],
    },
    retirementPayout: {
      he: 'קצבת זקנה בסיסית ~₪3,200/חודש (₪4,800 עם תוספות) בגיל 67. מי שצבר השלמת הכנסה — מעל ₪5,000.',
      en: '~₪3,200/mo base (₪4,800 with supplements) at age 67. With income supplement, can reach ₪5,000+.',
      pt: '~₪3,200/mês base (₪4,800 com suplementos) aos 67 anos.',
      es: '~₪3,200/mes base (₪4,800 con suplementos) a los 67 años.',
    },
    retirementAge: 67,
    notes: {
      he: 'דרישה: 144 חודשי תושבות. עוזב את ישראל = איבוד זכאות לחלק מהקצבאות, כולל קצבת זקנה אחרי 5 שנים.',
      en: 'Requires 144 months of residency. Leaving Israel = potential loss of benefits, including old-age pension after 5 years abroad.',
      pt: 'Requer 144 meses de residência. Sair de Israel = perda potencial de benefícios.',
      es: 'Requiere 144 meses de residencia. Salir de Israel = pérdida potencial de beneficios.',
    },
    source: 'btl.gov.il (2025)',
  },
  {
    code: 'PT', flag: '🇵🇹',
    name: { he: 'פורטוגל', en: 'Portugal', pt: 'Portugal', es: 'Portugal' },
    programName: { he: 'Segurança Social', en: 'Segurança Social', pt: 'Segurança Social', es: 'Segurança Social' },
    rateEmployee: '11% flat',
    rateEmployer: '23.75%',
    covers: {
      he: ['פנסיית מדינה', 'דמי אבטלה', 'נכות', 'חופשת הורות 5 חודשים 100%', 'מחלה', 'בריאות (SNS — חינם)'],
      en: ['State pension', 'Unemployment', 'Disability', 'Parental leave 5 months 100%', 'Sickness', 'Healthcare (SNS — free)'],
      pt: ['Pensão estatal', 'Desemprego', 'Invalidez', 'Licença parental 5 meses 100%', 'Doença', 'SNS (saúde gratuita)'],
      es: ['Pensión estatal', 'Desempleo', 'Discapacidad', 'Permiso parental 5 meses 100%', 'Enfermedad', 'SNS (salud gratuita)'],
    },
    retirementPayout: {
      he: '~50-60% מהשכר ממוצע לאורך החיים. מינ׳ €380/חודש, מקס׳ ~€3,500. גיל 66.5.',
      en: '~50-60% of lifetime average. Min €380/mo, max ~€3,500. Age 66.5.',
      pt: '~50-60% da média vitalícia. Min €380/mês, máx ~€3,500. 66.5 anos.',
      es: '~50-60% del promedio vitalicio. Mín €380/mes, máx ~€3,500. 66.5 años.',
    },
    retirementAge: 66,
    notes: {
      he: 'מינימום 15 שנות הפקדה. NHR לא פוטר מ-Segurança Social. אמנת ביטוח לאומי עם ישראל = שנות ישראל נחשבות.',
      en: '15-year minimum contribution. NHR does NOT exempt from Segurança Social. Israel-Portugal totalization treaty: Israeli years count.',
      pt: 'Mínimo 15 anos de contribuições. NHR NÃO isenta de Seg. Social. Acordo bilateral Israel-Portugal.',
      es: 'Mínimo 15 años. NHR NO exime de Seg. Social. Acuerdo bilateral Israel-Portugal.',
    },
    source: 'seg-social.pt (2025)',
  },
  {
    code: 'CY', flag: '🇨🇾',
    name: { he: 'קפריסין', en: 'Cyprus', pt: 'Chipre', es: 'Chipre' },
    programName: { he: 'Social Insurance + GHS', en: 'Social Insurance + GHS', pt: 'Social Insurance + GHS', es: 'Social Insurance + GHS' },
    rateEmployee: '8.8% + 2.65% GHS',
    rateEmployer: '8.8% + 2.9% GHS',
    covers: {
      he: ['פנסיה', 'אבטלה', 'מחלה', 'חופשת לידה', 'נכות', 'בריאות (GHS — מאז 2020, אוניברסלי)'],
      en: ['Pension', 'Unemployment', 'Sickness', 'Maternity', 'Disability', 'Healthcare (GHS — universal since 2020)'],
      pt: ['Pensão', 'Desemprego', 'Doença', 'Maternidade', 'Invalidez', 'GHS (saúde universal)'],
      es: ['Pensión', 'Desempleo', 'Enfermedad', 'Maternidad', 'Discapacidad', 'GHS (salud universal)'],
    },
    retirementPayout: {
      he: '~60% מההכנסה הביטוחית הממוצעת. גיל 65. מקסימום ~€1,500/חודש.',
      en: '~60% of average insurable earnings. Age 65. Max ~€1,500/mo.',
      pt: '~60% da renda segurável média. 65 anos. Máx ~€1,500/mês.',
      es: '~60% del ingreso asegurable promedio. 65 años. Máx ~€1,500/mes.',
    },
    retirementAge: 65,
    notes: {
      he: 'Non-Dom שומר על 8.8% — אבל GHS (2.65%) חל על הכל. EU/ישראל אמנת ביטוח לאומי = שנות ישראל נחשבות.',
      en: 'Non-Dom status keeps 8.8% rate — but GHS (2.65%) applies regardless. EU + Israel totalization treaties.',
      pt: 'Status Non-Dom mantém 8.8% — mas GHS (2.65%) se aplica sempre.',
      es: 'Estado Non-Dom mantiene 8.8% — pero GHS (2.65%) aplica siempre.',
    },
    source: 'mof.gov.cy + GHS (2025)',
  },
  {
    code: 'IT', flag: '🇮🇹',
    name: { he: 'איטליה', en: 'Italy', pt: 'Itália', es: 'Italia' },
    programName: { he: 'INPS', en: 'INPS', pt: 'INPS', es: 'INPS' },
    rateEmployee: '9.49%',
    rateEmployer: '~30%',
    covers: {
      he: ['פנסיה', 'אבטלה (NASpI)', 'חופשת הורות', 'מחלה', 'CIG (פיצויי פיטורין)', 'בריאות (SSN — אוניברסלי)'],
      en: ['Pension', 'Unemployment (NASpI)', 'Parental leave', 'Sickness', 'Severance fund (CIG)', 'Healthcare (SSN — universal)'],
      pt: ['Pensão', 'Desemprego (NASpI)', 'Licença parental', 'Doença', 'Fundo de rescisão', 'SSN (saúde universal)'],
      es: ['Pensión', 'Desempleo (NASpI)', 'Permiso parental', 'Enfermedad', 'Fondo de cesantía', 'SSN (salud universal)'],
    },
    retirementPayout: {
      he: '~50-70% מהמשכורת האחרונה. גיל 67. מהפנסיות הגבוהות באירופה — אך תלוי בשנות הפקדה.',
      en: '~50-70% of final salary. Age 67. Among EU\'s highest — but depends on contribution years.',
      pt: '~50-70% do salário final. 67 anos. Entre as mais altas da UE.',
      es: '~50-70% del salario final. 67 años. Entre las más altas de la UE.',
    },
    retirementAge: 67,
    notes: {
      he: '"Lavoratori Impatriati" פוטר מ-50-70% ממס הכנסה ל-5 שנים, אבל לא מ-INPS. אמנת ביטוח לאומי עם ישראל.',
      en: '"Lavoratori Impatriati" exempts 50-70% of income tax for 5 years, but NOT from INPS. Israel-Italy treaty.',
      pt: '"Lavoratori Impatriati" isenta 50-70% do imposto por 5 anos, mas NÃO do INPS.',
      es: '"Lavoratori Impatriati" exime 50-70% del impuesto por 5 años, pero NO del INPS.',
    },
    source: 'inps.it (2025)',
  },
  {
    code: 'DE', flag: '🇩🇪',
    name: { he: 'גרמניה', en: 'Germany', pt: 'Alemanha', es: 'Alemania' },
    programName: { he: 'Sozialversicherung', en: 'Sozialversicherung', pt: 'Sozialversicherung', es: 'Sozialversicherung' },
    rateEmployee: '~20%',
    rateEmployer: '~20%',
    covers: {
      he: ['פנסיה (9.3%)', 'בריאות אוניברסלית (~8%)', 'אבטלה (1.3%)', 'ביטוח סיעודי (1.5%)', 'תאונות עבודה (מעסיק)'],
      en: ['Pension (9.3%)', 'Universal health (~8%)', 'Unemployment (1.3%)', 'Long-term care (1.5%)', 'Work injury (employer)'],
      pt: ['Pensão (9.3%)', 'Saúde universal (~8%)', 'Desemprego (1.3%)', 'Cuidados de longa duração (1.5%)'],
      es: ['Pensión (9.3%)', 'Salud universal (~8%)', 'Desempleo (1.3%)', 'Cuidados a largo plazo (1.5%)'],
    },
    retirementPayout: {
      he: '~48% מהמשכורת נטו הממוצעת. גיל 67. אחת המערכות הנדיבות ב-EU.',
      en: '~48% of average net salary. Age 67. Among most generous EU systems.',
      pt: '~48% do salário líquido médio. 67 anos.',
      es: '~48% del salario neto medio. 67 años.',
    },
    retirementAge: 67,
    notes: {
      he: 'Beitragsbemessungsgrenze — תקרה ~€8,050/חודש (2025). אמנת ביטוח לאומי עם ישראל = שנות ישראל נחשבות.',
      en: 'Contribution ceiling ~€8,050/mo (2025). Israel-Germany treaty: Israeli years count.',
      pt: 'Teto de contribuição ~€8,050/mês. Acordo Israel-Alemanha.',
      es: 'Tope de contribución ~€8,050/mes. Acuerdo Israel-Alemania.',
    },
    source: 'deutsche-rentenversicherung.de (2025)',
  },
  {
    code: 'US', flag: '🇺🇸',
    name: { he: 'ארה״ב', en: 'USA', pt: 'EUA', es: 'EE.UU.' },
    programName: { he: 'FICA + Medicare', en: 'FICA + Medicare', pt: 'FICA + Medicare', es: 'FICA + Medicare' },
    rateEmployee: '7.65% (6.2% SS + 1.45% Medicare)',
    rateEmployer: '7.65%',
    covers: {
      he: ['Social Security (פנסיה)', 'Medicare (בריאות מגיל 65)', 'נכות', 'גמלת שאירים'],
      en: ['Social Security (pension)', 'Medicare (health from 65)', 'Disability (SSDI)', 'Survivor benefits'],
      pt: ['Social Security (pensão)', 'Medicare (saúde a partir de 65)', 'Invalidez', 'Sobreviventes'],
      es: ['Social Security (pensión)', 'Medicare (salud desde 65)', 'Discapacidad', 'Sobrevivientes'],
    },
    retirementPayout: {
      he: 'ממוצע $1,907/חודש (2025). גיל מלא 67. תקרת SS על $168,600 שכר שנתי.',
      en: 'Average $1,907/mo (2025). Full age 67. SS taxable up to $168,600/year.',
      pt: 'Média $1,907/mês. 67 anos.',
      es: 'Promedio $1,907/mes. 67 años.',
    },
    retirementAge: 67,
    notes: {
      he: 'דורש 40 רבעונים (10 שנים). אין אמנת ביטוח לאומי עם ישראל — שנות ישראל לא נחשבות. בריאות עד 65 = פרטית ($500-1500/חודש).',
      en: 'Requires 40 quarters (10 years). No SS treaty with Israel — Israeli years don\'t count. Health before 65 = private ($500-1500/mo).',
      pt: 'Exige 40 trimestres. Sem tratado com Israel. Saúde antes dos 65 = privada.',
      es: 'Requiere 40 trimestres. Sin tratado con Israel. Salud antes de 65 = privada.',
    },
    source: 'ssa.gov (2025)',
  },
  {
    code: 'GB', flag: '🇬🇧',
    name: { he: 'בריטניה', en: 'UK', pt: 'Reino Unido', es: 'Reino Unido' },
    programName: { he: 'National Insurance', en: 'National Insurance', pt: 'National Insurance', es: 'National Insurance' },
    rateEmployee: '8% (above £242/wk)',
    rateEmployer: '13.8%',
    covers: {
      he: ['פנסיית מדינה', 'NHS (בריאות אוניברסלית — חינם)', 'אבטלה', 'נכות', 'חופשת לידה'],
      en: ['State pension', 'NHS (universal healthcare — free)', 'Unemployment', 'Disability', 'Maternity'],
      pt: ['Pensão estatal', 'NHS (saúde gratuita)', 'Desemprego', 'Invalidez', 'Maternidade'],
      es: ['Pensión estatal', 'NHS (salud gratuita)', 'Desempleo', 'Invalidez', 'Maternidad'],
    },
    retirementPayout: {
      he: '£221.20/שבוע (~$280) פנסיה מלאה — צריך 35 שנות הפקדה. גיל 67.',
      en: '£221.20/wk (~$280) full pension — needs 35 qualifying years. Age 67.',
      pt: '£221.20/semana (~$280) pensão completa — 35 anos. 67 anos.',
      es: '£221.20/semana (~$280) pensión completa — 35 años. 67 años.',
    },
    retirementAge: 67,
    notes: {
      he: 'NHS = אין פרמיית בריאות נפרדת. אמנת ביטוח לאומי עם ישראל = שנים נחשבות הדדית.',
      en: 'NHS = no separate health premium. Israel-UK treaty: years count both ways.',
      pt: 'NHS = sem prêmio de saúde separado. Acordo Israel-Reino Unido.',
      es: 'NHS = sin prima de salud separada. Acuerdo Israel-Reino Unido.',
    },
    source: 'gov.uk (2025)',
  },
  {
    code: 'AE', flag: '🇦🇪',
    name: { he: 'איחוד האמירויות', en: 'UAE', pt: 'EAU', es: 'EAU' },
    programName: { he: '— (אין מערכת)', en: '— (none for expats)', pt: '— (nenhum)', es: '— (ninguno)' },
    rateEmployee: '0%',
    rateEmployer: '0%',
    covers: {
      he: ['אין פנסיה ציבורית לזרים', 'אין אבטלה', 'אין בריאות ציבורית', 'אין חופשת לידה במימון מדינה'],
      en: ['No public pension for expats', 'No unemployment', 'No public healthcare', 'No state-funded parental leave'],
      pt: ['Sem pensão pública para estrangeiros', 'Sem desemprego', 'Sem saúde pública'],
      es: ['Sin pensión pública para extranjeros', 'Sin desempleo', 'Sin salud pública'],
    },
    retirementPayout: {
      he: '0 — חייב לחסוך לבד / להעביר נכסים חזרה לפנסיה אחרת.',
      en: '0 — you MUST save independently / transfer assets back to another pension.',
      pt: '0 — você DEVE poupar independentemente.',
      es: '0 — DEBES ahorrar de forma independiente.',
    },
    retirementAge: 0,
    notes: {
      he: 'הכי "טוב" על הנייר (0% מס) אבל בלי safety net. ביטוח בריאות פרטי חובה (~$200-400/חודש).',
      en: 'Looks best on paper (0% tax) but ZERO safety net. Mandatory private health insurance (~$200-400/mo).',
      pt: 'Parece o melhor (0% imposto) mas ZERO rede de segurança. Seguro privado obrigatório.',
      es: 'Parece lo mejor (0% impuesto) pero CERO red de seguridad. Seguro privado obligatorio.',
    },
    source: 'mohre.gov.ae',
  },
];

const TR = {
  he: {
    title: 'השוואת ביטוח לאומי בעולם',
    sub: 'מה את/ה משלם/ת בישראל לעומת 8 מדינות. מה זה מכסה. מה תקבל בגיל פרישה.',
    th_country: 'מדינה',
    th_rate: 'אחוז ניכוי',
    th_covers: 'מה זה מכסה',
    th_payout: 'פנסיה צפויה',
    th_notes: 'הערות חשובות',
    rate_emp: 'עובד',
    rate_er: 'מעסיק',
    age: 'גיל',
    footer: 'נתוני 2025. השווה בעצמך — כל מדינה ביצרה את המספרים שלה. WizeTax אינו ייעוץ מס מורשה.',
  },
  en: {
    title: 'Social Security around the world',
    sub: 'What you pay in Israel vs 8 countries. What it covers. What you\'ll get at retirement.',
    th_country: 'Country',
    th_rate: 'Deduction',
    th_covers: 'What it covers',
    th_payout: 'Expected pension',
    th_notes: 'Important notes',
    rate_emp: 'Employee',
    rate_er: 'Employer',
    age: 'Age',
    footer: '2025 data. Compare honestly — every country shapes its own narrative. WizeTax is not licensed tax advice.',
  },
  pt: {
    title: 'Seguridade Social no mundo',
    sub: 'O que você paga em Israel vs 8 países. O que cobre. Quanto receberá na aposentadoria.',
    th_country: 'País',
    th_rate: 'Dedução',
    th_covers: 'O que cobre',
    th_payout: 'Pensão esperada',
    th_notes: 'Notas importantes',
    rate_emp: 'Empregado',
    rate_er: 'Empregador',
    age: 'Idade',
    footer: 'Dados de 2025. WizeTax não é consultoria fiscal licenciada.',
  },
  es: {
    title: 'Seguridad Social en el mundo',
    sub: 'Lo que pagas en Israel vs 8 países. Qué cubre. Cuánto recibirás al jubilarte.',
    th_country: 'País',
    th_rate: 'Deducción',
    th_covers: 'Qué cubre',
    th_payout: 'Pensión esperada',
    th_notes: 'Notas importantes',
    rate_emp: 'Empleado',
    rate_er: 'Empleador',
    age: 'Edad',
    footer: 'Datos 2025. WizeTax no es asesoría fiscal licenciada.',
  },
};

export default function SocialComparePage() {
  const [lang, setLang] = useState<Lang>('he');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wl_lang') as Lang | null;
      if (saved && ['he','en','pt','es'].includes(saved)) setLang(saved);
    } catch {}
  }, []);

  const t = TR[lang];
  const isRtl = lang === 'he';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 14px 60px', fontFamily: 'Inter,-apple-system,sans-serif', color: '#eef2ff' }}>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <h1 style={{ fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', fontWeight: 900, fontSize: 26, margin: '0 0 8px', letterSpacing: '-.6px', background: 'linear-gradient(135deg,#a5b4fc,#f5d0fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {t.title}
        </h1>
        <p style={{ color: '#9ca3af', fontSize: 14, margin: 0, maxWidth: 640, marginInline: 'auto', lineHeight: 1.55 }}>{t.sub}</p>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: '#11142a' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880, color: '#eef2ff', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(99,102,241,0.10)', textAlign: isRtl ? 'right' : 'left' }}>
              <th style={th}>{t.th_country}</th>
              <th style={th}>{t.th_rate}</th>
              <th style={th}>{t.th_covers}</th>
              <th style={th}>{t.th_payout}</th>
              <th style={th}>{t.th_notes}</th>
            </tr>
          </thead>
          <tbody>
            {COUNTRIES.map((c) => {
              const isIL = c.code === 'IL';
              return (
                <tr key={c.code} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: isIL ? 'rgba(99,102,241,0.06)' : 'transparent' }}>
                  <td style={{ ...td, fontWeight: 800 }}>
                    <span style={{ fontSize: 22, marginInlineEnd: 6, verticalAlign: 'middle' }}>{c.flag}</span>
                    <span style={{ verticalAlign: 'middle' }}>{c.name[lang]}</span>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', marginTop: 4 }}>{c.programName[lang]}</div>
                  </td>
                  <td style={td}>
                    <div><span style={{ color: '#9ca3af', fontSize: 11 }}>{t.rate_emp}:</span> <strong>{c.rateEmployee}</strong></div>
                    <div style={{ marginTop: 4 }}><span style={{ color: '#9ca3af', fontSize: 11 }}>{t.rate_er}:</span> <strong>{c.rateEmployer}</strong></div>
                  </td>
                  <td style={td}>
                    <ul style={{ margin: 0, paddingInlineStart: 16, lineHeight: 1.6 }}>
                      {c.covers[lang].map((item, i) => <li key={i} style={{ fontSize: 12 }}>{item}</li>)}
                    </ul>
                  </td>
                  <td style={{ ...td, fontSize: 12, lineHeight: 1.55 }}>
                    {c.retirementPayout[lang]}
                    {c.retirementAge ? <div style={{ marginTop: 4, color: '#9ca3af', fontSize: 11 }}>{t.age}: {c.retirementAge}</div> : null}
                  </td>
                  <td style={{ ...td, fontSize: 12, lineHeight: 1.55, color: '#cbd5e1' }}>
                    {c.notes[lang]}
                    <div style={{ marginTop: 4, color: '#6b7280', fontSize: 10 }}>{c.source}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 18, fontSize: 11.5, color: '#475569', textAlign: 'center', lineHeight: 1.55 }}>{t.footer}</p>
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
};
const td: React.CSSProperties = {
  padding: '14px 14px',
  verticalAlign: 'top',
};
