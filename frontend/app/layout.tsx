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
            window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
          }
        `}</Script>
      </body>
    </html>
  );
}
