import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import ThemeToggle from './theme-toggle';

export const metadata: Metadata = {
  title: 'Tax Master AI - Global Tax Advisor',
  description: 'AI-powered international tax advisor for optimal tax planning across all jurisdictions',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-MPRTN6CJ9K" strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-MPRTN6CJ9K');
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
