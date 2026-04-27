import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import ThemeToggle from './theme-toggle';

export const metadata: Metadata = {
  title: 'WizeTax — Global Tax Advisor',
  description: 'AI-powered international tax advisor for optimal tax planning across all jurisdictions. Part of WizeLife.',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

'use client';
import { useEffect, useState } from 'react';

function WizeOnboarding() {
  const [show, setShow] = useState(false);
  const OB_KEY = 'wl_ob_tax';
  const lang = typeof window !== 'undefined' ? (localStorage.getItem('wl_lang') || 'he') : 'he';
  const OB: Record<string, {title:string,sub:string,features:string[],btn:string,nosee:string}> = {
    he: { title:'ברוך הבא ל-WizeTax', sub:'ייעוץ מס גלובלי חכם', features:['🌍 תכנון מס לישראלים בחו"ל ובארץ','⚖️ אופטימיזציה חוקית להפחתת מס','💬 שאלות מס בעברית, אנגלית ועוד'], btn:'בואו נתחיל ←', nosee:'אל תציג שוב בהפעלה' },
    en: { title:'Welcome to WizeTax', sub:'Smart global tax advisory', features:['🌍 Tax planning for Israelis abroad & at home','⚖️ Legal tax optimization strategies','💬 Tax questions in any language'], btn:'Get started →', nosee:"Don't show on startup" },
  };
  const t = OB[lang] || OB.he;
  const isRtl = lang === 'he';
  useEffect(() => { if (!localStorage.getItem(OB_KEY)) setShow(true); }, []);
  if (!show) return (
    <button onClick={() => setShow(true)} style={{position:'fixed',bottom:20,right:20,zIndex:9997,width:32,height:32,borderRadius:'50%',background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.4)',color:'#f59e0b',fontSize:14,fontWeight:700,cursor:'pointer',lineHeight:1}}>?</button>
  );
  return (
    <div style={{position:'fixed',inset:0,zIndex:99998,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:'Inter,-apple-system,sans-serif',direction:isRtl?'rtl':'ltr'}}>
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

function WizeBar() {
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,height:36,zIndex:99999,background:'rgba(5,6,15,0.96)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',fontFamily:'Inter,-apple-system,sans-serif',boxSizing:'border-box',direction:'ltr'}}>
      <a href="https://finsightai.github.io/wizelife/dashboard.html" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none',lineHeight:1}}>
        <svg width="20" height="20" viewBox="0 0 100 100" style={{flexShrink:0}}><defs><linearGradient id="wlbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#wlbg)"/><text x="50" y="72" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="58" fill="white">W</text></svg>
        <span style={{fontSize:13,fontWeight:700,color:'#eef2ff',letterSpacing:'-0.3px'}}>WizeLife</span>
        <span style={{fontSize:11,fontWeight:600,color:'#f59e0b',background:'rgba(245,158,11,0.12)',padding:'2px 8px',borderRadius:99,lineHeight:1.4}}>WizeTax</span>
      </a>
      <a href="https://finsightai.github.io/wizelife/dashboard.html" style={{fontSize:12,color:'#7b88ad',textDecoration:'none',fontWeight:500,whiteSpace:'nowrap'}}>כל הכלים →</a>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ margin: 0, padding: 0, paddingTop: 36, overflow: 'hidden' }}>
        <WizeBar />
        <WizeOnboarding />
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-3W9ZZ0008E" strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-3W9ZZ0008E');
        `}</Script>
        {children}
        <ThemeToggle />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
          }
        `}} />
      </body>
    </html>
  );
}
