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
                reg.addEventListener('updatefound', () => {
                  const sw = reg.installing;
                  if (!sw) return;
                  sw.addEventListener('statechange', () => {
                    if (sw.state==='installed' && navigator.serviceWorker.controller) {
                      try { sw.postMessage({type:'SKIP_WAITING'}); } catch(e){}
                    }
                  });
                });
                let _r=false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                  if (_r) return; _r=true;
                  const safe=()=>{const a=document.activeElement;const t=a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.isContentEditable);if(!t) location.reload();};
                  if (document.visibilityState==='hidden') return location.reload();
                  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') location.reload(); else safe(); });
                  setTimeout(safe, 30*60*1000);
                });
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
        <Script src="https://wizelife.ai/js/wize-disclaimer.js" strategy="afterInteractive" />
        <Script id="wize-disclaimer-gate" strategy="afterInteractive">{`
          window.addEventListener('load', function(){
            setTimeout(function(){
              if (window.WizeDisclaimer) {
                WizeDisclaimer.gate({ app: 'tax' }).catch(function(){});
                /* Persistent slim amber banner — always visible, can't be
                   dismissed. Reinforces "not licensed tax advice". */
                try { WizeDisclaimer.showProfessionalDisclaimer({ app: 'tax' }); } catch(e){}
              }
            }, 600);
          });
        `}</Script>
        <Script src="/wize-bottom-nav.js" strategy="afterInteractive" />
        <Script src="/wize-onboarding.js" strategy="afterInteractive" />
        <Script src="/wize-hamburger.js" strategy="afterInteractive" />
        <Script src="/payslip-extractor.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
