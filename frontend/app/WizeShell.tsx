'use client';

import { useState, ReactNode } from 'react';

type NavItem = { id: string; label: string; icon: ReactNode; };

const NAV_ITEMS: NavItem[] = [
  { id: 'advisor', label: 'AI Advisor', icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>) },
  { id: 'compare', label: 'Country Compare', icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>) },
  { id: 'income', label: 'Income Sim', icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>) },
  { id: 'timeline', label: 'Tax Timeline', icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>) },
];

export default function WizeShell({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<string>('advisor');

  const handleNav = (id: string) => {
    setActive(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wize-nav', { detail: { view: id } }));
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 36px)', background: '#030508', color: '#eef2ff' }}>
      <aside className="wl-tax-sidebar" style={{
        width: 220, flexShrink: 0,
        background: '#060810',
        borderLeft: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 36, alignSelf: 'flex-start',
        height: 'calc(100vh - 36px)', overflowY: 'auto'
      }}>
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 13, fontWeight: 800, letterSpacing: '-0.3px', color: '#eef2ff' }}>
            Wize<span style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Tax</span>
          </div>
        </div>
        <div style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', padding: '14px 16px 4px' }}>
          כלים
        </div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => handleNav(item.id)}
            type="button"
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 16px', fontSize: 12.5,
              color: active === item.id ? '#fbbf24' : 'rgba(255,255,255,0.5)',
              background: active === item.id ? 'rgba(245,158,11,0.1)' : 'transparent',
              cursor: 'pointer', transition: 'all 0.15s',
              border: 'none', fontFamily: 'inherit',
              textAlign: 'right', width: '100%', direction: 'rtl'
            }}
          >
            <span style={{ width: 15, height: 15, flexShrink: 0, display: 'inline-flex' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: 11, color: '#6b7280', textAlign: 'right' }}>
          <strong style={{ color: '#eef2ff', display: 'block', marginBottom: 2 }}>WizeTax</strong>
          Global Tax Advisor
        </div>
      </aside>
      <main style={{ flex: 1, minWidth: 0 }}>
        {children}
      </main>
      <style>{`
        @media (max-width: 768px) {
          .wl-tax-sidebar { display: none !important; }
        }
      `}</style>
    </div>
  );
}
