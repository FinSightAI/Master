'use client';
import { useEffect, useState } from 'react';

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
          {l === 'he' ? 'עב' : l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function WizeOnboarding() {
  const [show, setShow] = useState(false);
  const OB_KEY = 'wl_ob_tax';
  const OB: Record<string, {title:string,sub:string,features:string[],btn:string,nosee:string,rtl?:boolean}> = {
    he: { title:'ברוך הבא ל-WizeTax', sub:'ייעוץ מס גלובלי חכם', features:['🌍 תכנון מס לישראלים בחו"ל ובארץ','⚖️ אופטימיזציה חוקית להפחתת מס','💬 שאלות מס בעברית, אנגלית ועוד'], btn:'בואו נתחיל ←', nosee:'אל תציג שוב בהפעלה', rtl:true },
    en: { title:'Welcome to WizeTax', sub:'Smart global tax advisory', features:['🌍 Tax planning for Israelis abroad & at home','⚖️ Legal tax optimization strategies','💬 Tax questions in any language'], btn:'Get started →', nosee:"Don't show on startup" },
    pt: { title:'Bem-vindo ao WizeTax', sub:'Consultoria tributária global inteligente', features:['🌍 Planejamento tributário para brasileiros no mundo','⚖️ Estratégias legais de otimização fiscal','💬 Perguntas sobre impostos em qualquer idioma'], btn:'Vamos lá →', nosee:'Não mostrar na inicialização' },
    es: { title:'Bienvenido a WizeTax', sub:'Asesoría tributaria global inteligente', features:['🌍 Planificación fiscal para hispanos en el mundo','⚖️ Estrategias legales de optimización fiscal','💬 Preguntas sobre impuestos en cualquier idioma'], btn:'Empecemos →', nosee:'No mostrar al iniciar' },
  };
  const [t, setT] = useState(OB.he);
  useEffect(() => {
    const lang = localStorage.getItem('wl_lang') || 'he';
    setT(OB[lang] || OB.he);
    if (!localStorage.getItem(OB_KEY)) setShow(true);
  }, []);
  if (!show) return (
    <button onClick={() => setShow(true)} style={{position:'fixed',bottom:20,right:20,zIndex:9997,width:32,height:32,borderRadius:'50%',background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.4)',color:'#f59e0b',fontSize:14,fontWeight:700,cursor:'pointer',lineHeight:1}}>?</button>
  );
  return (
    <div style={{position:'fixed',inset:0,zIndex:99998,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:'Inter,-apple-system,sans-serif',direction:t.rtl?'rtl':'ltr'}}>
      <div style={{background:'#0d1117',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,padding:36,maxWidth:440,width:'100%',boxShadow:'0 30px 80px rgba(0,0,0,0.6)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
          <svg width="36" height="36" viewBox="0 0 100 100"><defs><linearGradient id="tobg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f59e0b"/><stop offset="1" stopColor="#d97706"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#tobg)"/><text x="50" y="72" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="58" fill="white">W</text></svg>
          <div><div style={{fontSize:18,fontWeight:800,color:'#eef2ff',letterSpacing:'-0.4px'}}>{t.title}</div><div style={{fontSize:13,color:'#6b7280',marginTop:2}}>{t.sub}</div></div>
        </div>
        <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',margin:'20px 0'}}/>
        <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:24}}>
          {t.features.map((f,i) => <div key={i} style={{fontSize:14,color:'#94a3b8'}}>{f}</div>)}
        </div>
        <button onClick={() => { localStorage.setItem(OB_KEY,'1'); setShow(false); }} style={{width:'100%',padding:12,borderRadius:10,background:'#f59e0b',border:'none',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t.btn}</button>
        <label style={{display:'flex',alignItems:'center',gap:8,marginTop:14,fontSize:12,color:'#4b5563',cursor:'pointer'}}>
          <input type="checkbox" onChange={e => { if(e.target.checked) localStorage.setItem(OB_KEY,'1'); else localStorage.removeItem(OB_KEY); }}/> {t.nosee}
        </label>
      </div>
    </div>
  );
}

export function WizeBar() {
  const [allTools, setAllTools] = useState('← כל הכלים');
  useEffect(() => {
    const l = localStorage.getItem('wl_lang') || 'he';
    const labels: Record<string, string> = {
      he: '← כל הכלים', en: '← All Tools',
      pt: '← Todas as ferramentas', es: '← Todas las herramientas',
    };
    setAllTools(labels[l] || '← All Tools');
  }, []);
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,height:36,zIndex:99999,background:'rgba(5,6,15,0.96)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',fontFamily:'Inter,-apple-system,sans-serif',boxSizing:'border-box',direction:'ltr'}}>
      <a href="https://finsightai.github.io/wizelife/dashboard.html" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none',lineHeight:1}}>
        <svg width="20" height="20" viewBox="0 0 100 100" style={{flexShrink:0}}><defs><linearGradient id="wlbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#wlbg)"/><text x="50" y="72" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="58" fill="white">W</text></svg>
        <span style={{fontSize:13,fontWeight:700,color:'#eef2ff',letterSpacing:'-0.3px'}}>WizeLife</span>
        <span style={{fontSize:11,fontWeight:600,color:'#f59e0b',background:'rgba(245,158,11,0.12)',padding:'2px 8px',borderRadius:99,lineHeight:1.4}}>WizeTax</span>
      </a>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <LangSwitcher color="#f59e0b" />
        <a href="https://finsightai.github.io/wizelife/dashboard.html" style={{fontSize:12,color:'#7b88ad',textDecoration:'none',fontWeight:500,whiteSpace:'nowrap'}}>{allTools}</a>
      </div>
    </div>
  );
}
