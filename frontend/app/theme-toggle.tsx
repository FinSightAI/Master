'use client';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('wl_theme');
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      setLight(true);
    }
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    if (next) document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('wl_theme', next ? 'light' : 'dark');
  }

  return (
    <button
      onClick={toggle}
      title="Toggle theme"
      className="wl-theme-btn"
      style={{
        position: 'fixed', bottom: 18, left: 18, zIndex: 9999,
        width: 38, height: 38, borderRadius: '50%',
        background: light ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.85)',
        backdropFilter: 'blur(12px)',
        border: light ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.12)',
        color: light ? '#475569' : '#cbd5e1',
        fontSize: 15, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: light ? '0 4px 16px rgba(0,0,0,0.08)' : '0 4px 16px rgba(0,0,0,0.25)',
        transition: 'all .18s ease',
      }}
    >
      {light ? '🌙' : '☀️'}
    </button>
  );
}
