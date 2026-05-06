import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin','latin-ext'], variable: '--font-inter' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin','latin-ext'], weight: ['500','600','700','800'], variable: '--font-jakarta' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400','500','600'], variable: '--font-mono' });
import Script from 'next/script';
import './globals.css';
import ThemeToggle from './theme-toggle';
import { WizeBar, WizeOnboarding } from './wize-ui';
import WizeShell from './WizeShell';

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
    <html lang="he" dir="rtl" className={`${inter.variable} ${jakarta.variable} ${mono.variable}`}>
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
        <WizeShell>{children}</WizeShell>
        <ThemeToggle />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
          }
        `}} />
      
        <a href="https://wizelife.ai/wize-ai.html" target="_blank" rel="noopener noreferrer"
           id="wl-ai-fab" aria-label="WizeAI"
           style={{position:'fixed',bottom:22,right:22,width:52,height:52,borderRadius:'50%',
             background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',
             boxShadow:'0 8px 28px rgba(99,102,241,0.45)',
             display:'flex',alignItems:'center',justifyContent:'center',
             textDecoration:'none',zIndex:9990,transition:'all .18s ease'}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a8 8 0 0 1 8 8c0 3-1.5 5.5-4 7l-4 2-4-2c-2.5-1.5-4-4-4-7a8 8 0 0 1 8-8z"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/><path d="M9 14s1 1.5 3 1.5 3-1.5 3-1.5"/></svg>
        </a>
      </body>
    </html>
  );
}
