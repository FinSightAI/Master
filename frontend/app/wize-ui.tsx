'use client';
import { useEffect, useState } from 'react';
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


export function WizeOnboarding() {
  // The full-screen onboarding flow lives in the shared /wize-onboarding.js
  // script (loaded in layout.tsx). The React component used to render its
  // own broken modal — final-slide action buttons all called finish() and
  // never navigated anywhere. Replaced with just a ? help button that
  // re-triggers the shared (working) flow.
  const COLOR = '#f59e0b';
  return (
    <button
      aria-label="Help"
      onClick={() => {
        const w = window as unknown as { WizeOnboarding?: { show?: (id: string) => void } };
        if (w.WizeOnboarding && typeof w.WizeOnboarding.show === 'function') {
          try { localStorage.removeItem('wl_ob_tax'); } catch {}
          w.WizeOnboarding.show('tax');
        }
      }}
      style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 9997,
        width: 32, height: 32, borderRadius: '50%',
        background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)',
        color: COLOR, fontSize: 14, fontWeight: 700, cursor: 'pointer',
        lineHeight: '1', fontFamily: 'inherit',
      }}
    >
      ?
    </button>
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

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [sso, setSso] = useState<{ nick?: string; email?: string; plan?: string } | null>(null);

  useEffect(() => {
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

  const rawIdentity = user ? (user.displayName || user.email) : (sso?.nick || sso?.email);
  let displayName = rawIdentity && rawIdentity.includes('@') && !user?.displayName
    ? rawIdentity.split('@')[0]
    : rawIdentity;
  // First name only — "John Doe" -> "John"
  if (displayName && /\s/.test(displayName)) displayName = displayName.split(/\s+/)[0];
  const isConnected = !!(user || sso);

  return (
    <div className="wl-bar-react" style={{position:'fixed',top:0,left:0,right:0,height:36,zIndex:99999,background:'rgba(5,6,15,0.96)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',fontFamily:'Inter,-apple-system,sans-serif',boxSizing:'border-box',direction:'ltr'}}>
      <a href="https://finsightai.github.io/wizelife/dashboard.html" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none',lineHeight:1}}>
        <img src="https://wizelife.ai/assets/wizelife-icon.png?v=2026-05-14" width="20" height="20" alt="" style={{flexShrink:0,display:"block"}} />
        <span style={{fontSize:13,fontWeight:800,color:'#eef2ff',letterSpacing:'-0.3px',fontFamily:'Plus Jakarta Sans, sans-serif'}}>WizeLife</span>
        <span style={{fontSize:11,fontWeight:600,color:'#f59e0b',background:'rgba(245,158,11,0.12)',padding:'2px 8px',borderRadius:99,lineHeight:1.4}}>WizeTax</span>
      </a>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{display:'flex',gap:2,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:8,padding:3}}>
          {(['HE','EN','PT','ES'] as const).map(L => {
            const v = L.toLowerCase();
            const active = (typeof window !== 'undefined' && (localStorage.getItem('wl_lang') || 'he') === v);
            return (
              <button key={L} data-wl-lang={v}
                onClick={() => { localStorage.setItem('wl_lang', v); location.reload(); }}
                style={{background:active?'rgba(99,102,241,0.18)':'none',border:'none',color:active?'#a5b4fc':'#7b88ad',padding:'3px 8px',borderRadius:6,fontSize:11,fontWeight:700,cursor:'pointer',letterSpacing:.4}}>
                {L}
              </button>
            );
          })}
        </div>

        
        {authReady && isConnected && (
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            {(() => {
              const p = sso?.plan || (user ? 'free' : null);
              if (!p) return null;
              const c = p === 'yolo' ? '#fbbf24' : p === 'pro' ? '#34d399' : '#a5b4fc';
              const bg = p === 'yolo' ? 'rgba(245,158,11,0.18)' : p === 'pro' ? 'rgba(16,185,129,0.18)' : 'rgba(99,102,241,0.15)';
              const lbl = p === 'yolo' ? '⚡ YOLO' : p === 'pro' ? '✦ PRO' : 'FREE';
              return <span style={{fontSize:10,fontWeight:800,letterSpacing:.4,padding:'3px 9px',borderRadius:99,background:bg,color:c,border:`1px solid ${c}55`,whiteSpace:'nowrap'}}>{lbl}</span>;
            })()}
            <div style={{display:'flex',alignItems:'center',gap:5,padding:'3px 10px 3px 7px',borderRadius:99,background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.25)'}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 6px #22c55e',flexShrink:0}}/>
              <span style={{fontSize:11,fontWeight:700,color:'#86efac',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {displayName || 'מחובר'}
              </span>
              {user && <button onClick={() => signOut()} style={{...btnStyle,background:'none',color:'#6b7280',padding:'0 0 0 4px',fontSize:10}}>✕</button>}
            </div>
          </div>
        )}
        {authReady && !isConnected && (
          <a href="https://wizelife.ai/auth.html" style={{...btnStyle,background:'rgba(245,158,11,0.15)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.3)',textDecoration:'none',display:'inline-flex',alignItems:'center'}}>
            Sign in
          </a>
        )}      </div>
    </div>
  );
}
