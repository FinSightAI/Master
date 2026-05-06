'use client';

import { useState, useEffect, ReactNode } from 'react';

type Lang = 'he' | 'en' | 'pt' | 'es';

const LABELS: Record<string, Record<Lang, string>> = {
  advisor:  { he: 'יועץ AI',          en: 'AI Advisor',     pt: 'Consultor IA',    es: 'Asesor IA' },
  compare:  { he: 'השוואת מדינות',    en: 'Country Compare', pt: 'Comparar Países', es: 'Comparar Países' },
  income:   { he: 'סימולטור הכנסה',   en: 'Income Sim',     pt: 'Simulador',       es: 'Simulador' },
  timeline: { he: 'ציר זמן מס',       en: 'Tax Timeline',   pt: 'Linha do Tempo',  es: 'Línea de Tiempo' },
};
const SECTION_LABEL: Record<Lang, string> = { he: 'כלים', en: 'Tools', pt: 'Ferramentas', es: 'Herramientas' };
const FOOTER_SUB: Record<Lang, string> = { he: 'יועץ מס גלובלי', en: 'Global Tax Advisor', pt: 'Consultor Fiscal Global', es: 'Asesor Fiscal Global' };

const NAV_IDS = ['advisor', 'compare', 'income', 'timeline'] as const;
const ICONS: Record<string, ReactNode> = {
  advisor:  (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>),
  compare:  (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>),
  income:   (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>),
  timeline: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>),
};

export default function WizeShell({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<string>('advisor');
  const [rpCollapsed, setRpCollapsed] = useState<boolean>(false);
  const [isLight, setIsLight] = useState<boolean>(false);
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('wl_rp_collapsed') : null;
    if (saved === '1') setRpCollapsed(true);
    const detectTheme = () => {
      if (typeof document === 'undefined') return;
      const t = document.documentElement.getAttribute('data-theme') || document.body.className;
      setIsLight(t.includes('light'));
    };
    detectTheme();
    const obs = new MutationObserver(detectTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  const [lang, setLang] = useState<Lang>('he');

  useEffect(() => {
    const stored = (typeof window !== 'undefined' ? localStorage.getItem('wl_lang') : null) as Lang | null;
    if (stored && (['he', 'en', 'pt', 'es'] as const).includes(stored as Lang)) {
      setLang(stored);
    } else if (typeof navigator !== 'undefined') {
      const bl = (navigator.language || 'he').toLowerCase();
      if (bl.startsWith('en')) setLang('en');
      else if (bl.startsWith('pt')) setLang('pt');
      else if (bl.startsWith('es')) setLang('es');
    }
    const onStorage = () => {
      const v = localStorage.getItem('wl_lang') as Lang | null;
      if (v && (['he', 'en', 'pt', 'es'] as const).includes(v as Lang)) setLang(v);
    };
    window.addEventListener('storage', onStorage);
    const id = setInterval(onStorage, 1500);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(id); };
  }, []);

  const handleNav = (id: string) => {
    setActive(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wize-nav', { detail: { view: id } }));
      window.scrollTo({ top: 52, behavior: 'smooth' });
    }
  };

  const isRtl = lang === 'he';

  return (
    <div className="wl-shell-outer" style={{ display: 'flex', height: 'calc(100vh - 36px)', background: isLight ? '#f8fafc' : '#030508', color: isLight ? '#1e293b' : '#eef2ff', direction: isRtl ? 'rtl' : 'ltr' }}>
      <aside className="wl-tax-sidebar" style={{
        width: 220, flexShrink: 0,
        background: isLight ? '#ffffff' : '#060810',
        borderRight: isRtl ? 'none' : (isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.07)'),
        borderLeft: isRtl ? (isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.07)') : 'none',
        display: 'flex', flexDirection: 'column',
        height: 'calc(100vh - 36px)', overflowY: 'auto'
      }}>
        <div style={{ padding: '18px 16px 14px', borderBottom: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 13, fontWeight: 800, letterSpacing: '-0.3px', color: '#eef2ff' }}>
            Wize<span style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Tax</span>
          </div>
        </div>
        <div style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.25)', padding: '14px 16px 4px' }}>
          {SECTION_LABEL[lang]}
        </div>
        {NAV_IDS.map(id => (
          <button
            key={id}
            onClick={() => handleNav(id)}
            type="button"
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 16px', fontSize: 12.5,
              color: active === id ? '#fbbf24' : 'rgba(255,255,255,0.5)',
              background: active === id ? 'rgba(245,158,11,0.1)' : 'transparent',
              cursor: 'pointer', transition: 'all 0.15s',
              border: 'none', fontFamily: 'inherit',
              textAlign: isRtl ? 'right' : 'left', width: '100%'
            }}
          >
            <span style={{ width: 15, height: 15, flexShrink: 0, display: 'inline-flex' }}>{ICONS[id]}</span>
            {LABELS[id][lang]}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '12px 16px', borderTop: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.07)', fontSize: 11, color: isLight ? '#475569' : '#6b7280' }}>
          <strong style={{ color: '#eef2ff', display: 'block', marginBottom: 2 }}>WizeTax</strong>
          {FOOTER_SUB[lang]}
        </div>
      </aside>
      <main style={{ flex: 1, minWidth: 0, height: 'calc(100vh - 52px)', overflowY: 'auto' }}>
        {children}
      </main>
      {!rpCollapsed && (
      <aside className="wl-tax-rpanel" style={{
        width: 240, flexShrink: 0,
        background: isLight ? '#ffffff' : '#060810',
        borderLeft: isRtl ? 'none' : (isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.07)'),
        borderRight: isRtl ? (isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.07)') : 'none',
        padding: '16px',
        display: 'flex', flexDirection: 'column', gap: 14,
        height: 'calc(100vh - 36px)', overflowY: 'auto'
      }}>
        <button onClick={() => { setRpCollapsed(true); localStorage.setItem('wl_rp_collapsed', '1'); }} aria-label="Collapse panel" style={{position:'absolute',top:10,right:10,width:24,height:24,borderRadius:6,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8',cursor:'pointer',fontSize:14,lineHeight:'1',padding:0,fontFamily:'inherit'}}>×</button>
        <div style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 12, fontWeight: 800, color: isLight ? '#1e293b' : '#eef2ff', marginBottom: 4 }}>
          {lang==='he'?'תובנות AI':'AI Insights'}
        </div>

        <div style={{ background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 12 }}>
          <div style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
            {lang==='he'?'נטו צפוי':'Estimated Net'}
          </div>
          <div style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 28, fontWeight: 900, color: '#fbbf24', textAlign: 'center', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>—</div>
          <div style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', marginTop: 4 }}>{lang==='he'?'שאל את היועץ':'Ask the advisor'}</div>
        </div>

        <div style={{ background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 12 }}>
          <div style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
            {lang==='he'?'טיפים מהירים':'Quick Tips'}
          </div>
          {(lang==='he'?[
            'נתוני PwC/OECD מאומתים — 26 מדינות',
            'מס יציאה משתנה לפי תקופת תושבות',
            'קצבת לידה ופנסיה — בדוק לכל מדינה',
          ]:[
            'PwC/OECD verified data — 26 countries',
            'Exit tax depends on residency duration',
            'Maternity & pension — varies per country',
          ]).map((t,i,arr) => (
            <div key={i} style={{ fontSize: 11.5, color: isLight ? '#475569' : '#94a3b8', lineHeight: 1.55, padding: '8px 0', borderBottom: i < arr.length - 1 ? (isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.04)') : 'none' }}>{t}</div>
          ))}
        </div>

        <div style={{ background: isLight ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 12 }}>
          <div style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(165,180,252,0.6)', marginBottom: 6 }}>
            WizeAI
          </div>
          <a href="https://wizelife.ai/wize-ai.html" target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:6, textDecoration:'none', color:'#a5b4fc', fontSize:12, fontWeight:600 }}>
            {lang==='he'?'יועץ חוצה אפליקציות ←':'Cross-app advisor →'}
          </a>
        </div>
      </aside>
      )}
      {rpCollapsed && (
        <button onClick={() => { setRpCollapsed(false); localStorage.setItem('wl_rp_collapsed', '0'); }} aria-label="Open AI panel" style={{position:'fixed',top:'50%',left:0,transform:'translateY(-50%)',width:24,height:60,borderRadius:'0 8px 8px 0',background:'rgba(99,102,241,0.18)',border:'1px solid rgba(99,102,241,0.3)',borderLeft:'none',color:'#a5b4fc',cursor:'pointer',fontSize:14,lineHeight:'60px',textAlign:'center',padding:0,zIndex:51,fontFamily:'inherit'}}>›</button>
      )}
      <style>{`
        @media (max-width: 1100px) {
          .wl-tax-rpanel { display: none !important; }
        }
        @media (max-width: 768px) {
          .wl-tax-sidebar { display: none !important; }
        }
      `}</style>
    </div>
  );
}
