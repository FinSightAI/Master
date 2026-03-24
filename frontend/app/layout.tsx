import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tax Master AI - Global Tax Advisor',
  description: 'AI-powered international tax advisor for optimal tax planning across all jurisdictions',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="auto">
      <body>{children}</body>
    </html>
  );
}
