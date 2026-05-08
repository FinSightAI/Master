import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin','latin-ext'], variable: '--font-inter' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin','latin-ext'], weight: ['500','600','700','800'], variable: '--font-jakarta' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400','500','600'], variable: '--font-mono' });
import Script from 'next/script';
import './globals.css';
import ThemeToggle from './theme-toggle';
import { WizeBar, WizeOnboarding } from './wize-ui';

export const metadata: Metadata = {
  title: 'WizeTax — Global Tax Advisor',
  description: 'AI-powered international tax advisor for optimal tax planning across all jurisdictions. Part of WizeLife.',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${inter.variable} ${jakarta.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <Script id="wl_theme-early" strategy="beforeInteractive">{`(function(){try{var t=localStorage.getItem('wl_theme');var isLight=t==='light';var de=document.documentElement;de.setAttribute('data-theme',isLight?'light':'dark');if(isLight){de.classList.remove('dark');de.classList.add('light');if(document.body){document.body.classList.add('light');document.body.classList.remove('dark');}document.addEventListener('DOMContentLoaded',function(){document.body.classList.add('light');document.body.classList.remove('dark');});}else{de.classList.add('dark');de.classList.remove('light');}}catch(e){}})();`}</Script>
      </head>
      <body style={{ margin: 0, padding: 0, paddingTop: 36, overflow: 'hidden' }} suppressHydrationWarning>
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
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').then(reg => {
                const showBanner = (newSW) => {
                  if (document.getElementById('wl-sw-update-banner')) return;
                  const lang = (function(){try{return localStorage.getItem('wl_lang')||'he'}catch(e){return 'he'}})();
                  const T = ({he:{m:'גרסה חדשה זמינה ✨',b:'עדכן'},en:{m:'New version available ✨',b:'Update'},pt:{m:'Nova versão ✨',b:'Atualizar'},es:{m:'Nueva versión ✨',b:'Actualizar'}})[lang]||{m:'New version',b:'Update'};
                  const bar = document.createElement('div');
                  bar.id='wl-sw-update-banner';
                  bar.style.cssText='position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 16px;border-radius:99px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;font:600 13px Inter,sans-serif;box-shadow:0 8px 24px rgba(245,158,11,.4);display:flex;align-items:center;gap:10px';
                  bar.innerHTML='<span>'+T.m+'</span><button style="background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff;padding:4px 12px;border-radius:99px;font:700 12px inherit;cursor:pointer">'+T.b+'</button><button style="background:transparent;border:0;color:rgba(255,255,255,.7);font-size:18px;cursor:pointer;padding:0 4px">×</button>';
                  document.body.appendChild(bar);
                  const btns = bar.querySelectorAll('button');
                  btns[0].onclick=()=>newSW.postMessage({type:'SKIP_WAITING'});
                  btns[1].onclick=()=>bar.remove();
                };
                reg.addEventListener('updatefound', () => {
                  const sw = reg.installing;
                  if (!sw) return;
                  sw.addEventListener('statechange', () => {
                    if (sw.state==='installed' && navigator.serviceWorker.controller) showBanner(sw);
                  });
                });
                let _r=false;
                navigator.serviceWorker.addEventListener('controllerchange', () => { if(!_r){_r=true;location.reload();} });
                setInterval(()=>{try{reg.update()}catch(e){}}, 5*60*1000);
                window.addEventListener('focus', ()=>{try{reg.update()}catch(e){}});
              }).catch(()=>{});
            });
          }
        `}</Script>
        <Script id="ms-clarity" strategy="afterInteractive">{`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "wnvlwv7gu0");
        `}</Script>
      </body>
    </html>
  );
}
