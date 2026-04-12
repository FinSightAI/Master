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
      style={{
        position: 'fixed', bottom: 16, left: 16, zIndex: 9999,
        width: 36, height: 36, borderRadius: '50%',
        background: 'var(--surface)', border: '1px solid var(--border)',
        color: 'var(--text-muted)', fontSize: 16,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {light ? '🌙' : '☀️'}
    </button>
  );
}
