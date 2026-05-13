'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReportsRedirect() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('wize-initial-view', 'reports');
    }
    router.replace('/advisor');
  }, [router]);
  return <div style={{minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'}}>Loading reports…</div>;
}
