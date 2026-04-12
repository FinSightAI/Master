import type { Metadata, Viewport } from 'next';
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
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
