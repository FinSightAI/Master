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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
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
