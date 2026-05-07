'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { onAuth, signInWithGoogle, signOut, type User } from '../lib/firebase';

const LANGS = ['he','en','pt','es'] as const;
type Lang = typeof LANGS[number];

const pillStyle = (active: boolean, color: string): React.CSSProperties => ({
  background: active ? color + '33' : 'none',
  border: 'none',
  color: active ? color : '#6b7280',
  padding: '3px 7px',
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all .15s',
  fontFamily: 'inherit',
  letterSpacing: '.4px',
});

export function LangSwitcher({ color }: { color: string }) {
  const [lang, setLangState] = useState<Lang>('he');
  useEffect(() => {
    setLangState((localStorage.getItem('wl_lang') as Lang) || 'he');
  }, []);
  function pick(l: Lang) {
    localStorage.setItem('wl_lang', l);
    setLangState(l);
    window.location.reload();
  }
  return (
    <div style={{display:'flex',gap:2,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:8,padding:3}}>
      {LANGS.map(l => (
        <button key={l} style={pillStyle(lang===l, color)} onClick={() => pick(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// ── Onboarding slides ────────────────────���─────────────────────────────────
type Feature = { e: string; t: string };
type Action  = { e: string; label: string; color: string; href?: string };
type Slide   = { icon: string; bg: string; title: string; sub: string; features?: Feature[]; actions?: Action[] };

const SLIDES: Record<string, Slide[]> = {
  he: [
    { icon:'💰', bg:'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.38) 0%, transparent 70%)',
      title:'ברוכים הבאים ל-WizeTax', sub:'יועץ המס הגלובלי שלך — מבוסס בינה מלאכותית',
      features:[{e:'🌍',t:'תכנון מס לישראלים בחו"ל ובארץ'},{e:'⚖️',t:'אופטימיזציה חוקית להפחתת נטל המס'},{e:'💬',t:'שאלות מס בעברית, אנגלית, פורטוגזית וספרדית'}] },
    { icon:'🗺️', bg:'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.35) 0%, transparent 70%)',
      title:'מס ישראלי + בינלאומי', sub:'מומחה בכל תחומי השיפוט המרכזיים',
      features:[{e:'🇮🇱',t:'ישראל — מס הכנסה, ביטוח לאומי, הגירה'},{e:'🇺🇸',t:'ארה"ב — FBAR, FATCA, treaty benefits'},{e:'🇵🇹',t:'פורטוגל, קפריסין, דובאי ועוד'}] },
    { icon:'⚖️', bg:'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.32) 0%, transparent 70%)',
      title:'אופטימיזציה חוקית', sub:'הפחת מסים — בתוך החוק לחלוטין',
      features:[{e:'🏢',t:'מבני חברות — חברת החזקות, IP Box, holding'},{e:'📊',t:'השוואת תרחישים: מכירה, דיבידנד, פירוק'},{e:'📅',t:'תזמון אירועי מס — מתי למכור ומתי להמתין'}] },
    { icon:'🔐', bg:'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.3) 0%, transparent 70%)',
      title:'דיסקרטיות מלאה', sub:'השיחות שלך נשמרות פרטיות לחלוטין',
      features:[{e:'🔒',t:'אין שמירת מידע אישי על שרתים חיצוניים'},{e:'⚠️',t:'WizeTax הוא כלי מידע — לא תחליף ליועץ מס מורשה'},{e:'✅',t:'מאה אחוז חוקי — אופטימיזציה בתוך החוק'}] },
    { icon:'🚀', bg:'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.3) 0%, transparent 70%)',
      title:'במה תרצה להתחיל?', sub:'בחר נושא לשאלה ראשונה',
      actions:[
        {e:'🇮🇱',label:'מס ישראלי',color:'#f59e0b'},
        {e:'🇺🇸',label:'מס אמריקאי',color:'#3b82f6'},
        {e:'🇵🇹',label:'פורטוגל / קפריסין',color:'#10b981'},
        {e:'🏢',label:'מבנה חברה',color:'#8b5cf6'},
        {e:'📊',label:'השוואת תרחישים',color:'#ec4899'},
        {e:'💬',label:'שאלה חופשית',color:'#64748b'},
      ] },
  ],
  en: [
    { icon:'💰', bg:'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.38) 0%, transparent 70%)',
      title:'Welcome to WizeTax', sub:'Your AI-powered global tax advisor',
      features:[{e:'🌍',t:'Tax planning for Israelis abroad & at home'},{e:'⚖️',t:'Legal optimization to reduce your tax burden'},{e:'💬',t:'Tax questions in Hebrew, English, Portuguese & Spanish'}] },
    { icon:'🗺️', bg:'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.35) 0%, transparent 70%)',
      title:'Israeli & International Tax', sub:'Expert in all major jurisdictions',
      features:[{e:'🇮🇱',t:'Israel — income tax, national insurance, immigration'},{e:'🇺🇸',t:'USA — FBAR, FATCA, treaty benefits'},{e:'🇵🇹',t:'Portugal, Cyprus, Dubai and more'}] },
    { icon:'⚖️', bg:'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.32) 0%, transparent 70%)',
      title:'Legal Tax Optimization', sub:'Reduce taxes — fully within the law',
      features:[{e:'🏢',t:'Corporate structures — holding, IP Box, management'},{e:'📊',t:'Scenario comparison: sell, dividend, liquidate'},{e:'📅',t:'Tax event timing — when to sell, when to wait'}] },
    { icon:'🔐', bg:'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.3) 0%, transparent 70%)',
      title:'Full Discretion', sub:'Your conversations stay completely private',
      features:[{e:'🔒',t:'No personal data stored on external servers'},{e:'⚠️',t:'WizeTax is an information tool — not a substitute for a licensed tax advisor'},{e:'✅',t:'100% legal — optimization within the law'}] },
    { icon:'🚀', bg:'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.3) 0%, transparent 70%)',
      title:'What would you like to start with?', sub:'Choose a topic for your first question',
      actions:[
        {e:'🇮🇱',label:'Israeli Tax',color:'#f59e0b'},
        {e:'🇺🇸',label:'US Tax',color:'#3b82f6'},
        {e:'🇵🇹',label:'Portugal / Cyprus',color:'#10b981'},
        {e:'🏢',label:'Company Structure',color:'#8b5cf6'},
        {e:'📊',label:'Scenario Compare',color:'#ec4899'},
        {e:'💬',label:'Free Question',color:'#64748b'},
      ] },
  ],
  pt: [
    { icon:'💰', bg:'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.38) 0%, transparent 70%)',
      title:'Bem-vindo ao WizeTax', sub:'Seu consultor tributário global com IA',
      features:[{e:'🌍',t:'Planejamento tributário para israelenses no mundo'},{e:'⚖️',t:'Otimização legal para reduzir sua carga tributária'},{e:'💬',t:'Perguntas fiscais em qualquer idioma'}] },
    { icon:'🗺️', bg:'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.35) 0%, transparent 70%)',
      title:'Impostos Israelenses & Internacionais', sub:'Especialista em todas as principais jurisdições',
      features:[{e:'🇮🇱',t:'Israel — imposto de renda, seguro nacional'},{e:'🇺🇸',t:'EUA — FBAR, FATCA, benefícios de tratados'},{e:'🇵🇹',t:'Portugal, Chipre, Dubai e mais'}] },
    { icon:'⚖️', bg:'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.32) 0%, transparent 70%)',
      title:'Otimização Tributária Legal', sub:'Reduza impostos — totalmente dentro da lei',
      features:[{e:'🏢',t:'Estruturas corporativas — holding, IP Box'},{e:'📊',t:'Comparação de cenários: venda, dividendo, liquidação'},{e:'📅',t:'Timing de eventos fiscais — quando vender, quando esperar'}] },
    { icon:'🔐', bg:'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.3) 0%, transparent 70%)',
      title:'Total Discrição', sub:'Suas conversas ficam completamente privadas',
      features:[{e:'🔒',t:'Nenhum dado pessoal armazenado em servidores externos'},{e:'⚠️',t:'WizeTax é uma ferramenta informativa — não substitui um consultor tributário'},{e:'✅',t:'100% legal — otimização dentro da lei'}] },
    { icon:'🚀', bg:'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.3) 0%, transparent 70%)',
      title:'Por onde quer começar?', sub:'Escolha um tema para sua primeira pergunta',
      actions:[
        {e:'🇮🇱',label:'Imposto Israelense',color:'#f59e0b'},
        {e:'🇺🇸',label:'Imposto Americano',color:'#3b82f6'},
        {e:'🇵🇹',label:'Portugal / Chipre',color:'#10b981'},
        {e:'🏢',label:'Estrutura Corporativa',color:'#8b5cf6'},
        {e:'📊',label:'Comparar Cenários',color:'#ec4899'},
        {e:'💬',label:'Pergunta Livre',color:'#64748b'},
      ] },
  ],
  es: [
    { icon:'💰', bg:'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.38) 0%, transparent 70%)',
      title:'Bienvenido a WizeTax', sub:'Tu asesor tributario global con IA',
      features:[{e:'🌍',t:'Planificación fiscal para israelíes en el mundo'},{e:'⚖️',t:'Optimización legal para reducir tu carga tributaria'},{e:'💬',t:'Preguntas fiscales en cualquier idioma'}] },
    { icon:'🗺️', bg:'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.35) 0%, transparent 70%)',
      title:'Impuestos Israelíes & Internacionales', sub:'Experto en todas las principales jurisdicciones',
      features:[{e:'🇮🇱',t:'Israel — impuesto sobre la renta, seguro nacional'},{e:'🇺🇸',t:'EE.UU. — FBAR, FATCA, beneficios de tratados'},{e:'🇵🇹',t:'Portugal, Chipre, Dubái y más'}] },
    { icon:'⚖️', bg:'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.32) 0%, transparent 70%)',
      title:'Optimización Tributaria Legal', sub:'Reduce impuestos — totalmente dentro de la ley',
      features:[{e:'🏢',t:'Estructuras corporativas — holding, IP Box'},{e:'📊',t:'Comparación de escenarios: venta, dividendo, liquidación'},{e:'📅',t:'Timing de eventos fiscales — cuándo vender, cuándo esperar'}] },
    { icon:'🔐', bg:'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.3) 0%, transparent 70%)',
      title:'Total Discreción', sub:'Tus conversaciones permanecen completamente privadas',
      features:[{e:'🔒',t:'Sin datos personales almacenados en servidores externos'},{e:'⚠️',t:'WizeTax es una herramienta informativa — no reemplaza a un asesor tributario'},{e:'✅',t:'100% legal — optimización dentro de la ley'}] },
    { icon:'🚀', bg:'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.3) 0%, transparent 70%)',
      title:'¿Por dónde quieres empezar?', sub:'Elige un tema para tu primera pregunta',
      actions:[
        {e:'🇮🇱',label:'Impuesto Israelí',color:'#f59e0b'},
        {e:'🇺🇸',label:'Impuesto Americano',color:'#3b82f6'},
        {e:'🇵🇹',label:'Portugal / Chipre',color:'#10b981'},
        {e:'🏢',label:'Estructura Corporativa',color:'#8b5cf6'},
        {e:'📊',label:'Comparar Escenarios',color:'#ec4899'},
        {e:'💬',label:'Pregunta Libre',color:'#64748b'},
      ] },
  ],
};

const LABELS: Record<string, {skip:string;next:string;start:string}> = {
  he: {skip:'דלג',next:'הבא →',start:'✓ בואו נתחיל'},
  en: {skip:'Skip',next:'Next →',start:"✓ Let's Start"},
  pt: {skip:'Pular',next:'Próximo →',start:'✓ Vamos Começar'},
  es: {skip:'Saltar',next:'Siguiente →',start:'✓ ¡Empecemos'},
};

export function WizeOnboarding() {
  const OB_KEY = 'wl_ob_tax';
  const COLOR  = '#f59e0b';
  const [show, setShow]   = useState(false);
  const [step, setStep]   = useState(0);
  const [lang, setLang]   = useState<Lang>('he');
  const touchX = useRef(0);

  useEffect(() => {
    const l = (localStorage.getItem('wl_lang') as Lang) || 'he';
    setLang(l);
    // Onboarding disabled by default — full-screen takeover is excessive.
    // Users can still open via the ? button at bottom-left.
    // if (!localStorage.getItem(OB_KEY)) setShow(true);
  }, []);

  const slides = SLIDES[lang] || SLIDES.he;
  const lb     = LABELS[lang] || LABELS.he;
  const total  = slides.length;
  const isLast = step === total - 1;
  const s      = slides[step];
  const isRtl  = lang === 'he';

  const finish = useCallback(() => {
    localStorage.setItem(OB_KEY, '1');
    setShow(false);
    setStep(0);
  }, []);

  const next = () => { if (step < total - 1) setStep(s => s + 1); else finish(); };
  const prev = () => { if (step > 0) setStep(s => s - 1); };

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 50) { isRtl ? (dx > 0 ? prev() : next()) : (dx < 0 ? next() : prev()); }
  };

  // ? button always visible
  const HelpBtn = () => (
    <button onClick={() => { setStep(0); setShow(true); }}
      style={{position:'fixed',bottom:20,right:20,zIndex:9997,width:32,height:32,borderRadius:'50%',
        background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.4)',
        color:COLOR,fontSize:14,fontWeight:700,cursor:'pointer',lineHeight:'1',fontFamily:'inherit'}}>?</button>
  );

  if (!show) return <HelpBtn />;

  return (
    <>
      <HelpBtn />
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{position:'fixed',inset:0,zIndex:99998,background:'#060a14',overflow:'hidden',
          fontFamily:'Inter,-apple-system,sans-serif',direction:isRtl?'rtl':'ltr'}}>

        {/* Progress bar */}
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'rgba(255,255,255,0.08)',zIndex:3}}>
          <div style={{height:'100%',background:`linear-gradient(90deg,${COLOR},#d97706)`,
            width:`${(step+1)/total*100}%`,transition:'width 0.4s ease'}}/>
        </div>

        {/* Top bar */}
        <div style={{position:'absolute',top:3,left:0,right:0,zIndex:3,display:'flex',
          justifyContent:'space-between',alignItems:'center',padding:'12px 20px'}}>
          <button onClick={finish}
            style={{background:'rgba(255,255,255,0.08)',border:'none',borderRadius:20,
              color:'rgba(255,255,255,0.5)',fontSize:13,cursor:'pointer',padding:'6px 14px',fontFamily:'inherit'}}>
            {lb.skip}
          </button>
          <span style={{color:'rgba(255,255,255,0.3)',fontSize:13}}>{step+1} / {total}</span>
        </div>

        {/* Slide */}
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',
          alignItems:'center',justifyContent:'center',padding:'80px 28px 120px',boxSizing:'border-box'}}>

          {/* Glow */}
          <div style={{position:'absolute',inset:0,background:s.bg,pointerEvents:'none'}}/>

          {/* Icon */}
          <div style={{width:96,height:96,borderRadius:28,background:'rgba(255,255,255,0.07)',
            border:'1px solid rgba(255,255,255,0.12)',display:'flex',alignItems:'center',
            justifyContent:'center',fontSize:'3rem',marginBottom:28,backdropFilter:'blur(4px)',flexShrink:0,zIndex:1}}>
            {s.icon}
          </div>

          <h2 style={{color:'#fff',fontSize:'1.5rem',fontWeight:700,textAlign:'center',
            margin:'0 0 12px',lineHeight:1.3,zIndex:1}}>{s.title}</h2>
          <p style={{color:'rgba(255,255,255,0.55)',fontSize:'1rem',textAlign:'center',
            lineHeight:1.7,margin:'0 0 32px',maxWidth:340,zIndex:1}}>{s.sub}</p>

          {s.actions ? (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,
              width:'100%',maxWidth:360,zIndex:1}}>
              {s.actions.map((a,i) => (
                <button key={i} onClick={finish}
                  style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                    gap:8,borderRadius:16,padding:'18px 12px',cursor:'pointer',
                    border:`1px solid ${a.color}44`,background:`${a.color}18`,
                    color:'white',fontFamily:'inherit',transition:'transform 0.15s'}}>
                  <span style={{fontSize:'1.6rem',lineHeight:1}}>{a.e}</span>
                  <span style={{fontSize:12,fontWeight:600,textAlign:'center',lineHeight:1.3}}>{a.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:10,width:'100%',maxWidth:360,zIndex:1}}>
              {s.features?.map((f,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,
                  background:'rgba(255,255,255,0.06)',borderRadius:10,padding:'10px 14px',
                  fontSize:14,color:'rgba(255,255,255,0.85)',border:'1px solid rgba(255,255,255,0.08)'}}>
                  <span style={{fontSize:'1.2rem',flexShrink:0}}>{f.e}</span>
                  <span>{f.t}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'0 24px 36px',
          display:'flex',gap:12,alignItems:'center',zIndex:3}}>
          {step > 0 && (
            <button onClick={prev}
              style={{width:50,height:50,borderRadius:'50%',background:'rgba(255,255,255,0.08)',
                border:'1px solid rgba(255,255,255,0.15)',color:'white',fontSize:22,
                cursor:'pointer',flexShrink:0,fontFamily:'inherit'}}>
              {'←'}
            </button>
          )}
          {!isLast && (
            <button onClick={next}
              style={{flex:1,height:52,borderRadius:14,
                background:`linear-gradient(135deg,${COLOR},#d97706)`,
                border:'none',color:'white',fontWeight:700,fontSize:16,
                cursor:'pointer',fontFamily:'inherit'}}>
              {lb.next}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function decodeWlToken(token: string): { email?: string } | null {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const p = JSON.parse(atob(b64));
    return { email: p.email };
  } catch { return null; }
}

export function WizeBar() {
  const [wlBarLight, setWlBarLight] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('light') || document.documentElement.getAttribute('data-theme') === 'light';
  });
  useEffect(() => {
    const sync = () => {
      const t = document.documentElement.getAttribute('data-theme');
      setWlBarLight(t === 'light');
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const [allTools, setAllTools] = useState('← כל הכלים');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [sso, setSso] = useState<{ nick?: string; email?: string; plan?: string } | null>(null);

  useEffect(() => {
    const l = localStorage.getItem('wl_lang') || 'he';
    const labels: Record<string, string> = {
      he: '← כל הכלים', en: '← All Tools',
      pt: '← Todas as ferramentas', es: '← Todas las herramientas',
    };
    setAllTools(labels[l] || '← All Tools');
    const unsub = onAuth((u) => { setUser(u); setAuthReady(true); });

    try {
      const p = new URLSearchParams(window.location.search);
      const t = p.get('wl_token');
        const planParam = p.get('wl_plan');
        if (planParam && ['pro','yolo','free'].includes(planParam)) {
          localStorage.setItem('wl_plan', planParam);
        }
      const n = p.get('wl_nick');
      if (t || n) {
        const stored: Record<string,string> = JSON.parse(localStorage.getItem('wl_sso') || '{}');
        if (t) { stored.token = t; const d = decodeWlToken(t); if (d?.email) stored.email = d.email; }
        if (n) stored.nick = decodeURIComponent(n);
        localStorage.setItem('wl_sso', JSON.stringify(stored));
        const url = new URL(window.location.href);
        url.searchParams.delete('wl_token'); url.searchParams.delete('wl_nick');
        window.history.replaceState({}, '', url.toString());
      }
      const s: Record<string,string> = JSON.parse(localStorage.getItem('wl_sso') || '{}');
      if (s.token) {
        setSso({ nick: s.nick, email: s.email, plan: s.plan });
        if (!s.plan || !s.uid) {
          try {
            const b64 = s.token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
            const payload = JSON.parse(atob(b64));
            const uid = payload.user_id || payload.sub;
            if (uid) {
              fetch(`https://firestore.googleapis.com/v1/projects/finzilla-7f1f9/databases/(default)/documents/users/${uid}`,
                { headers: { Authorization: `Bearer ${s.token}` } })
                .then(r => r.json())
                .then(doc => {
                  const plan = doc.fields?.plan?.stringValue || 'free';
                  const updated: Record<string,string> = JSON.parse(localStorage.getItem('wl_sso') || '{}');
                  updated.plan = plan; updated.uid = uid;
                  localStorage.setItem('wl_sso', JSON.stringify(updated));
                  setSso(prev => prev ? { ...prev, plan } : prev);
                }).catch(() => {});
            }
          } catch {}
        }
      }
    } catch {}

    return unsub;
  }, []);

  const btnStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    border: 'none', borderRadius: 6, padding: '3px 10px', lineHeight: '20px',
    whiteSpace: 'nowrap',
  };

  const displayName = user ? (user.displayName || user.email) : (sso?.nick || sso?.email);
  const isConnected = !!(user || sso);

  return (
    <div className="wl-bar-react" style={{position:'fixed',top:0,left:0,right:0,height:36,zIndex:99999,background:'rgba(5,6,15,0.96)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',fontFamily:'Inter,-apple-system,sans-serif',boxSizing:'border-box',direction:'ltr'}}>
      <a href="https://finsightai.github.io/wizelife/dashboard.html" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none',lineHeight:1}}>
        <svg width="20" height="20" viewBox="0 0 100 100" style={{flexShrink:0}}><defs><linearGradient id="wlbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#wlbg)"/><text x="50" y="72" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="58" fill="white">W</text></svg>
        <span style={{fontSize:13,fontWeight:800,color:'#eef2ff',letterSpacing:'-0.3px',fontFamily:'Plus Jakarta Sans, sans-serif'}}>WizeLife</span>
        <span style={{fontSize:11,fontWeight:600,color:'#f59e0b',background:'rgba(245,158,11,0.12)',padding:'2px 8px',borderRadius:99,lineHeight:1.4}}>WizeTax</span>
      </a>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        
        {authReady && isConnected && (
          <div style={{display:'flex',alignItems:'center',gap:5,padding:'3px 10px 3px 7px',borderRadius:99,background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.25)'}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 6px #22c55e',flexShrink:0}}/>
            <span style={{fontSize:11,fontWeight:700,color:'#86efac',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {displayName || 'מחובר'}
              {(()=>{const p=user?null:sso?.plan;return p&&p!=='free'?<span style={{marginLeft:4,color:p==='yolo'?'#fbbf24':'#a78bfa'}}>{p==='yolo'?'⚡':'💎'}</span>:null;})()}
            </span>
            {user && <button onClick={() => signOut()} style={{...btnStyle,background:'none',color:'#6b7280',padding:'0 0 0 4px',fontSize:10}}>✕</button>}
          </div>
        )}
        {authReady && !isConnected && (
          <a href="https://wizelife.ai/auth.html" style={{...btnStyle,background:'rgba(245,158,11,0.15)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.3)',textDecoration:'none',display:'inline-flex',alignItems:'center'}}>
            Sign in
          </a>
        )}
        <a href="https://finsightai.github.io/wizelife/dashboard.html" style={{fontSize:12,color:'#7b88ad',textDecoration:'none',fontWeight:500,whiteSpace:'nowrap'}}>{allTools}</a>
      </div>
    </div>
  );
}
