'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, Settings, ChevronDown, ChevronUp, Zap,
  RotateCcw, Globe, BarChart3, X, Plus, TrendingDown, History, Clock,
  FileText, Download, Calculator, ClipboardCheck, Building2, Bell, Bookmark, Calendar,
  Swords, Mail, GitCompare, TrendingUp, Shuffle, Home, PiggyBank, Printer, Plane, Award,
  AlertTriangle, CalendarClock, Coins, Landmark, CheckCircle2, CircleDot
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { streamChat, fetchSavings, fetchCountry, analyzeDocument, fetchIsraelAnalysis, fetchCompanyAnalysis, fetchTaxUpdates } from '../../lib/api';
import { UserProfile, ChatMessage, ToolEvent, DEFAULT_PROFILE, TOOL_DISPLAY_NAMES, TOOL_ICONS, SavingsAnalysis, SavedSession, IsraelProfile, DEFAULT_ISRAEL_PROFILE, IsraelAnalysis, CompanyAnalysis, TaxUpdate, Scenario } from '../../lib/types';
import { Lang, useTranslation } from '../../lib/i18n';

// ─── Country Comparison Panel ────────────────────────────────────────────────
const COUNTRIES = [
  { code: 'UAE', name: 'UAE 🇦🇪', flag: '🇦🇪' },
  { code: 'CYPRUS', name: 'Cyprus 🇨🇾', flag: '🇨🇾' },
  { code: 'PORTUGAL', name: 'Portugal 🇵🇹', flag: '🇵🇹' },
  { code: 'MALTA', name: 'Malta 🇲🇹', flag: '🇲🇹' },
  { code: 'SINGAPORE', name: 'Singapore 🇸🇬', flag: '🇸🇬' },
  { code: 'SWITZERLAND', name: 'Switzerland 🇨🇭', flag: '🇨🇭' },
  { code: 'IRELAND', name: 'Ireland 🇮🇪', flag: '🇮🇪' },
  { code: 'ITALY', name: 'Italy 🇮🇹', flag: '🇮🇹' },
  { code: 'GERMANY', name: 'Germany 🇩🇪', flag: '🇩🇪' },
  { code: 'UK', name: 'UK 🇬🇧', flag: '🇬🇧' },
  { code: 'ISRAEL', name: 'Israel 🇮🇱', flag: '🇮🇱' },
  { code: 'GEORGIA', name: 'Georgia 🇬🇪', flag: '🇬🇪' },
  { code: 'THAILAND', name: 'Thailand 🇹🇭', flag: '🇹🇭' },
  { code: 'PANAMA', name: 'Panama 🇵🇦', flag: '🇵🇦' },
  { code: 'PARAGUAY', name: 'Paraguay 🇵🇾', flag: '🇵🇾' },
  { code: 'HONG_KONG', name: 'Hong Kong 🇭🇰', flag: '🇭🇰' },
  { code: 'CAYMAN', name: 'Cayman Islands 🇰🇾', flag: '🇰🇾' },
  { code: 'USA', name: 'USA 🇺🇸', flag: '🇺🇸' },
  { code: 'FRANCE', name: 'France 🇫🇷', flag: '🇫🇷' },
  { code: 'NETHERLANDS', name: 'Netherlands 🇳🇱', flag: '🇳🇱' },
  { code: 'MONACO', name: 'Monaco 🇲🇨', flag: '🇲🇨' },
  { code: 'MALAYSIA', name: 'Malaysia 🇲🇾', flag: '🇲🇾' },
];

function ComparePanel({
  lang, profile, onCompare, onClose
}: {
  lang: Lang;
  profile: UserProfile;
  onCompare: (msg: string) => void;
  onClose: () => void;
}) {
  const tr = useTranslation(lang);
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (code: string) => {
    setSelected(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : prev.length < 5 ? [...prev, code] : prev
    );
  };

  const buildCompareMessage = () => {
    const countries = selected.join(', ');
    const income = Object.entries(profile.income)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}: $${v.toLocaleString()}`)
      .join(', ');
    const assets = Object.entries(profile.assets)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}: $${v.toLocaleString()}`)
      .join(', ');

    if (lang === 'he') {
      return `השווה את המדינות הבאות עבור הפרופיל שלי: ${countries}.
${income ? `הכנסות שנתיות: ${income}.` : ''}
${assets ? `נכסים: ${assets}.` : ''}
לכל מדינה תן: שיעור מס משוקלל, כמה אחסוך לעומת המצב הנוכחי, משטרים מיוחדים שאני זכאי להם, ודרישות עיקריות.
סכם בטבלה ברורה עם המלצה מי הכי טובה עבורי.`;
    }
    return `Compare the following countries for my profile: ${countries}.
${income ? `Annual income: ${income}.` : ''}
${assets ? `Assets: ${assets}.` : ''}
For each country provide: effective tax rate, estimated annual savings vs. my current situation, special regimes I qualify for, and key requirements.
Summarize in a clear table and recommend the best option for me.`;
  };

  return (
    <div className="border-b p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold flex items-center gap-2">
              <BarChart3 size={16} style={{ color: 'var(--accent)' }} />
              {tr.compareTitle}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.compareSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {COUNTRIES.map(c => (
            <button
              key={c.code}
              onClick={() => toggle(c.code)}
              className="px-3 py-1.5 rounded-lg text-sm transition-all font-medium"
              style={{
                background: selected.includes(c.code) ? 'var(--accent)' : 'var(--surface-2)',
                color: selected.includes(c.code) ? 'white' : 'var(--text-muted)',
                border: `1px solid ${selected.includes(c.code) ? 'var(--accent)' : 'var(--border)'}`,
                opacity: !selected.includes(c.code) && selected.length >= 5 ? 0.4 : 1,
              }}
            >
              {c.flag} {c.code.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { onCompare(buildCompareMessage()); onClose(); }}
            disabled={selected.length < 2}
            className="px-5 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-40"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {tr.compareBtn} {selected.length > 0 ? `(${selected.length})` : ''}
          </button>
          {selected.length < 2 && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {lang === 'he' ? 'בחר לפחות 2 מדינות' : 'Select at least 2 countries'}
            </span>
          )}
          {selected.length >= 2 && (
            <div className="flex gap-1">
              {selected.map(c => (
                <span key={c} className="text-xs px-2 py-1 rounded"
                  style={{ background: 'var(--surface-2)', color: 'var(--accent)' }}>
                  {COUNTRIES.find(x => x.code === c)?.flag} {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Profile Panel ────────────────────────────────────────────────────────────
function ProfilePanel({
  lang, profile, setProfile, onSave, onClose
}: {
  lang: Lang;
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const tr = useTranslation(lang);
  const dir = lang === 'he' ? 'rtl' : 'ltr';

  const ILS_TO_USD = 0.27; // ~3.7 ₪ per $1
  const [incomeCurrency, setIncomeCurrency] = useState<'USD' | 'ILS'>('USD');

  const update = (field: keyof UserProfile, value: unknown) =>
    setProfile({ ...profile, [field]: value });

  const updateIncome = (field: string, value: string) => {
    const raw = parseFloat(value) || 0;
    const usd = incomeCurrency === 'ILS' ? Math.round(raw * ILS_TO_USD) : raw;
    setProfile({ ...profile, income: { ...profile.income, [field]: usd } });
  };

  const displayIncome = (usdValue: number) =>
    incomeCurrency === 'ILS' ? Math.round(usdValue / ILS_TO_USD) : usdValue;

  const updateAssets = (field: string, value: string) =>
    setProfile({ ...profile, assets: { ...profile.assets, [field]: parseFloat(value) || 0 } });

  const toggleGoal = (g: string) =>
    setProfile({ ...profile, goals: profile.goals.includes(g) ? profile.goals.filter(x => x !== g) : [...profile.goals, g] });

  const toggleConstraint = (c: string) =>
    setProfile({ ...profile, constraints: profile.constraints.includes(c) ? profile.constraints.filter(x => x !== c) : [...profile.constraints, c] });

  return (
    <div className="border-b overflow-y-auto" dir={dir}
      style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '65vh' }}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Settings size={18} style={{ color: 'var(--accent)' }} />
            {tr.profileTitle}
            <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>
              — {tr.profileSubtitle}
            </span>
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Citizenship */}
          <div className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold mb-3 text-sm">{lang === 'he' ? 'אזרחות ומגורים' : 'Citizenship & Residency'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{tr.citizenships}</label>
                <input type="text" value={profile.citizenships.join(', ')}
                  onChange={e => update('citizenships', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder={tr.citizenshipsPlaceholder}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{tr.currentResidency}</label>
                <input type="text" value={profile.current_residency}
                  onChange={e => update('current_residency', e.target.value)}
                  placeholder={tr.residencyPlaceholder}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={profile.is_us_person}
                  onChange={e => update('is_us_person', e.target.checked)} className="rounded" />
                <span>{tr.usPersonLabel}</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={profile.crypto_long_term}
                  onChange={e => update('crypto_long_term', e.target.checked)} className="rounded" />
                <span>{tr.cryptoLongTermLabel}</span>
              </label>
            </div>
          </div>

          {/* Income */}
          <div className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">{tr.annualIncome}</h3>
              <div className="flex rounded-lg overflow-hidden text-xs" style={{ border: '1px solid var(--border)' }}>
                {(['USD', 'ILS'] as const).map(c => (
                  <button key={c} onClick={() => setIncomeCurrency(c)}
                    className="px-2 py-1 transition-all"
                    style={{
                      background: incomeCurrency === c ? 'var(--accent)' : 'var(--surface)',
                      color: incomeCurrency === c ? 'white' : 'var(--text-muted)',
                      fontWeight: incomeCurrency === c ? 700 : 400,
                    }}>
                    {c === 'USD' ? '$ USD' : '₪ ILS'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {(Object.entries(tr.income) as [string, string][]).map(([field, label]) => (
                <div key={field} className="flex items-center gap-2">
                  <span className="text-xs flex-shrink-0 w-32" style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <div className="flex-1 flex items-center rounded overflow-hidden"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <span className="px-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {incomeCurrency === 'ILS' ? '₪' : '$'}
                    </span>
                    <input type="number"
                      value={displayIncome((profile.income as unknown as Record<string, number>)[field] || 0) || ''}
                      onChange={e => updateIncome(field, e.target.value)}
                      placeholder="0"
                      className="flex-1 px-1 py-1.5 text-sm outline-none"
                      style={{ background: 'transparent', color: 'var(--text)' }} />
                  </div>
                </div>
              ))}
            </div>
            {incomeCurrency === 'ILS' && (
              <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                {lang === 'he' ? '* ערכים מומרים ל-USD לצורך חישוב (₪1 ≈ $0.27)' : '* Values converted to USD for calculation (₪1 ≈ $0.27)'}
              </div>
            )}
          </div>

          {/* Assets */}
          <div className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold mb-3 text-sm">{tr.assets}</h3>
            <div className="space-y-2">
              {(Object.entries(tr.assetFields) as [string, string][]).map(([field, label]) => (
                <div key={field} className="flex items-center gap-2">
                  <span className="text-xs flex-shrink-0 w-32" style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <input type="number"
                    value={(profile.assets as unknown as Record<string, number>)[field] || ''}
                    onChange={e => updateAssets(field, e.target.value)}
                    placeholder="0"
                    className="flex-1 px-2 py-1.5 rounded text-sm outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Goals & Constraints */}
          <div className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold mb-2 text-sm">{tr.goals}</h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {tr.goalOptions.map(g => (
                <button key={g} onClick={() => toggleGoal(g)}
                  className="px-2 py-1 rounded text-xs transition-all"
                  style={{ background: profile.goals.includes(g) ? 'var(--accent)' : 'var(--surface)', color: profile.goals.includes(g) ? 'white' : 'var(--text-muted)', border: `1px solid ${profile.goals.includes(g) ? 'var(--accent)' : 'var(--border)'}` }}>
                  {g}
                </button>
              ))}
            </div>
            <h3 className="font-semibold mb-2 text-sm">{tr.constraints}</h3>
            <div className="flex flex-wrap gap-1.5">
              {tr.constraintOptions.map(c => (
                <button key={c} onClick={() => toggleConstraint(c)}
                  className="px-2 py-1 rounded text-xs transition-all"
                  style={{ background: profile.constraints.includes(c) ? '#ef4444' : 'var(--surface)', color: profile.constraints.includes(c) ? 'white' : 'var(--text-muted)', border: `1px solid ${profile.constraints.includes(c) ? '#ef4444' : 'var(--border)'}` }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-3 rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <label className="text-xs mb-1 block font-semibold">{tr.additionalInfo}</label>
          <textarea value={profile.notes}
            onChange={e => update('notes', e.target.value)}
            placeholder={tr.additionalInfoPlaceholder} rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={onSave}
            className="px-6 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'white' }}>
            {tr.saveProfile}
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
            {tr.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tool Activity ─────────────────────────────────────────────────────────────
function ToolActivity({ tools, lang }: { tools: ToolEvent[]; lang: Lang }) {
  const [expanded, setExpanded] = useState(false);
  const toolStarts = tools.filter(t => t.type === 'tool_start');
  const tr = useTranslation(lang);

  if (toolStarts.length === 0) return null;

  return (
    <div className="mb-3 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs transition-all hover:opacity-80"
        style={{ color: 'var(--text-muted)' }}>
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-yellow-400" />
          <span>{toolStarts.length} {tr.toolsUsed}: {toolStarts.map(t => TOOL_ICONS[t.tool] || '🔧').join(' ')}</span>
        </div>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5">
          {tools.map((t, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span>{TOOL_ICONS[t.tool] || '🔧'}</span>
              <div>
                <span style={{ color: t.type === 'tool_start' ? 'var(--accent)' : 'var(--success)' }}>
                  {t.type === 'tool_start' ? '→ ' : '← '}
                  {TOOL_DISPLAY_NAMES[t.tool] || t.tool}
                </span>
                {t.type === 'tool_start' && t.input && (
                  <span style={{ color: 'var(--text-muted)' }}>
                    {' '}{JSON.stringify(t.input).slice(0, 80)}
                  </span>
                )}
                {t.type === 'tool_result' && t.result_preview && (
                  <div style={{ color: 'var(--text-muted)' }} className="mt-0.5 truncate max-w-md">
                    {t.result_preview}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Country Detail Modal ──────────────────────────────────────────────────────
function CountryDetailModal({ code, savingsRow, lang, onAsk, onClose }: {
  code: string;
  savingsRow: { name: string; estimated_tax: number; annual_savings: number; ten_year_savings: number; effective_rate: number; special_regimes: string[]; territorial: boolean };
  lang: Lang;
  onAsk: (msg: string) => void;
  onClose: () => void;
}) {
  const tr = useTranslation(lang);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [exitTax, setExitTax] = useState<Record<string, unknown>>({});

  useEffect(() => {
    fetchCountry(code).then(r => { setDetail(r.data as Record<string, unknown>); setExitTax(r.exit_tax as Record<string, unknown>); }).catch(() => {});
  }, [code]);

  const fmt = (n: number) => {
    if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}K`;
    return `$${n}`;
  };

  const fmtRate = (v: unknown) => {
    if (v == null) return '—';
    if (typeof v === 'string') return v;
    return `${Math.round((v as number) * 100)}%`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 relative"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
          <X size={18} />
        </button>

        <h2 className="font-bold text-xl mb-1">{savingsRow.name}</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{detail?.region as string}</p>

        {/* Key numbers */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tr.annualSavings}</div>
            <div className="font-bold text-sm" style={{ color: '#10b981' }}>+{fmt(savingsRow.annual_savings)}/yr</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tr.effectiveRate}</div>
            <div className="font-bold text-sm">{savingsRow.effective_rate}%</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tr.tenYearSavings}</div>
            <div className="font-bold text-sm">{fmt(savingsRow.ten_year_savings)}</div>
          </div>
        </div>

        {detail && (
          <>
            {/* Tax rates */}
            <div className="rounded-xl p-4 mb-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <h3 className="font-semibold text-sm mb-3">{lang === 'he' ? 'שיעורי מס' : 'Tax Rates'}</h3>
              <div className="space-y-2">
                {[
                  [tr.incomeTax, detail.personal_income_tax_top ?? detail.personal_income_tax],
                  [tr.capitalGainsTax, detail.capital_gains_tax],
                  [tr.dividendTax, detail.dividend_tax],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-muted)' }}>{label as string}</span>
                    <span className="font-semibold">{fmtRate(val)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>{tr.territorial}</span>
                  <span className="font-semibold">{savingsRow.territorial ? '✅' : '—'}</span>
                </div>
              </div>
            </div>

            {/* Special regimes */}
            {savingsRow.special_regimes.length > 0 && (
              <div className="rounded-xl p-4 mb-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--accent)' }}>✨ {tr.specialRegimes}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {savingsRow.special_regimes.map(r => (
                    <span key={r} className="text-xs px-2 py-1 rounded-full"
                      style={{ background: 'var(--accent)', color: 'white' }}>
                      {r.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Exit tax warning */}
            {exitTax?.note && (
              <div className="rounded-xl p-4 mb-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <div className="font-semibold text-sm mb-1" style={{ color: '#f59e0b' }}>⚠️ Exit Tax</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{exitTax.note as string}</div>
              </div>
            )}

            {/* Notable for */}
            {detail.notable_for && (
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>💡 {detail.notable_for as string}</p>
            )}
          </>
        )}

        <button
          onClick={() => { onAsk(lang === 'he' ? `ספר לי הכל על תושבות מס ב${savingsRow.name} — מה הדרישות, המסים בפועל, ומה צריך לדעת לפני המעבר?` : `Tell me everything about tax residency in ${savingsRow.name} — requirements, actual taxes, and what to know before moving.`); onClose(); }}
          className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
          style={{ background: 'var(--accent)', color: 'white' }}>
          {tr.askAboutCountry}
        </button>
      </div>
    </div>
  );
}

// ─── Exit Tax Calculator Panel ─────────────────────────────────────────────────
function ExitTaxPanel({ lang, profile, savingsData, onClose }: {
  lang: Lang; profile: UserProfile; savingsData: SavingsAnalysis | null; onClose: () => void;
}) {
  const tr = useTranslation(lang);
  const [assets, setAssets] = useState({ ...profile.assets });

  const EXIT_TAXES_DISPLAY: Record<string, { rate: number; note: string }> = {
    GERMANY: { rate: 0.25, note: 'Wegzugsteuer 25%' },
    NETHERLANDS: { rate: 0.249, note: 'Exit tax 24.9%' },
    ISRAEL: { rate: 0.25, note: 'Section 100A 25%' },
    FRANCE: { rate: 0.128, note: 'Exit tax 12.8%' },
    CANADA: { rate: 0.27, note: 'Departure tax 27%' },
    AUSTRALIA: { rate: 0.30, note: 'CGT event I1 30%' },
    SWEDEN: { rate: 0.30, note: 'Exit tax 30%' },
    SPAIN: { rate: 0.23, note: 'Exit tax 23%' },
    NORWAY: { rate: 0.37, note: 'Exit tax 37%' },
    DENMARK: { rate: 0.42, note: 'Exit tax 42%' },
  };

  const fmt = (n: number) => {
    if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}K`;
    return `$${n}`;
  };

  const currentCode = (profile.current_residency || '').toUpperCase().replace(' ', '_');
  const exitInfo = EXIT_TAXES_DISPLAY[currentCode];
  const taxableBase = ((assets.stocks || 0) + (assets.crypto_holdings || 0) + (assets.business_value || 0)) * 0.5;
  const exitTaxAmount = exitInfo ? Math.round(taxableBase * exitInfo.rate) : 0;

  return (
    <div className="border-b overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '65vh' }}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Calculator size={18} style={{ color: 'var(--accent)' }} />
              {tr.exitTaxTitle}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.exitTaxSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {!exitInfo ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>{tr.exitTaxNoData}</div>
        ) : (
          <>
            <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <div className="font-semibold mb-1" style={{ color: '#f59e0b' }}>⚠️ {currentCode} — {exitInfo.note}</div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {lang === 'he' ? 'על 50% מהנכסים הבאים (רווח לא ממומש משוער):' : 'Applied to ~50% of taxable assets (estimated unrealized gain):'}
              </div>
            </div>

            {/* Asset inputs */}
            <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <h3 className="font-semibold text-sm mb-3">{lang === 'he' ? 'ערך נכסים (USD)' : 'Asset Values (USD)'}</h3>
              {(['stocks', 'crypto_holdings', 'business_value'] as const).map(field => (
                <div key={field} className="flex items-center gap-3 mb-2">
                  <label className="text-xs w-36 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {field === 'stocks' ? (lang === 'he' ? 'מניות/ניירות ערך' : 'Stocks/Securities') :
                     field === 'crypto_holdings' ? (lang === 'he' ? 'קריפטו' : 'Crypto') :
                     (lang === 'he' ? 'שווי עסק' : 'Business Value')}
                  </label>
                  <input type="number" value={assets[field] || ''}
                    onChange={e => setAssets(a => ({ ...a, [field]: parseFloat(e.target.value) || 0 }))}
                    className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
              ))}
            </div>

            {/* Result */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl p-4 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{lang === 'he' ? 'בסיס חייב במס' : 'Taxable base'}</div>
                <div className="font-bold text-lg">{fmt(taxableBase)}</div>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <div className="text-xs mb-1" style={{ color: '#ef4444' }}>{lang === 'he' ? 'מס יציאה משוער' : 'Est. exit tax'}</div>
                <div className="font-bold text-lg" style={{ color: '#ef4444' }}>{fmt(exitTaxAmount)}</div>
              </div>
            </div>

            {/* Break-even table */}
            {savingsData && savingsData.results.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                  {tr.netSavingsAfterExit} / {tr.breakEvenYears}
                </div>
                <div className="space-y-1.5" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {savingsData.results.filter(r => r.annual_savings > 0).slice(0, 8).map(r => {
                    const breakEven = r.annual_savings > 0 ? (exitTaxAmount / r.annual_savings).toFixed(1) : '∞';
                    return (
                      <div key={r.code} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <span className="flex-1 font-medium">{r.name}</span>
                        <span style={{ color: '#10b981' }}>+{fmt(r.annual_savings)}/yr</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>
                          {lang === 'he' ? `${breakEven} שנים` : `${breakEven}y`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Savings Panel ─────────────────────────────────────────────────────────────
function SavingsPanel({ lang, profile, onAsk, onDetail, onSavingsLoaded, onClose }: {
  lang: Lang; profile: UserProfile; onAsk: (msg: string) => void;
  onDetail: (code: string, row: { name: string; estimated_tax: number; annual_savings: number; ten_year_savings: number; effective_rate: number; special_regimes: string[]; territorial: boolean }) => void;
  onSavingsLoaded?: (d: SavingsAnalysis) => void;
  onClose: () => void;
}) {
  const tr = useTranslation(lang);
  const [data, setData] = useState<SavingsAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavings(profile)
      .then(d => { setData(d); setLoading(false); onSavingsLoaded?.(d); })
      .catch(() => setLoading(false));
  }, [profile]);

  const fmt = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `$${(n / 1000).toFixed(0)}K`;
    return `$${n.toLocaleString()}`;
  };

  const exportReport = () => {
    if (!data) return;
    const rows = data.results.filter(r => r.annual_savings > 0).slice(0, 10)
      .map((r, i) => `  ${i + 1}. ${r.name.padEnd(20)} ${fmt(r.annual_savings).padStart(10)}/yr   ${r.effective_rate}% effective rate   10yr: ${fmt(r.ten_year_savings)}`)
      .join('\n');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tax Master AI Report</title>
<style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#1a1a1a;line-height:1.6}
h1{color:#6366f1}table{width:100%;border-collapse:collapse;margin:20px 0}
th{background:#6366f1;color:white;padding:8px 12px;text-align:left}
td{padding:8px 12px;border-bottom:1px solid #e5e7eb}tr:hover{background:#f9fafb}
.green{color:#10b981;font-weight:bold}.warn{background:#fff7ed;border:1px solid #f59e0b;padding:12px;border-radius:8px;margin:16px 0}
</style></head><body>
<h1>💰 Tax Master AI — Tax Optimization Report</h1>
<p><strong>Current situation:</strong> ${data.current_country_name} — ${fmt(data.current_tax)}/yr (${data.current_effective_rate}% effective rate)</p>
<p><strong>Total income:</strong> ${fmt(data.total_income)}</p>
${data.exit_tax_info?.note ? `<div class="warn">⚠️ <strong>Exit Tax Warning:</strong> ${data.exit_tax_info.note}</div>` : ''}
<h2>Top Countries by Tax Savings</h2>
<table><tr><th>#</th><th>Country</th><th>Annual Savings</th><th>10-Year</th><th>Effective Rate</th></tr>
${data.results.filter(r => r.annual_savings > 0).slice(0, 10).map((r, i) =>
  `<tr><td>${i + 1}</td><td>${r.name}</td><td class="green">+${fmt(r.annual_savings)}</td><td>${fmt(r.ten_year_savings)}</td><td>${r.effective_rate}%</td></tr>`
).join('')}
</table>
<p style="color:#9ca3af;font-size:12px;margin-top:40px">⚠️ For informational purposes only. Always consult a licensed tax advisor. Generated by Tax Master AI.</p>
</body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500); }
  };

  return (
    <div className="border-b overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '65vh' }}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <TrendingDown size={18} style={{ color: 'var(--accent)' }} />
              {tr.savingsTitle}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.savingsSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {data && !data.error && (
              <button onClick={exportReport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                style={{ background: 'var(--surface-2)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                <Download size={12} />{tr.exportReport}
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
            <div className="text-3xl mb-2">🧮</div>
            <div>{tr.calculating}</div>
          </div>
        )}

        {!loading && data && !data.error && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tr.currentSituation}</div>
                <div className="font-bold">{data.current_country_name || data.current_country || '—'}</div>
                <div className="text-sm">{fmt(data.current_tax)}<span className="text-xs" style={{ color: 'var(--text-muted)' }}>/yr</span></div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{data.current_effective_rate}% {tr.effectiveRate}</div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tr.totalIncome}</div>
                <div className="font-bold">{fmt(data.total_income)}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>/yr</div>
              </div>
              {data.results[0] && (
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tr.bestOption}</div>
                  <div className="font-bold">{data.results[0].name}</div>
                  <div className="text-sm font-bold" style={{ color: '#10b981' }}>+{fmt(data.results[0].annual_savings)}/yr</div>
                </div>
              )}
            </div>

            {/* Exit tax warning */}
            {data.exit_tax_info?.note && (
              <div className="mb-4 rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <div className="font-semibold text-sm mb-0.5" style={{ color: '#f59e0b' }}>⚠️ {tr.exitTaxWarning}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {data.exit_tax_info.note}
                  {data.exit_tax_estimate > 0 && (
                    <span className="font-semibold ml-2" style={{ color: '#f59e0b' }}>
                      {lang === 'he' ? 'הערכה: ' : 'Est: '}{fmt(data.exit_tax_estimate)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Country list */}
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>{tr.topCountries}</div>
            <div className="space-y-1.5" style={{ maxHeight: '260px', overflowY: 'auto' }}>
              {data.results.filter(r => r.annual_savings > 0).slice(0, 15).map((r, i) => (
                <div key={r.code}
                  className="rounded-xl px-3 py-2.5 flex items-center gap-3 cursor-pointer transition-all hover:opacity-80"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                  onClick={() => onDetail(r.code, r)}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: i < 3 ? 'var(--accent)' : 'var(--surface)', color: i < 3 ? 'white' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{r.name}</div>
                    {r.special_regimes.length > 0 && (
                      <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {r.special_regimes[0].replace(/_/g, ' ')}{r.special_regimes.length > 1 ? ` +${r.special_regimes.length - 1}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm" style={{ color: '#10b981' }}>+{fmt(r.annual_savings)}/yr</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmt(r.ten_year_savings)} / 10yr</div>
                  </div>
                  <div className="w-12 text-right flex-shrink-0">
                    <div className="text-sm font-bold" style={{ color: r.effective_rate < 10 ? '#10b981' : r.effective_rate < 25 ? 'var(--accent)' : '#ef4444' }}>
                      {r.effective_rate}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && data?.error && (
          <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
            {lang === 'he'
              ? 'הוסף הכנסות לפרופיל שלך כדי לראות חיסכון אפשרי'
              : 'Add income to your profile to see potential savings'}
          </div>
        )}

        {!loading && !data && (
          <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
            {lang === 'he' ? 'שגיאה בטעינת הנתונים' : 'Error loading data'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Company Structure Optimizer ─────────────────────────────────────────────
function CompanyOptimizer({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const tr = useTranslation(lang);
  const isHe = lang === 'he';
  const [profit, setProfit] = useState(500000);
  const [isNondom, setIsNondom] = useState(false);
  const [preferEu, setPreferEu] = useState(false);
  const [data, setData] = useState<CompanyAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try { setData(await fetchCompanyAnalysis(profit, isNondom, preferEu)); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const fmt = (n: number) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n.toLocaleString()}`;

  return (
    <div className="border-b overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '75vh' }}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Building2 size={18} style={{ color: 'var(--accent)' }} />
              {tr.companyOptimizer}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.companyOptimizerSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs mb-1 block font-medium" style={{ color: 'var(--text-muted)' }}>{tr.annualProfit}</label>
              <input type="number" value={profit} onChange={e => setProfit(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>
            <div className="flex flex-col gap-2 justify-end">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={isNondom} onChange={e => setIsNondom(e.target.checked)} className="rounded" />
                {tr.ownerNonDom}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={preferEu} onChange={e => setPreferEu(e.target.checked)} className="rounded" />
                {tr.preferEu}
              </label>
            </div>
            <div className="flex items-end">
              <button onClick={analyze} disabled={loading}
                className="w-full py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'white' }}>
                {loading ? (isHe ? 'מנתח...' : 'Analyzing...') : tr.analyzeStructure}
              </button>
            </div>
          </div>
        </div>

        {data && (
          <div className="space-y-2">
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
              {isHe ? 'תוצאות — ממוינות לפי שיעור מס אפקטיבי' : 'Results — sorted by effective tax rate'}
            </div>
            {data.results.map((j, i) => (
              <div key={j.code} className="rounded-xl p-3" style={{ background: 'var(--surface-2)', border: `1px solid ${i === 0 ? 'var(--accent)' : 'var(--border)'}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: i === 0 ? 'var(--accent)' : 'var(--surface)', color: i === 0 ? 'white' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      {i + 1}
                    </span>
                    <span className="font-semibold text-sm">{j.name}</span>
                    {j.eu && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>EU</span>}
                    {j.israel_treaty && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>🇮🇱 {isHe ? 'אמנה' : 'Treaty'}</span>}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg" style={{ color: i === 0 ? 'var(--accent)' : 'var(--text)' }}>{j.effective_rate.toFixed(1)}%</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{tr.effectiveRate}</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1 text-xs">
                  {[
                    [tr.corpTax, `${j.corp_tax}%`],
                    [tr.dividendTax, `${j.dividend_tax}%`],
                    [tr.setupCost, fmt(j.setup_cost)],
                    [tr.annualCost, fmt(j.annual_cost)],
                  ].map(([label, val]) => (
                    <div key={label} className="text-center rounded p-1.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <div style={{ color: 'var(--text-muted)' }}>{label}</div>
                      <div className="font-medium">{val}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <div className="flex gap-2">
                    {j.residency_required && <span style={{ color: '#f59e0b' }}>⚠️ {tr.eResidency}</span>}
                    {j.substance_required && <span style={{ color: '#f59e0b' }}>🏢 {tr.substanceRequired}</span>}
                  </div>
                  <div className="font-bold" style={{ color: '#10b981' }}>
                    {tr.netProfit}: {fmt(j.net_profit_after_tax)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tax Updates Feed ─────────────────────────────────────────────────────────
function TaxUpdatesFeed({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const tr = useTranslation(lang);
  const isHe = lang === 'he';
  const [updates, setUpdates] = useState<TaxUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTaxUpdates()
      .then(setUpdates)
      .catch(() => setUpdates([]))
      .finally(() => setLoading(false));
  }, []);

  const typeColor = (type: string) => {
    if (type === 'alert') return { bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.25)', color: '#ef4444', icon: '🚨' };
    if (type === 'positive') return { bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.25)', color: '#10b981', icon: '✅' };
    return { bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.25)', color: '#f59e0b', icon: '📢' };
  };

  return (
    <div className="border-b overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '75vh' }}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Bell size={18} style={{ color: 'var(--accent)' }} />
              {tr.taxUpdatesTitle}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.taxUpdatesSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {loading ? (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>{isHe ? 'טוען...' : 'Loading...'}</div>
        ) : (
          <div className="space-y-2">
            {updates.map((u, i) => {
              const style = typeColor(u.type);
              return (
                <div key={i} className="rounded-xl p-3" style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{style.icon}</span>
                        <span className="text-xs font-bold" style={{ color: style.color }}>{u.country}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          {u.type}
                        </span>
                      </div>
                      <div className="text-sm">{isHe ? u.he : u.en}</div>
                    </div>
                    <div className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{u.date}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Letter Generator ─────────────────────────────────────────────────────────
function LetterGeneratorPanel({
  lang, profile, onClose
}: { lang: Lang; profile: UserProfile; onClose: () => void }) {
  const tr = useTranslation(lang);
  const isHe = lang === 'he';
  const [typeIdx, setTypeIdx] = useState(0);
  const [details, setDetails] = useState('');
  const [letter, setLetter] = useState('');
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    setLetter('');
    const letterTypeName = tr.letterTypes[typeIdx];
    const incomeStr = Object.entries(profile.income).filter(([,v]) => v > 0).map(([k,v]) => `${k}: $${v.toLocaleString()}`).join(', ');
    const prompt = isHe
      ? `צור מכתב רשמי בעברית לרשות המסים הישראלית מסוג: "${letterTypeName}".
${incomeStr ? `פרופיל הכנסות: ${incomeStr}.` : ''}
${details ? `פרטים נוספים: ${details}` : ''}
${profile.citizenships.length ? `אזרחויות: ${profile.citizenships.join(', ')}.` : ''}
${profile.current_residency ? `תושבות נוכחית: ${profile.current_residency}.` : ''}
המכתב צריך להיות פורמלי, משפטי, ומכיל את כל הסעיפים הנדרשים. כלול [שם מלא], [ת.ז.], [תאריך] כ-placeholders.`
      : `Generate an official formal letter in English to the Israeli Tax Authority of type: "${letterTypeName}".
${incomeStr ? `Income profile: ${incomeStr}.` : ''}
${details ? `Additional details: ${details}` : ''}
${profile.citizenships.length ? `Citizenships: ${profile.citizenships.join(', ')}.` : ''}
${profile.current_residency ? `Current residency: ${profile.current_residency}.` : ''}
The letter must be formal, legally sound, and include all required sections. Use [FULL NAME], [ID NUMBER], [DATE] as placeholders.`;

    try {
      for await (const event of streamChat(prompt, profile, [])) {
        if (event.type === 'text_delta') setLetter(prev => prev + event.text);
        if (event.type === 'done' || event.type === 'error') break;
      }
    } catch { /* ignore */ }
    finally { setGenerating(false); }
  };

  return (
    <div className="border-b overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '75vh' }}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Mail size={18} style={{ color: 'var(--accent)' }} />
              {tr.letterGenerator}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.letterGeneratorSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>{tr.letterType}</label>
              <select value={typeIdx} onChange={e => setTypeIdx(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                {tr.letterTypes.map((t, i) => <option key={i} value={i}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>{tr.letterDetails}</label>
              <textarea value={details} onChange={e => setDetails(e.target.value)}
                placeholder={tr.letterDetailsPlaceholder} rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>
            <button onClick={generate} disabled={generating}
              className="w-full py-2 rounded-lg font-semibold text-sm disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: 'var(--accent)', color: 'white' }}>
              {generating ? tr.generatingLetter : tr.generateLetter}
            </button>
          </div>
        </div>

        {letter && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-4 py-2" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{tr.letterTypes[typeIdx]}</span>
              <div className="flex gap-2">
                <button onClick={() => navigator.clipboard?.writeText(letter)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all hover:opacity-80"
                  style={{ background: 'var(--accent)', color: 'white' }}>
                  <FileText size={11} /> {tr.copyLetter}
                </button>
              </div>
            </div>
            <div className="p-4 text-sm whitespace-pre-wrap font-mono leading-relaxed"
              style={{ background: 'var(--surface)', color: 'var(--text)', maxHeight: '400px', overflowY: 'auto' }}>
              {letter}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Side-by-Side Comparison ──────────────────────────────────────────────────
const COUNTRY_FLAGS: Record<string, string> = {
  CYPRUS: '🇨🇾', UAE: '🇦🇪', BULGARIA: '🇧🇬', PORTUGAL: '🇵🇹', MALTA: '🇲🇹',
  SPAIN: '🇪🇸', GEORGIA: '🇬🇪', URUGUAY: '🇺🇾', HUNGARY: '🇭🇺', ANDORRA: '🇦🇩',
  GERMANY: '🇩🇪', UK: '🇬🇧', FRANCE: '🇫🇷', NETHERLANDS: '🇳🇱', IRELAND: '🇮🇪',
  SINGAPORE: '🇸🇬', SWITZERLAND: '🇨🇭', USA: '🇺🇸', ISRAEL: '🇮🇱', PANAMA: '🇵🇦',
  THAILAND: '🇹🇭', GREECE: '🇬🇷', ITALY: '🇮🇹', MEXICO: '🇲🇽', BAHRAIN: '🇧🇭',
  MONACO: '🇲🇨', HONG_KONG: '🇭🇰', CAYMAN: '🇰🇾',
};

function SideBySideComparison({
  lang, profile, savingsData, onClose, onFetchSavings
}: {
  lang: Lang; profile: UserProfile; savingsData: SavingsAnalysis | null;
  onClose: () => void; onFetchSavings: () => void;
}) {
  const tr = useTranslation(lang);
  const isHe = lang === 'he';
  const [selected, setSelected] = useState<string[]>([]);

  const data = savingsData;
  const allCountries = data?.results || [];

  const toggleCountry = (code: string) => {
    setSelected(prev => prev.includes(code)
      ? prev.filter(c => c !== code)
      : prev.length < 3 ? [...prev, code] : prev);
  };

  const selectedData = selected.map(code => allCountries.find(c => c.code === code)).filter(Boolean) as typeof allCountries;

  const ROWS: Array<{ key: keyof typeof allCountries[0] | 'annual_savings' | 'ten_year_savings'; label: string; format: (v: unknown) => string; highlight?: 'low' | 'high' }> = [
    { key: 'effective_rate', label: isHe ? 'שיעור מס אפקטיבי' : 'Effective Tax Rate', format: v => `${(v as number).toFixed(1)}%`, highlight: 'low' },
    { key: 'estimated_tax', label: isHe ? 'מס שנתי' : 'Annual Tax', format: v => `$${((v as number)/1000).toFixed(0)}K`, highlight: 'low' },
    { key: 'annual_savings', label: isHe ? 'חיסכון שנתי' : 'Annual Savings', format: v => `$${((v as number)/1000).toFixed(0)}K`, highlight: 'high' },
    { key: 'ten_year_savings', label: isHe ? 'חיסכון 10 שנה' : '10-Year Savings', format: v => `$${((v as number)/1000).toFixed(0)}K`, highlight: 'high' },
    { key: 'territorial', label: isHe ? 'מס טריטוריאלי' : 'Territorial', format: v => v ? '✅' : '—' },
    { key: 'region', label: isHe ? 'אזור' : 'Region', format: v => v as string },
    { key: 'special_regimes', label: isHe ? 'משטרים מיוחדים' : 'Special Regimes', format: v => (v as string[]).join(', ') || '—' },
  ];

  if (!data) return (
    <div className="border-b p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="max-w-3xl mx-auto text-center py-8">
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{isHe ? 'נדרשים נתוני חיסכון — פתח תחילה את מחשבון החיסכון' : 'Savings data required — open the Tax Savings calculator first'}</p>
        <button onClick={onFetchSavings} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--accent)', color: 'white' }}>
          {isHe ? 'חשב חיסכון' : 'Calculate Savings'}
        </button>
        <button onClick={onClose} className="ml-2 px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          {tr.cancel}
        </button>
      </div>
    </div>
  );

  return (
    <div className="border-b overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '75vh' }}>
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <GitCompare size={18} style={{ color: 'var(--accent)' }} />
              {tr.sideByCompareTitle}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {/* Country selector */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {allCountries.slice(0, 20).map(c => {
            const isSelected = selected.includes(c.code);
            return (
              <button key={c.code} onClick={() => toggleCountry(c.code)}
                className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: isSelected ? 'var(--accent)' : 'var(--surface-2)',
                  color: isSelected ? 'white' : 'var(--text-muted)',
                  border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  opacity: !isSelected && selected.length >= 3 ? 0.4 : 1,
                }}>
                {COUNTRY_FLAGS[c.code] || '🌍'} {c.name}
              </button>
            );
          })}
        </div>

        {/* Comparison table */}
        {selectedData.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--accent)' }}>
                  <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)', minWidth: '140px' }}>
                    {isHe ? 'מדד' : 'Metric'}
                  </th>
                  {selectedData.map(c => (
                    <th key={c.code} className="px-3 py-2 text-center text-sm font-bold">
                      {COUNTRY_FLAGS[c.code] || '🌍'} {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(row => {
                  const vals = selectedData.map(c => c[row.key as keyof typeof c]);
                  const nums = vals.map(v => typeof v === 'number' ? v : null).filter(v => v !== null) as number[];
                  const best = nums.length > 0 ? (row.highlight === 'low' ? Math.min(...nums) : row.highlight === 'high' ? Math.max(...nums) : null) : null;
                  return (
                    <tr key={row.key} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--text-muted)', background: 'var(--surface-2)' }}>
                        {row.label}
                      </td>
                      {selectedData.map(c => {
                        const val = c[row.key as keyof typeof c];
                        const num = typeof val === 'number' ? val : null;
                        const isBest = best !== null && num === best;
                        return (
                          <td key={c.code} className="px-3 py-2 text-center font-medium"
                            style={{
                              background: isBest ? (row.highlight === 'high' ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.08)') : 'var(--surface)',
                              color: isBest ? '#10b981' : 'var(--text)',
                            }}>
                            {isBest && '★ '}{row.format(val)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {selectedData.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
            {isHe ? 'בחר עד 3 מדינות להשוואה' : 'Select up to 3 countries to compare'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Wealth Projection Chart ──────────────────────────────────────────────────
const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];

function WealthProjectionChart({
  lang, analysis, onClose
}: { lang: Lang; analysis: IsraelAnalysis; onClose: () => void }) {
  const tr = useTranslation(lang);
  const isHe = lang === 'he';

  const chartData = useMemo(() => {
    const exitTax = analysis.exit_tax_analysis.exit_tax_estimate;
    const khBonus = analysis.kh_analysis.status === 'tax_free'
      ? (analysis.kh_analysis.withdrawal_net || 0) * 0.25
      : 0;

    return [0, 1, 2, 3, 4, 5, 7, 10].map(year => {
      const point: Record<string, number | string> = { year: `${isHe ? 'שנה' : 'Yr'} ${year}` };
      analysis.country_recommendations.slice(0, 4).forEach(c => {
        if (c.annual_savings_vs_israel == null) return;
        const label = isHe ? c.name : c.name_en;
        point[label] = Math.round(c.annual_savings_vs_israel * year + khBonus - exitTax);
      });
      return point;
    });
  }, [analysis, isHe]);

  const countries = analysis.country_recommendations.slice(0, 4).filter(c => c.annual_savings_vs_israel != null);
  const fmt = (v: number) => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`;

  return (
    <div className="border-b overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '75vh' }}>
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
              {tr.wealthChartTitle}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {isHe ? `כולל מס יציאה $${fmt(analysis.exit_tax_analysis.exit_tax_estimate)} — לעומת הישארות בישראל` : `Including exit tax $${fmt(analysis.exit_tax_analysis.exit_tax_estimate)} — vs. staying in Israel`}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tickFormatter={v => fmt(v as number)} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: unknown) => [fmt(v as number), '']}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {/* Zero line */}
              <Area type="monotone" dataKey="_zero" stroke="none" fill="none" />
              {countries.map((c, i) => (
                <Area key={c.code}
                  type="monotone"
                  dataKey={isHe ? c.name : c.name_en}
                  stroke={CHART_COLORS[i]}
                  fill={CHART_COLORS[i]}
                  fillOpacity={0.08}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tax breakdown bars */}
        <div className="mt-4">
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
            {isHe ? 'השוואת מס שנתי' : 'Annual Tax Comparison'}
          </div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                {
                  name: isHe ? 'ישראל' : 'Israel',
                  tax: analysis.israel_annual_tax,
                  ...Object.fromEntries(countries.map(c => [isHe ? c.name : c.name_en, c.annual_tax_estimate || 0]))
                }
              ].concat(countries.map(c => ({
                name: isHe ? c.name : c.name_en,
                tax: c.annual_tax_estimate || 0,
              })))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis tickFormatter={v => fmt(v as number)} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: unknown) => [fmt(v as number), isHe ? 'מס שנתי' : 'Annual Tax']}
                />
                <Bar dataKey="tax" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakeven summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          {countries.map((c, i) => {
            const saving = c.annual_savings_vs_israel!;
            const exitTax = analysis.exit_tax_analysis.exit_tax_estimate;
            const breakeven = exitTax > 0 ? Math.ceil(exitTax / Math.max(saving, 1)) : 0;
            return (
              <div key={c.code} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-2)', border: `1px solid ${CHART_COLORS[i]}33` }}>
                <div className="text-xs font-bold mb-1" style={{ color: CHART_COLORS[i] }}>{isHe ? c.name : c.name_en}</div>
                <div className="text-lg font-bold">{breakeven > 0 ? `${breakeven}y` : '0y'}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{isHe ? 'שנות החזר' : 'break-even'}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Israel Exit Wizard ───────────────────────────────────────────────────────
function IsraelExitWizard({
  lang, profile, onAsk, onClose
}: {
  lang: Lang; profile: UserProfile; onAsk: (msg: string) => void; onClose: () => void;
}) {
  const tr = useTranslation(lang);
  const isHe = lang === 'he';
  const [step, setStep] = useState(0);
  const [ip, setIp] = useState<IsraelProfile>(DEFAULT_ISRAEL_PROFILE);
  const [analysis, setAnalysis] = useState<IsraelAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [checklist, setChecklist] = useState<Record<number, boolean>>({});
  const [plannedDeparture, setPlannedDeparture] = useState('');
  const [scenarios, setScenarios] = useState<Scenario[]>(() => {
    try { return JSON.parse(localStorage.getItem('tax_master_scenarios') || '[]'); } catch { return []; }
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [whatIfIncome, setWhatIfIncome] = useState(0);
  const [whatIfYears, setWhatIfYears] = useState(0);
  const [whatIfDestIdx, setWhatIfDestIdx] = useState(0);

  const updIp = (field: keyof IsraelProfile, value: number | boolean) =>
    setIp(p => ({ ...p, [field]: value }));

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetchIsraelAnalysis(profile, ip);
      setAnalysis(res);
      setWhatIfIncome(res.total_income_usd || 0);
      setWhatIfYears(ip.years_as_israeli_resident);
      setWhatIfDestIdx(0);
      setStep(1);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const fmt = (n: number) => {
    if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return `${n.toLocaleString()}`;
  };

  const severityColor = (s: string) => s === 'high' ? '#ef4444' : '#f59e0b';

  const saveScenario = () => {
    if (!analysis || !scenarioName.trim()) return;
    const scenario: Scenario = {
      id: Date.now().toString(),
      name: scenarioName.trim(),
      savedAt: new Date().toISOString(),
      israelProfile: ip,
      userProfile: profile,
      analysis,
    };
    const updated = [scenario, ...scenarios];
    setScenarios(updated);
    localStorage.setItem('tax_master_scenarios', JSON.stringify(updated.slice(0, 10)));
    setShowSaveModal(false);
    setScenarioName('');
  };

  const loadScenario = (s: Scenario) => {
    setIp(s.israelProfile);
    setAnalysis(s.analysis);
    setStep(1);
  };

  const deleteScenario = (id: string) => {
    const updated = scenarios.filter(s => s.id !== id);
    setScenarios(updated);
    localStorage.setItem('tax_master_scenarios', JSON.stringify(updated));
  };

  const exportPdf = () => {
    if (!analysis) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const topCountry = analysis.country_recommendations[0];
    const savings5y = topCountry?.annual_savings_vs_israel ? topCountry.annual_savings_vs_israel * 5 - analysis.exit_tax_analysis.exit_tax_estimate : 0;
    w.document.write(`<!DOCTYPE html><html dir="${isHe ? 'rtl' : 'ltr'}"><head>
      <meta charset="utf-8"><title>Israel Exit Plan</title>
      <style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6}
      h1{color:#6366f1}h2{color:#6366f1;border-bottom:2px solid #e5e7eb;padding-bottom:8px}
      table{width:100%;border-collapse:collapse}th,td{padding:8px 12px;border:1px solid #e5e7eb;text-align:left}
      th{background:#f9fafb}.alert{color:#dc2626}.good{color:#059669}.warn{color:#d97706}
      @media print{body{margin:0}}</style>
    </head><body>
      <h1>🇮🇱 Israel Tax Exit Report</h1>
      <p style="color:#6b7280">Generated ${new Date().toLocaleDateString()}</p>
      <h2>${isHe ? 'סיכום כספי' : 'Financial Summary'}</h2>
      <table><tr><th>${isHe ? 'פריט' : 'Item'}</th><th>${isHe ? 'סכום' : 'Amount'}</th></tr>
        <tr><td>${isHe ? 'מס שנתי ישראל' : 'Israel Annual Tax'}</td><td class="alert">$${fmt(analysis.israel_annual_tax)}</td></tr>
        <tr><td>${isHe ? 'מס יציאה (100א)' : 'Exit Tax (Sec. 100A)'}</td><td class="alert">$${fmt(analysis.exit_tax_analysis.exit_tax_estimate)}</td></tr>
        <tr><td>${isHe ? 'מדינה מומלצת' : 'Top Country'}</td><td>${topCountry ? (isHe ? topCountry.name : topCountry.name_en) : 'N/A'}</td></tr>
        <tr><td>${isHe ? 'חיסכון נטו ל-5 שנה' : '5-Year Net Savings'}</td><td class="good">$${fmt(savings5y)}</td></tr>
      </table>
      <h2>${isHe ? 'קרן השתלמות' : 'Keren Hishtalmut'}</h2>
      <p>${isHe ? analysis.kh_analysis.advice_he : analysis.kh_analysis.advice_en}</p>
      <h2>${isHe ? 'מדינות מומלצות' : 'Recommended Countries'}</h2>
      <table><tr><th>${isHe ? 'מדינה' : 'Country'}</th><th>${isHe ? 'ציון' : 'Score'}</th><th>${isHe ? 'יתרון מס' : 'Tax Benefit'}</th><th>${isHe ? 'חיסכון שנתי' : 'Annual Savings'}</th></tr>
        ${analysis.country_recommendations.slice(0, 5).map(c => `
          <tr><td>${isHe ? c.name : c.name_en}</td><td>${c.adjusted_score}</td><td>${isHe ? c.tax_benefit : c.tax_benefit_en}</td><td class="good">$${c.annual_savings_vs_israel ? fmt(c.annual_savings_vs_israel) : 'N/A'}</td></tr>
        `).join('')}
      </table>
      <h2>${isHe ? 'תהליך יציאה' : 'Exit Process'}</h2>
      <ol>${analysis.exit_process.map(s => `<li><strong>${isHe ? s.title_he : s.title_en}</strong> — ${isHe ? s.detail_he : s.detail_en}</li>`).join('')}</ol>
      <p style="color:#6b7280;font-size:12px;margin-top:40px">⚠️ ${isHe ? 'לצורך מידע בלבד. התייעץ עם יועץ מס מוסמך לפני פעולה.' : 'For informational purposes only. Consult a licensed tax professional before acting.'}</p>
      <script>window.onload=()=>window.print()</script>
    </body></html>`);
    w.document.close();
  };

  return (
    <div className="border-b overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '75vh' }}>
      <div className="max-w-3xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              🇮🇱 {tr.israelWizard}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.israelWizardSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {analysis && (
              <>
                <button onClick={() => setShowSaveModal(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: 'var(--surface-2)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                  <Bookmark size={12} /> {tr.saveScenario}
                </button>
                <button onClick={exportPdf}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  <Download size={12} /> {tr.exportPdf}
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
          </div>
        </div>

        {/* Save scenario modal */}
        {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="rounded-xl p-5 w-80" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="font-bold mb-3">{tr.saveScenario}</h3>
              <input value={scenarioName} onChange={e => setScenarioName(e.target.value)}
                placeholder={tr.scenarioName}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-3"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              <div className="flex gap-2">
                <button onClick={saveScenario} disabled={!scenarioName.trim()}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: 'white' }}>
                  {isHe ? 'שמור' : 'Save'}
                </button>
                <button onClick={() => setShowSaveModal(false)}
                  className="flex-1 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  {tr.cancel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Saved scenarios */}
        {scenarios.length > 0 && step === 0 && (
          <div className="mb-4 rounded-xl p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Bookmark size={11} /> {tr.savedScenarios}
            </div>
            <div className="space-y-1">
              {scenarios.map(s => (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  <button onClick={() => loadScenario(s)}
                    className="flex-1 text-left px-2 py-1.5 rounded-lg transition-all hover:opacity-80 truncate"
                    style={{ background: 'var(--surface)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                    📋 {s.name}
                  </button>
                  <span style={{ color: 'var(--text-muted)' }}>{new Date(s.savedAt).toLocaleDateString()}</span>
                  <button onClick={() => deleteScenario(s.id)} className="hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step tabs */}
        {analysis && (
          <div className="flex gap-1 mb-4 flex-wrap">
            {[tr.israelStep0, tr.israelStep1, tr.israelStep2, tr.israelStep3, tr.israelProjection, tr.israelStep5, tr.israelStep6].map((label, i) => (
              <button key={i} onClick={() => setStep(i)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: step === i ? 'var(--accent)' : 'var(--surface-2)',
                  color: step === i ? 'white' : 'var(--text-muted)',
                  border: `1px solid ${step === i ? 'var(--accent)' : 'var(--border)'}`,
                }}>
                {i + 1}. {label}
              </button>
            ))}
          </div>
        )}

        {/* Step 0: Input form */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <h3 className="font-semibold text-sm mb-3">
                {isHe ? 'מוצרים פיננסיים ישראלים' : 'Israeli Financial Products'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {([
                  ['keren_hishtalmut_value', tr.israelKHValue],
                  ['keren_hishtalmut_years', tr.israelKHYears],
                  ['keren_pansiya_value', tr.israelPension],
                  ['kupat_gemel_value', tr.israelGemel],
                  ['bituach_menahalim_value', tr.israelBituach],
                ] as [keyof IsraelProfile, string][]).map(([field, label]) => (
                  <div key={field}>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{label}</label>
                    <input type="number" value={(ip[field] as number) || ''}
                      onChange={e => updIp(field, parseFloat(e.target.value) || 0)}
                      placeholder="0" className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <h3 className="font-semibold text-sm mb-3">
                {isHe ? 'סטטוס תושבות' : 'Residency Status'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{tr.israelDaysInIsrael}</label>
                  <input type="number" value={ip.days_in_israel_this_year || ''}
                    onChange={e => updIp('days_in_israel_this_year', parseFloat(e.target.value) || 0)}
                    placeholder="0" min={0} max={365}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{tr.israelYearsResident}</label>
                  <input type="number" value={ip.years_as_israeli_resident || ''}
                    onChange={e => updIp('years_as_israeli_resident', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={ip.has_israeli_company}
                    onChange={e => updIp('has_israeli_company', e.target.checked)} className="rounded" />
                  {tr.israelHasCompany}
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={ip.family_in_israel}
                    onChange={e => updIp('family_in_israel', e.target.checked)} className="rounded" />
                  {tr.israelFamilyInIsrael}
                </label>
              </div>
            </div>

            {/* Citizenship context notice */}
            <div className="rounded-xl p-3" style={{
              background: profile.citizenships.length > 0 ? 'rgba(16,185,129,0.07)' : 'rgba(245,158,11,0.07)',
              border: `1px solid ${profile.citizenships.length > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
            }}>
              {profile.citizenships.length > 0 ? (
                <div className="text-sm">
                  <span className="font-semibold">
                    {isHe ? '🌍 אזרחויות בפרופיל: ' : '🌍 Citizenships in profile: '}
                  </span>
                  {profile.citizenships.join(', ')}
                  <span className="block text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {isHe
                      ? 'הדירוג יותאם לפי האזרחויות שלך (למשל: דרכון רומני = EU, ברזילאי = MERCOSUR)'
                      : 'Rankings will be adjusted based on your citizenships (e.g. Romanian = EU passport, Brazilian = MERCOSUR)'}
                  </span>
                </div>
              ) : (
                <div className="text-sm">
                  <span className="font-semibold">
                    {isHe ? '⚠️ לא הוגדרו אזרחויות בפרופיל' : '⚠️ No citizenships set in profile'}
                  </span>
                  <span className="block text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {isHe
                      ? 'הוסף אזרחויות בפרופיל שלך (למשל: Israel, Romania, Brazil) לקבלת המלצות מדויקות. דרכון רומני = גישה ל-EU, ברזילאי = MERCOSUR + אפס מס על ידי אזרחות.'
                      : 'Add citizenships in your profile (e.g. Israel, Romania, Brazil) for accurate recommendations. Romanian passport = EU access, Brazilian = MERCOSUR + no citizenship-based tax.'}
                  </span>
                </div>
              )}
            </div>

            <button onClick={analyze} disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'white' }}>
              {loading ? tr.israelAnalyzing : tr.israelAnalyze}
            </button>
          </div>
        )}

        {/* Step 1: Timing analysis */}
        {step === 1 && analysis && (
          <div className="space-y-4">
            {/* Timing alerts */}
            {analysis.timing_messages.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{tr.israelTimingAlerts}</div>
                {analysis.timing_messages.map((m, i) => (
                  <div key={i} className="rounded-xl p-3" style={{
                    background: m.priority === 'high' ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
                    border: `1px solid ${m.priority === 'high' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                  }}>
                    <div className="text-sm font-medium">{isHe ? m.text_he : m.text_en}</div>
                  </div>
                ))}
              </div>
            )}

            {/* KH analysis */}
            {analysis.kh_analysis.status !== 'no_data' && (
              <div className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <h3 className="font-semibold text-sm mb-2">🏦 {tr.israelKH}</h3>
                <div className="text-sm font-medium mb-2">{isHe ? analysis.kh_analysis.status_he : analysis.kh_analysis.status_en}</div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{isHe ? analysis.kh_analysis.advice_he : analysis.kh_analysis.advice_en}</div>
                {analysis.kh_analysis.tax_if_withdraw_now !== undefined && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="text-center rounded-lg p-2" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{isHe ? 'תשלום מס עכשיו' : 'Tax if leave now'}</div>
                      <div className="font-bold text-sm" style={{ color: '#ef4444' }}>₪{fmt(analysis.kh_analysis.tax_if_withdraw_now)}</div>
                    </div>
                    <div className="text-center rounded-lg p-2" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{isHe ? 'פדיון אחרי 6 שנה' : 'Withdrawal after 6y'}</div>
                      <div className="font-bold text-sm" style={{ color: '#10b981' }}>₪{fmt(analysis.kh_analysis.withdrawal_net_if_wait || 0)}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pension products */}
            {analysis.pension_analysis.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <h3 className="font-semibold text-sm mb-3">🏛️ {isHe ? 'מוצרי פנסיה' : 'Pension Products'}</h3>
                <div className="space-y-3">
                  {analysis.pension_analysis.map((p, i) => (
                    <div key={i} className="rounded-lg p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <div className="font-medium text-sm mb-1">{p.name_he} — ₪{fmt(p.value)}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{isHe ? p.strategy_he : p.strategy_en}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exit tax */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <h3 className="font-semibold text-sm mb-2" style={{ color: '#f59e0b' }}>⚠️ {tr.israelExitTax}</h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="text-center rounded-lg p-2" style={{ background: 'var(--surface)' }}>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{isHe ? 'רווח לא ממומש' : 'Unrealized gain'}</div>
                  <div className="font-bold">${fmt(analysis.exit_tax_analysis.unrealized_gain_estimate)}</div>
                </div>
                <div className="text-center rounded-lg p-2" style={{ background: 'rgba(239,68,68,0.08)' }}>
                  <div className="text-xs" style={{ color: '#ef4444' }}>{isHe ? 'מס יציאה (25%)' : 'Exit tax (25%)'}</div>
                  <div className="font-bold" style={{ color: '#ef4444' }}>${fmt(analysis.exit_tax_analysis.exit_tax_estimate)}</div>
                </div>
              </div>
              <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{isHe ? 'אפשרויות דחייה:' : 'Deferral options:'}</div>
              <div className="space-y-1">
                {(isHe ? analysis.exit_tax_analysis.deferral_options_he : analysis.exit_tax_analysis.deferral_options_en).map((opt, i) => (
                  <div key={i} className="text-xs rounded p-1.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>{opt}</div>
                ))}
              </div>
              <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{isHe ? analysis.exit_tax_analysis.note_he : analysis.exit_tax_analysis.note_en}</div>
            </div>

            {/* Residency risks */}
            {analysis.residency_risks.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <h3 className="font-semibold text-sm mb-2">🔍 {tr.israelResidencyRisks}</h3>
                <div className="space-y-2">
                  {analysis.residency_risks.map((r, i) => (
                    <div key={i} className="text-sm rounded-lg p-2.5 flex items-start gap-2"
                      style={{ background: 'var(--surface)', border: `1px solid ${severityColor(r.severity)}33` }}>
                      <span style={{ color: severityColor(r.severity) }}>{r.severity === 'high' ? '🔴' : '🟡'}</span>
                      <span>{isHe ? r.text_he : r.text_en}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bituach Leumi */}
            {analysis.bituach_leumi && (
              <div className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <h3 className="font-semibold text-sm mb-3">🏛️ {tr.bituachLeumiTitle}</h3>
                <div className="space-y-2">
                  {/* Old-age pension */}
                  <div className="rounded-lg p-3" style={{
                    background: analysis.bituach_leumi.old_age_pension.qualifies ? 'rgba(16,185,129,0.07)' : 'rgba(245,158,11,0.07)',
                    border: `1px solid ${analysis.bituach_leumi.old_age_pension.qualifies ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                  }}>
                    <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{tr.oldAgePension}</div>
                    <div className="text-sm">{isHe ? analysis.bituach_leumi.old_age_pension.note_he : analysis.bituach_leumi.old_age_pension.note_en}</div>
                    {analysis.bituach_leumi.old_age_pension.qualifies && (
                      <div className="mt-1 text-sm font-bold" style={{ color: '#10b981' }}>
                        ₪{analysis.bituach_leumi.old_age_pension.monthly_ils.toLocaleString()}/
                        {isHe ? 'חודש' : 'month'}
                      </div>
                    )}
                  </div>
                  {/* Healthcare */}
                  <div className="rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{tr.healthcare}</div>
                    <div className="text-sm">{isHe ? analysis.bituach_leumi.healthcare.warning_he : analysis.bituach_leumi.healthcare.warning_en}</div>
                    <div className="text-xs mt-1" style={{ color: '#ef4444' }}>{isHe ? analysis.bituach_leumi.healthcare.action_he : analysis.bituach_leumi.healthcare.action_en}</div>
                  </div>
                  {/* Unemployment + contributions */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg p-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{tr.unemployment}</div>
                      <div className="text-xs">{isHe ? analysis.bituach_leumi.unemployment.note_he : analysis.bituach_leumi.unemployment.note_en}</div>
                    </div>
                    <div className="rounded-lg p-2.5" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{tr.contributionsOngoing}</div>
                      <div className="text-xs">{isHe ? analysis.bituach_leumi.contributions_ongoing.note_he : analysis.bituach_leumi.contributions_ongoing.note_en}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Country recommendations */}
        {step === 2 && analysis && (
          <div className="space-y-3">
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
              {isHe ? 'מדינות מומלצות לישראלים — ממוינות לפי פרופיל שלך' : 'Recommended countries for Israelis — sorted by your profile'}
            </div>
            {analysis.country_recommendations.map((c, i) => (
              <div key={c.code} className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: i === 0 ? '#f59e0b' : 'var(--surface)', color: i === 0 ? 'white' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      {i + 1}
                    </span>
                    <div>
                      <span className="font-bold">{isHe ? c.name : c.name_en}</span>
                      {i === 0 && <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>⭐ {isHe ? 'מומלץ' : 'Recommended'}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg" style={{ color: 'var(--accent)' }}>{c.adjusted_score}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{isHe ? 'ציון' : 'score'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs">
                  <div className="rounded p-1.5 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div style={{ color: 'var(--text-muted)' }}>{tr.israelFlightHours}</div>
                    <div className="font-medium">✈️ {c.flight_hours}h</div>
                  </div>
                  <div className="rounded p-1.5 text-center" style={{ background: c.treaty_with_israel ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)', border: `1px solid ${c.treaty_with_israel ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                    <div style={{ color: 'var(--text-muted)' }}>{tr.israelTreaty}</div>
                    <div className="font-medium" style={{ color: c.treaty_with_israel ? '#10b981' : '#ef4444' }}>
                      {c.treaty_with_israel ? '✓' : '✗'}
                    </div>
                  </div>
                  <div className="rounded p-1.5 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div style={{ color: 'var(--text-muted)' }}>{tr.israelCommunity}</div>
                    <div className="font-medium">{isHe ? c.israeli_community : c.israeli_community_en}</div>
                  </div>
                  {c.cost_of_living_index != null && (
                    <div className="rounded p-1.5 text-center" style={{
                      background: c.cost_of_living_index <= 80 ? 'rgba(16,185,129,0.07)' : c.cost_of_living_index >= 120 ? 'rgba(239,68,68,0.07)' : 'var(--surface)',
                      border: `1px solid ${c.cost_of_living_index <= 80 ? 'rgba(16,185,129,0.25)' : c.cost_of_living_index >= 120 ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
                    }}>
                      <div style={{ color: 'var(--text-muted)' }}>{tr.costOfLiving}</div>
                      <div className="font-medium" style={{ color: c.cost_of_living_index <= 80 ? '#10b981' : c.cost_of_living_index >= 120 ? '#ef4444' : 'inherit' }}>
                        {c.cost_of_living_index}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-xs space-y-1.5">
                  <div className="rounded p-2" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <span className="font-medium" style={{ color: '#10b981' }}>💰 {tr.israelTaxBenefit}: </span>
                    {isHe ? c.tax_benefit : c.tax_benefit_en}
                  </div>
                  <div className="rounded p-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <span className="font-medium">📋 {tr.israelResidencyReq}: </span>
                    {isHe ? c.residency_req : c.residency_req_en}
                  </div>
                </div>

                <div className="mt-3 flex gap-2 flex-wrap">
                  {c.pros.slice(0, 3).map((p, pi) => (
                    <span key={pi} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                      ✓ {p}
                    </span>
                  ))}
                  {c.cons.slice(0, 2).map((con, ci) => (
                    <span key={ci} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}>
                      − {con}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => onAsk(isHe
                    ? `ספר לי יותר על מעבר לגור ב${c.name} כתושב מס ישראלי עם הפרופיל שלי. מה הדרישות המדויקות לתושבות מס, מה האמנה עם ישראל אומרת, ואיך זה עובד בפועל?`
                    : `Tell me more about relocating to ${c.name_en} as an Israeli tax resident with my profile. What are the exact tax residency requirements, what does the Israel tax treaty say, and how does it work in practice?`)}
                  className="mt-3 w-full py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                  {isHe ? `שאל AI על ${c.name} →` : `Ask AI about ${c.name_en} →`}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Action checklist */}
        {step === 3 && analysis && (
          <div className="space-y-2">
            {/* Departure Timeline */}
            <div className="rounded-xl p-3 mb-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Calendar size={14} style={{ color: 'var(--accent)' }} />
                {tr.departurePlan}
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{tr.plannedDate}</label>
                  <input type="date" value={plannedDeparture} onChange={e => setPlannedDeparture(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
                {plannedDeparture && (() => {
                  const days = Math.ceil((new Date(plannedDeparture).getTime() - Date.now()) / 86400000);
                  return (
                    <div className="text-center flex-shrink-0">
                      <div className="text-2xl font-bold" style={{ color: days < 30 ? '#ef4444' : days < 90 ? '#f59e0b' : 'var(--accent)' }}>{days}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{tr.daysUntilDeparture}</div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
              {isHe ? 'סמן כל שלב שביצעת:' : 'Check each step as you complete it:'}
            </div>
            {analysis.exit_process.map(item => (
              <div key={item.step}
                className="rounded-xl p-3 transition-all cursor-pointer"
                style={{
                  background: checklist[item.step] ? 'rgba(16,185,129,0.07)' : 'var(--surface-2)',
                  border: `1px solid ${checklist[item.step] ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
                  opacity: checklist[item.step] ? 0.7 : 1,
                }}
                onClick={() => setChecklist(c => ({ ...c, [item.step]: !c[item.step] }))}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: checklist[item.step] ? '#10b981' : 'var(--surface)',
                      color: checklist[item.step] ? 'white' : 'var(--text-muted)',
                      border: `1px solid ${checklist[item.step] ? '#10b981' : 'var(--border)'}`,
                    }}>
                    {checklist[item.step] ? '✓' : item.step}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        {item.category}
                      </span>
                      <span className="font-medium text-sm" style={{ textDecoration: checklist[item.step] ? 'line-through' : 'none' }}>
                        {isHe ? item.title_he : item.title_en}
                      </span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {isHe ? item.detail_he : item.detail_en}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-xl p-3 text-center mt-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div className="font-bold text-lg" style={{ color: 'var(--accent)' }}>
                {Object.values(checklist).filter(Boolean).length} / {analysis.exit_process.length}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {isHe ? 'שלבים הושלמו' : 'steps completed'}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: 5-Year projection */}
        {step === 4 && analysis && (() => {
          const exitTax = analysis.exit_tax_analysis.exit_tax_estimate;
          const khNet = analysis.kh_analysis.status === 'tax_free'
            ? (analysis.kh_analysis.withdrawal_net || 0)
            : (analysis.kh_analysis.withdrawal_net_now || 0);
          const khBonus = analysis.kh_analysis.status === 'tax_free'
            ? (analysis.kh_analysis.withdrawal_net || 0) - (analysis.kh_analysis.withdrawal_net || 0) * 0.25
            : 0; // extra saved vs non-resident withdrawal

          const countries = analysis.country_recommendations.filter(c => c.annual_savings_vs_israel !== null);
          const israelTax = analysis.israel_annual_tax || 0;

          return (
            <div className="space-y-4">
              <div className="rounded-xl p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{tr.israelProjectionSubtitle}</div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="text-center rounded-lg p-2" style={{ background: 'var(--surface)' }}>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{tr.israelCurrentTax}</div>
                    <div className="font-bold">${fmt(israelTax)}/yr</div>
                  </div>
                  <div className="text-center rounded-lg p-2" style={{ background: 'rgba(239,68,68,0.07)' }}>
                    <div className="text-xs" style={{ color: '#ef4444' }}>{isHe ? 'מס יציאה' : 'Exit tax'}</div>
                    <div className="font-bold" style={{ color: '#ef4444' }}>-${fmt(exitTax)}</div>
                  </div>
                </div>
              </div>

              {countries.map(c => {
                const annualSaving = c.annual_savings_vs_israel!;
                const rows = [1, 2, 3, 5].map(year => {
                  const cumSavings = annualSaving * year + khBonus;
                  const netAfterExit = cumSavings - exitTax;
                  return { year, cumSavings, netAfterExit };
                });
                const breakEvenYear = exitTax > 0
                  ? Math.ceil(exitTax / Math.max(annualSaving + khBonus / 5, 1))
                  : 0;
                const net5y = rows[3].netAfterExit;

                return (
                  <div key={c.code} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--surface-2)' }}>
                      <div className="font-semibold text-sm">{isHe ? c.name : c.name_en}</div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {isHe ? 'חיסכון שנתי:' : 'Annual saving:'} <span className="font-bold" style={{ color: '#10b981' }}>${fmt(annualSaving)}</span>
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: net5y > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: net5y > 0 ? '#10b981' : '#ef4444' }}>
                          5yr: {net5y > 0 ? '+' : ''}{fmt(net5y)}
                        </span>
                      </div>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                          <th className="px-3 py-1.5 text-left font-medium" style={{ color: 'var(--text-muted)' }}>{tr.israelProjectionYear}</th>
                          <th className="px-3 py-1.5 text-right font-medium" style={{ color: 'var(--text-muted)' }}>{isHe ? 'חיסכון מצטבר' : 'Cumulative saving'}</th>
                          <th className="px-3 py-1.5 text-right font-medium" style={{ color: 'var(--text-muted)' }}>{tr.israelProjectionNetGain}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(r => (
                          <tr key={r.year} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td className="px-3 py-2 font-medium">{r.year}</td>
                            <td className="px-3 py-2 text-right font-medium" style={{ color: '#10b981' }}>
                              +${fmt(r.cumSavings)}
                            </td>
                            <td className="px-3 py-2 text-right font-bold" style={{ color: r.netAfterExit >= 0 ? '#10b981' : '#ef4444' }}>
                              {r.netAfterExit >= 0 ? '+' : ''}{fmt(r.netAfterExit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {breakEvenYear > 0 && (
                      <div className="px-4 py-2 text-xs" style={{ background: 'rgba(245,158,11,0.05)', color: 'var(--text-muted)' }}>
                        ⏱ {tr.israelBreakEven}: <strong style={{ color: '#f59e0b' }}>{isHe ? `שנה ${breakEvenYear}` : `Year ${breakEvenYear}`}</strong>
                      </div>
                    )}
                  </div>
                );
              })}

              {countries.length === 0 && (
                <div className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {isHe ? 'הכנס הכנסות בפרופיל לחישוב תחזית מדויקת' : 'Enter income in your profile for accurate projections'}
                </div>
              )}
            </div>
          );
        })()}

        {/* Step 5: What If */}
        {step === 5 && analysis && (() => {
          const baseIncome = analysis.total_income_usd || 1;
          const incomeRatio = whatIfIncome > 0 ? whatIfIncome / baseIncome : 1;
          const dest = analysis.country_recommendations[whatIfDestIdx] || analysis.country_recommendations[0];
          if (!dest) return <div className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>{isHe ? 'אין המלצות' : 'No recommendations'}</div>;

          const scaledSaving = dest.annual_savings_vs_israel != null ? Math.round(dest.annual_savings_vs_israel * incomeRatio) : 0;
          const exitTax = Math.round(analysis.exit_tax_analysis.exit_tax_estimate * incomeRatio);
          const breakEven = scaledSaving > 0 ? Math.ceil(exitTax / scaledSaving) : 0;
          const net5yr = scaledSaving * 5 - exitTax;

          return (
            <div className="space-y-4">
              <div className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <Shuffle size={14} style={{ color: 'var(--accent)' }} />
                  {tr.whatIfTitle}
                </h3>

                {/* Income slider */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    <span>{tr.whatIfIncome}</span>
                    <span className="font-bold" style={{ color: 'var(--accent)' }}>${(whatIfIncome / 1000).toFixed(0)}K/yr</span>
                  </div>
                  <input type="range" min={50000} max={2000000} step={50000}
                    value={whatIfIncome}
                    onChange={e => setWhatIfIncome(Number(e.target.value))}
                    className="w-full accent-indigo-500" />
                  <div className="flex justify-between text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    <span>$50K</span><span>$2M</span>
                  </div>
                </div>

                {/* Years slider */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    <span>{tr.whatIfYears}</span>
                    <span className="font-bold" style={{ color: 'var(--accent)' }}>{whatIfYears} {isHe ? 'שנים' : 'yrs'}</span>
                  </div>
                  <input type="range" min={0} max={40} step={1}
                    value={whatIfYears}
                    onChange={e => setWhatIfYears(Number(e.target.value))}
                    className="w-full accent-indigo-500" />
                  <div className="flex justify-between text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    <span>0</span><span>40</span>
                  </div>
                </div>

                {/* Destination */}
                <div>
                  <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tr.whatIfDestination}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.country_recommendations.slice(0, 8).map((c, i) => (
                      <button key={c.code} onClick={() => setWhatIfDestIdx(i)}
                        className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: whatIfDestIdx === i ? 'var(--accent)' : 'var(--surface)',
                          color: whatIfDestIdx === i ? 'white' : 'var(--text-muted)',
                          border: `1px solid ${whatIfDestIdx === i ? 'var(--accent)' : 'var(--border)'}`,
                        }}>
                        {isHe ? c.name : c.name_en}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tr.whatIfAnnualSaving}</div>
                  <div className="font-bold text-lg" style={{ color: '#10b981' }}>${fmt(scaledSaving)}</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tr.whatIfExitTax}</div>
                  <div className="font-bold text-lg" style={{ color: '#ef4444' }}>-${fmt(exitTax)}</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tr.whatIfBreakEven}</div>
                  <div className="font-bold text-lg" style={{ color: '#f59e0b' }}>{breakEven > 0 ? `${breakEven}y` : '—'}</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{
                  background: net5yr > 0 ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
                  border: `1px solid ${net5yr > 0 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tr.whatIf5yr}</div>
                  <div className="font-bold text-lg" style={{ color: net5yr > 0 ? '#10b981' : '#ef4444' }}>
                    {net5yr > 0 ? '+' : ''}{fmt(net5yr)}
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-3 text-xs" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                {isHe
                  ? `בהכנסה של $${fmt(whatIfIncome)}/שנה, מעבר ל${dest.name} עם מס יציאה של $${fmt(exitTax)} — ${breakEven > 0 ? `מגיעים לנקודת אפס בשנה ${breakEven}` : 'אין מס יציאה משמעותי'}, ורווח נקי של $${fmt(net5yr)} ב-5 שנים.`
                  : `At $${fmt(whatIfIncome)}/year income, moving to ${dest.name_en} with $${fmt(exitTax)} exit tax — ${breakEven > 0 ? `break-even at year ${breakEven}` : 'no significant exit tax'}, net gain of $${fmt(net5yr)} over 5 years.`}
              </div>
            </div>
          );
        })()}

        {/* Step 6: Wealth Projection Chart */}
        {step === 6 && analysis && (
          <WealthProjectionChart lang={lang} analysis={analysis} onClose={() => setStep(4)} />
        )}
      </div>
    </div>
  );
}

// ─── FATCA Advisory Panel ─────────────────────────────────────────────────────
function FatcaAdvisoryPanel({ lang, profile, setProfile, onAsk, onClose }: {
  lang: Lang; profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  onAsk: (msg: string) => void; onClose: () => void;
}) {
  const tr = useTranslation(lang);
  const isHe = lang === 'he';

  const totalIncome = Object.values(profile.income).reduce((a, b) => a + b, 0);
  const earnedIncome = (profile.income.employment || 0) + (profile.income.business || 0);
  const foreignIncome = totalIncome; // all income is "foreign" from US perspective
  const totalAssets = Object.values(profile.assets).reduce((a, b) => a + b, 0);

  // US Tax 2024 (simplified, single filer)
  const calcUsTax = (income: number) => {
    const std = 14600;
    const taxable = Math.max(0, income - std);
    let tax = 0;
    const brackets = [[11600, 0.10], [35550, 0.12], [53375, 0.22], [91425, 0.24], [51775, 0.32], [365625, 0.35], [Infinity, 0.37]] as [number, number][];
    let remaining = taxable;
    for (const [size, rate] of brackets) {
      const chunk = Math.min(remaining, size);
      tax += chunk * rate;
      remaining -= chunk;
      if (remaining <= 0) break;
    }
    return Math.round(tax);
  };

  // FEIE 2024
  const FEIE_2024 = 126500;
  const feieApplied = Math.min(earnedIncome, FEIE_2024);
  const incomeAfterFeie = Math.max(0, totalIncome - feieApplied);
  const usTaxBeforeFtc = calcUsTax(incomeAfterFeie);

  // Foreign Tax Credit (estimate: Israeli taxes ~25-35% of non-earned income)
  const israeliTaxEstimate = Math.round(totalIncome * 0.28);
  const ftcLimit = totalIncome > 0 ? Math.round(usTaxBeforeFtc * (foreignIncome / Math.max(totalIncome, 1))) : 0;
  const ftcApplied = Math.min(israeliTaxEstimate, ftcLimit);
  const additionalUsTax = Math.max(0, usTaxBeforeFtc - ftcApplied);
  const combinedRate = totalIncome > 0 ? ((israeliTaxEstimate + additionalUsTax) / totalIncome * 100) : 0;

  // FBAR: foreign accounts > $10K aggregate
  const fbarRequired = totalAssets > 10000;
  // FATCA Form 8938: assets > $50K abroad (single, living outside US = $200K threshold)
  const fatcaFormRequired = totalAssets > 200000;
  // Covered expatriate: net worth > $2M OR avg annual tax > $201K
  const coveredExpatriate = totalAssets > 2000000 || calcUsTax(totalIncome) > 201000;

  const fmt = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n.toLocaleString()}`;

  if (!profile.is_us_person) return (
    <div className="border-b overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '60vh' }}>
      <div className="max-w-3xl mx-auto p-6 text-center">
        <div className="text-5xl mb-3">🇺🇸</div>
        <h2 className="font-bold text-lg mb-2">{tr.fatcaNotUsPerson}</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{tr.fatcaNotUsPersonDesc}</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => { setProfile({ ...profile, is_us_person: true }); }}
            className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--accent)', color: 'white' }}>
            {tr.fatcaMarkAsUs}
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            {tr.cancel}
          </button>
        </div>
      </div>
    </div>
  );

  const risks = [
    { flag: fbarRequired, label: isHe ? `FBAR — חייב בהגשה (נכסים זרים ${fmt(totalAssets)})` : `FBAR filing required (foreign assets ${fmt(totalAssets)})`, severity: 'warn' },
    { flag: fatcaFormRequired, label: isHe ? `טופס 8938 — נדרש (נכסים ${fmt(totalAssets)} > $200K)` : `Form 8938 required (assets ${fmt(totalAssets)} > $200K)`, severity: 'warn' },
    { flag: true, label: isHe ? 'קרן השתלמות / קופת גמל — עלולות להיות PFIC (ריבוי מסים + קנסות)' : 'Keren Hishtalmut / Kupat Gemel — may be classified as PFIC (severe penalties)', severity: 'high' },
    { flag: coveredExpatriate, label: isHe ? `Covered Expatriate — ויתור על אזרחות מחייב מס יציאה אמריקאי (שווי נכסים ${fmt(totalAssets)})` : `Covered Expatriate — renouncing citizenship triggers US exit tax (assets ${fmt(totalAssets)})`, severity: 'high' },
    { flag: true, label: isHe ? 'ביטול תושבות ישראלית לא פוטר ממס אמריקאי — חייב בהגשה לעד כל חיים' : 'Breaking Israeli residency does NOT eliminate US tax — must file for life', severity: 'info' },
  ].filter(r => r.flag);

  const actions = [
    isHe ? 'הגש FBAR (FinCEN 114) עד 15 באפריל כל שנה — קנס $10K–$100K על אי-הגשה' : 'File FBAR (FinCEN 114) by April 15 each year — $10K–$100K penalty for non-filing',
    isHe ? 'הגש Form 8938 עם 1040 אם נכסים זרים > $200K (מחוץ לארה"ב, נשוי בנפרד)' : 'File Form 8938 with 1040 if foreign assets > $200K (living abroad, single)',
    isHe ? 'בדוק אם קרנות ישראליות = PFIC — שקול חשבון broker אמריקאי (Interactive Brokers) לניירות ערך' : 'Check if Israeli funds = PFIC — consider US broker (Interactive Brokers) for securities',
    isHe ? 'שקול "Foreign Earned Income Exclusion" (Form 2555) להכנסת עבודה עד $126,500' : 'Consider FEIE (Form 2555) to exclude up to $126,500 of earned income',
    isHe ? 'תכנן זיכוי מס זר (Form 1116) — מסים ישראלים גבוהים בד"כ מכסים את המס האמריקאי' : 'Plan Foreign Tax Credit (Form 1116) — high Israeli taxes usually cover US liability',
  ];

  return (
    <div className="border-b overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '75vh' }}>
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">🇺🇸🇮🇱 {tr.fatcaTitle}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {isHe ? `הכנסה שנתית: ${fmt(totalIncome)} | נכסים: ${fmt(totalAssets)}` : `Annual income: ${fmt(totalIncome)} | Assets: ${fmt(totalAssets)}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {/* Key numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: tr.fatcaFeie, value: feieApplied > 0 ? fmt(feieApplied) : isHe ? 'לא חל' : 'N/A', color: '#10b981', sub: isHe ? 'פטור הכנסת עבודה זרה' : 'earned income exclusion' },
            { label: tr.fatcaFtc, value: fmt(ftcApplied), color: '#10b981', sub: isHe ? `מתוך ${fmt(ftcLimit)} מקסימום` : `of ${fmt(ftcLimit)} max` },
            { label: tr.fatcaAdditionalUs, value: additionalUsTax > 0 ? fmt(additionalUsTax) : '✓ $0', color: additionalUsTax > 0 ? '#ef4444' : '#10b981', sub: isHe ? 'מס ארה"ב לתשלום' : 'US tax owed' },
            { label: tr.fatcaNetRate, value: `${combinedRate.toFixed(1)}%`, color: combinedRate > 40 ? '#ef4444' : combinedRate > 25 ? '#f59e0b' : '#10b981', sub: isHe ? 'ישראל + ארה"ב ביחד' : 'Israel + US combined' },
          ].map((card, i) => (
            <div key={i} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{card.label}</div>
              <div className="font-bold text-lg" style={{ color: card.color }}>{card.value}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{card.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-3 mb-3">
          {/* Obligations */}
          <div className="rounded-xl p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div className="font-semibold text-sm mb-2">{tr.fatcaKeyRisks}</div>
            <div className="space-y-2">
              {risks.map((r, i) => (
                <div key={i} className="flex gap-2 text-xs rounded-lg p-2" style={{
                  background: r.severity === 'high' ? 'rgba(239,68,68,0.07)' : r.severity === 'warn' ? 'rgba(245,158,11,0.07)' : 'rgba(99,102,241,0.07)',
                  border: `1px solid ${r.severity === 'high' ? 'rgba(239,68,68,0.2)' : r.severity === 'warn' ? 'rgba(245,158,11,0.2)' : 'rgba(99,102,241,0.2)'}`,
                }}>
                  <span>{r.severity === 'high' ? '🔴' : r.severity === 'warn' ? '🟡' : 'ℹ️'}</span>
                  <span>{r.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-xl p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div className="font-semibold text-sm mb-2">{tr.fatcaActions}</div>
            <div className="space-y-1.5">
              {actions.map((a, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'var(--accent)', color: 'white', fontSize: 9 }}>{i + 1}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{a}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FBAR/FATCA status bar */}
        <div className="flex gap-2 flex-wrap mb-3">
          {[
            { label: 'FBAR (FinCEN 114)', required: fbarRequired },
            { label: 'Form 8938', required: fatcaFormRequired },
            { label: 'Form 2555 (FEIE)', required: earnedIncome > 0 },
            { label: 'Form 1116 (FTC)', required: true },
            { label: isHe ? 'Covered Expatriate' : 'Covered Expatriate', required: coveredExpatriate },
          ].map((f, i) => (
            <span key={i} className="text-xs px-2 py-1 rounded-full font-medium"
              style={{
                background: f.required ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                color: f.required ? '#ef4444' : '#10b981',
                border: `1px solid ${f.required ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
              }}>
              {f.required ? '⚠️' : '✓'} {f.label}
            </span>
          ))}
        </div>

        <button
          onClick={() => onAsk(isHe
            ? `אני דואל-נתינות ישראל-ארה"ב עם הכנסה של ${fmt(totalIncome)} ונכסים של ${fmt(totalAssets)}. ${fbarRequired ? 'יש לי חובת FBAR.' : ''} ${fatcaFormRequired ? 'יש לי חובת Form 8938.' : ''} ${coveredExpatriate ? 'אני Covered Expatriate.' : ''} הסבר לי את כל ה-US tax obligations שלי, מה זיכוי מס זר מכסה ומה לא, ואיך לייעל את המצב שלי.`
            : `I am an Israel-USA dual citizen with ${fmt(totalIncome)} income and ${fmt(totalAssets)} assets. ${fbarRequired ? 'FBAR required.' : ''} ${fatcaFormRequired ? 'Form 8938 required.' : ''} ${coveredExpatriate ? 'I am a covered expatriate.' : ''} Explain all my US tax obligations, what the foreign tax credit covers, and how to optimize my situation.`)}
          className="w-full py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
          style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
          {isHe ? '🤖 שאל AI על הסיטואציה שלי →' : '🤖 Ask AI about my situation →'}
        </button>
      </div>
    </div>
  );
}

// ─── Conversational Onboarding ────────────────────────────────────────────────
const ONBOARDING_QUESTIONS = [
  { field: 'citizenships', type: 'text' as const, he: 'מה האזרחויות שלך? (לדוגמה: ישראל, ארה"ב)', en: 'What are your citizenships? (e.g. Israel, USA)', hint_he: 'ישראל, גרמניה...', hint_en: 'Israel, Germany...' },
  { field: 'current_residency', type: 'text' as const, he: 'באיזו מדינה אתה מתגורר כיום למטרות מס?', en: 'What country are you currently a tax resident of?', hint_he: 'ישראל...', hint_en: 'Israel...' },
  { field: 'years_in_country', type: 'number' as const, he: 'כמה שנים אתה מתגורר שם?', en: 'How many years have you lived there?', hint_he: '5', hint_en: '5' },
  { field: 'is_us_person', type: 'bool' as const, he: 'האם אתה אזרח אמריקאי או בעל גרין קארד?', en: 'Are you a US citizen or green card holder?' },
  { field: 'income_employment', type: 'number' as const, he: 'כמה אתה מרוויח ממשכורת / עבודה שנתית? ($)', en: 'Annual employment / salary income? ($)', hint_he: '200000', hint_en: '200000' },
  { field: 'income_business', type: 'number' as const, he: 'הכנסה עסקית / עצמאי שנתית? (0 אם לא רלוונטי)', en: 'Annual business / self-employment income? (0 if none)', hint_he: '0', hint_en: '0' },
  { field: 'income_capital_gains', type: 'number' as const, he: 'רווחי הון שנתיים מוערכים (מניות, מכירת נכסים)?', en: 'Estimated annual capital gains (stocks, asset sales)?', hint_he: '50000', hint_en: '50000' },
  { field: 'assets_stocks', type: 'number' as const, he: 'שווי תיק ניירות ערך / מניות? ($)', en: 'Stock / securities portfolio value? ($)', hint_he: '500000', hint_en: '500000' },
  { field: 'assets_real_estate', type: 'number' as const, he: 'שווי נדל"ן? (דירה, בית — לא משכנתא)', en: 'Real estate value? (apartment, house — not mortgage)', hint_he: '1000000', hint_en: '1000000' },
  { field: 'goals', type: 'multiselect' as const, he: 'מה המטרה העיקרית שלך?', en: 'What is your main goal?', options_he: ['מיניזציית מס', 'אזרחות / דרכון שני', 'הגנת נכסים', 'יציאה מישראל', 'תכנון פרישה'], options_en: ['Tax minimization', 'Second citizenship / passport', 'Asset protection', 'Leaving Israel', 'Retirement planning'] },
];

function ConversationalOnboarding({ lang, profile, onComplete, onClose }: {
  lang: Lang; profile: UserProfile;
  onComplete: (p: UserProfile) => void; onClose: () => void;
}) {
  const tr = useTranslation(lang);
  const isHe = lang === 'he';
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [inputVal, setInputVal] = useState('');
  const [boolVal, setBoolVal] = useState<boolean | null>(null);
  const [multiVal, setMultiVal] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const q = ONBOARDING_QUESTIONS[step];
  const total = ONBOARDING_QUESTIONS.length;

  const submitAnswer = () => {
    const newAnswers = { ...answers };
    if (q.type === 'bool') newAnswers[q.field] = boolVal ?? false;
    else if (q.type === 'multiselect') newAnswers[q.field] = multiVal;
    else if (q.type === 'number') newAnswers[q.field] = parseFloat(inputVal) || 0;
    else newAnswers[q.field] = inputVal;
    setAnswers(newAnswers);
    setInputVal('');
    setBoolVal(null);
    setMultiVal([]);
    if (step < total - 1) setStep(s => s + 1);
    else buildProfile(newAnswers);
  };

  const buildProfile = (ans: Record<string, unknown>) => {
    const newProfile: UserProfile = {
      ...profile,
      citizenships: typeof ans.citizenships === 'string' ? ans.citizenships.split(/[,،]+/).map((s: string) => s.trim()).filter(Boolean) : profile.citizenships,
      current_residency: (ans.current_residency as string) || profile.current_residency,
      years_in_country: (ans.years_in_country as number) || profile.years_in_country,
      is_us_person: (ans.is_us_person as boolean) ?? profile.is_us_person,
      income: {
        ...profile.income,
        employment: (ans.income_employment as number) || profile.income.employment,
        business: (ans.income_business as number) || profile.income.business,
        capital_gains: (ans.income_capital_gains as number) || profile.income.capital_gains,
      },
      assets: {
        ...profile.assets,
        stocks: (ans.assets_stocks as number) || profile.assets.stocks,
        real_estate: (ans.assets_real_estate as number) || profile.assets.real_estate,
      },
      goals: Array.isArray(ans.goals) ? ans.goals as string[] : profile.goals,
    };
    setDone(true);
    setTimeout(() => onComplete(newProfile), 100);
  };

  const canSubmit = q.type === 'bool' ? boolVal !== null : q.type === 'multiselect' ? multiVal.length > 0 : inputVal.trim() !== '';

  if (done) return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="rounded-2xl p-8 text-center max-w-sm mx-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="text-5xl mb-3">🎉</div>
        <div className="font-bold text-lg mb-1">{tr.onboardingDone}</div>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{isHe ? 'הפרופיל שלך מוכן' : 'Your profile is ready'}</div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.65)' }}>
      <div className="rounded-2xl max-w-lg w-full mx-4 overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <div>
            <div className="font-bold">{tr.onboardingTitle}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.onboardingProgress} {step + 1} {tr.onboardingOf} {total}</div>
          </div>
          <button onClick={onClose} className="p-1 hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {/* Progress bar */}
        <div className="h-1" style={{ background: 'var(--border)' }}>
          <div className="h-1 transition-all duration-500" style={{ background: 'var(--accent)', width: `${((step + 1) / total) * 100}%` }} />
        </div>

        {/* Chat bubbles */}
        <div className="p-5 space-y-3" dir={isHe ? 'rtl' : 'ltr'}>
          {/* AI question bubble */}
          <div className={`flex gap-2 ${isHe ? 'flex-row-reverse' : ''}`}>
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm" style={{ background: 'var(--accent)' }}>💰</div>
            <div className="rounded-2xl px-4 py-2.5 max-w-xs text-sm" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              {isHe ? q.he : q.en}
            </div>
          </div>

          {/* Previous answers */}
          {step > 0 && Object.entries(answers).slice(-1).map(([k, v]) => (
            <div key={k} className={`flex gap-2 ${isHe ? '' : 'flex-row-reverse'}`}>
              <div className="rounded-2xl px-4 py-2.5 text-sm" style={{ background: 'var(--accent)', color: 'white' }}>
                {Array.isArray(v) ? (v as string[]).join(', ') : String(v === true ? (isHe ? 'כן' : 'Yes') : v === false ? (isHe ? 'לא' : 'No') : v)}
              </div>
            </div>
          ))}

          {/* Input area */}
          {q.type === 'bool' && (
            <div className="flex gap-2 justify-center mt-2">
              {[true, false].map(b => (
                <button key={String(b)} onClick={() => setBoolVal(b)}
                  className="px-6 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: boolVal === b ? 'var(--accent)' : 'var(--surface-2)',
                    color: boolVal === b ? 'white' : 'var(--text-muted)',
                    border: `1px solid ${boolVal === b ? 'var(--accent)' : 'var(--border)'}`,
                  }}>
                  {b ? (isHe ? 'כן' : 'Yes') : (isHe ? 'לא' : 'No')}
                </button>
              ))}
            </div>
          )}

          {q.type === 'multiselect' && (
            <div className="flex flex-wrap gap-2">
              {(isHe ? (q as {options_he?: string[]}).options_he || [] : (q as {options_en?: string[]}).options_en || []).map((opt: string) => (
                <button key={opt} onClick={() => setMultiVal(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: multiVal.includes(opt) ? 'var(--accent)' : 'var(--surface-2)',
                    color: multiVal.includes(opt) ? 'white' : 'var(--text-muted)',
                    border: `1px solid ${multiVal.includes(opt) ? 'var(--accent)' : 'var(--border)'}`,
                  }}>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {(q.type === 'text' || q.type === 'number') && (
            <input
              type={q.type === 'number' ? 'number' : 'text'}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canSubmit && submitAnswer()}
              placeholder={isHe ? (q as {hint_he?: string}).hint_he || '' : (q as {hint_en?: string}).hint_en || ''}
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            {tr.onboardingSkip}
          </button>
          <button onClick={submitAnswer} disabled={!canSubmit}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: 'var(--accent)', color: 'white' }}>
            {step < total - 1 ? tr.onboardingNext : tr.onboardingConfirm} {step < total - 1 ? '→' : '✓'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Scenario Diff ────────────────────────────────────────────────────────────
function ScenarioDiff({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const tr = useTranslation(lang);
  const isHe = lang === 'he';
  const [scenarios] = useState<Scenario[]>(() => {
    try { return JSON.parse(localStorage.getItem('tax_master_scenarios') || '[]'); } catch { return []; }
  });
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev
  );

  const selectedScenarios = selected.map(id => scenarios.find(s => s.id === id)).filter(Boolean) as Scenario[];

  const METRICS: Array<{
    label_he: string; label_en: string;
    getValue: (s: Scenario) => number | string;
    format: (v: number | string) => string;
    highlight?: 'high' | 'low';
  }> = [
    {
      label_he: 'מס יציאה מוערך', label_en: 'Estimated Exit Tax',
      getValue: s => s.analysis.exit_tax_analysis.exit_tax_estimate,
      format: v => `$${Math.round(v as number).toLocaleString()}`, highlight: 'low',
    },
    {
      label_he: 'מס ישראלי שנתי', label_en: 'Israeli Annual Tax',
      getValue: s => s.analysis.israel_annual_tax,
      format: v => `$${Math.round(v as number).toLocaleString()}`, highlight: 'low',
    },
    {
      label_he: 'יעד מומלץ #1', label_en: 'Top Recommended Country',
      getValue: s => isHe ? (s.analysis.country_recommendations[0]?.name || '—') : (s.analysis.country_recommendations[0]?.name_en || '—'),
      format: v => v as string,
    },
    {
      label_he: 'חיסכון שנתי (יעד #1)', label_en: 'Annual Saving (Top Country)',
      getValue: s => s.analysis.country_recommendations[0]?.annual_savings_vs_israel ?? 0,
      format: v => v ? `$${Math.round(v as number).toLocaleString()}` : '—', highlight: 'high',
    },
    {
      label_he: 'הכנסה שנתית', label_en: 'Total Annual Income',
      getValue: s => s.analysis.total_income_usd,
      format: v => `$${Math.round(v as number).toLocaleString()}`,
    },
    {
      label_he: 'סיכוני תושבות', label_en: 'Residency Risks',
      getValue: s => s.analysis.residency_risks.length,
      format: v => `${v} ${isHe ? 'סיכונים' : 'risks'}`, highlight: 'low',
    },
    {
      label_he: 'קרן השתלמות', label_en: 'Keren Hishtalmut',
      getValue: s => isHe ? s.analysis.kh_analysis.status_he : s.analysis.kh_analysis.status_en,
      format: v => v as string,
    },
    {
      label_he: 'שיעור מס יציאה', label_en: 'Exit Tax Rate',
      getValue: s => s.analysis.exit_tax_analysis.rate,
      format: v => `${(v as number * 100).toFixed(0)}%`, highlight: 'low',
    },
  ];

  if (scenarios.length === 0) return (
    <div className="border-b p-6 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="text-4xl mb-3">📂</div>
      <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>{tr.scenarioDiffNone}</p>
      <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{tr.cancel}</button>
    </div>
  );

  return (
    <div className="border-b overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '75vh' }}>
      <div className="max-w-5xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2"><GitCompare size={18} style={{ color: 'var(--accent)' }} />{tr.scenarioDiffTitle}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.scenarioDiffSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {/* Scenario selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {scenarios.map(s => (
            <button key={s.id} onClick={() => toggle(s.id)}
              className="px-3 py-2 rounded-xl text-xs font-medium transition-all text-left"
              style={{
                background: selected.includes(s.id) ? 'var(--accent)' : 'var(--surface-2)',
                color: selected.includes(s.id) ? 'white' : 'var(--text-muted)',
                border: `1px solid ${selected.includes(s.id) ? 'var(--accent)' : 'var(--border)'}`,
                opacity: !selected.includes(s.id) && selected.length >= 3 ? 0.4 : 1,
              }}>
              <div className="font-semibold">{s.name}</div>
              <div className="opacity-70">{new Date(s.savedAt).toLocaleDateString()}</div>
            </button>
          ))}
        </div>

        {selected.length < 2 && (
          <div className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>{tr.scenarioDiffSelectTwo}</div>
        )}

        {selectedScenarios.length >= 2 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--accent)' }}>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)', minWidth: 160 }}>
                    {isHe ? 'מדד' : 'Metric'}
                  </th>
                  {selectedScenarios.map(s => (
                    <th key={s.id} className="px-3 py-2.5 text-center text-sm font-bold">
                      {s.name}
                      <div className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                        {new Date(s.savedAt).toLocaleDateString()}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((metric, mi) => {
                  const vals = selectedScenarios.map(s => metric.getValue(s));
                  const nums = vals.map(v => typeof v === 'number' ? v : null);
                  const hasNums = nums.every(n => n !== null);
                  const bestVal = hasNums && metric.highlight
                    ? (metric.highlight === 'high' ? Math.max(...nums as number[]) : Math.min(...nums as number[]))
                    : null;
                  const worstVal = hasNums && metric.highlight
                    ? (metric.highlight === 'high' ? Math.min(...nums as number[]) : Math.max(...nums as number[]))
                    : null;

                  return (
                    <tr key={mi} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--text-muted)', background: 'var(--surface-2)' }}>
                        {isHe ? metric.label_he : metric.label_en}
                      </td>
                      {selectedScenarios.map((s, si) => {
                        const val = vals[si];
                        const num = nums[si];
                        const isBest = bestVal !== null && num === bestVal;
                        const isWorst = worstVal !== null && num === worstVal && bestVal !== worstVal;
                        // Diff vs first scenario
                        const baseNum = nums[0];
                        const diff = si > 0 && num !== null && baseNum !== null ? num - baseNum : null;
                        return (
                          <td key={s.id} className="px-3 py-2 text-center font-medium"
                            style={{
                              background: isBest ? 'rgba(16,185,129,0.08)' : isWorst ? 'rgba(239,68,68,0.05)' : 'var(--surface)',
                              color: isBest ? '#10b981' : isWorst ? '#ef4444' : 'var(--text)',
                            }}>
                            <div>{isBest && '★ '}{metric.format(val)}</div>
                            {diff !== null && diff !== 0 && (
                              <div className="text-xs mt-0.5" style={{
                                color: (metric.highlight === 'high' ? diff > 0 : diff < 0) ? '#10b981' : '#ef4444',
                              }}>
                                {diff > 0 ? '+' : ''}{metric.format(diff).replace('$', '$Δ')}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Document Checklist ───────────────────────────────────────────────────────
const CHECKLIST_ITEMS = [
  // Legal / Tax
  { id: 'form1348', cat: 'legal', daysBeforeMin: 0, daysBeforeMax: 30, he: 'הגש טופס 1348 — הצהרת עזיבה לרשות המסים', en: 'File Form 1348 — departure declaration to Tax Authority' },
  { id: 'exitTax100a', cat: 'legal', daysBeforeMin: -30, daysBeforeMax: 0, he: 'חשב מס יציאה סעיף 100א ובחר: תשלום מיידי / דחיה יחסית', en: 'Calculate Section 100A exit tax: pay now vs proportional deferral' },
  { id: 'taxRuling', cat: 'legal', daysBeforeMin: 90, daysBeforeMax: 180, he: 'קבל אישור מוקדם מרשות המסים (Private Ruling) לגבי תכנית', en: 'Obtain advance tax ruling from ITA on your plan' },
  { id: 'taxResidencyCert', cat: 'legal', daysBeforeMin: -90, daysBeforeMax: 30, he: 'קבל תעודת תושב מס ממדינת היעד (לצורך האמנה)', en: 'Obtain tax residency certificate from destination country (treaty)' },
  { id: 'israelTaxReturn', cat: 'legal', daysBeforeMin: -180, daysBeforeMax: -30, he: 'הגש דו"ח מס שנת הפרישה (עד 30 באפריל שנה הבאה)', en: 'File final Israeli tax return for departure year (by April 30 next year)' },
  // Financial
  { id: 'khWithdraw', cat: 'financial', daysBeforeMin: 30, daysBeforeMax: 180, he: 'משוך קרן השתלמות אם מעל 6 שנים — ללא מס (לפני הניתוק!)', en: 'Withdraw Keren Hishtalmut if 6+ years — tax-free before breaking residency' },
  { id: 'bankForeign', cat: 'financial', daysBeforeMin: 0, daysBeforeMax: 60, he: 'פתח חשבון "תושב חוץ" בבנק ישראלי (ריבית מוגבלת + ניכוי 15%)', en: 'Open "foreign resident" account at Israeli bank (15% withholding applies)' },
  { id: 'pensionStrategy', cat: 'financial', daysBeforeMin: 60, daysBeforeMax: 180, he: 'בחר אסטרטגיה לקרן פנסיה / קופת גמל / ביטוח מנהלים', en: 'Decide strategy for pension / Kupat Gemel / executive insurance' },
  { id: 'stockOptions', cat: 'financial', daysBeforeMin: 30, daysBeforeMax: 90, he: 'אפשרויות (options): מימוש לפני עזיבה או בחינת מיסוי חלקי', en: 'Stock options: exercise before departure or analyze partial taxation' },
  { id: 'foreignBankAcc', cat: 'financial', daysBeforeMin: 60, daysBeforeMax: 180, he: 'פתח חשבון בנק בחו"ל (קפריסין / UAE / אחר) לקבלת הכנסות', en: 'Open overseas bank account (Cyprus / UAE / other) for income receipt' },
  // Administrative
  { id: 'niiForm1510', cat: 'admin', daysBeforeMin: 0, daysBeforeMax: 30, he: 'הודע לביטוח לאומי על עזיבה (טופס 1510)', en: 'Notify National Insurance Institute of departure (Form 1510)' },
  { id: 'cancelKupatHolim', cat: 'admin', daysBeforeMin: 0, daysBeforeMax: 14, he: 'בטל חברות בקופת חולים (שים לב: תקופת המתנה לחזרה!)', en: 'Cancel Kupat Holim membership (note: waiting period if you return!)' },
  { id: 'cancelDriversLic', cat: 'admin', daysBeforeMin: -90, daysBeforeMax: 0, he: 'קבל רישיון נהיגה בינלאומי / המר לרישיון זר', en: 'Obtain international driver\'s license / convert to foreign license' },
  { id: 'postBox', cat: 'admin', daysBeforeMin: 0, daysBeforeMax: 30, he: 'הגדר כתובת למשלוח דואר בישראל (עורך דין / משפחה)', en: 'Arrange Israeli mailing address (lawyer / family)' },
  { id: 'registrar', cat: 'admin', daysBeforeMin: -60, daysBeforeMax: 30, he: 'עדכן כתובת במשרד הפנים / רשם האוכלוסין', en: 'Update address at Population Registry (Ministry of Interior)' },
  // Insurance & Health
  { id: 'internationalHealth', cat: 'insurance', daysBeforeMin: 30, daysBeforeMax: 90, he: 'רכוש ביטוח בריאות בינלאומי שמכסה גם ישראל', en: 'Purchase international health insurance (covers Israel too)' },
  { id: 'lifeInsurance', cat: 'insurance', daysBeforeMin: 30, daysBeforeMax: 90, he: 'בדוק פוליסת ביטוח חיים — האם תקפה בחו"ל?', en: 'Review life insurance policy — valid abroad?' },
  // Property
  { id: 'apartment', cat: 'property', daysBeforeMin: 90, daysBeforeMax: 365, he: 'החלט: מכור / השכר / שמור דירה בישראל (השלכות מס שונות)', en: 'Decide: sell / rent / keep Israeli apartment (different tax implications)' },
  { id: 'rentalTax', cat: 'property', daysBeforeMin: -90, daysBeforeMax: 0, he: 'אם משכיר: הגדר שיטת מיסוי השכרה (10% פטור vs פרוגרסיבי)', en: 'If renting out: elect tax method (10% flat vs progressive)' },
  { id: 'israelCompany', cat: 'property', daysBeforeMin: 60, daysBeforeMax: 180, he: 'טפל בחברה ישראלית: פירוק / מכירה / ניהול מחו"ל (CFC!)', en: 'Handle Israeli company: liquidate / sell / manage from abroad (CFC risk!)' },
];

type ChecklistStatus = 'pending' | 'done' | 'na';

function DocumentChecklist({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const tr = useTranslation(lang);
  const STORAGE_KEY = 'tax_master_checklist';
  const [statuses, setStatuses] = useState<Record<string, ChecklistStatus>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  });
  const [departureDate, setDepartureDate] = useState<string>(() =>
    localStorage.getItem('tax_master_departure_date') || ''
  );
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const daysLeft = useMemo(() => {
    if (!departureDate) return null;
    const diff = Math.ceil((new Date(departureDate).getTime() - Date.now()) / 86400000);
    return diff;
  }, [departureDate]);

  const saveStatus = (id: string, status: ChecklistStatus) => {
    const next = { ...statuses, [id]: status };
    setStatuses(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const saveDeparture = (v: string) => {
    setDepartureDate(v);
    localStorage.setItem('tax_master_departure_date', v);
  };

  const categories = [
    { key: 'all', label: lang === 'he' ? 'הכל' : 'All' },
    { key: 'legal', label: tr.docChecklistCatLegal },
    { key: 'financial', label: tr.docChecklistCatFinancial },
    { key: 'admin', label: tr.docChecklistCatAdmin },
    { key: 'insurance', label: tr.docChecklistCatInsurance },
    { key: 'property', label: tr.docChecklistCatProperty },
  ];

  const filtered = activeFilter === 'all' ? CHECKLIST_ITEMS : CHECKLIST_ITEMS.filter(i => i.cat === activeFilter);
  const doneCount = CHECKLIST_ITEMS.filter(i => statuses[i.id] === 'done').length;

  const urgency = (item: typeof CHECKLIST_ITEMS[0]) => {
    if (!daysLeft) return 'normal';
    const dbl = item.daysBeforeMax;
    if (dbl >= 0 && daysLeft <= dbl && daysLeft >= (item.daysBeforeMin >= 0 ? item.daysBeforeMin : 0)) return 'due';
    if (dbl < 0 && daysLeft <= Math.abs(dbl)) return 'overdue';
    return 'normal';
  };

  return (
    <div className="flex flex-col h-full" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <div className="flex-shrink-0 p-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
        <div>
          <h2 className="font-bold text-base">{tr.docChecklistTitle}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.docChecklistSubtitle}</p>
        </div>
        <button onClick={onClose}><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
      </div>

      {/* Progress + departure date */}
      <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap gap-4 items-center mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
              <span>{tr.docChecklistProgress}: {doneCount} {tr.docChecklistOf} {CHECKLIST_ITEMS.length} {tr.docChecklistCompleted}</span>
              <span>{Math.round(doneCount / CHECKLIST_ITEMS.length * 100)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div className="h-2 rounded-full transition-all duration-300"
                style={{ width: `${doneCount / CHECKLIST_ITEMS.length * 100}%`, background: 'var(--accent)' }} />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{tr.docChecklistDeparture}:</span>
            <input type="date" value={departureDate} onChange={e => saveDeparture(e.target.value)}
              className="text-xs rounded px-2 py-1 outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            {daysLeft !== null && (
              <span className="text-xs font-bold px-2 py-0.5 rounded"
                style={{ background: daysLeft < 30 ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.1)', color: daysLeft < 30 ? '#ef4444' : '#22c55e' }}>
                {daysLeft > 0 ? `${daysLeft} ${tr.docChecklistDaysLeft}` : lang === 'he' ? 'עברת!' : 'Past!'}
              </span>
            )}
          </div>
        </div>
        {/* Category filter */}
        <div className="flex gap-1 flex-wrap">
          {categories.map(c => (
            <button key={c.key} onClick={() => setActiveFilter(c.key)}
              className="text-xs px-2 py-1 rounded-full transition-all"
              style={{ background: activeFilter === c.key ? 'var(--accent)' : 'var(--surface-2)', color: activeFilter === c.key ? 'white' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtered.map(item => {
          const status = statuses[item.id] || 'pending';
          const urg = urgency(item);
          return (
            <div key={item.id} className="rounded-xl p-3 flex gap-3 items-start transition-all"
              style={{
                background: status === 'done' ? 'rgba(34,197,94,0.06)' : urg === 'due' ? 'rgba(251,191,36,0.08)' : urg === 'overdue' ? 'rgba(239,68,68,0.06)' : 'var(--surface-2)',
                border: `1px solid ${status === 'done' ? 'rgba(34,197,94,0.3)' : urg === 'due' ? 'rgba(251,191,36,0.4)' : urg === 'overdue' ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                opacity: status === 'na' ? 0.5 : 1,
              }}>
              <div className="flex flex-col gap-1 flex-shrink-0 mt-0.5">
                {(['done', 'pending', 'na'] as ChecklistStatus[]).map(s => (
                  <button key={s} onClick={() => saveStatus(item.id, s)}
                    title={s === 'done' ? tr.docChecklistDone : s === 'na' ? tr.docChecklistNa : tr.docChecklistPending}
                    className="w-5 h-5 rounded flex items-center justify-center text-xs transition-all"
                    style={{ background: status === s ? (s === 'done' ? '#22c55e' : s === 'na' ? '#64748b' : '#6366f1') : 'var(--border)', color: 'white' }}>
                    {s === 'done' ? '✓' : s === 'na' ? '—' : '○'}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: status === 'done' ? 'var(--text-muted)' : 'var(--text)', textDecoration: status === 'done' ? 'line-through' : 'none' }}>
                  {lang === 'he' ? item.he : item.en}
                </p>
                {daysLeft !== null && urg === 'due' && (
                  <span className="text-xs font-semibold mt-0.5" style={{ color: '#f59e0b' }}>
                    ⏰ {lang === 'he' ? 'בטווח הזמן — בצע עכשיו' : 'Due now — take action'}
                  </span>
                )}
                {daysLeft !== null && urg === 'overdue' && (
                  <span className="text-xs font-semibold mt-0.5" style={{ color: '#ef4444' }}>
                    ⚠️ {lang === 'he' ? 'כנראה הוחמצ — בדוק אם עדיין ניתן' : 'Possibly missed — check if still possible'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Exit Timing Calculator ────────────────────────────────────────────────────
interface TimingAsset {
  id: string;
  name: string;
  value: number;
  costBasis: number;
  acquisitionDate: string;
}

function ExitTimingCalculator({ lang, profile, onClose }: { lang: Lang; profile: UserProfile; onClose: () => void }) {
  const tr = useTranslation(lang);
  const [assets, setAssets] = useState<TimingAsset[]>([
    { id: '1', name: lang === 'he' ? 'מניות' : 'Stocks', value: 500000, costBasis: 200000, acquisitionDate: '2018-01-01' },
  ]);

  const addAsset = () => setAssets(prev => [...prev, { id: Date.now().toString(), name: '', value: 0, costBasis: 0, acquisitionDate: '' }]);
  const removeAsset = (id: string) => setAssets(prev => prev.filter(a => a.id !== id));
  const updateAsset = (id: string, field: keyof TimingAsset, val: string | number) =>
    setAssets(prev => prev.map(a => a.id === id ? { ...a, [field]: val } : a));

  const today = new Date();
  const daysInIsrael = profile.years_in_country * 365;

  const calcForDate = (exitDate: Date) => {
    let totalExitTax = 0;
    for (const a of assets) {
      if (!a.acquisitionDate || a.value <= a.costBasis) continue;
      const acqDate = new Date(a.acquisitionDate);
      const jan2003 = new Date('2003-01-01');
      const effectiveStart = acqDate < jan2003 ? jan2003 : acqDate;
      const totalDays = (exitDate.getTime() - effectiveStart.getTime()) / 86400000;
      const israeliDays = Math.min(totalDays, profile.years_in_country * 365);
      if (totalDays <= 0) continue;
      const israeliRatio = israeliDays / totalDays;
      const gain = a.value - a.costBasis;
      totalExitTax += gain * israeliRatio * 0.25;
    }
    return totalExitTax;
  };

  // Find optimal month in next 24 months
  const windows = useMemo(() => {
    const months: { label: string; date: Date; exitTax: number }[] = [];
    for (let m = 0; m < 24; m++) {
      const d = new Date(today.getFullYear(), today.getMonth() + m, 31);
      const label = d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { month: 'long', year: 'numeric' });
      months.push({ label, date: d, exitTax: calcForDate(d) });
    }
    return months;
  }, [assets, profile]);

  const exitTaxNow = calcForDate(today);
  const optimal = windows.reduce((best, w) => w.exitTax < best.exitTax ? w : best, windows[0]);
  const safeDays = 183 - Math.round((daysInIsrael % 365));

  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

  return (
    <div className="flex flex-col h-full" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <div className="flex-shrink-0 p-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
        <div>
          <h2 className="font-bold text-base">{tr.timingCalcTitle}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.timingCalcSubtitle}</p>
        </div>
        <button onClick={onClose}><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: tr.timingCalcExitTaxNow, value: fmt(exitTaxNow), color: '#ef4444' },
            { label: tr.timingCalcOptimalMonth, value: optimal?.label || '—', color: '#22c55e' },
            { label: tr.timingCalcExitTaxOptimal, value: fmt(optimal?.exitTax || 0), color: '#22c55e' },
            { label: tr.timingCalcSavingByWaiting, value: fmt(exitTaxNow - (optimal?.exitTax || 0)), color: '#6366f1' },
          ].map((k, i) => (
            <div key={i} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{k.label}</div>
              <div className="font-bold text-sm" style={{ color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Safe days */}
        <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)' }}>
          <Clock size={18} style={{ color: 'var(--accent)' }} />
          <div>
            <div className="text-sm font-semibold">{tr.timingCalcDaysSafe}: <span style={{ color: 'var(--accent)' }}>{Math.max(0, safeDays)} {lang === 'he' ? 'ימים' : 'days'}</span></div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.timingCalcTaxYearNote}</div>
          </div>
        </div>

        {/* Asset table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">{lang === 'he' ? 'נכסים' : 'Assets'}</h3>
            <button onClick={addAsset} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all hover:opacity-80"
              style={{ background: 'var(--accent)', color: 'white' }}>
              <Plus size={12} /> {tr.timingCalcAddAsset}
            </button>
          </div>
          <div className="space-y-2">
            {assets.map(a => (
              <div key={a.id} className="rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-2 items-center"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <input value={a.name} onChange={e => updateAsset(a.id, 'name', e.target.value)}
                  placeholder={tr.timingCalcName}
                  className="text-xs rounded px-2 py-1.5 outline-none col-span-2 md:col-span-1"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <input type="number" value={a.value || ''} onChange={e => updateAsset(a.id, 'value', Number(e.target.value))}
                  placeholder={tr.timingCalcValue}
                  className="text-xs rounded px-2 py-1.5 outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <input type="number" value={a.costBasis || ''} onChange={e => updateAsset(a.id, 'costBasis', Number(e.target.value))}
                  placeholder={tr.timingCalcCostBasis}
                  className="text-xs rounded px-2 py-1.5 outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <div className="flex items-center gap-2">
                  <input type="date" value={a.acquisitionDate} onChange={e => updateAsset(a.id, 'acquisitionDate', e.target.value)}
                    className="text-xs rounded px-2 py-1.5 outline-none flex-1"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                  <button onClick={() => removeAsset(a.id)} style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 24-month chart */}
        <div>
          <h3 className="text-sm font-semibold mb-2">{tr.timingCalcWindowsTitle}</h3>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={windows.map(w => ({ name: w.label.slice(0, 8), tax: Math.round(w.exitTax) }))} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, lang === 'he' ? 'מס יציאה' : 'Exit Tax']}
                  contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="tax" stroke="#6366f1" fill="rgba(99,102,241,0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tax Treaty Lookup ─────────────────────────────────────────────────────────
const TREATY_COUNTRIES: { code: string; name: (l: Lang) => string }[] = [
  { code: 'IL', name: (l: Lang) => l === 'he' ? 'ישראל 🇮🇱' : 'Israel 🇮🇱' },
  { code: 'US', name: (l: Lang) => l === 'he' ? 'ארה"ב 🇺🇸' : 'USA 🇺🇸' },
  { code: 'CY', name: (l: Lang) => l === 'he' ? 'קפריסין 🇨🇾' : 'Cyprus 🇨🇾' },
  { code: 'AE', name: (l: Lang) => l === 'he' ? 'UAE 🇦🇪' : 'UAE 🇦🇪' },
  { code: 'DE', name: (l: Lang) => l === 'he' ? 'גרמניה 🇩🇪' : 'Germany 🇩🇪' },
  { code: 'GB', name: (l: Lang) => l === 'he' ? 'בריטניה 🇬🇧' : 'UK 🇬🇧' },
  { code: 'FR', name: (l: Lang) => l === 'he' ? 'צרפת 🇫🇷' : 'France 🇫🇷' },
  { code: 'PT', name: (l: Lang) => l === 'he' ? 'פורטוגל 🇵🇹' : 'Portugal 🇵🇹' },
  { code: 'ES', name: (l: Lang) => l === 'he' ? 'ספרד 🇪🇸' : 'Spain 🇪🇸' },
  { code: 'NL', name: (l: Lang) => l === 'he' ? 'הולנד 🇳🇱' : 'Netherlands 🇳🇱' },
  { code: 'CH', name: (l: Lang) => l === 'he' ? 'שוויץ 🇨🇭' : 'Switzerland 🇨🇭' },
  { code: 'BG', name: (l: Lang) => l === 'he' ? 'בולגריה 🇧🇬' : 'Bulgaria 🇧🇬' },
  { code: 'HU', name: (l: Lang) => l === 'he' ? 'הונגריה 🇭🇺' : 'Hungary 🇭🇺' },
  { code: 'MT', name: (l: Lang) => l === 'he' ? 'מלטה 🇲🇹' : 'Malta 🇲🇹' },
  { code: 'GR', name: (l: Lang) => l === 'he' ? 'יוון 🇬🇷' : 'Greece 🇬🇷' },
  { code: 'AU', name: (l: Lang) => l === 'he' ? 'אוסטרליה 🇦🇺' : 'Australia 🇦🇺' },
  { code: 'CA', name: (l: Lang) => l === 'he' ? 'קנדה 🇨🇦' : 'Canada 🇨🇦' },
  { code: 'RO', name: (l: Lang) => l === 'he' ? 'רומניה 🇷🇴' : 'Romania 🇷🇴' },
  { code: 'GE', name: (l: Lang) => l === 'he' ? 'גאורגיה 🇬🇪' : 'Georgia 🇬🇪' },
  { code: 'MX', name: (l: Lang) => l === 'he' ? 'מקסיקו 🇲🇽' : 'Mexico 🇲🇽' },
  { code: 'UY', name: (l: Lang) => l === 'he' ? 'אורוגוואי 🇺🇾' : 'Uruguay 🇺🇾' },
  { code: 'TH', name: (l: Lang) => l === 'he' ? 'תאילנד 🇹🇭' : 'Thailand 🇹🇭' },
  { code: 'SG', name: (l: Lang) => l === 'he' ? 'סינגפור 🇸🇬' : 'Singapore 🇸🇬' },
];

interface TreatyData {
  dividend: string; interest: string; royalties: string; capGains: string; pension: string;
  note_he: string; note_en: string;
}

// Key: "FROM-TO" (source of income → recipient's residence)
const TREATIES: Record<string, TreatyData> = {
  'IL-US': { dividend: '12.5% / 25%', interest: '10% / 17.5%', royalties: '10% / 15%', capGains: 'כלל תושבות מקבל / Source-residence rule', pension: '15%', note_he: 'אמנה ישראל-ארה"ב 1975. US Person ממשיך לשלם מס ארה"ב בכל מקרה.', note_en: 'Israel-US treaty 1975. US persons always owe US tax regardless.' },
  'US-IL': { dividend: '12.5% / 25%', interest: '10% / 17.5%', royalties: '10% / 15%', capGains: 'מדינת התושבות / Residence country', pension: '15%', note_he: 'כנ"ל', note_en: 'Same treaty.' },
  'IL-CY': { dividend: '0%', interest: '0%', royalties: '0%', capGains: '0% (non-dom)', pension: '5%', note_he: 'אמנה ישראל-קפריסין. קפריסין non-dom: אפס על כמעט הכל. אחד מהטובים ביותר.', note_en: 'Israel-Cyprus treaty. Cyprus non-dom: zero on almost everything. One of the best.' },
  'CY-IL': { dividend: '0%', interest: '0%', royalties: '0%', capGains: '0%', pension: '5%', note_he: 'כנ"ל', note_en: 'Same.' },
  'IL-DE': { dividend: '5% / 10% / 25%', interest: '5%', royalties: '5%', capGains: '0% (תושב גרמניה)', pension: '10%', note_he: 'אמנה ישראל-גרמניה. רווחי הון פטור בגרמניה אם תושב גרמניה.', note_en: 'Israel-Germany treaty. Capital gains exempt in Germany if German resident.' },
  'IL-GB': { dividend: '5% / 10% / 15%', interest: '5%', royalties: '0% / 15%', capGains: 'מדינת תושבות', pension: '10% / 25%', note_he: 'אמנה ישראל-בריטניה. Non-dom בבריטניה — פטור על הכנסות מחוץ לבריטניה.', note_en: 'Israel-UK treaty. UK non-dom — exempt on foreign income not remitted.' },
  'IL-FR': { dividend: '5% / 10% / 15%', interest: '5%', royalties: '10%', capGains: 'מדינת תושבות', pension: '15%', note_he: 'אמנה ישראל-צרפת. ISF (מס עושר) עד 2018. PFU 30% על רווחי הון.', note_en: 'Israel-France treaty. PFU 30% flat on capital gains.' },
  'IL-PT': { dividend: '5% / 10% / 15%', interest: '10%', royalties: '10%', capGains: 'מדינת תושבות', pension: '10%', note_he: 'אמנה ישראל-פורטוגל. IFICI: 20% על הכנסות מקצועיות זרות.', note_en: 'Israel-Portugal treaty. IFICI regime: 20% flat on foreign professional income.' },
  'IL-NL': { dividend: '5% / 10% / 15%', interest: '5% / 10%', royalties: '5%', capGains: '0%', pension: '15%', note_he: 'אמנה ישראל-הולנד. Box 3 reform (2023): 36% על הכנסה רעיונית מנכסים.', note_en: 'Israel-Netherlands treaty. Box 3 reform ongoing.' },
  'IL-CH': { dividend: '5% / 10% / 25%', interest: '10%', royalties: '0%', capGains: '0%', pension: '15%', note_he: 'אמנה ישראל-שוויץ. Lump-sum taxation לעשירים. 0% רווחי הון לתושבים.', note_en: 'Israel-Switzerland treaty. Lump-sum for HNW. 0% CGT for residents.' },
  'IL-MT': { dividend: '5% / 10% / 15%', interest: '5% / 10%', royalties: '0%', capGains: 'מדינת תושבות', pension: '15%', note_he: 'אמנה ישראל-מלטה. Non-dom: הכנסה זרה שלא הועברה למלטה פטורה.', note_en: 'Israel-Malta treaty. Non-dom: foreign income not remitted to Malta is exempt.' },
  'IL-AE': { dividend: '0%', interest: '0%', royalties: '0%', capGains: '0%', pension: '0%', note_he: 'אמנה ישראל-UAE 2022 (אחרי הסכם אברהם). UAE: 0% על הכל.', note_en: 'Israel-UAE treaty 2022 (post Abraham Accords). UAE: 0% on everything.' },
  'IL-ES': { dividend: '5% / 10% / 15%', interest: '5% / 10%', royalties: '5% / 10%', capGains: 'מדינת תושבות', pension: '15%', note_he: 'אמנה ישראל-ספרד. Beckham Law: 24% פלאט ל-6 שנים.', note_en: 'Israel-Spain treaty. Beckham Law: 24% flat for 6 years.' },
  'IL-GR': { dividend: '25% / 5%', interest: '8% / 10%', royalties: '8% / 10%', capGains: 'מדינת תושבות', pension: '10%', note_he: 'אמנה ישראל-יוון. Non-dom €100K flat.', note_en: 'Israel-Greece treaty. Non-dom €100K flat tax on foreign income.' },
  'IL-HU': { dividend: '5% / 15%', interest: '0%', royalties: '0%', capGains: '0%', pension: '10%', note_he: 'אמנה ישראל-הונגריה. 15% מס הכנסה, 9% מס חברות (הנמוך ב-EU).', note_en: 'Israel-Hungary treaty. 15% income tax, 9% corp tax (lowest in EU).' },
  'IL-BG': { dividend: '5% / 10%', interest: '5% / 10%', royalties: '5% / 10%', capGains: '10%', pension: '10%', note_he: 'אמנה ישראל-בולגריה. 10% מס הכנסה פלאט, 5% על דיבידנד.', note_en: 'Israel-Bulgaria treaty. 10% flat income tax, 5% dividend.' },
  'IL-AU': { dividend: '5% / 10% / 15%', interest: '5% / 10%', royalties: '5%', capGains: '0%', pension: '15%', note_he: 'אמנה ישראל-אוסטרליה. CGT discount 50% לאחזקה מעל שנה.', note_en: 'Israel-Australia treaty. 50% CGT discount for assets held over 1 year.' },
  'IL-CA': { dividend: '5% / 10% / 15%', interest: '5% / 10%', royalties: '0% / 10%', capGains: '0%', pension: '15% / 25%', note_he: 'אמנה ישראל-קנדה. CGT: 50% מהשבח חייב.', note_en: 'Israel-Canada treaty. CGT: 50% of gain is taxable income.' },
  'IL-RO': { dividend: '5% / 10%', interest: '5% / 10%', royalties: '5% / 10%', capGains: 'מדינת תושבות', pension: '10%', note_he: 'אמנה ישראל-רומניה. דרכון רומני = EU. תושבות בבולגריה/קפריסין עם דרכון EU.', note_en: 'Israel-Romania treaty. Romanian passport = EU. Pair with Bulgaria/Cyprus.' },
  'IL-MX': { dividend: '5% / 10%', interest: '5% / 10%', royalties: '10%', capGains: 'מדינת תושבות', pension: '15%', note_he: 'אמנה ישראל-מקסיקו. טריטוריאלי בפועל: 0% על הכנסות מחו"ל.', note_en: 'Israel-Mexico treaty. Territorial in practice: 0% on foreign-source income.' },
  'IL-TH': { dividend: '10% / 15%', interest: '10% / 15%', royalties: '5% / 15%', capGains: 'מדינת תושבות', pension: '10% / 20%', note_he: 'אמנה ישראל-תאילנד. LTR visa: פטור על הכנסות זרות.', note_en: 'Israel-Thailand treaty. LTR visa: exempt on foreign-sourced income.' },
};

function TreatyLookupPanel({ lang, onAsk, onClose }: { lang: Lang; onAsk: (msg: string) => void; onClose: () => void }) {
  const tr = useTranslation(lang);
  const [from, setFrom] = useState('IL');
  const [to, setTo] = useState('CY');

  const key = `${from}-${to}`;
  const treaty = TREATIES[key] || TREATIES[`${to}-${from}`];
  const countryName = (code: string) => TREATY_COUNTRIES.find(c => c.code === code)?.name(lang) || code;

  const askAi = () => {
    const fromName = countryName(from);
    const toName = countryName(to);
    if (lang === 'he') {
      onAsk(`פרט לי את אמנת המס בין ${fromName} ל-${toName}: שיעורי ניכוי במקור על דיבידנד, ריבית, תמלוגים ורווחי הון. כולל תנאי ה-tie-breaker ואופטימיזציה למיגרנט ישראלי.`);
    } else {
      onAsk(`Explain the tax treaty between ${fromName} and ${toName} in detail: withholding rates for dividends, interest, royalties, and capital gains. Include tie-breaker rules and optimization for an Israeli migrant.`);
    }
    onClose();
  };

  const rows = [
    { label: tr.treatyDividend, val: treaty?.dividend, icon: '📈' },
    { label: tr.treatyInterest, val: treaty?.interest, icon: '💰' },
    { label: tr.treatyRoyalties, val: treaty?.royalties, icon: '©️' },
    { label: tr.treatyCapGains, val: treaty?.capGains, icon: '📊' },
    { label: tr.treatyPension, val: treaty?.pension, icon: '🏦' },
  ];

  return (
    <div className="flex flex-col h-full" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <div className="flex-shrink-0 p-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
        <div>
          <h2 className="font-bold text-base">{tr.treatyLookupTitle}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.treatyLookupSubtitle}</p>
        </div>
        <button onClick={onClose}><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Country selectors */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{tr.treatyFrom}</label>
            <select value={from} onChange={e => setFrom(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              {TREATY_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name(lang)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{tr.treatyTo}</label>
            <select value={to} onChange={e => setTo(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              {TREATY_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name(lang)}</option>)}
            </select>
          </div>
        </div>

        {/* Visual arrow */}
        <div className="flex items-center justify-center gap-3 text-sm font-medium">
          <span className="px-3 py-1.5 rounded-full text-sm" style={{ background: 'var(--accent)', color: 'white' }}>{countryName(from)}</span>
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <span className="px-3 py-1.5 rounded-full text-sm" style={{ background: 'var(--surface-2)', border: '1px solid var(--accent)', color: 'var(--accent)' }}>{countryName(to)}</span>
        </div>

        {treaty ? (
          <>
            {/* Rate rows */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {rows.map((r, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-3 ${i < rows.length - 1 ? 'border-b' : ''}`}
                  style={{ borderColor: 'var(--border)', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                  <div className="flex items-center gap-2 text-sm">
                    <span>{r.icon}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                  </div>
                  <span className="font-bold text-sm" style={{ color: 'var(--accent)' }}>{r.val || '—'}</span>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="rounded-xl p-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--accent)' }}>{tr.treatyNote}</div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {lang === 'he' ? treaty.note_he : treaty.note_en}
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div className="text-2xl mb-2">⚠️</div>
            <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>{tr.treatyNotFound}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{tr.treatyDomesticRate}</p>
          </div>
        )}

        <button onClick={askAi} className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{ background: 'var(--accent)', color: 'white' }}>
          🤖 {tr.treatyAskAi}
        </button>
      </div>
    </div>
  );
}

// ─── Country Tax Profiles ────────────────────────────────────────────────────

interface CountryTaxData {
  code: string; flag: string; name_he: string; name_en: string;
  incomeTax: string; capitalGains: string; dividendTax: string;
  corporateTax: string; vat: string; socialSecurity: string;
  taxSystem: 'territorial' | 'worldwide' | 'remittance';
  specialRegime_he: string; specialRegime_en: string;
  residencyDays: number; costIndex: number;
  notes_he: string; notes_en: string;
}

const COUNTRY_TAX_DATA: CountryTaxData[] = [
  { code:'UAE', flag:'🇦🇪', name_he:'איחוד האמירויות', name_en:'UAE', incomeTax:'0%', capitalGains:'0%', dividendTax:'0%', corporateTax:'9%', vat:'5%', socialSecurity:'0%', taxSystem:'territorial', specialRegime_he:'אין מס הכנסה אישי — חופשי לחלוטין', specialRegime_en:'Zero personal income tax on all individuals', residencyDays:183, costIndex:118, notes_he:'אין מס הכנסה אישי, אין מס רווחי הון, אין מס דיבידנד. מס חברות 9% הוכנס ב-2023 (ראשון 375K AED פטור). אמנת מס ישראל-UAE נחתמה 2022. מרכזי מסחר חינמיים (Free Zones) עם 0% מס חברות.', notes_en:'No personal income tax, no capital gains, no dividend tax. 9% corporate tax since 2023 (first 375K AED exempt). Israel–UAE tax treaty 2022. Free Zones offer 0% corporate tax.' },
  { code:'CY', flag:'🇨🇾', name_he:'קפריסין', name_en:'Cyprus', incomeTax:'0–35%', capitalGains:'0% (ני"ע)', dividendTax:'0% (non-dom)', corporateTax:'12.5%', vat:'19%', socialSecurity:'8.3%', taxSystem:'worldwide', specialRegime_he:'Non-Dom — פטור ממס SDC (17%) על דיבידנד וריבית מחו"ל ל-17 שנה', specialRegime_en:'Non-Dom — exempt from 17% SDC on foreign dividends/interest for 17 years', residencyDays:60, costIndex:84, notes_he:'כלל 60 הימים — תושבות מס קפריסאית ב-60 ימי שהייה אם אינך תושב מדינה אחרת. Non-Dom: 0% SDC על דיבידנד וריבית זרים לתקופה של 17 שנה. IP Box: 2.5% על הכנסות קניין רוחני. חבר האיחוד האירופי.', notes_en:'60-day rule — tax residency in 60 days if not resident elsewhere. Non-Dom: 0% SDC on foreign dividends & interest for 17 years. IP Box: 2.5% on qualifying IP. EU member.' },
  { code:'PT', flag:'🇵🇹', name_he:'פורטוגל', name_en:'Portugal', incomeTax:'13–48%', capitalGains:'28%', dividendTax:'28%', corporateTax:'21%', vat:'23%', socialSecurity:'11%', taxSystem:'worldwide', specialRegime_he:'IFICI — שיעור 20% שטוח ל-10 שנים לתושבים חדשים (יורש NHR)', specialRegime_en:'IFICI regime — 20% flat rate for 10 years for new residents (NHR successor)', residencyDays:183, costIndex:77, notes_he:'משטר IFICI (יורש NHR) — שיעור 20% שטוח על הכנסות מזכות ל-10 שנים. קריפטו פטור אם לא נסחר באופן תכוף. איכות חיים גבוהה, עלות מחיה נמוכה יחסית, חבר האיחוד האירופי. גולדן ויזה זמינה.', notes_en:'IFICI (NHR successor) — 20% flat rate on qualifying income for 10 years. Crypto exempt if not actively traded. High quality of life, low cost of living, EU member. Golden Visa available.' },
  { code:'MT', flag:'🇲🇹', name_he:'מלטה', name_en:'Malta', incomeTax:'0–35%', capitalGains:'0% (non-dom, חו"ל)', dividendTax:'0% (non-dom)', corporateTax:'5% (אפקטיבי)', vat:'18%', socialSecurity:'10%', taxSystem:'remittance', specialRegime_he:'Non-Dom — מס רק על הכנסות ממלטה + הכנסות שמועברות לחשבון מלטי', specialRegime_en:'Non-Dom — tax only on Malta-source income + remitted foreign income', residencyDays:183, costIndex:80, notes_he:'Non-Dom: תשלום מס רק על הכנסות ממלטה והכנסות שמועברות לחשבון בנק מלטי. מס חברות אפקטיבי 5% דרך מנגנון החזר לבעלי מניות. חבר האיחוד האירופי. תוכנית אזרחות בהשקעה.', notes_en:'Non-Dom: pay tax only on Malta income and remitted foreign income. Effective 5% corporate tax via shareholder refund. EU member. Citizenship by investment programme.' },
  { code:'GE', flag:'🇬🇪', name_he:'גיאורגיה', name_en:'Georgia', incomeTax:'20%', capitalGains:'0–20%', dividendTax:'5%', corporateTax:'15% (רווח מחולק)', vat:'18%', socialSecurity:'2%', taxSystem:'territorial', specialRegime_he:'Virtual Zone (0%) ל-IT, עסק קטן (1–3%) עד 500K GEL', specialRegime_en:'Virtual Zone (0%) for exported IT services, Small Business (1–3%)', residencyDays:183, costIndex:44, notes_he:'עלות מחיה נמוכה מאוד. Virtual Zone — 0% על הכנסות IT המיוצאות. עסק קטן — 1% על מחזור עד 500K GEL. מס חברות "אסטוני" — 0% על רווח שמורכב, 15% על חלוקה. אין מס על דיבידנד מחברות זרות.', notes_en:'Very low cost of living. Virtual Zone — 0% on exported IT revenue. Small Business — 1% on turnover up to 500K GEL. Estonian-model corp tax: 0% retained, 15% distributed. No tax on foreign dividends.' },
  { code:'SG', flag:'🇸🇬', name_he:'סינגפור', name_en:'Singapore', incomeTax:'0–24%', capitalGains:'0%', dividendTax:'0%', corporateTax:'17%', vat:'9% (GST)', socialSecurity:'20% (אזרחים/PR)', taxSystem:'territorial', specialRegime_he:'מיסוי טריטוריאלי — הכנסות מחו"ל פטורות בדרך כלל', specialRegime_en:'Territorial system — foreign-source income generally exempt', residencyDays:183, costIndex:135, notes_he:'0% רווחי הון, 0% דיבידנד (מיסוי חד-שכבתי). הכנסות ממקורות זרים פטורות בדרך כלל. מרכז פיננסי של אסיה. עלות מחיה גבוהה. CPF (ביטוח לאומי) רק לאזרחים ו-PR.', notes_en:'0% capital gains, 0% dividend (one-tier system). Foreign-source income generally exempt. Asia\'s financial hub. High cost of living. CPF only for citizens/PR.' },
  { code:'CH', flag:'🇨🇭', name_he:'שווייץ', name_en:'Switzerland', incomeTax:'8.5–45%', capitalGains:'0% (פרטי)', dividendTax:'35% (בר-השבה)', corporateTax:'12–21%', vat:'8.1%', socialSecurity:'5.3%', taxSystem:'worldwide', specialRegime_he:'Forfait (לומפ-סום) — מיסוי לפי הוצאות מחיה, לא לפי הכנסה', specialRegime_en:'Lump-sum (forfait) — taxed on living expenses, not actual income', residencyDays:90, costIndex:178, notes_he:'מיסוי לומפ-סום — אידאלי לעשירים עם הוצאות מחיה נמוכות בשווייץ. 0% רווחי הון מניות בידי משקיע פרטי. ניכוי מס 35% על דיבידנד — ניתן להחזר. יציבות פוליטית ומטבע.', notes_en:'Lump-sum taxation (forfait) — ideal for wealthy with low Swiss expenses. 0% capital gains on private holdings. 35% withholding on dividends — refundable. Political/currency stability.' },
  { code:'HU', flag:'🇭🇺', name_he:'הונגריה', name_en:'Hungary', incomeTax:'15% (שטוח)', capitalGains:'15%', dividendTax:'15% + 13% ביטוח', corporateTax:'9%', vat:'27%', socialSecurity:'18.5%', taxSystem:'worldwide', specialRegime_he:'מס חברות 9% — הנמוך ביותר באיחוד האירופי', specialRegime_en:'9% corporate tax — lowest in the EU', residencyDays:183, costIndex:63, notes_he:'מס הכנסה שטוח 15%, מס חברות 9% (הנמוך באיחוד האירופי). מע"מ 27% — הגבוה ביותר ב-EU. חבר האיחוד האירופי. עלות מחיה נמוכה יחסית לאירופה.', notes_en:'15% flat income tax, 9% corporate (lowest in EU). 27% VAT — highest in EU. EU member. Relatively low cost of living for Europe.' },
  { code:'EE', flag:'🇪🇪', name_he:'אסטוניה', name_en:'Estonia', incomeTax:'20%', capitalGains:'20% (בחלוקה)', dividendTax:'0% (רווח שמור)', corporateTax:'0%/20%', vat:'22%', socialSecurity:'33% (מעסיק)', taxSystem:'worldwide', specialRegime_he:'מס חברות 0% על רווח שמור — "המודל האסטוני"', specialRegime_en:'0% corporate tax on retained profits — the "Estonian Model"', residencyDays:183, costIndex:74, notes_he:'מס חברות ייחודי — 0% כל עוד לא מחלקים רווחים, 20% על חלוקה. e-Residency לניהול חברה אירופית מרחוק. חברה דיגיטלית מפותחת. חבר האיחוד האירופי.', notes_en:'Unique corporate tax — 0% on retained profits, 20% on distributed. e-Residency for remote EU business. Highly digital society. EU member.' },
  { code:'PA', flag:'🇵🇦', name_he:'פנמה', name_en:'Panama', incomeTax:'0–25%', capitalGains:'10% (נדל"ן)', dividendTax:'10%', corporateTax:'25%', vat:'7%', socialSecurity:'9%', taxSystem:'territorial', specialRegime_he:'טריטוריאלי מוחלט — הכנסות ממקור זר פטורות לחלוטין', specialRegime_en:'Pure territorial — all foreign-source income fully exempt', residencyDays:183, costIndex:70, notes_he:'מיסוי טריטוריאלי מוחלט — שום מס על הכנסות מחו"ל. ויזת Friendly Nations לתושבות מהירה. תוכנית פנסיונדו עם הנחות משמעותיות. מערכת בנקאות חזקה.', notes_en:'Pure territorial — zero tax on all foreign income. Friendly Nations Visa for fast residency. Pensionado programme with major discounts. Strong banking system.' },
  { code:'IL', flag:'🇮🇱', name_he:'ישראל', name_en:'Israel', incomeTax:'10–50%', capitalGains:'25–30%', dividendTax:'25–30%', corporateTax:'23%', vat:'17%', socialSecurity:'12%', taxSystem:'worldwide', specialRegime_he:'עולה חדש / תושב חוזר — פטור 10 שנה על הכנסות מחו"ל', specialRegime_en:'New Immigrant / Returning Resident — 10-year exemption on foreign income', residencyDays:0, costIndex:100, notes_he:'מיסוי כלל-עולמי. שיעורי מס גבוהים יחסית. פטור 10 שנה על הכנסות זרות לעולים ותושבים חוזרים. ביטוח לאומי 12% עד תקרה. מס שבח 25% על נדל"ן.', notes_en:'Worldwide taxation. Relatively high rates. 10-year foreign income exemption for new immigrants/returning residents. Social security 12% up to ceiling. 25% land appreciation tax.' },
];

function CountryProfilesPanel({ lang, onAsk, onClose }: { lang: Lang; onAsk: (msg: string) => void; onClose: () => void }) {
  const tr = useTranslation(lang);
  const [selected, setSelected] = useState<string | null>(null);
  const country = selected ? COUNTRY_TAX_DATA.find(c => c.code === selected) ?? null : null;

  const sysColor = (s: string) => s === 'territorial' ? '#10b981' : s === 'remittance' ? '#f59e0b' : '#ef4444';
  const sysLabel = (s: string) => {
    if (s === 'territorial') return lang === 'he' ? '🌍 טריטוריאלי' : '🌍 Territorial';
    if (s === 'remittance') return lang === 'he' ? '💸 העברה' : '💸 Remittance';
    return lang === 'he' ? '🌐 עולמי' : '🌐 Worldwide';
  };

  return (
    <div className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            {country && (
              <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-xs mb-1 hover:opacity-70" style={{ color: 'var(--accent)' }}>
                ← {lang === 'he' ? 'חזרה לרשימה' : 'Back to list'}
              </button>
            )}
            <h2 className="font-bold flex items-center gap-2">
              🗺️ {country ? (lang === 'he' ? country.name_he : country.name_en) : tr.countryProfiles}
            </h2>
            {!country && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.countryProfilesSubtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {!country ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {COUNTRY_TAX_DATA.map(c => (
              <button key={c.code} onClick={() => setSelected(c.code)}
                className="p-3 rounded-xl text-left transition-all hover:opacity-80"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="text-2xl mb-1">{c.flag}</div>
                <div className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{lang === 'he' ? c.name_he : c.name_en}</div>
                <div className="text-xs font-mono mt-1" style={{ color: sysColor(c.taxSystem) }}>{c.incomeTax}</div>
                <div className="mt-0.5" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{sysLabel(c.taxSystem)}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: lang === 'he' ? 'מס הכנסה' : 'Income Tax', v: country.incomeTax },
                { l: lang === 'he' ? 'רווחי הון' : 'Capital Gains', v: country.capitalGains },
                { l: lang === 'he' ? 'דיבידנד' : 'Dividend', v: country.dividendTax },
                { l: lang === 'he' ? 'מס חברות' : 'Corporate', v: country.corporateTax },
                { l: lang === 'he' ? 'מע"מ' : 'VAT/GST', v: country.vat },
                { l: lang === 'he' ? 'ביטוח לאומי' : 'Social Sec.', v: country.socialSecurity },
              ].map(row => (
                <div key={row.l} className="rounded-xl p-2.5 text-center" style={{ background: 'var(--surface-2)' }}>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.l}</div>
                  <div className="font-bold text-sm mt-0.5" style={{ color: 'var(--text)' }}>{row.v}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl p-2.5" style={{ background: 'var(--surface-2)' }}>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{lang === 'he' ? 'שיטת מיסוי' : 'Tax System'}</div>
                <div className="font-semibold text-sm mt-0.5" style={{ color: sysColor(country.taxSystem) }}>{sysLabel(country.taxSystem)}</div>
              </div>
              <div className="flex-1 rounded-xl p-2.5" style={{ background: 'var(--surface-2)' }}>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{lang === 'he' ? 'ימי תושבות' : 'Residency Days'}</div>
                <div className="font-bold text-sm mt-0.5" style={{ color: 'var(--text)' }}>
                  {country.residencyDays === 0 ? (lang === 'he' ? 'מבחן מרכז חיים' : 'Center of life') : `${country.residencyDays}`}
                </div>
              </div>
              <div className="flex-1 rounded-xl p-2.5" style={{ background: 'var(--surface-2)' }}>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{lang === 'he' ? 'יוקר מחיה' : 'Cost (IL=100)'}</div>
                <div className="font-bold text-sm mt-0.5" style={{ color: country.costIndex > 100 ? '#ef4444' : '#10b981' }}>{country.costIndex}</div>
              </div>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--accent)' }}>✨ {lang === 'he' ? 'משטר מיוחד' : 'Special Regime'}</div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text)' }}>{lang === 'he' ? country.specialRegime_he : country.specialRegime_en}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{lang === 'he' ? country.notes_he : country.notes_en}</p>
            </div>
            <button
              onClick={() => {
                onAsk(lang === 'he'
                  ? `ספר לי בפירוט על מיסוי ב${country.name_he} — דרישות לתושבות מס, אילו הכנסות חייבות, ומה המשמעות לישראלי שעובר לגור שם?`
                  : `Tell me in detail about taxation in ${country.name_en} — tax residency requirements, taxable income types, and what it means for an Israeli moving there.`);
                onClose();
              }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: 'var(--accent)', color: 'white' }}>
              🤖 {lang === 'he' ? 'שאל AI על מדינה זו' : 'Ask AI about this country'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Real Estate Tax Calculator (מחשבון מס שבח) ────────────────────────────────

const REFORM_DATE = new Date('2014-01-01').getTime();
const PRIMARY_CEILING = 4846000;

function RealEstateCalcPanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const tr = useTranslation(lang);
  const today = new Date().toISOString().slice(0, 10);
  const [purchaseDate, setPurchaseDate] = useState('2010-06-01');
  const [purchasePrice, setPurchasePrice] = useState('1200000');
  const [saleDate, setSaleDate] = useState(today);
  const [salePrice, setSalePrice] = useState('3000000');
  const [improvements, setImprovements] = useState('0');
  const [bettermentLevy, setBettermentLevy] = useState('0');
  const [isPrimary, setIsPrimary] = useState(false);

  const result = useMemo(() => {
    const pMs = new Date(purchaseDate).getTime();
    const sMs = new Date(saleDate).getTime();
    const pp = parseFloat(purchasePrice) || 0;
    const sp = parseFloat(salePrice) || 0;
    const imp = parseFloat(improvements) || 0;
    const levy = parseFloat(bettermentLevy) || 0;
    if (!pMs || !sMs || sMs <= pMs || pp <= 0 || sp <= 0) return null;

    const gain = sp - pp - imp;

    // Linear exemption — pre-2014 holding is exempt
    let linearExempt = 0;
    if (pMs < REFORM_DATE && gain > 0) {
      const totalMs = sMs - pMs;
      const pre2014Ms = REFORM_DATE - pMs;
      linearExempt = gain * (pre2014Ms / totalMs);
    }

    const taxableGain = Math.max(0, gain - linearExempt);

    // Primary residence exemption
    let taxDue = 0;
    if (isPrimary && sp <= PRIMARY_CEILING) {
      taxDue = 0;
    } else if (isPrimary && sp > PRIMARY_CEILING) {
      const excessRatio = (sp - PRIMARY_CEILING) / sp;
      taxDue = taxableGain * excessRatio * 0.25;
    } else {
      taxDue = taxableGain * 0.25;
    }
    taxDue = Math.max(0, taxDue - levy);
    const effectiveRate = gain > 0 ? (taxDue / gain) * 100 : 0;
    return { gain, linearExempt, taxableGain, taxDue, effectiveRate, isLoss: gain <= 0 };
  }, [purchaseDate, purchasePrice, saleDate, salePrice, improvements, bettermentLevy, isPrimary]);

  const fmt = (n: number) => Math.round(n).toLocaleString('he-IL');
  const fmtInput = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => setter(e.target.value);
  const inputStyle = { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' };

  return (
    <div className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold flex items-center gap-2">🏠 {tr.realEstateTitle}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.realEstateSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          {([
            [tr.rePurchaseDate, purchaseDate, setPurchaseDate, 'date'],
            [tr.rePurchasePrice, purchasePrice, setPurchasePrice, 'number'],
            [tr.reSaleDate, saleDate, setSaleDate, 'date'],
            [tr.reSalePrice, salePrice, setSalePrice, 'number'],
            [tr.reImprovements, improvements, setImprovements, 'number'],
            [tr.reBettermentLevy, bettermentLevy, setBettermentLevy, 'number'],
          ] as [string, string, (v: string) => void, string][]).map(([label, val, setter, type]) => (
            <div key={label}>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
              <input type={type} value={val} onChange={fmtInput(setter)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle} />
            </div>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer mb-4">
          <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)}
            className="w-4 h-4" style={{ accentColor: 'var(--accent)' }} />
          <span className="text-sm" style={{ color: 'var(--text)' }}>{tr.reIsPrimary}</span>
        </label>

        {result && !result.isLoss && (
          <div className="space-y-2">
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{tr.reBreakdown}</div>
            {[
              { label: tr.reGain, value: `₪${fmt(result.gain)}`, color: 'var(--text)' },
              ...(result.linearExempt > 0 ? [{ label: tr.reLinearExempt, value: `-₪${fmt(result.linearExempt)}`, color: '#10b981' }] : []),
              { label: tr.reTaxableGain, value: `₪${fmt(result.taxableGain)}`, color: 'var(--text)' },
              ...(isPrimary ? [{ label: tr.rePrimaryExempt, value: lang === 'he' ? 'חל (עד ₪4,846,000)' : 'Applies (up to ₪4,846,000)', color: '#10b981' }] : []),
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center px-3 py-2 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                <span className="text-sm font-semibold" style={{ color: row.color }}>{row.value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center px-4 py-3 rounded-xl"
              style={{ background: result.taxDue === 0 ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)', border: `1px solid ${result.taxDue === 0 ? '#10b981' : 'var(--accent)'}` }}>
              <span className="font-bold" style={{ color: 'var(--text)' }}>{tr.reTaxDue}</span>
              <div className="text-right">
                <div className="font-bold text-xl" style={{ color: result.taxDue === 0 ? '#10b981' : 'var(--accent)' }}>
                  {result.taxDue === 0 ? (lang === 'he' ? 'פטור מלא! 🎉' : 'Fully Exempt! 🎉') : `₪${fmt(result.taxDue)}`}
                </div>
                {result.taxDue > 0 && (
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{result.effectiveRate.toFixed(1)}% {lang === 'he' ? 'מהרווח' : 'of gain'}</div>
                )}
              </div>
            </div>
            {new Date(purchaseDate) < new Date('2014-01-01') && (
              <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>ℹ️ {tr.reLinearNote}</p>
            )}
          </div>
        )}
        {result?.isLoss && (
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid #10b981' }}>
            <p className="text-sm font-semibold" style={{ color: '#10b981' }}>
              {lang === 'he' ? '🎉 אין רווח — אין מס שבח' : '🎉 No gain — no tax due'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pension & Funds Calculator ──────────────────────────────────────────────

function PensionCalcPanel({ lang, onAsk, onClose }: { lang: Lang; onAsk: (msg: string) => void; onClose: () => void }) {
  const tr = useTranslation(lang);
  const [tab, setTab] = useState<'kh' | 'pension' | 'gemel'>('kh');
  const [khBalance, setKhBalance] = useState('200000');
  const [khYears, setKhYears] = useState('4.5');
  const [khMonthly, setKhMonthly] = useState('1500');
  const [pensionBalance, setPensionBalance] = useState('600000');
  const [pensionAge, setPensionAge] = useState('42');
  const [pensionMonthly, setPensionMonthly] = useState('3500');
  const [gemelBalance, setGemelBalance] = useState('200000');
  const [gemelCost, setGemelCost] = useState('130000');
  const [gemelPre2008, setGemelPre2008] = useState(false);

  const khResult = useMemo(() => {
    const bal = parseFloat(khBalance) || 0;
    const yrs = parseFloat(khYears) || 0;
    const monthly = parseFloat(khMonthly) || 0;
    const yearsLeft = Math.max(0, 6 - yrs);
    const isVested = yrs >= 6;
    const futureIfWait = yearsLeft > 0
      ? bal * Math.pow(1.05, yearsLeft) + monthly * 12 * ((Math.pow(1.05, yearsLeft) - 1) / 0.05)
      : bal;
    const taxEarly = bal * 0.42;
    const netEarly = bal - taxEarly;
    return { bal, yearsLeft, isVested, futureIfWait, taxEarly, netEarly };
  }, [khBalance, khYears, khMonthly]);

  const pensionResult = useMemo(() => {
    const bal = parseFloat(pensionBalance) || 0;
    const age = parseFloat(pensionAge) || 0;
    const monthly = parseFloat(pensionMonthly) || 0;
    const yrs = Math.max(0, 67 - age);
    const r = 0.055;
    const fv = bal * Math.pow(1 + r, yrs) + (yrs > 0 ? monthly * 12 * ((Math.pow(1 + r, yrs) - 1) / r) : 0);
    const monthlyPension = fv / 240;
    return { bal, yrs, fv, monthlyPension };
  }, [pensionBalance, pensionAge, pensionMonthly]);

  const gemelResult = useMemo(() => {
    const bal = parseFloat(gemelBalance) || 0;
    const cost = parseFloat(gemelCost) || 0;
    const nomGain = Math.max(0, bal - cost);
    const realGain = nomGain * 0.8;
    const taxRate = gemelPre2008 ? 0.15 : 0.25;
    const taxDue = realGain * taxRate;
    const net = bal - taxDue;
    const effectiveRate = bal > 0 ? (taxDue / bal) * 100 : 0;
    return { bal, nomGain, realGain, taxDue, net, effectiveRate };
  }, [gemelBalance, gemelCost, gemelPre2008]);

  const fmt = (n: number) => Math.round(n).toLocaleString('he-IL');
  const inp = (s: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => s(e.target.value);
  const iStyle = { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' };
  const tabDefs = [
    { id: 'kh' as const, label: lang === 'he' ? 'קרן השתלמות' : 'Training Fund' },
    { id: 'pension' as const, label: lang === 'he' ? 'קרן פנסיה' : 'Pension Fund' },
    { id: 'gemel' as const, label: lang === 'he' ? 'קופת גמל' : 'Provident Fund' },
  ];

  const Row = ({ l, v, c }: { l: string; v: string; c: string }) => (
    <div className="flex justify-between items-center px-3 py-2 rounded-lg" style={{ background: 'var(--surface-2)' }}>
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{l}</span>
      <span className="text-sm font-semibold" style={{ color: c }}>{v}</span>
    </div>
  );

  const Note = ({ text }: { text: string }) => (
    <div className="rounded-xl p-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{text}</p>
    </div>
  );

  return (
    <div className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold flex items-center gap-2"><PiggyBank size={16} style={{ color: 'var(--accent)' }} /> {tr.pensionCalcTitle}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.pensionCalcSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: 'var(--surface-2)' }}>
          {tabDefs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: tab === t.id ? 'var(--accent)' : 'transparent', color: tab === t.id ? 'white' : 'var(--text-muted)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── KH ── */}
        {tab === 'kh' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>{lang === 'he' ? 'יתרת הקרן (₪)' : 'Fund Balance (₪)'}</label>
                <input type="number" value={khBalance} onChange={inp(setKhBalance)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={iStyle} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>{lang === 'he' ? 'שנות ותק' : 'Years of Tenure'}</label>
                <input type="number" step="0.5" value={khYears} onChange={inp(setKhYears)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={iStyle} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>{lang === 'he' ? 'הפקדה חודשית (₪)' : 'Monthly Deposit (₪)'}</label>
                <input type="number" value={khMonthly} onChange={inp(setKhMonthly)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={iStyle} />
              </div>
              <div className="flex items-end pb-0.5">
                <div className="w-full rounded-xl p-2.5 text-center" style={{ background: khResult.isVested ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)', border: `1px solid ${khResult.isVested ? '#10b981' : '#ef4444'}` }}>
                  <div className="text-xs font-semibold" style={{ color: khResult.isVested ? '#10b981' : '#ef4444' }}>
                    {khResult.isVested
                      ? (lang === 'he' ? '✅ הקרן בשלה!' : '✅ Fully Vested!')
                      : `⏳ ${lang === 'he' ? 'עוד' : ''} ${khResult.yearsLeft.toFixed(1)} ${lang === 'he' ? 'שנים' : 'yrs left'}`}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {khResult.isVested ? (
                <>
                  <Row l={lang === 'he' ? '✅ זמינה ללא מס' : '✅ Available tax-free'} v={`₪${fmt(khResult.bal)}`} c="#10b981" />
                  <Row l={lang === 'he' ? '💡 המלצה' : '💡 Recommendation'} v={lang === 'he' ? 'משוך לפני ניתוק תושבות!' : 'Withdraw before breaking residency!'} c="var(--accent)" />
                </>
              ) : (
                <>
                  <Row l={lang === 'he' ? '⚠️ מס על משיכה מוקדמת (~42%)' : '⚠️ Early withdrawal tax (~42%)'} v={`₪${fmt(khResult.taxEarly)}`} c="#ef4444" />
                  <Row l={lang === 'he' ? 'נטו עכשיו (לא מומלץ)' : 'Net now (not recommended)'} v={`₪${fmt(khResult.netEarly)}`} c="var(--text)" />
                  <Row l={lang === 'he' ? '✅ צפי לאחר הבשלה (5%/שנה)' : '✅ Projected when vested (5%/yr)'} v={`₪${fmt(khResult.futureIfWait)}`} c="#10b981" />
                </>
              )}
            </div>

            <Note text={lang === 'he'
              ? 'קרן שהגיעה לבשלות (6 שנות ותק) — עדיף למשוך לפני ניתוק תושבות ישראלית. משיכה לאחר ניתוק עלולה לחייב ניכוי מס 25% במקור. קרן שלא הגיעה לבשלות — שקול להשאיר עד לבשלות.'
              : 'Vested KH fund (6+ years) — best to withdraw before breaking Israeli residency. Post-residency withdrawals may face 25% withholding. Unvested fund — consider leaving until maturity.'} />

            <button onClick={() => { onAsk(lang === 'he' ? `מה קורה לקרן השתלמות שלי (יתרה ₪${fmt(khResult.bal)}, ותק ${khYears} שנים) כשאני מנתק תושבות ישראלית? מתי עדיף למשוך?` : `What happens to my Training Fund (₪${fmt(khResult.bal)}, ${khYears} yrs) when I break Israeli residency? When to withdraw?`); onClose(); }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold hover:opacity-80" style={{ background: 'var(--accent)', color: 'white' }}>
              🤖 {lang === 'he' ? 'שאל AI על קרן השתלמות' : 'Ask AI about Training Fund'}
            </button>
          </div>
        )}

        {/* ── Pension ── */}
        {tab === 'pension' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {([
                [lang === 'he' ? 'יתרה נצברת (₪)' : 'Accumulated (₪)', pensionBalance, setPensionBalance],
                [lang === 'he' ? 'גיל נוכחי' : 'Current Age', pensionAge, setPensionAge],
                [lang === 'he' ? 'הפקדה חודשית (₪)' : 'Monthly Deposit (₪)', pensionMonthly, setPensionMonthly],
              ] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
                <div key={label}>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
                  <input type="number" value={val} onChange={inp(setter)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={iStyle} />
                </div>
              ))}
              <div className="rounded-xl p-2.5 text-center flex flex-col justify-center" style={{ background: 'var(--surface-2)' }}>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{lang === 'he' ? 'שנים עד פרישה (67)' : 'Years to retirement (67)'}</div>
                <div className="font-bold text-2xl" style={{ color: 'var(--accent)' }}>{pensionResult.yrs}</div>
              </div>
            </div>

            <div className="space-y-2">
              <Row l={lang === 'he' ? 'יתרה צפויה בגיל 67 (5.5%/שנה)' : 'Projected balance at 67 (5.5%/yr)'} v={`₪${fmt(pensionResult.fv)}`} c="#10b981" />
              <Row l={lang === 'he' ? 'פנסיה חודשית צפויה' : 'Est. monthly pension'} v={`₪${fmt(pensionResult.monthlyPension)}/חודש`} c="var(--accent)" />
            </div>

            <Note text={lang === 'he'
              ? 'קרן פנסיה אינה ניתנת למשיכה לפני גיל 67 ללא קנס כבד. ביציאה מישראל — עדיף להשאיר את הקרן ולקבל פנסיה בגיל פרישה. תשלומי פנסיה ממוסים לפי אמנת המס בין ישראל למדינת התושבות החדשה.'
              : 'Pension funds cannot be withdrawn before age 67 without heavy penalties. On leaving Israel — best to leave the fund and receive pension at retirement. Pension payments are taxed per the Israel–residency country tax treaty.'} />

            <button onClick={() => { onAsk(lang === 'he' ? `מה קורה לקרן פנסיה ישראלית כשמנתקים תושבות? האם ניתן לקבל פנסיה ישראלית כשגר בחו"ל ואיך ממוסה?` : `What happens to an Israeli pension fund when breaking residency? Can I receive Israeli pension abroad and how is it taxed?`); onClose(); }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold hover:opacity-80" style={{ background: 'var(--accent)', color: 'white' }}>
              🤖 {lang === 'he' ? 'שאל AI על קרן פנסיה' : 'Ask AI about Pension Fund'}
            </button>
          </div>
        )}

        {/* ── Gemel ── */}
        {tab === 'gemel' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>{lang === 'he' ? 'יתרת הקופה (₪)' : 'Fund Balance (₪)'}</label>
                <input type="number" value={gemelBalance} onChange={inp(setGemelBalance)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={iStyle} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>{lang === 'he' ? 'עלות — הפקדות שלך (₪)' : 'Cost Basis — your deposits (₪)'}</label>
                <input type="number" value={gemelCost} onChange={inp(setGemelCost)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={iStyle} />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={gemelPre2008} onChange={e => setGemelPre2008(e.target.checked)} className="w-4 h-4" style={{ accentColor: 'var(--accent)' }} />
              <span className="text-sm" style={{ color: 'var(--text)' }}>{lang === 'he' ? 'קופה ישנה (נפתחה לפני 2008) — מס 15%' : 'Old fund (opened pre-2008) — 15% tax rate'}</span>
            </label>

            <div className="space-y-2">
              <Row l={lang === 'he' ? 'רווח נומינלי' : 'Nominal Gain'} v={`₪${fmt(gemelResult.nomGain)}`} c="var(--text)" />
              <Row l={lang === 'he' ? `מס ${gemelPre2008 ? '15' : '25'}% על הרווח הריאלי` : `${gemelPre2008 ? '15' : '25'}% tax on real gain`} v={`₪${fmt(gemelResult.taxDue)}`} c="#ef4444" />
              <Row l={lang === 'he' ? 'שיעור מס אפקטיבי' : 'Effective tax rate'} v={`${gemelResult.effectiveRate.toFixed(1)}%`} c="var(--text-muted)" />
              <div className="flex justify-between items-center px-4 py-3 rounded-xl"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid var(--accent)' }}>
                <span className="font-bold" style={{ color: 'var(--text)' }}>{lang === 'he' ? 'נטו לאחר מס' : 'Net After Tax'}</span>
                <span className="font-bold text-xl" style={{ color: 'var(--accent)' }}>₪{fmt(gemelResult.net)}</span>
              </div>
            </div>

            <Note text={lang === 'he'
              ? 'קופת גמל חדשה (מ-2008) — כלל ניתנת למשיכה כקצבה בלבד בגיל פרישה. בעזיבת ישראל: ניתן לפדות בנסיבות מיוחדות בהגשת בקשה לפקיד שומה. מוטל מס 25% (15% לקופה ישנה) על הרווח הריאלי. קופה ישנה (לפני 2008) — ניתנת לפדיון בתנאים מסוימים.'
              : 'Post-2008 provident fund — generally can only be withdrawn as annuity at retirement. On leaving Israel: can redeem under special circumstances by applying to the tax authority. 25% tax (15% for old funds) on real gain. Old funds (pre-2008) — can be redeemed under certain conditions.'} />

            <button onClick={() => { onAsk(lang === 'he' ? `איך פודים קופת גמל ישראלית בעת עזיבת ישראל? מה התהליך, אילו טפסים צריך, ומה המיסוי?` : `How do I redeem an Israeli provident fund (kupat gemel) when leaving Israel? What's the process and tax?`); onClose(); }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold hover:opacity-80" style={{ background: 'var(--accent)', color: 'white' }}>
              🤖 {lang === 'he' ? 'שאל AI על קופת גמל' : 'Ask AI about Provident Fund'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section 100A Exit Tax Calculator ─────────────────────────────────────────
interface S100Asset { id: number; name: string; purchaseDate: string; costBasis: number; fmv: number; }

function Section100APanel({ lang, onAsk, onClose }: { lang: Lang; onAsk: (msg: string) => void; onClose: () => void }) {
  const tr = useTranslation(lang);
  const [exitDate, setExitDate] = useState(new Date().toISOString().slice(0, 10));
  const [assets, setAssets] = useState<S100Asset[]>([
    { id: 1, name: lang === 'he' ? 'מניות ניירות ערך' : 'Stock Portfolio', purchaseDate: '2015-01-01', costBasis: 500000, fmv: 1200000 },
  ]);
  const nextId = useRef(2);

  const addAsset = () => {
    setAssets(a => [...a, { id: nextId.current++, name: '', purchaseDate: '2018-01-01', costBasis: 0, fmv: 0 }]);
  };
  const removeAsset = (id: number) => setAssets(a => a.filter(x => x.id !== id));
  const updateAsset = (id: number, field: keyof S100Asset, value: string | number) =>
    setAssets(a => a.map(x => x.id === id ? { ...x, [field]: value } : x));

  const PRE_2003 = new Date('2003-01-01').getTime();

  const results = useMemo(() => assets.map(a => {
    const purchaseMs = new Date(a.purchaseDate).getTime();
    const exitMs = new Date(exitDate).getTime();
    const rawGain = Math.max(0, a.fmv - a.costBasis);

    let taxableGain = rawGain;
    if (purchaseMs < PRE_2003) {
      const totalDays = (exitMs - purchaseMs) / 86400000;
      const pre2003Days = (PRE_2003 - purchaseMs) / 86400000;
      const exemptRatio = totalDays > 0 ? Math.min(pre2003Days / totalDays, 1) : 0;
      taxableGain = rawGain * (1 - exemptRatio);
    }
    return { ...a, rawGain, taxableGain, tax: Math.round(taxableGain * 0.25) };
  }), [assets, exitDate]);

  const totalTax = results.reduce((s, r) => s + r.tax, 0);
  const fmt = (n: number) => '₪' + n.toLocaleString('he-IL');

  const Row = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <div className="flex justify-between items-center py-1 text-sm border-b" style={{ borderColor: 'var(--border)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="font-semibold" style={{ color: color || 'var(--text)' }}>{value}</span>
    </div>
  );

  return (
    <div className="border-b overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '65vh' }}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Calculator size={18} style={{ color: 'var(--accent)' }} />
              {tr.section100aTitle}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.section100aSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {/* Exit date */}
        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-muted)' }}>{tr.s100ExitDate}</label>
          <input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </div>

        {/* Asset list */}
        <div className="space-y-3 mb-4">
          {assets.map(a => (
            <div key={a.id} className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <input value={a.name} onChange={e => updateAsset(a.id, 'name', e.target.value)}
                  placeholder={tr.s100AssetName}
                  className="font-semibold text-sm bg-transparent outline-none flex-1"
                  style={{ color: 'var(--text)' }} />
                {assets.length > 1 && (
                  <button onClick={() => removeAsset(a.id)} className="text-xs hover:opacity-70 ml-2" style={{ color: '#ef4444' }}>{tr.s100Remove}</button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: tr.s100PurchaseDate, field: 'purchaseDate' as const, type: 'date', val: a.purchaseDate },
                  { label: tr.s100CostBasis, field: 'costBasis' as const, type: 'number', val: a.costBasis },
                  { label: tr.s100CurrentFMV, field: 'fmv' as const, type: 'number', val: a.fmv },
                ].map(({ label, field, type, val }) => (
                  <div key={field}>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
                    <input type={type} value={val}
                      onChange={e => updateAsset(a.id, field, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button onClick={addAsset} className="w-full py-2 rounded-xl text-sm font-semibold mb-4 hover:opacity-80 transition-opacity"
          style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px dashed var(--accent)' }}>
          + {tr.s100AddAsset}
        </button>

        {/* Results table */}
        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold text-sm mb-3">{lang === 'he' ? 'תוצאות' : 'Results'}</h3>
          {results.map(r => (
            <div key={r.id} className="mb-3 pb-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
              <div className="font-medium text-sm mb-1">{r.name || `Asset ${r.id}`}</div>
              <Row label={tr.s100TotalGain} value={fmt(r.rawGain)} />
              {new Date(r.purchaseDate).getTime() < PRE_2003 && (
                <Row label={lang === 'he' ? 'ניכוי פטור (לפני 2003)' : 'Exempt portion (pre-2003)'} value={fmt(r.rawGain - r.taxableGain)} color="#10b981" />
              )}
              <Row label={lang === 'he' ? 'שבח חייב' : 'Taxable gain'} value={fmt(r.taxableGain)} />
              <Row label={tr.s100TaxDue} value={fmt(r.tax)} color="#ef4444" />
            </div>
          ))}
          <div className="flex justify-between items-center pt-2">
            <span className="font-bold">{tr.s100TotalTax}</span>
            <span className="font-bold text-xl" style={{ color: '#ef4444' }}>{fmt(totalTax)}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl p-3 mb-3 text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'var(--text-muted)' }}>
          ⚠️ {tr.s100DeferNote}
        </div>
        <div className="rounded-xl p-3 mb-4 text-xs" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid var(--accent)', color: 'var(--text-muted)' }}>
          📅 {tr.s100Pre2003Note}
        </div>
        <button onClick={() => onAsk(lang === 'he' ? `סעיף 100א — מס יציאה: נכסים בשווי ${fmt(assets.reduce((s,a)=>s+a.fmv,0))}, מס יציאה משוער ${fmt(totalTax)}. האם כדאי לדחות? מה האפשרויות?` : `Section 100A exit tax: assets worth ${fmt(assets.reduce((s,a)=>s+a.fmv,0))}, estimated exit tax ${fmt(totalTax)}. Should I defer? What are my options?`)}
          className="w-full py-2 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
          style={{ background: 'var(--accent)', color: 'white' }}>
          🤖 {lang === 'he' ? 'שאל AI על אפשרויות דחיית מס' : 'Ask AI about deferral options'}
        </button>
      </div>
    </div>
  );
}

// ─── DTAA Benefit Calculator ───────────────────────────────────────────────────
const DTAA_RATES: Record<string, Record<string, { d: number; i: number; r: number }>> = {
  'ISRAEL-GERMANY':    { treaty: { d: 10, i: 5, r: 0  }, domestic: { d: 25, i: 25, r: 25 } } as never,
  'ISRAEL-USA':        { treaty: { d: 12.5, i: 17.5, r: 15 }, domestic: { d: 25, i: 25, r: 25 } } as never,
  'ISRAEL-UK':         { treaty: { d: 15, i: 15, r: 12.5 }, domestic: { d: 25, i: 25, r: 25 } } as never,
  'ISRAEL-NETHERLANDS':{ treaty: { d: 5, i: 10, r: 5  }, domestic: { d: 25, i: 25, r: 25 } } as never,
  'ISRAEL-CANADA':     { treaty: { d: 15, i: 15, r: 15 }, domestic: { d: 25, i: 25, r: 25 } } as never,
  'ISRAEL-FRANCE':     { treaty: { d: 5,  i: 5,  r: 0  }, domestic: { d: 25, i: 25, r: 25 } } as never,
  'ISRAEL-SWITZERLAND':{ treaty: { d: 5,  i: 5,  r: 5  }, domestic: { d: 25, i: 25, r: 25 } } as never,
  'ISRAEL-SINGAPORE':  { treaty: { d: 0,  i: 5,  r: 0  }, domestic: { d: 25, i: 25, r: 25 } } as never,
  'ISRAEL-UAE':        { treaty: { d: 0,  i: 0,  r: 0  }, domestic: { d: 25, i: 25, r: 25 } } as never,
  'ISRAEL-PORTUGAL':   { treaty: { d: 10, i: 10, r: 10 }, domestic: { d: 25, i: 25, r: 25 } } as never,
};
const COUNTRIES_DTAA = ['Israel', 'Germany', 'USA', 'UK', 'Netherlands', 'Canada', 'France', 'Switzerland', 'Singapore', 'UAE', 'Portugal'];

function DtaaCalcPanel({ lang, onAsk, onClose }: { lang: Lang; onAsk: (msg: string) => void; onClose: () => void }) {
  const tr = useTranslation(lang);
  const [source, setSource] = useState('Israel');
  const [residence, setResidence] = useState('Germany');
  const [incomeType, setIncomeType] = useState<'d'|'i'|'r'>('d');
  const [amount, setAmount] = useState(50000);

  const key1 = `${source.toUpperCase()}-${residence.toUpperCase()}`;
  const key2 = `${residence.toUpperCase()}-${source.toUpperCase()}`;
  const rates = (DTAA_RATES[key1] || DTAA_RATES[key2]) as { treaty: { d:number;i:number;r:number }; domestic: { d:number;i:number;r:number } } | undefined;

  const domRate = rates ? rates.domestic[incomeType] : 25;
  const treatyRate = rates ? rates.treaty[incomeType] : domRate;
  const taxWithout = Math.round(amount * domRate / 100);
  const taxWith = Math.round(amount * treatyRate / 100);
  const saving = taxWithout - taxWith;
  const netWithout = amount - taxWithout;
  const netWith = amount - taxWith;

  const fmtUsd = (n: number) => '$' + n.toLocaleString('en-US');

  const incomeTypes = [
    { key: 'd' as const, label: tr.dtaaIncomeDividend },
    { key: 'i' as const, label: tr.dtaaIncomeInterest },
    { key: 'r' as const, label: tr.dtaaIncomeRoyalties },
  ];

  return (
    <div className="border-b overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '65vh' }}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Globe size={18} style={{ color: 'var(--accent)' }} />
              {tr.dtaaCalcTitle}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.dtaaCalcSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: tr.dtaaSourceCountry, val: source, setter: setSource },
            { label: tr.dtaaResidenceCountry, val: residence, setter: setResidence },
          ].map(({ label, val, setter }) => (
            <div key={label}>
              <div className="text-xs mb-1 font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</div>
              <select value={val} onChange={e => setter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                {COUNTRIES_DTAA.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          {incomeTypes.map(({ key, label }) => (
            <button key={key} onClick={() => setIncomeType(key)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: incomeType === key ? 'var(--accent)' : 'var(--surface-2)', color: incomeType === key ? 'white' : 'var(--text-muted)', border: incomeType === key ? 'none' : '1px solid var(--border)' }}>
              {label}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <div className="text-xs mb-1 font-semibold" style={{ color: 'var(--text-muted)' }}>{tr.dtaaAmount}</div>
          <input type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </div>

        {/* Comparison cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <div className="text-xs mb-2 font-semibold" style={{ color: '#ef4444' }}>{tr.dtaaWithoutTreaty}</div>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{lang === 'he' ? 'שיעור' : 'Rate'}: {domRate}%</div>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{lang === 'he' ? 'מס' : 'Tax'}: <span style={{ color: '#ef4444' }}>{fmtUsd(taxWithout)}</span></div>
            <div className="font-bold">{tr.dtaaNetInHand}: {fmtUsd(netWithout)}</div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <div className="text-xs mb-2 font-semibold" style={{ color: '#10b981' }}>{tr.dtaaWithTreaty}</div>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{lang === 'he' ? 'שיעור' : 'Rate'}: {treatyRate}%</div>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{lang === 'he' ? 'מס' : 'Tax'}: <span style={{ color: '#10b981' }}>{fmtUsd(taxWith)}</span></div>
            <div className="font-bold">{tr.dtaaNetInHand}: {fmtUsd(netWith)}</div>
          </div>
        </div>

        {saving > 0 ? (
          <div className="rounded-xl p-4 mb-4 text-center" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid var(--accent)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tr.dtaaSaving}</div>
            <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{fmtUsd(saving)}</div>
          </div>
        ) : !rates ? (
          <div className="rounded-xl p-3 mb-4 text-sm text-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
            {lang === 'he' ? '⚠️ אין נתוני אמנה לצמד מדינות זה — ניתן לשאול AI לפרטים' : '⚠️ No treaty data for this country pair — ask AI for details'}
          </div>
        ) : null}

        <button onClick={() => onAsk(lang === 'he'
          ? `DTAA ${source}–${residence}: ${incomeTypes.find(x=>x.key===incomeType)?.label} ${fmtUsd(amount)} — שיעור מקומי ${domRate}%, שיעור אמנה ${treatyRate}%. מה הדרך הנכונה לדווח ולנצל את האמנה?`
          : `DTAA ${source}–${residence}: ${incomeTypes.find(x=>x.key===incomeType)?.label} ${fmtUsd(amount)} — domestic rate ${domRate}%, treaty rate ${treatyRate}%. How do I correctly report and benefit from the treaty?`)}
          className="w-full py-2 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
          style={{ background: 'var(--accent)', color: 'white' }}>
          🤖 {tr.dtaaAskAi}
        </button>
      </div>
    </div>
  );
}

// ─── Annual Income Tax Calculator (Israel 2024) ────────────────────────────────
const IL_BRACKETS = [
  { upto: 81480,  rate: 0.10 },
  { upto: 116760, rate: 0.14 },
  { upto: 187440, rate: 0.20 },
  { upto: 260520, rate: 0.31 },
  { upto: 542160, rate: 0.35 },
  { upto: Infinity, rate: 0.47 },
];
const CREDIT_POINT_VALUE = 2904; // ₪ per point per year (2024)
const NI_CEILING = 588360;       // annual ceiling
const NI_LOW_THRESH = 90264;     // 60% of average wage threshold

function calcIncomeTax(income: number, creditPoints: number, pensionDeduction: number): number {
  const deductible = Math.min(pensionDeduction, income * 0.07, 35000);
  const taxable = Math.max(0, income - deductible);
  let tax = 0;
  let prev = 0;
  for (const b of IL_BRACKETS) {
    if (taxable <= prev) break;
    const slice = Math.min(taxable, b.upto) - prev;
    tax += slice * b.rate;
    prev = b.upto;
  }
  const credit = creditPoints * CREDIT_POINT_VALUE;
  return Math.max(0, Math.round(tax - credit));
}

function calcNI(income: number): { ni: number; health: number } {
  const capped = Math.min(income, NI_CEILING);
  const low = Math.min(capped, NI_LOW_THRESH);
  const high = capped - low;
  const ni = Math.round(low * 0.004 + high * 0.07);
  const health = Math.round(low * 0.031 + high * 0.05);
  return { ni, health };
}

function AnnualTaxPanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const tr = useTranslation(lang);
  const [salary, setSalary] = useState(240000);
  const [capGains, setCapGains] = useState(0);
  const [rental, setRental] = useState(0);
  const [freelance, setFreelance] = useState(0);
  const [creditPoints, setCreditPoints] = useState(2.25);
  const [pension, setPension] = useState(16800);
  const [savedMsg, setSavedMsg] = useState(false);

  const results = useMemo(() => {
    const totalIncome = salary + freelance;
    const incomeTax = calcIncomeTax(totalIncome, creditPoints, pension);
    const { ni, health } = calcNI(totalIncome);
    const capGainsTax = Math.round(capGains * 0.25);
    const rentalTax = Math.max(0, Math.round((rental - 5471 * 12) * 0.1));
    const totalTax = incomeTax + ni + health + capGainsTax + rentalTax;
    const netIncome = salary + freelance + capGains + rental - totalTax;
    const effectiveRate = totalIncome > 0 ? (totalTax / (totalIncome + capGains + rental)) * 100 : 0;

    const brackets: { range: string; rate: string; tax: number }[] = [];
    const deductible = Math.min(pension, totalIncome * 0.07, 35000);
    const taxable = Math.max(0, totalIncome - deductible);
    let prev = 0;
    for (const b of IL_BRACKETS) {
      if (taxable <= prev) break;
      const slice = Math.min(taxable, b.upto) - prev;
      if (slice > 0) {
        brackets.push({
          range: `₪${prev.toLocaleString('he-IL')} – ${b.upto === Infinity ? '∞' : '₪' + b.upto.toLocaleString('he-IL')}`,
          rate: `${b.rate * 100}%`,
          tax: Math.round(slice * b.rate),
        });
      }
      prev = b.upto;
    }

    return { incomeTax, ni, health, capGainsTax, rentalTax, totalTax, netIncome, effectiveRate, brackets };
  }, [salary, capGains, rental, freelance, creditPoints, pension]);

  const fmt = (n: number) => '₪' + Math.round(n).toLocaleString('he-IL');

  const Field = ({ label, val, setter, step = 1000 }: { label: string; val: number; setter: (v: number) => void; step?: number }) => (
    <div>
      <div className="text-xs mb-1 font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <input type="number" value={val} step={step}
        onChange={e => setter(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
    </div>
  );

  const Row = ({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) => (
    <div className="flex justify-between items-center py-1.5 text-sm border-b" style={{ borderColor: 'var(--border)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className={bold ? 'font-bold text-base' : 'font-semibold'} style={{ color: color || 'var(--text)' }}>{value}</span>
    </div>
  );

  return (
    <div className="border-b overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '70vh' }}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
              {tr.annualTaxTitle}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.annualTaxSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {/* Inputs */}
        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr.atSalary} val={salary} setter={setSalary} />
            <Field label={tr.atFreelance} val={freelance} setter={setFreelance} />
            <Field label={tr.atCapGains} val={capGains} setter={setCapGains} />
            <Field label={tr.atRental} val={rental} setter={setRental} />
            <Field label={tr.atPensionContrib} val={pension} setter={setPension} />
            <div>
              <div className="text-xs mb-1 font-semibold" style={{ color: 'var(--text-muted)' }}>{tr.atCreditPoints}</div>
              <input type="number" value={creditPoints} step={0.25} min={0} max={10}
                onChange={e => setCreditPoints(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>ℹ️ {tr.atCreditNote}</p>
        </div>

        {/* Summary */}
        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold text-sm mb-3">{lang === 'he' ? 'סיכום' : 'Summary'}</h3>
          <Row label={tr.atIncomeTax} value={fmt(results.incomeTax)} color="#ef4444" />
          <Row label={tr.atNationalIns} value={fmt(results.ni)} color="#f59e0b" />
          <Row label={tr.atHealthTax} value={fmt(results.health)} color="#f59e0b" />
          {results.capGainsTax > 0 && <Row label={lang === 'he' ? 'מס רווחי הון (25%)' : 'Capital gains tax (25%)'} value={fmt(results.capGainsTax)} color="#ef4444" />}
          {results.rentalTax > 0 && <Row label={lang === 'he' ? 'מס שכירות' : 'Rental tax'} value={fmt(results.rentalTax)} color="#ef4444" />}
          <div className="border-t mt-2 pt-2" style={{ borderColor: 'var(--border)' }}>
            <Row label={tr.atTotalTax} value={fmt(results.totalTax)} color="#ef4444" bold />
            <Row label={tr.atNetIncome} value={fmt(results.netIncome)} color="#10b981" bold />
            <Row label={tr.atEffectiveRate} value={results.effectiveRate.toFixed(1) + '%'} />
          </div>
        </div>

        {/* Save button */}
        <button onClick={() => {
          const saved = JSON.parse(localStorage.getItem('taxmaster_saved_calcs') || '[]');
          saved.unshift({ id: Date.now(), type: 'annualTax', salary, capGains, rental, freelance, creditPoints, pension, results, savedAt: new Date().toISOString() });
          localStorage.setItem('taxmaster_saved_calcs', JSON.stringify(saved.slice(0, 20)));
          setSavedMsg(true);
          setTimeout(() => setSavedMsg(false), 2000);
        }}
          className="w-full py-2 rounded-xl text-sm font-semibold mb-4 hover:opacity-80 transition-all"
          style={{ background: savedMsg ? 'rgba(16,185,129,0.15)' : 'var(--surface-2)', color: savedMsg ? '#10b981' : 'var(--text-muted)', border: `1px solid ${savedMsg ? '#10b981' : 'var(--border)'}` }}>
          {savedMsg ? tr.calcSaved : `💾 ${tr.saveCalc}`}
        </button>

        {/* Bracket breakdown */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold text-sm mb-3">{tr.atBrackets}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th className="text-start py-1">{lang === 'he' ? 'טווח' : 'Range'}</th>
                  <th className="text-center py-1">{lang === 'he' ? 'שיעור' : 'Rate'}</th>
                  <th className="text-end py-1">{lang === 'he' ? 'מס' : 'Tax'}</th>
                </tr>
              </thead>
              <tbody>
                {results.brackets.map((b, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-1.5" style={{ color: 'var(--text-muted)' }}>{b.range}</td>
                    <td className="text-center py-1.5 font-semibold">{b.rate}</td>
                    <td className="text-end py-1.5 font-semibold" style={{ color: '#ef4444' }}>{fmt(b.tax)}</td>
                  </tr>
                ))}
                <tr className="border-t font-bold" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-1.5" colSpan={2}>{lang === 'he' ? 'ניכוי נקודות זיכוי' : 'Credit points deduction'}</td>
                  <td className="text-end py-1.5" style={{ color: '#10b981' }}>−{fmt(creditPoints * CREDIT_POINT_VALUE)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Days Tracker ─────────────────────────────────────────────────────────────
interface DtTrip { id: number; country: string; from: string; to: string; }
const DT_THRESHOLD = 183;
const DT_WARN = 150;
const ALL_COUNTRIES_DT = ['Israel','Germany','USA','UK','Netherlands','Canada','France','Switzerland','Singapore','UAE','Portugal','Austria','Italy','Spain','Cyprus','Malta','Greece','Poland','Hungary','Estonia','Thailand','Mexico','Georgia','Serbia','Dubai'];

function DaysTrackerPanel({ lang, onAsk, onClose }: { lang: Lang; onAsk: (msg: string) => void; onClose: () => void }) {
  const tr = useTranslation(lang);
  const STORAGE_KEY = 'taxmaster_days_tracker';
  const NOTIF_KEY = 'taxmaster_notif_enabled';
  const [trips, setTrips] = useState<DtTrip[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [notifEnabled, setNotifEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(NOTIF_KEY) === '1';
  });
  const nextId = useRef(Date.now());
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  }, [trips]);

  const toggleNotifications = async () => {
    if (!notifEnabled) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setNotifEnabled(true);
        localStorage.setItem(NOTIF_KEY, '1');
        new Notification(lang === 'he' ? '🔔 התראות פעילות' : '🔔 Alerts Active', {
          body: lang === 'he' ? 'תקבל התראה כשמדינה תתקרב ל-183 ימים' : 'You\'ll be alerted when a country approaches 183 days',
        });
      }
    } else {
      setNotifEnabled(false);
      localStorage.setItem(NOTIF_KEY, '0');
    }
  };

  const addTrip = () => {
    const today = new Date().toISOString().slice(0, 10);
    setTrips(t => [...t, { id: nextId.current++, country: 'Germany', from: today, to: today }]);
  };
  const removeTrip = (id: number) => setTrips(t => t.filter(x => x.id !== id));
  const updateTrip = (id: number, field: keyof DtTrip, value: string) =>
    setTrips(t => t.map(x => x.id === id ? { ...x, [field]: value } : x));

  const daysBetween = (from: string, to: string) => {
    const d = (new Date(to).getTime() - new Date(from).getTime()) / 86400000;
    return Math.max(0, Math.round(d) + 1);
  };

  const thisYearStart = `${currentYear}-01-01`;
  const thisYearEnd = `${currentYear}-12-31`;

  const summary = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of trips) {
      const from = t.from > thisYearStart ? t.from : thisYearStart;
      const to = t.to < thisYearEnd ? t.to : thisYearEnd;
      if (from > to) continue;
      map[t.country] = (map[t.country] || 0) + daysBetween(from, to);
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [trips]);

  useEffect(() => {
    if (!notifEnabled || typeof window === 'undefined') return;
    const warn = summary.filter(([, d]) => d >= DT_WARN && d < DT_THRESHOLD);
    const over = summary.filter(([, d]) => d >= DT_THRESHOLD);
    const lastFired = localStorage.getItem('taxmaster_notif_last') || '';
    const today = new Date().toISOString().slice(0, 10);
    if (today === lastFired) return;
    if (over.length > 0) {
      new Notification(lang === 'he' ? '⚠️ התראת תושבות מס' : '⚠️ Tax Residency Alert', {
        body: lang === 'he'
          ? `חצית את 183 הימים ב: ${over.map(([c]) => c).join(', ')}`
          : `You've crossed 183 days in: ${over.map(([c]) => c).join(', ')}`,
      });
      localStorage.setItem('taxmaster_notif_last', today);
    } else if (warn.length > 0) {
      new Notification(lang === 'he' ? '🔔 קרב לסף 183 ימים' : '🔔 Approaching 183-Day Threshold', {
        body: lang === 'he'
          ? `שים לב: ${warn.map(([c, d]) => `${c}: ${d} ימים`).join(', ')}`
          : `Watch out: ${warn.map(([c, d]) => `${c}: ${d} days`).join(', ')}`,
      });
      localStorage.setItem('taxmaster_notif_last', today);
    }
  }, [notifEnabled, summary, lang]);

  const getStatus = (days: number) => {
    if (days >= DT_THRESHOLD) return 'resident';
    if (days >= DT_WARN) return 'warning';
    return 'safe';
  };

  const statusColor = { resident: '#ef4444', warning: '#f59e0b', safe: '#10b981' };
  const statusLabel = (days: number) => {
    const s = getStatus(days);
    if (s === 'resident') return tr.dtResident;
    if (s === 'warning') return `${DT_THRESHOLD - days} ${tr.dtRemaining}`;
    return tr.dtSafe + ` (${DT_THRESHOLD - days} ${lang === 'he' ? 'יום עד הסף' : 'days to threshold'})`;
  };

  return (
    <div className="border-b overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '70vh' }}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Calendar size={18} style={{ color: 'var(--accent)' }} />
              {tr.daysTrackerTitle}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.daysTrackerSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {/* Summary cards */}
        {summary.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>{tr.dtSummary} — {currentYear}</div>
            <div className="space-y-2">
              {summary.map(([country, days]) => {
                const pct = Math.min(100, (days / DT_THRESHOLD) * 100);
                const st = getStatus(days);
                return (
                  <div key={country} className="rounded-xl p-3" style={{ background: 'var(--surface-2)', border: `1px solid ${st === 'resident' ? 'rgba(239,68,68,0.4)' : st === 'warning' ? 'rgba(245,158,11,0.4)' : 'var(--border)'}` }}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-semibold text-sm">{country}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{days} {lang === 'he' ? 'ימים' : 'days'}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${statusColor[st]}22`, color: statusColor[st] }}>
                          {statusLabel(days)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: statusColor[st] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Trip list */}
        <div className="space-y-2 mb-4">
          {trips.map(t => (
            <div key={t.id} className="rounded-xl p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div className="grid grid-cols-4 gap-2 items-end">
                <div>
                  <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tr.dtCountry}</div>
                  <select value={t.country} onChange={e => updateTrip(t.id, 'country', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                    {ALL_COUNTRIES_DT.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tr.dtFrom}</div>
                  <input type="date" value={t.from} onChange={e => updateTrip(t.id, 'from', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{tr.dtTo}</div>
                  <input type="date" value={t.to} onChange={e => updateTrip(t.id, 'to', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{daysBetween(t.from, t.to)}d</span>
                  <button onClick={() => removeTrip(t.id)} className="text-xs hover:opacity-70" style={{ color: '#ef4444' }}>{tr.dtRemove}</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addTrip} className="w-full py-2 rounded-xl text-sm font-semibold mb-4 hover:opacity-80 transition-opacity"
          style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px dashed var(--accent)' }}>
          + {tr.dtAddTrip}
        </button>

        <div className="rounded-xl p-3 mb-4 text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'var(--text-muted)' }}>
          ⚠️ {tr.dtNote}
        </div>

        <div className="flex gap-2">
          <button onClick={() => onAsk(lang === 'he'
            ? `מונה ימי שהייה: ${summary.map(([c,d]) => `${c}: ${d} ימים`).join(', ')}. מה הסיכון לתושבות מס כפולה? מה לעשות?`
            : `Days tracker: ${summary.map(([c,d]) => `${c}: ${d} days`).join(', ')}. What is my dual-residency tax risk?`)}
            className="flex-1 py-2 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
            style={{ background: 'var(--accent)', color: 'white' }}>
            🤖 {lang === 'he' ? 'שאל AI על סיכון תושבות כפולה' : 'Ask AI about dual-residency risk'}
          </button>
          <button onClick={toggleNotifications}
            className="py-2 px-3 rounded-xl text-sm font-semibold hover:opacity-80 transition-all flex-shrink-0"
            style={{ background: notifEnabled ? 'rgba(16,185,129,0.15)' : 'var(--surface-2)', color: notifEnabled ? '#10b981' : 'var(--text-muted)', border: `1px solid ${notifEnabled ? '#10b981' : 'var(--border)'}` }}>
            {notifEnabled ? `🔔 ${tr.notif183On}` : `🔔 ${tr.notif183}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Emigration ROI ────────────────────────────────────────────────────────────
const ROI_COUNTRIES: Record<string, { name: string; taxRate: number; exitTaxRate: number; color: string }> = {
  GERMANY:     { name: 'Germany',     taxRate: 0.42, exitTaxRate: 0.25, color: '#6366f1' },
  PORTUGAL:    { name: 'Portugal',    taxRate: 0.20, exitTaxRate: 0.28, color: '#10b981' },
  UAE:         { name: 'UAE / Dubai', taxRate: 0.00, exitTaxRate: 0.00, color: '#f59e0b' },
  CYPRUS:      { name: 'Cyprus',      taxRate: 0.125, exitTaxRate: 0.00, color: '#06b6d4' },
  MALTA:       { name: 'Malta',       taxRate: 0.15, exitTaxRate: 0.00, color: '#8b5cf6' },
  GEORGIA:     { name: 'Georgia',     taxRate: 0.05, exitTaxRate: 0.00, color: '#ec4899' },
  SINGAPORE:   { name: 'Singapore',   taxRate: 0.17, exitTaxRate: 0.00, color: '#14b8a6' },
  THAILAND:    { name: 'Thailand',    taxRate: 0.17, exitTaxRate: 0.00, color: '#f97316' },
};
const IL_EFFECTIVE_RATE = 0.33; // approximate effective rate on 240K+ ₪ income

function EmigROIPanel({ lang, onAsk, onClose }: { lang: Lang; onAsk: (msg: string) => void; onClose: () => void }) {
  const tr = useTranslation(lang);
  const [securities, setSecurities] = useState(1000000);
  const [realEstate, setRealEstate] = useState(500000);
  const [business, setBusiness] = useState(0);
  const [annualIncome, setAnnualIncome] = useState(400000);
  const [selected, setSelected] = useState<string[]>(['UAE', 'PORTUGAL', 'GEORGIA']);

  const toggleCountry = (code: string) => {
    setSelected(s => s.includes(code) ? s.filter(x => x !== code) : s.length < 4 ? [...s, code] : s);
  };

  const results = useMemo(() => {
    const taxableAssets = securities * 0.5 + realEstate * 0.4 + business * 0.5;
    const israelExitTax = Math.round(taxableAssets * 0.25);
    const israelAnnualTax = Math.round(annualIncome * IL_EFFECTIVE_RATE);

    return selected.map(code => {
      const c = ROI_COUNTRIES[code];
      const destExitTax = Math.round(taxableAssets * c.exitTaxRate);
      const totalExitCost = israelExitTax + destExitTax;
      const destAnnualTax = Math.round(annualIncome * c.taxRate);
      const annualSaving = israelAnnualTax - destAnnualTax;
      const breakEven = annualSaving > 0 ? totalExitCost / annualSaving : Infinity;
      const netAfter10 = annualSaving * 10 - totalExitCost;
      const chartData = Array.from({ length: 11 }, (_, yr) => ({
        yr, cumSaving: Math.round(annualSaving * yr - totalExitCost),
      }));
      return { code, ...c, totalExitCost, annualSaving, breakEven, netAfter10, chartData };
    });
  }, [securities, realEstate, business, annualIncome, selected]);

  const fmtIL = (n: number) => (n < 0 ? '−' : '') + '₪' + Math.abs(Math.round(n)).toLocaleString('he-IL');

  return (
    <div className="border-b overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '75vh' }}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
              {tr.emigROITitle}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.emigROISubtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {/* Inputs */}
        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: tr.emigSecurities, val: securities, setter: setSecurities },
              { label: tr.emigRealEstate, val: realEstate, setter: setRealEstate },
              { label: tr.emigBusiness, val: business, setter: setBusiness },
              { label: tr.emigAnnualIncome, val: annualIncome, setter: setAnnualIncome },
            ].map(({ label, val, setter }) => (
              <div key={label}>
                <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
                <input type="number" value={val} onChange={e => setter(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Country selector */}
        <div className="mb-4">
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>{tr.emigSelectDest}</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ROI_COUNTRIES).map(([code, c]) => (
              <button key={code} onClick={() => toggleCountry(code)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:opacity-80"
                style={{ background: selected.includes(code) ? c.color : 'var(--surface-2)', color: selected.includes(code) ? 'white' : 'var(--text-muted)', border: `1px solid ${selected.includes(code) ? c.color : 'var(--border)'}` }}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Result cards */}
        <div className="space-y-3 mb-4">
          {results.map(r => (
            <div key={r.code} className="rounded-xl p-4" style={{ background: 'var(--surface-2)', border: `1px solid ${r.color}44` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold" style={{ color: r.color }}>{r.name}</span>
                <span className="text-xs px-2 py-1 rounded-full font-semibold"
                  style={{ background: `${r.color}22`, color: r.color }}>
                  {r.taxRate * 100}% {lang === 'he' ? 'מס' : 'tax'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg p-2" style={{ background: 'var(--surface)' }}>
                  <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{tr.emigExitTax}</div>
                  <div className="font-bold text-sm" style={{ color: '#ef4444' }}>{fmtIL(r.totalExitCost)}</div>
                </div>
                <div className="rounded-lg p-2" style={{ background: 'var(--surface)' }}>
                  <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{tr.emigAnnualSaving}</div>
                  <div className="font-bold text-sm" style={{ color: r.annualSaving > 0 ? '#10b981' : '#ef4444' }}>{fmtIL(r.annualSaving)}</div>
                </div>
                <div className="rounded-lg p-2" style={{ background: 'var(--surface)' }}>
                  <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{tr.emigBreakEven}</div>
                  <div className="font-bold text-sm" style={{ color: r.color }}>
                    {r.annualSaving <= 0 ? '∞' : r.breakEven < 100 ? r.breakEven.toFixed(1) : '∞'}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-center">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{tr.emigNetAfter10}: </span>
                <span className="text-sm font-bold" style={{ color: r.netAfter10 > 0 ? '#10b981' : '#ef4444' }}>{fmtIL(r.netAfter10)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Cumulative savings chart */}
        {results.length > 0 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>{tr.emigChart}</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={Array.from({ length: 11 }, (_, yr) => {
                const point: Record<string, number> = { yr };
                results.forEach(r => { point[r.name] = r.annualSaving * yr - r.totalExitCost; });
                return point;
              })}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="yr" tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  tickFormatter={v => `${lang === 'he' ? 'שנה' : 'Yr'} ${v}`} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  tickFormatter={v => v >= 0 ? `₪${(v/1000).toFixed(0)}K` : `-₪${Math.abs(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => fmtIL(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {results.map(r => (
                  <Area key={r.code} type="monotone" dataKey={r.name}
                    stroke={r.color} fill={`${r.color}22`} strokeWidth={2} dot={false} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <button onClick={() => onAsk(lang === 'he'
          ? `ROI יציאה: נכסים ${fmtIL(securities + realEstate + business)}, הכנסה שנתית ${fmtIL(annualIncome)}. המדינות הטובות ביותר: ${results.map(r => `${r.name} (${r.breakEven < 100 ? r.breakEven.toFixed(1) + ' שנות החזר' : 'לא כדאי'}`).join(', ')}. מה מומלץ?`
          : `Emigration ROI: assets ${fmtIL(securities + realEstate + business)}, annual income ${fmtIL(annualIncome)}. Top countries: ${results.map(r => `${r.name} (${r.breakEven < 100 ? r.breakEven.toFixed(1) + ' yr payback' : 'no saving'}`).join(', ')}. What do you recommend?`)}
          className="w-full py-2 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
          style={{ background: 'var(--accent)', color: 'white' }}>
          🤖 {lang === 'he' ? 'שאל AI איזו מדינה הכי כדאית' : 'Ask AI which country is best'}
        </button>
      </div>
    </div>
  );
}

// ─── Multi-Year Tax Projection ──────────────────────────────────────────────────
const MY_COUNTRIES: Record<string, { nameEn: string; nameHe: string; effectiveRate: number; color: string }> = {
  ISRAEL:    { nameEn: 'Israel',    nameHe: 'ישראל',    effectiveRate: 0.33,  color: '#6366f1' },
  GERMANY:   { nameEn: 'Germany',   nameHe: 'גרמניה',   effectiveRate: 0.40,  color: '#ef4444' },
  PORTUGAL:  { nameEn: 'Portugal',  nameHe: 'פורטוגל',  effectiveRate: 0.20,  color: '#10b981' },
  UAE:       { nameEn: 'UAE',       nameHe: 'דובאי/UAE', effectiveRate: 0.00, color: '#f59e0b' },
  CYPRUS:    { nameEn: 'Cyprus',    nameHe: 'קפריסין',  effectiveRate: 0.125, color: '#06b6d4' },
  GEORGIA:   { nameEn: 'Georgia',   nameHe: 'גאורגיה',  effectiveRate: 0.05,  color: '#ec4899' },
  SINGAPORE: { nameEn: 'Singapore', nameHe: 'סינגפור',  effectiveRate: 0.17,  color: '#14b8a6' },
};
const myCountryName = (code: string, lang: Lang) => MY_COUNTRIES[code]?.[lang === 'he' ? 'nameHe' : 'nameEn'] ?? code;

function MultiYearPanel({ lang, onAsk, onClose }: { lang: Lang; onAsk: (msg: string) => void; onClose: () => void }) {
  const tr = useTranslation(lang);
  const [annualIncome, setAnnualIncome] = useState(400000);
  const [growthPct, setGrowthPct] = useState(3);
  const [selected, setSelected] = useState(['ISRAEL', 'UAE', 'PORTUGAL']);
  const YEARS = 10;

  const toggleCountry = (code: string) => {
    if (code === 'ISRAEL') return;
    setSelected(s => s.includes(code) ? s.filter(x => x !== code) : s.length < 4 ? [...s, code] : s);
  };

  const projData = useMemo(() => {
    return Array.from({ length: YEARS + 1 }, (_, yr) => {
      const income = annualIncome * Math.pow(1 + growthPct / 100, yr);
      const point: Record<string, number | string> = { yr };
      selected.forEach(code => {
        const c = MY_COUNTRIES[code];
        if (!c) return;
        point[code] = Math.round(income * (1 - c.effectiveRate));
      });
      return point;
    });
  }, [annualIncome, growthPct, selected]);

  const cumData = useMemo(() => {
    const accum: Record<string, number> = {};
    return projData.map(row => {
      const point: Record<string, number | string> = { yr: row.yr };
      selected.forEach(code => {
        accum[code] = (accum[code] || 0) + ((row[code] as number) || 0);
        point[code] = accum[code];
      });
      return point;
    });
  }, [projData, selected]);

  const tableRows = projData.slice(1);
  const israelCum = (cumData[YEARS]?.['ISRAEL'] as number) || 1;
  const fmtIL = (n: number) => '₪' + Math.round(n).toLocaleString('he-IL');

  return (
    <div className="border-b overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '75vh' }}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
              {tr.multiYearTitle}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.multiYearSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <div className="text-xs mb-1 font-semibold" style={{ color: 'var(--text-muted)' }}>{tr.myAnnualIncome}</div>
            <input type="number" value={annualIncome} onChange={e => setAnnualIncome(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div>
            <div className="text-xs mb-1 font-semibold" style={{ color: 'var(--text-muted)' }}>{tr.myAnnualGrowth}</div>
            <input type="number" value={growthPct} step={0.5} onChange={e => setGrowthPct(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>{tr.mySelectCountries}</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(MY_COUNTRIES).map(([code, c]) => (
              <button key={code} onClick={() => toggleCountry(code)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:opacity-80"
                style={{ background: selected.includes(code) ? c.color : 'var(--surface-2)', color: selected.includes(code) ? 'white' : 'var(--text-muted)', border: `1px solid ${selected.includes(code) ? c.color : 'var(--border)'}`, cursor: code === 'ISRAEL' ? 'default' : 'pointer' }}>
                {myCountryName(code, lang)} {code === 'ISRAEL' ? '🔒' : ''}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>{lang === 'he' ? 'נטו מצטבר לאורך 10 שנים (₪)' : 'Cumulative net income over 10 years (₪)'}</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={cumData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="yr" tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickFormatter={v => `${lang === 'he' ? 'שנה' : 'Yr'} ${v}`} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickFormatter={v => `₪${(Number(v) / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v) => fmtIL(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {selected.map(code => {
                const c = MY_COUNTRIES[code];
                return c ? (
                  <Area key={code} type="monotone" dataKey={code} name={myCountryName(code, lang)}
                    stroke={c.color} fill={`${c.color}22`} strokeWidth={2} dot={false} />
                ) : null;
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-4 mb-4 overflow-x-auto" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="text-start py-1.5 font-semibold">{tr.myYear}</th>
                {selected.map(code => {
                  const c = MY_COUNTRIES[code];
                  return c ? <th key={code} className="text-end py-1.5 font-semibold" style={{ color: c.color }}>{myCountryName(code, lang)}</th> : null;
                })}
              </tr>
            </thead>
            <tbody>
              {tableRows.map(row => (
                <tr key={row.yr as number} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-1.5" style={{ color: 'var(--text-muted)' }}>{lang === 'he' ? `שנה ${row.yr}` : `Year ${row.yr}`}</td>
                  {selected.map(code => {
                    const c = MY_COUNTRIES[code];
                    if (!c) return null;
                    const net = (row[code] as number) || 0;
                    const ilNet = (row['ISRAEL'] as number) || 0;
                    return (
                      <td key={code} className="text-end py-1.5 font-semibold" style={{ color: code !== 'ISRAEL' && net > ilNet ? '#10b981' : 'var(--text)' }}>
                        {fmtIL(net)}
                        {code !== 'ISRAEL' && <span className="ml-1 text-xs" style={{ color: net - ilNet > 0 ? '#10b981' : '#ef4444' }}>({net - ilNet > 0 ? '+' : ''}{fmtIL(net - ilNet)})</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-bold" style={{ borderColor: 'var(--border)' }}>
                <td className="py-2">{lang === 'he' ? 'סה"כ 10 שנים' : 'Total 10 yrs'}</td>
                {selected.map(code => {
                  const c = MY_COUNTRIES[code];
                  if (!c) return null;
                  const cum = (cumData[YEARS]?.[code] as number) || 0;
                  const diff = cum - israelCum;
                  return (
                    <td key={code} className="text-end py-2" style={{ color: c.color }}>
                      {fmtIL(cum)}
                      {code !== 'ISRAEL' && <div className="text-xs font-normal" style={{ color: diff > 0 ? '#10b981' : '#ef4444' }}>({diff > 0 ? '+' : ''}{fmtIL(diff)})</div>}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>

        <button onClick={() => onAsk(lang === 'he'
          ? `תחזית 10 שנים: הכנסה שנתית ₪${annualIncome.toLocaleString('he-IL')}, צמיחה ${growthPct}%. מדינות: ${selected.map(c => myCountryName(c, lang)).join(', ')}. מה הכי כדאי לטווח הארוך?`
          : `10-year projection: annual income ₪${annualIncome.toLocaleString()}, growth ${growthPct}%. Countries: ${selected.map(c => myCountryName(c, lang)).join(', ')}. What is best long-term?`)}
          className="w-full py-2 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
          style={{ background: 'var(--accent)', color: 'white' }}>
          🤖 {lang === 'he' ? 'שאל AI על האסטרטגיה הטובה ביותר' : 'Ask AI about the best long-term strategy'}
        </button>
      </div>
    </div>
  );
}

// ─── Pension & Retirement Guide ───────────────────────────────────────────────
const PENSION_TYPES = [
  {
    id:'keren', icon:'🏦',
    title_he:'קרן פנסיה', title_en:'Pension Fund (Keren Pensia)',
    desc_he:'מכשיר החיסכון הנפוץ ביותר בישראל. כולל כיסויי ביטוח (נכות/שארים). צבירה מוטבת 25% הכנסה.',
    desc_en:'Most common Israeli savings vehicle. Includes disability/survivors insurance. Up to 25% of income tax-advantaged.',
    options_he: [
      { title:'השארת הכסף', desc:'ניתן להשאיר את הכסף בקרן ולמשוך בגיל פרישה (67/62). הכספים מוגנים מנושים ובד"כ פטורים ממס עיזבון.', risk:'low' },
      { title:'פדיון מוקדם', desc:'חייב במס מלא (47%+ ביטוח לאומי) על הרכיב הפיצויים. על רכיב תגמולים — מס 35% (לרוב). כדאי רק אם קיים לחץ נזילות.', risk:'high' },
      { title:'ניוד לחו"ל', desc:'לא ניתן להעביר קרן פנסיה ישירות לחו"ל. ניתן לעצור הפקדות ולהמשיך צבירה.', risk:'medium' },
    ],
    options_en: [
      { title:'Leave in fund', desc:'Keep funds in the Israeli pension, withdraw at retirement age (67/62). Funds are creditor-protected and typically estate-tax exempt.', risk:'low' },
      { title:'Early redemption', desc:'Full tax (47%+ NII) on severance component. 35% tax on savings component (usually). Only worthwhile under liquidity pressure.', risk:'high' },
      { title:'Transfer abroad', desc:'Israeli pension funds cannot be directly transferred abroad. You can stop contributions and let the fund accumulate.', risk:'medium' },
    ],
    tips_he:'✅ ההמלצה הנפוצה: השאר בקרן, תן לה לצמוח, משוך בגיל פרישה בפטור.',
    tips_en:'✅ Most common advice: leave it, let it grow, withdraw at retirement age with tax exemption.',
  },
  {
    id:'gemel', icon:'💰',
    title_he:'קופת גמל / פוליסה', title_en:'Provident Fund (Kupat Gemel)',
    desc_he:'גמישות משיכה גבוהה יותר מקרן פנסיה. ללא כיסויי ביטוח. תשואות חיסכון נטו.',
    desc_en:'More withdrawal flexibility than pension fund. No insurance coverage. Pure savings returns.',
    options_he: [
      { title:'משיכה פטורה (גיל 60+)', desc:'אם הכסף הופקד לפני 2008 ומשיכה אחרי גיל 60 — פטור מלא ממס. פוטנציאל חיסכון עצום.', risk:'low' },
      { title:'המרה לקצבה', desc:'ניתן להמיר לקצבה חודשית פטורה ממס עד תקרה. מומלץ לצבירות גדולות.', risk:'low' },
      { title:'משיכה כתושב חוץ', desc:'ניתן לבקש פדיון כ"תושב חוץ" — ניכוי מס במקור 25% ותו לא. חיסכון משמעותי בהשוואה למשיכה כתושב.', risk:'medium' },
    ],
    options_en: [
      { title:'Tax-free withdrawal (age 60+)', desc:'If deposited before 2008 and withdrawn after 60 — full tax exemption. Massive savings potential.', risk:'low' },
      { title:'Convert to annuity', desc:'Can be converted to monthly tax-exempt annuity (up to ceiling). Recommended for large accumulations.', risk:'low' },
      { title:'Withdraw as non-resident', desc:'Can request redemption as "foreign resident" — 25% withholding tax only. Significant saving vs. resident withdrawal.', risk:'medium' },
    ],
    tips_he:'✅ כתושב חוץ: בקש אישור ניכוי מס מופחת מרשות המסים לפני פדיון.',
    tips_en:'✅ As non-resident: request reduced withholding tax approval from ITA before redemption.',
  },
  {
    id:'hashtalamut', icon:'📈',
    title_he:"קרן השתלמות", title_en:'Study Fund (Keren Hishtalmut)',
    desc_he:"אחד מכלי החיסכון הטובים בישראל — צמיחה פטורה ממס לאחר 6 שנים. תקרה שנתית מוטבת: ₪19,020.",
    desc_en:'One of Israel\'s best savings vehicles — tax-free growth after 6 years. Annual tax-advantaged ceiling: ₪19,020.',
    options_he: [
      { title:'המשך צבירה מרחוק', desc:'ניתן להמשיך להפקיד (לעצמאים) גם בעת מגורים בחו"ל. אחרי 6 שנות ותק — משיכה פטורה ממס לחלוטין.', risk:'low' },
      { title:'משיכה לפני 6 שנים', desc:'חייבת במס הכנסה רגיל. הפסד הטבת המס. להימנע אם אפשר.', risk:'high' },
      { title:'שמירה כנכס', desc:'קרן השתלמות אינה מדווחת ב-CRS כחשבון פיננסי רגיל. מוגנת מנושים ומכינוס נכסים.', risk:'low' },
    ],
    options_en: [
      { title:'Continue accumulating remotely', desc:'Self-employed can continue depositing from abroad. After 6 years vesting — 100% tax-free withdrawal.', risk:'low' },
      { title:'Withdraw before 6 years', desc:'Subject to regular income tax. Loses tax benefit. Avoid if possible.', risk:'high' },
      { title:'Keep as protected asset', desc:'Keren Hishtalmut is not typically reported under CRS as a standard financial account. Protected from creditors and insolvency.', risk:'low' },
    ],
    tips_he:'✅ אל תמשוך לפני 6 שנים. אם כבר הגעת — חכה לפדיון פטור. שקול כחלק מתיק ניהול עושר.',
    tips_en:'✅ Never withdraw before 6 years. If already vested — wait for tax-free redemption. Consider as part of wealth portfolio.',
  },
  {
    id:'bituach', icon:'🛡️',
    title_he:'ביטוח מנהלים', title_en:'Executive Insurance (Bituach Menahalim)',
    desc_he:'פוליסת ביטוח חיים בשילוב חיסכון. מבטיח מקדם קצבה (חשוב לפוליסות ישנות). מסלולי ביטוח ייחודיים.',
    desc_en:'Life insurance combined with savings. Guarantees annuity rate (important for old policies). Unique insurance tracks.',
    options_he: [
      { title:'שמירת הפוליסה הישנה', desc:'פוליסות לפני 2013 עם מקדם קצבה מובטח הן נכס יקר ערך. אל תפדה — המקדם יאבד.', risk:'low' },
      { title:'הפסקת הפקדות', desc:'ניתן לעצור הפקדות ולהשאיר פוליסה "קפואה". הכיסוי הביטוחי יפחת/יבוטל.', risk:'medium' },
    ],
    options_en: [
      { title:'Keep old policy', desc:'Pre-2013 policies with guaranteed annuity rate are extremely valuable assets. Do NOT redeem — you lose the guaranteed rate.', risk:'low' },
      { title:'Stop contributions', desc:'Can freeze contributions, keeping the policy dormant. Insurance coverage will diminish or cancel.', risk:'medium' },
    ],
    tips_he:'✅ פוליסות עם מקדם מובטח < 200 — שמור בכל מחיר. התייעץ עם יועץ פנסיוני מוסמך.',
    tips_en:'✅ Policies with guaranteed rate < 200 — keep at all costs. Consult a certified pension advisor.',
  },
];

const BILATERAL_AGREEMENTS: { country_he:string; country_en:string; flag:string; covers:string }[] = [
  { country_he:'ארה"ב', country_en:'USA', flag:'🇺🇸', covers:'ביטוח לאומי / Social Security — הסדר הדדי' },
  { country_he:'גרמניה', country_en:'Germany', flag:'🇩🇪', covers:'הסכם ביטוח סוציאלי מלא' },
  { country_he:'צרפת', country_en:'France', flag:'🇫🇷', covers:'הסכם ביטוח סוציאלי מלא' },
  { country_he:'אוסטריה', country_en:'Austria', flag:'🇦🇹', covers:'ביטוח לאומי הדדי' },
  { country_he:'קנדה', country_en:'Canada', flag:'🇨🇦', covers:'CPP / OAS הדדי' },
  { country_he:'אוסטרליה', country_en:'Australia', flag:'🇦🇺', covers:'הסדר פנסיה חלקי' },
  { country_he:'הולנד', country_en:'Netherlands', flag:'🇳🇱', covers:'ביטוח סוציאלי הדדי' },
  { country_he:'שוויץ', country_en:'Switzerland', flag:'🇨🇭', covers:'ביטוח סוציאלי הדדי' },
];

function PensionGuidePanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [selected, setSelected] = useState('keren');
  const [showAgreements, setShowAgreements] = useState(false);
  const pt = PENSION_TYPES.find(p => p.id === selected)!;
  const riskColor = { low:'#10b981', medium:'#f59e0b', high:'#ef4444' };
  const riskLabel = { he: { low:'עדיף', medium:'זהירות', high:'סיכון' }, en: { low:'Preferred', medium:'Caution', high:'Risk' } };

  return (
    <div className="flex-shrink-0 overflow-y-auto" style={{ maxHeight:'75vh', background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'1.5rem' }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <span>🏛️</span>
          {lang==='he'?'מדריך פנסיה, גמל והשתלמות בהגירה':'Pension, Provident Fund & Study Fund Guide'}
        </h2>
        <button onClick={onClose} style={{color:'var(--text-muted)'}}><X size={18}/></button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap mb-4">
        {PENSION_TYPES.map(p => (
          <button key={p.id} onClick={() => setSelected(p.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all"
            style={{ background: selected===p.id?'var(--accent)':'var(--surface-2)', color: selected===p.id?'#fff':'var(--text-muted)', border: selected===p.id?'1px solid var(--accent)':'1px solid var(--border)' }}>
            {p.icon} {lang==='he'?p.title_he:p.title_en}
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="text-sm mb-4" style={{color:'var(--text-muted)'}}>{lang==='he'?pt.desc_he:pt.desc_en}</p>

      {/* Options */}
      <div className="flex flex-col gap-3 mb-4">
        {(lang==='he'?pt.options_he:pt.options_en).map((o,i) => (
          <div key={i} style={{ background:'var(--surface-2)', border:`1px solid ${riskColor[o.risk as keyof typeof riskColor]}33`, borderRadius:10, padding:'0.9rem 1rem' }}>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ background:`${riskColor[o.risk as keyof typeof riskColor]}22`, color:riskColor[o.risk as keyof typeof riskColor], borderRadius:6, padding:'1px 8px', fontSize:'0.7rem', fontWeight:700 }}>
                {riskLabel[lang][o.risk as keyof typeof riskLabel.he]}
              </span>
              <span className="font-semibold text-sm">{o.title}</span>
            </div>
            <p className="text-xs" style={{color:'var(--text-muted)'}}>{o.desc}</p>
          </div>
        ))}
      </div>

      {/* Tip */}
      <div className="p-3 rounded-lg text-sm mb-4" style={{background:'#10b98111',border:'1px solid #10b98133',color:'#10b981'}}>
        {lang==='he'?pt.tips_he:pt.tips_en}
      </div>

      {/* Bilateral agreements */}
      <button onClick={()=>setShowAgreements(s=>!s)} className="flex items-center gap-2 text-sm w-full px-3 py-2 rounded-lg" style={{background:'var(--surface-2)',color:'var(--text-muted)',border:'1px solid var(--border)'}}>
        <ChevronDown size={14} style={{transform:showAgreements?'rotate(180deg)':'none',transition:'0.2s'}}/>
        {lang==='he'?'הסכמי ביטוח סוציאלי בילטרלי עם ישראל':'Israel Bilateral Social Security Agreements'}
      </button>
      {showAgreements && (
        <div className="mt-2 flex flex-col gap-1.5">
          {BILATERAL_AGREEMENTS.map((a,i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{background:'var(--surface-2)'}}>
              <span>{a.flag}</span>
              <span className="font-medium">{lang==='he'?a.country_he:a.country_en}</span>
              <span className="text-xs mr-auto" style={{color:'var(--text-muted)'}}>{a.covers}</span>
            </div>
          ))}
          <p className="text-xs px-1" style={{color:'var(--text-muted)'}}>{lang==='he'?'UAE, ברזיל, קפריסין, פורטוגל, תאילנד — ללא הסכם ביטוח סוציאלי עם ישראל.':'UAE, Brazil, Cyprus, Portugal, Thailand — no social security agreement with Israel.'}</p>
        </div>
      )}
    </div>
  );
}

// ─── Business Exit Planner ────────────────────────────────────────────────────
function BusinessExitPanel({ lang, profile, onClose }: { lang: Lang; profile: UserProfile; onClose: () => void }) {
  const defVal = profile.assets.business_value || 500000;
  const [companyType, setCompanyType] = useState<'ltd'|'sole'>('ltd');
  const [companyValue, setCompanyValue] = useState(defVal);
  const [retainedEarnings, setRetainedEarnings] = useState(Math.round(defVal * 0.3));
  const [scenario, setScenario] = useState<'sell'|'dividend'|'liquidate'|'holdco'>('sell');

  const CORP_TAX = 0.23;
  const DIV_TAX = 0.30; // incl surtax
  const CGT = 0.25;
  const SURTAX = 0.03;

  const results = useMemo(() => {
    const gain = Math.max(0, companyValue - 100000); // simplified cost basis
    switch (scenario) {
      case 'sell': {
        const cgt = gain * (CGT + SURTAX);
        const net = companyValue - cgt;
        return { net, tax: cgt, rate: ((cgt/companyValue)*100).toFixed(1), steps_he: ['הכנת דו"ח שמאות לחברה','הסכם מכר מניות','דיווח לרשות המסים תוך 30 יום','תשלום מס שבח / רווח הון'], steps_en: ['Prepare company valuation report','Share purchase agreement','Report to ITA within 30 days','Pay CGT'] };
      }
      case 'dividend': {
        const corpTax = retainedEarnings * CORP_TAX;
        const afterCorp = retainedEarnings - corpTax;
        const divTax = afterCorp * DIV_TAX;
        const net = afterCorp - divTax;
        return { net, tax: corpTax + divTax, rate: (((corpTax+divTax)/retainedEarnings)*100).toFixed(1), steps_he: ['אישור חלוקת דיבידנד בדירקטוריון','ניכוי מס במקור 30%','הגשת טופס 850','שקול חלוקה לפני שינוי תושבות'], steps_en: ['Board resolution for dividend','30% withholding tax deduction','File form 850','Consider distributing before changing residency'] };
      }
      case 'liquidate': {
        const corpCgt = gain * CORP_TAX;
        const afterCorp = companyValue - corpCgt;
        const divTax2 = afterCorp * DIV_TAX;
        const net = afterCorp - divTax2;
        return { net, tax: corpCgt + divTax2, rate: (((corpCgt+divTax2)/companyValue)*100).toFixed(1), steps_he: ['החלטת פירוק בבעלי מניות','מינוי מפרק','פירעון חובות לנושים','חלוקת יתרה לבעלי מניות','מחיקה מרשם החברות'], steps_en: ['Shareholder dissolution resolution','Appoint liquidator','Pay creditors','Distribute remainder to shareholders','Remove from company registry'] };
      }
      case 'holdco': {
        const restructureCost = companyValue * 0.01; // ~1% legal/accounting
        return { net: companyValue - restructureCost, tax: restructureCost, rate: '~1', steps_he: ['הקמת חברת אחזקות בחו"ל (UAEׁ/קפריסין/הולנד)','העברת מניות החברה הישראלית ל-Holdco','בדיקת סעיף 104ח לפטור מס שבח','הכנסות עתידיות דרך ה-Holdco','זהירות: CFC rules ישראליות'], steps_en: ['Set up foreign holding company (UAE/Cyprus/NL)','Transfer Israeli company shares to Holdco','Check Section 104H CGT exemption','Route future income via Holdco','Caution: Israeli CFC rules apply'] };
      }
    }
  }, [companyType, companyValue, retainedEarnings, scenario]);

  const scenarioColor = { sell:'#3b82f6', dividend:'#10b981', liquidate:'#f59e0b', holdco:'#8b5cf6' };
  const scenarioLabel = {
    he: { sell:'מכירת מניות', dividend:'חלוקת דיבידנד', liquidate:'פירוק', holdco:'מבנה Holding' },
    en: { sell:'Sell Shares', dividend:'Distribute Dividend', liquidate:'Liquidate', holdco:'Holding Structure' },
  };

  const fmt = (n: number) => `$${n.toLocaleString('en',{maximumFractionDigits:0})}`;

  return (
    <div className="flex-shrink-0 overflow-y-auto" style={{ maxHeight:'75vh', background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'1.5rem' }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <span>🏢</span>
          {lang==='he'?'תכנון יציאת עסקים — מה לעשות עם החברה?':'Business Exit Planner — What to Do With Your Company?'}
        </h2>
        <button onClick={onClose} style={{color:'var(--text-muted)'}}><X size={18}/></button>
      </div>

      {/* Inputs */}
      <div className="grid gap-3 mb-5" style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
        <div>
          <label className="text-xs mb-1 block" style={{color:'var(--text-muted)'}}>{lang==='he'?'סוג עסק':'Business Type'}</label>
          <select value={companyType} onChange={e=>setCompanyType(e.target.value as 'ltd'|'sole')} className="w-full text-sm px-2 py-1 rounded" style={{background:'var(--surface-2)',border:'1px solid var(--border)',color:'var(--text)'}}>
            <option value="ltd">{lang==='he'?'חברה בע"מ':'Ltd Company'}</option>
            <option value="sole">{lang==='he'?'עוסק מורשה':'Sole Proprietor'}</option>
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{color:'var(--text-muted)'}}>{lang==='he'?'שווי החברה ($)':'Company Value ($)'}</label>
          <input type="number" value={companyValue} onChange={e=>setCompanyValue(Number(e.target.value))} className="w-full text-sm px-2 py-1 rounded" style={{background:'var(--surface-2)',border:'1px solid var(--border)',color:'var(--text)'}}/>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{color:'var(--text-muted)'}}>{lang==='he'?'רווחים צבורים ($)':'Retained Earnings ($)'}</label>
          <input type="number" value={retainedEarnings} onChange={e=>setRetainedEarnings(Number(e.target.value))} className="w-full text-sm px-2 py-1 rounded" style={{background:'var(--surface-2)',border:'1px solid var(--border)',color:'var(--text)'}}/>
        </div>
      </div>

      {/* Scenario tabs */}
      <div className="grid gap-2 mb-5" style={{gridTemplateColumns:'1fr 1fr 1fr 1fr'}}>
        {(['sell','dividend','liquidate','holdco'] as const).map(s => (
          <button key={s} onClick={()=>setScenario(s)}
            className="py-2 px-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: scenario===s?scenarioColor[s]+'22':'var(--surface-2)', color: scenario===s?scenarioColor[s]:'var(--text-muted)', border: scenario===s?`1px solid ${scenarioColor[s]}66`:'1px solid var(--border)' }}>
            {scenarioLabel[lang][s]}
          </button>
        ))}
      </div>

      {/* Results */}
      {results && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3" style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
            <div style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:8,padding:'0.9rem',textAlign:'center'}}>
              <div className="text-xs mb-1" style={{color:'var(--text-muted)'}}>{lang==='he'?'תקבולים נטו':'Net Proceeds'}</div>
              <div className="font-bold" style={{color:'#10b981'}}>{fmt(results.net)}</div>
            </div>
            <div style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:8,padding:'0.9rem',textAlign:'center'}}>
              <div className="text-xs mb-1" style={{color:'var(--text-muted)'}}>{lang==='he'?'עלות מס':'Tax Cost'}</div>
              <div className="font-bold" style={{color:'#ef4444'}}>{fmt(results.tax)}</div>
            </div>
            <div style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:8,padding:'0.9rem',textAlign:'center'}}>
              <div className="text-xs mb-1" style={{color:'var(--text-muted)'}}>{lang==='he'?'שיעור מס':'Effective Rate'}</div>
              <div className="font-bold" style={{color:'var(--accent)'}}>{results.rate}%</div>
            </div>
          </div>

          <div style={{background:'var(--surface-2)',border:`1px solid ${scenarioColor[scenario]}44`,borderRadius:10,padding:'1rem'}}>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <CheckCircle2 size={14} style={{color:scenarioColor[scenario]}}/>
              {lang==='he'?'שלבי ביצוע':'Execution Steps'}
            </h3>
            {(lang==='he'?results.steps_he:results.steps_en).map((s,i) => (
              <div key={i} className="flex items-start gap-2 text-sm py-1.5" style={{borderBottom:'1px solid var(--border)',color:'var(--text)'}}>
                <span style={{color:scenarioColor[scenario],fontWeight:700,flexShrink:0}}>{i+1}.</span>{s}
              </div>
            ))}
          </div>

          {scenario === 'holdco' && (
            <div className="p-3 rounded text-xs" style={{background:'#f59e0b11',border:'1px solid #f59e0b33',color:'#f59e0b'}}>
              ⚠️ {lang==='he'?'שימוש ב-Holdco דורש בחינה מעמיקה של כללי CFC ישראליים (סעיף 75ב) ואמנות מס. לא מתאים לכל מצב.':'Using a Holdco requires careful analysis of Israeli CFC rules (Section 75B) and tax treaties. Not suitable for all situations.'}
            </div>
          )}
          {scenario === 'sell' && companyValue > 1000000 && (
            <div className="p-3 rounded text-xs" style={{background:'#3b82f611',border:'1px solid #3b82f633',color:'#3b82f6'}}>
              💡 {lang==='he'?'טיפ: מכירה לפני שינוי תושבות עשויה להיות עדיפה — ניתן לנצל פטורים ישראליים (סעיף 9(5)) במקרים מסוימים.':'Tip: Selling before changing residency may be preferable — Section 9(5) exemptions may apply.'}
            </div>
          )}
        </div>
      )}
      <p className="text-xs mt-4" style={{color:'var(--text-muted)'}}>{lang==='he'?'* חישוב משוער. מיסוי עסקים מורכב — חובה להתייעץ עם רו"ח/עו"ד לפני פעולה.':'* Rough estimate. Business taxation is complex — mandatory to consult a CPA/lawyer before acting.'}</p>
    </div>
  );
}

// ─── World Tax Map ─────────────────────────────────────────────────────────────
const TAX_MAP_REGIONS: { region_he: string; region_en: string; countries: string[] }[] = [
  { region_he: 'אירופה', region_en: 'Europe', countries: ['Portugal','Malta','Cyprus','Greece','Italy','Hungary','Netherlands','Estonia','Montenegro','Serbia'] },
  { region_he: 'מזרח תיכון / אסיה', region_en: 'Middle East / Asia', countries: ['UAE','Georgia','Thailand','Singapore'] },
  { region_he: 'אמריקה', region_en: 'Americas', countries: ['Panama','Mexico','Colombia','Brazil'] },
];

function taxColor(rate: number): string {
  if (rate <= 2) return '#10b981';
  if (rate <= 10) return '#34d399';
  if (rate <= 20) return '#f59e0b';
  if (rate <= 30) return '#f97316';
  return '#ef4444';
}

function WorldTaxMapPanel({ lang, profile, onClose }: { lang: Lang; profile: UserProfile; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [metric, setMetric] = useState<'taxSalary' | 'taxCG' | 'taxPassive'>('taxSalary');
  const income = (profile.income.employment||0)+(profile.income.business||0)+(profile.income.capital_gains||0)+(profile.income.dividends||0)+(profile.income.other||0);

  const metricLabels: Record<string, {he:string;en:string}> = {
    taxSalary: {he:'מס הכנסה',en:'Income Tax'},
    taxCG:     {he:'מס רווח הון',en:'Capital Gains'},
    taxPassive:{he:'מס פאסיבי',en:'Passive Income'},
  };

  const sorted = Object.entries(FIT_DATA).sort((a,b) => a[1][metric] - b[1][metric]);
  const isrEffective = income > 720000 ? 50 : income > 480000 ? 47 : income > 290000 ? 45 : income > 180000 ? 35 : 25;

  return (
    <div style={{ flex:'1 1 0', overflowY:'auto', padding:'1.5rem', minHeight:0 }}>
      <div style={{ maxWidth:860, margin:'0 auto' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold" style={{ color:'var(--text)' }}>🗺️ {lang==='he'?'אטלס מס עולמי':'World Tax Atlas'}</h2>
            <p className="text-sm mt-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'השוואה ויזואלית של עומס מס לפי מדינה':'Visual tax burden comparison by country'}</p>
          </div>
          <button onClick={onClose} style={{ color:'var(--text-muted)' }}><X size={18}/></button>
        </div>

        {/* Metric selector */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {(['taxSalary','taxCG','taxPassive'] as const).map(m => (
            <button key={m} onClick={() => setMetric(m)}
              className="px-3 py-1.5 rounded-lg text-sm"
              style={{ background: metric===m ? 'var(--accent-glow)' : 'var(--surface-2)', border: metric===m ? '1px solid var(--accent)' : '1px solid var(--border)', color: metric===m ? 'var(--accent)' : 'var(--text-muted)' }}>
              {metricLabels[m][lang==='he'?'he':'en']}
            </button>
          ))}
          <div className="flex items-center gap-3 mr-auto text-xs" style={{ color:'var(--text-muted)' }}>
            {[[0,'≤2%','#10b981'],[1,'≤10%','#34d399'],[2,'≤20%','#f59e0b'],[3,'≤30%','#f97316'],[4,'>30%','#ef4444']].map(([,label,color]) => (
              <span key={String(label)} className="flex items-center gap-1"><span style={{width:10,height:10,borderRadius:2,background:String(color),display:'inline-block'}}/>{label}</span>
            ))}
          </div>
        </div>

        {/* Israel reference bar */}
        <div className="rounded-xl p-3 mb-5 flex items-center gap-4" style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)' }}>
          <span className="text-xl">🇮🇱</span>
          <div className="flex-1">
            <div className="text-sm font-semibold" style={{ color:'var(--text)' }}>{lang==='he'?'ישראל (כיום)':'Israel (current)'}</div>
            <div className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>{lang==='he'?`שיעור אפקטיבי על הכנסתך: ~${isrEffective}%`:`Effective rate on your income: ~${isrEffective}%`}</div>
          </div>
          <div className="text-xl font-bold" style={{ color:'#ef4444' }}>{metric==='taxSalary' ? `~${isrEffective}%` : metric==='taxCG' ? '25%' : '25%'}</div>
        </div>

        {/* Regions */}
        {TAX_MAP_REGIONS.map(region => (
          <div key={region.region_en} className="mb-6">
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color:'var(--text-muted)' }}>
              {lang==='he' ? region.region_he : region.region_en}
            </h3>
            <div className="grid gap-2" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(150px,1fr))' }}>
              {region.countries.filter(c => FIT_DATA[c]).map(code => {
                const d = FIT_DATA[code];
                const rate = d[metric];
                const color = taxColor(rate);
                const isExp = expanded === code;
                const saving = metric==='taxSalary' ? isrEffective - rate : metric==='taxCG' ? 25 - rate : 25 - rate;
                return (
                  <button key={code} onClick={() => setExpanded(isExp ? null : code)}
                    className="rounded-xl p-3 text-left transition-all hover:opacity-90"
                    style={{ background: isExp ? `${color}18` : 'var(--surface)', border: `1px solid ${isExp ? color : 'var(--border)'}`, transform: isExp ? 'scale(1.02)' : 'scale(1)' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{d.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate" style={{ color:'var(--text)' }}>{lang==='he'?d.name:code}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold" style={{ color }}>{rate}%</div>
                      {saving > 0 && <div className="text-xs px-1.5 py-0.5 rounded-full" style={{ background:`${color}22`, color }}>{lang==='he'?`חיסכון ${saving}%`:`Save ${saving}%`}</div>}
                    </div>
                    {isExp && (
                      <div className="mt-2 pt-2 space-y-1 text-xs" style={{ borderTop:`1px solid ${color}40`, color:'var(--text-muted)' }}>
                        <div>{lang==='he'?'הכנסה':'Income'}: {d.taxSalary}% | {lang==='he'?'רווח הון':'CG'}: {d.taxCG}% | {lang==='he'?'פאסיבי':'Passive'}: {d.taxPassive}%</div>
                        <div>{lang==='he'?'קלות ויזה':'Visa ease'}: {d.visaEase}/100 | {lang==='he'?'יציבות':'Stability'}: {d.stability}/100</div>
                        <div>{lang==='he'?'אמנה עם ישראל':'Treaty w/IL'}: {d.treatyIsrael ? '✅' : '❌'}</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Ranking bar */}
        <div className="rounded-xl p-4 mt-2" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color:'var(--text)' }}>🏆 {lang==='he'?`דירוג לפי ${metricLabels[metric][lang==='he'?'he':'en']}`:`Ranking by ${metricLabels[metric]['en']}`}</h3>
          <div className="space-y-1.5">
            {sorted.slice(0,8).map(([code, d], i) => {
              const rate = d[metric];
              const pct = Math.min(rate / 50 * 100, 100);
              return (
                <div key={code} className="flex items-center gap-3">
                  <span className="text-xs w-4 text-center" style={{ color:'var(--text-muted)' }}>{i+1}</span>
                  <span>{d.flag}</span>
                  <span className="text-xs w-20 truncate" style={{ color:'var(--text)' }}>{lang==='he'?d.name:code}</span>
                  <div className="flex-1 rounded-full overflow-hidden" style={{ height:6, background:'var(--surface-2)' }}>
                    <div style={{ width:`${pct}%`, height:'100%', background:taxColor(rate), borderRadius:3, transition:'width 0.5s ease' }}/>
                  </div>
                  <span className="text-xs font-bold w-10 text-right" style={{ color:taxColor(rate) }}>{rate}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Lifetime Savings Counter ───────────────────────────────────────────────────
function calcLifetimeSaving(profile: UserProfile, countryKey: string, years: number): number {
  const income = (profile.income.employment||0)+(profile.income.business||0)+(profile.income.capital_gains||0)+(profile.income.dividends||0)+(profile.income.other||0);
  const cg = (profile.income.capital_gains||0)+(profile.income.dividends||0);
  const employment = (profile.income.employment||0)+(profile.income.business||0);
  if (income === 0) return 0;
  // Israel effective rates
  const isrIncome = income > 720000 ? 0.50 : income > 480000 ? 0.47 : income > 290000 ? 0.45 : income > 180000 ? 0.35 : 0.25;
  const isrCG = 0.25;
  const isrTotal = employment * isrIncome + cg * isrCG;
  const d = FIT_DATA[countryKey];
  if (!d) return 0;
  const destIncome = countryKey === 'Italy' && income > 400000 ? (110000 / income) : d.taxSalary / 100;
  const destCG = d.taxCG / 100;
  const destTotal = employment * destIncome + cg * destCG;
  const annualSaving = Math.max(0, isrTotal - destTotal);
  // Compound effect (savings invested at 6% annually)
  let total = 0;
  for (let y = 1; y <= years; y++) total += annualSaving * Math.pow(1.06, y);
  return Math.round(total);
}

function LifetimeSavingsPanel({ lang, profile, onClose }: { lang: Lang; profile: UserProfile; onClose: () => void }) {
  const [years, setYears] = useState(20);
  const [countryKey, setCountryKey] = useState('UAE');
  const [animated, setAnimated] = useState(0);

  const target = calcLifetimeSaving(profile, countryKey, years);
  const income = (profile.income.employment||0)+(profile.income.business||0)+(profile.income.capital_gains||0)+(profile.income.dividends||0)+(profile.income.other||0);

  useEffect(() => {
    if (target === 0) { setAnimated(0); return; }
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setAnimated(target); clearInterval(timer); }
      else setAnimated(Math.round(start));
    }, 20);
    return () => clearInterval(timer);
  }, [target]);

  const annualSaving = target > 0 ? Math.round(target / years / 1.5) : 0;
  const bestCountry = Object.entries(FIT_DATA).map(([k,d]) => ({ k, d, saving: calcLifetimeSaving(profile, k, years) })).sort((a,b) => b.saving - a.saving)[0];

  return (
    <div style={{ flex:'1 1 0', overflowY:'auto', padding:'1.5rem', minHeight:0 }}>
      <div style={{ maxWidth:700, margin:'0 auto' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color:'var(--text)' }}>💸 {lang==='he'?'מד חיסכון לכל החיים':'Lifetime Savings Counter'}</h2>
            <p className="text-sm mt-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'כמה תחסוך לאורך השנים אם תעבור מגורים':'How much you save over the years by relocating'}</p>
          </div>
          <button onClick={onClose} style={{ color:'var(--text-muted)' }}><X size={18}/></button>
        </div>

        {income === 0 ? (
          <div className="rounded-xl p-6 text-center" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
            <div className="text-3xl mb-2">📊</div>
            <p style={{ color:'var(--text-muted)' }}>{lang==='he'?'עדכן הכנסות בפרופיל כדי לראות חישוב אמיתי':'Update income in your profile to see a real calculation'}</p>
          </div>
        ) : (
          <>
            {/* Big number */}
            <div className="rounded-2xl p-8 text-center mb-6" style={{ background:'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.1))', border:'1px solid rgba(16,185,129,0.3)' }}>
              <div className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color:'#10b981' }}>
                {lang==='he'?`חיסכון צפוי ב-${years} שנה + תשואה על חיסכון (6%):`:`Projected savings over ${years} years + investment return (6%):`}
              </div>
              <div className="text-5xl font-black mb-2" style={{ color:'#10b981', fontVariantNumeric:'tabular-nums' }}>
                ₪{animated.toLocaleString()}
              </div>
              <div className="text-sm" style={{ color:'var(--text-muted)' }}>
                {lang==='he'?`≈ ₪${annualSaving.toLocaleString()} חיסכון שנתי ראשוני`:`≈ ₪${annualSaving.toLocaleString()} initial annual savings`}
              </div>
              {bestCountry && bestCountry.k === countryKey && (
                <div className="mt-2 text-xs" style={{ color:'#10b981' }}>🏆 {lang==='he'?'האפשרות הטובה ביותר לפרופיל שלך!':'Best option for your profile!'}</div>
              )}
            </div>

            {/* Controls */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl p-4" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                <label className="block text-xs font-medium mb-3" style={{ color:'var(--text-muted)' }}>{lang==='he'?'מדינת יעד:':'Target Country:'}</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(FIT_DATA).map(([k,d]) => (
                    <button key={k} onClick={() => setCountryKey(k)}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all"
                      style={{ background: countryKey===k ? 'var(--accent-glow)' : 'var(--surface-2)', border: countryKey===k ? '1px solid var(--accent)' : '1px solid var(--border)', color: countryKey===k ? 'var(--accent)' : 'var(--text-muted)' }}>
                      <span>{d.flag}</span><span className="truncate">{lang==='he'?d.name:k}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl p-4" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                  <label className="block text-xs font-medium mb-3" style={{ color:'var(--text-muted)' }}>{lang==='he'?`טווח זמן: ${years} שנה`:`Time horizon: ${years} years`}</label>
                  <input type="range" min={5} max={40} step={5} value={years} onChange={e => setYears(Number(e.target.value))}
                    className="w-full" style={{ accentColor:'var(--accent)' }}/>
                  <div className="flex justify-between text-xs mt-1" style={{ color:'var(--text-muted)' }}>
                    <span>5</span><span>20</span><span>40</span>
                  </div>
                </div>
                {/* Top 3 comparison */}
                <div className="rounded-xl p-4" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                  <div className="text-xs font-medium mb-2" style={{ color:'var(--text-muted)' }}>🏆 {lang==='he'?'TOP 3 לפרופיל שלך:':'TOP 3 for your profile:'}</div>
                  {Object.entries(FIT_DATA)
                    .map(([k,d]) => ({ k, d, s: calcLifetimeSaving(profile, k, years) }))
                    .sort((a,b) => b.s - a.s).slice(0,3)
                    .map(({k,d,s}, i) => (
                      <button key={k} onClick={() => setCountryKey(k)} className="w-full flex items-center gap-2 py-1 hover:opacity-80">
                        <span className="text-xs w-4" style={{ color:'var(--text-muted)' }}>{i+1}.</span>
                        <span>{d.flag}</span>
                        <span className="text-xs flex-1 text-left" style={{ color:'var(--text)' }}>{lang==='he'?d.name:k}</span>
                        <span className="text-xs font-bold" style={{ color:'#10b981' }}>₪{(s/1000000).toFixed(1)}M</span>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </>
        )}
        <p className="text-xs text-center" style={{ color:'var(--text-muted)' }}>* {lang==='he'?'הנחה: חיסכון מושקע ב-6% שנתי. אינו כולל עלויות מעבר, שינויי חקיקה, או גורמים אישיים.':'Assumes savings invested at 6% annual return. Does not include relocation costs, law changes, or personal factors.'}</p>
      </div>
    </div>
  );
}

// ─── Family Impact Analysis ─────────────────────────────────────────────────────
const FAMILY_DATA: Record<string, {
  schoolQuality: number; schoolCost_he: string; schoolCost_en: string;
  healthcareAccess: number; healthcareCost_he: string; healthcareCost_en: string;
  spouseWorkRights_he: string; spouseWorkRights_en: string;
  childBenefits_he: string; childBenefits_en: string;
  citizenship_he: string; citizenship_en: string;
  intlSchool_he: string; intlSchool_en: string;
}> = {
  UAE:      { schoolQuality:80, schoolCost_he:'₪50K-₪150K/שנה לבי"ס בינלאומי', schoolCost_en:'₪50K-₪150K/yr intl school', healthcareAccess:88, healthcareCost_he:'ביטוח פרטי חובה ~₪15K/שנה', healthcareCost_en:'Mandatory private insurance ~₪15K/yr', spouseWorkRights_he:'ויזת עבודה נפרדת נדרשת', spouseWorkRights_en:'Separate work visa required', childBenefits_he:'אין קצבת ילדים ממשלתית', childBenefits_en:'No government child benefits', citizenship_he:'אין מסלול אזרחות רגיל לילדים', citizenship_en:'No standard citizenship path for children', intlSchool_he:'מצוין — עשרות בתי ספר בינלאומיים', intlSchool_en:'Excellent — dozens of intl schools' },
  Cyprus:   { schoolQuality:72, schoolCost_he:'₪12K-₪40K/שנה — בי"ס בינלאומי', schoolCost_en:'₪12K-₪40K/yr intl school', healthcareAccess:78, healthcareCost_he:'GESY ציבורי + ביטוח פרטי אופציונלי', healthcareCost_en:'GESY public + optional private insurance', spouseWorkRights_he:'חופשי לעבודה ב-EU', spouseWorkRights_en:'Free to work in EU', childBenefits_he:'קצבת ילדים נמוכה (~€50/חודש)', childBenefits_en:'Low child benefit (~€50/month)', citizenship_he:'5 שנות מגורים → דרכון EU', citizenship_en:'5 years residency → EU passport', intlSchool_he:'טוב — מספר אפשרויות אנגלופוניות', intlSchool_en:'Good — several anglophone options' },
  Portugal: { schoolQuality:75, schoolCost_he:'₪8K-₪35K/שנה — ציבורי חינם!', schoolCost_en:'₪8K-₪35K/yr — public is free!', healthcareAccess:80, healthcareCost_he:'SNS ציבורי + ביטוח פרטי ~₪6K/שנה', healthcareCost_en:'Public SNS + private insurance ~₪6K/yr', spouseWorkRights_he:'חופשי לעבודה ב-EU', spouseWorkRights_en:'Free to work in EU', childBenefits_he:'€50-€140/חודש לילד', childBenefits_en:'€50-€140/month per child', citizenship_he:'5 שנות מגורים → דרכון EU', citizenship_en:'5 years residency → EU passport', intlSchool_he:'בינוני — אפשרויות מוגבלות מחוץ לליסבון', intlSchool_en:'Medium — limited options outside Lisbon' },
  Georgia:  { schoolQuality:55, schoolCost_he:'₪8K-₪20K/שנה — בי"ס בינלאומי', schoolCost_en:'₪8K-₪20K/yr intl school', healthcareAccess:62, healthcareCost_he:'ביטוח פרטי ~₪4K/שנה', healthcareCost_en:'Private insurance ~₪4K/yr', spouseWorkRights_he:'ויזת 1 שנה ללא מגבלות', spouseWorkRights_en:'1-year visa, no restrictions', childBenefits_he:'מינימלי', childBenefits_en:'Minimal', citizenship_he:'10 שנות מגורים → אזרחות', citizenship_en:'10 years residency → citizenship', intlSchool_he:'מוגבל — בעיקר בטביליסי', intlSchool_en:'Limited — mainly in Tbilisi' },
  Thailand: { schoolQuality:65, schoolCost_he:'₪15K-₪55K/שנה — בי"ס בינלאומי', schoolCost_en:'₪15K-₪55K/yr intl school', healthcareAccess:82, healthcareCost_he:'טיפול מצוין במחיר נמוך + ביטוח ~₪7K', healthcareCost_en:'Excellent care at low cost + insurance ~₪7K', spouseWorkRights_he:'ויזת עבודה נפרדת נדרשת', spouseWorkRights_en:'Separate work visa required', childBenefits_he:'אין קצבת ילדים ממשלתית', childBenefits_en:'No government child benefits', citizenship_he:'קשה מאוד להשיג אזרחות', citizenship_en:'Very difficult to obtain citizenship', intlSchool_he:'מצוין — ריכוז גדול בבנגקוק', intlSchool_en:'Excellent — large concentration in Bangkok' },
  Greece:   { schoolQuality:70, schoolCost_he:'ציבורי חינם + ₪10K-₪30K בינלאומי', schoolCost_en:'Public free + ₪10K-₪30K intl', healthcareAccess:72, healthcareCost_he:'ציבורי + ביטוח פרטי ~₪8K/שנה', healthcareCost_en:'Public + private insurance ~₪8K/yr', spouseWorkRights_he:'חופשי לעבודה ב-EU', spouseWorkRights_en:'Free to work in EU', childBenefits_he:'€50-€100/חודש לילד', childBenefits_en:'€50-€100/month per child', citizenship_he:'7 שנות מגורים → דרכון EU', citizenship_en:'7 years residency → EU passport', intlSchool_he:'מוגבל — באתונה בעיקר', intlSchool_en:'Limited — mainly Athens' },
  Panama:   { schoolQuality:60, schoolCost_he:'₪12K-₪40K/שנה — בי"ס בינלאומי', schoolCost_en:'₪12K-₪40K/yr intl school', healthcareAccess:70, healthcareCost_he:'ביטוח פרטי ~₪12K/שנה', healthcareCost_en:'Private insurance ~₪12K/yr', spouseWorkRights_he:'ויזה נפרדת קלה לקבלה', spouseWorkRights_en:'Separate visa, easy to obtain', childBenefits_he:'אין', childBenefits_en:'None', citizenship_he:'5 שנות מגורים → אזרחות', citizenship_en:'5 years residency → citizenship', intlSchool_he:'טוב — מספר אפשרויות פנמה סיטי', intlSchool_en:'Good — several Panama City options' },
  Malta:    { schoolQuality:74, schoolCost_he:'ציבורי חינם + ₪15K-₪40K בינלאומי', schoolCost_en:'Public free + ₪15K-₪40K intl', healthcareAccess:80, healthcareCost_he:'ציבורי + ביטוח פרטי ~₪7K/שנה', healthcareCost_en:'Public + private insurance ~₪7K/yr', spouseWorkRights_he:'חופשי לעבודה ב-EU', spouseWorkRights_en:'Free to work in EU', childBenefits_he:'€150-€300/חודש לילד', childBenefits_en:'€150-€300/month per child', citizenship_he:'1-3 שנות השקעה → דרכון EU', citizenship_en:'1-3 years investment → EU passport', intlSchool_he:'טוב — מספר בתי ספר אנגלופוניים', intlSchool_en:'Good — several anglophone schools' },
};

function FamilyImpactPanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [numChildren, setNumChildren] = useState(2);
  const [childAges, setChildAges] = useState('8, 12');
  const [spouseWorks, setSpouseWorks] = useState(true);
  const [country, setCountry] = useState('Portugal');

  const d = FAMILY_DATA[country];
  const countries = Object.keys(FAMILY_DATA);

  const healthBar = (score: number) => (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-full overflow-hidden" style={{ height:6, background:'var(--surface-2)' }}>
        <div style={{ width:`${score}%`, height:'100%', background: score >= 80 ? '#10b981' : score >= 65 ? '#f59e0b' : '#ef4444', borderRadius:3 }}/>
      </div>
      <span className="text-xs font-medium w-8" style={{ color: score >= 80 ? '#10b981' : score >= 65 ? '#f59e0b' : '#ef4444' }}>{score}</span>
    </div>
  );

  const schoolCostNum = numChildren * (country === 'UAE' ? 80000 : country === 'Thailand' ? 35000 : country === 'Portugal' ? 0 : 20000);

  return (
    <div style={{ flex:'1 1 0', overflowY:'auto', padding:'1.5rem', minHeight:0 }}>
      <div style={{ maxWidth:720, margin:'0 auto' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color:'var(--text)' }}>👨‍👩‍👧 {lang==='he'?'ניתוח השפעה משפחתית':'Family Impact Analysis'}</h2>
            <p className="text-sm mt-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'חינוך, בריאות, זכויות עבודה ואזרחות לפי מדינה':'Education, healthcare, work rights & citizenship by country'}</p>
          </div>
          <button onClick={onClose} style={{ color:'var(--text-muted)' }}><X size={18}/></button>
        </div>

        {/* Family config */}
        <div className="rounded-xl p-4 mb-5" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color:'var(--text)' }}>{lang==='he'?'פרטי המשפחה':'Family Details'}</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color:'var(--text-muted)' }}>{lang==='he'?'מספר ילדים':'Number of Children'}</label>
              <input type="number" min={0} max={6} value={numChildren} onChange={e => setNumChildren(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-sm" style={{ background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--text)' }}/>
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color:'var(--text-muted)' }}>{lang==='he'?'גילאי ילדים':'Children Ages'}</label>
              <input value={childAges} onChange={e => setChildAges(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm" style={{ background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--text)' }} placeholder="8, 12, 15"/>
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color:'var(--text-muted)' }}>{lang==='he'?'בן/בת זוג עובד/ת?':'Spouse Works?'}</label>
              <div className="flex gap-2">
                <button onClick={() => setSpouseWorks(true)} className="flex-1 py-2 rounded-lg text-sm" style={{ background: spouseWorks ? 'var(--accent-glow)' : 'var(--surface-2)', border: spouseWorks ? '1px solid var(--accent)' : '1px solid var(--border)', color: spouseWorks ? 'var(--accent)' : 'var(--text-muted)' }}>{lang==='he'?'כן':'Yes'}</button>
                <button onClick={() => setSpouseWorks(false)} className="flex-1 py-2 rounded-lg text-sm" style={{ background: !spouseWorks ? 'var(--accent-glow)' : 'var(--surface-2)', border: !spouseWorks ? '1px solid var(--accent)' : '1px solid var(--border)', color: !spouseWorks ? 'var(--accent)' : 'var(--text-muted)' }}>{lang==='he'?'לא':'No'}</button>
              </div>
            </div>
          </div>
        </div>

        {/* Country selector */}
        <div className="flex flex-wrap gap-2 mb-5">
          {countries.map(c => (
            <button key={c} onClick={() => setCountry(c)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
              style={{ background: country===c ? 'var(--accent-glow)' : 'var(--surface-2)', border: country===c ? '1px solid var(--accent)' : '1px solid var(--border)', color: country===c ? 'var(--accent)' : 'var(--text-muted)' }}>
              {FIT_DATA[c]?.flag} {lang==='he'?FIT_DATA[c]?.name:c}
            </button>
          ))}
        </div>

        {d && (
          <div className="space-y-4">
            {/* Scores */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-4" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                <div className="text-xs font-medium mb-2" style={{ color:'var(--text-muted)' }}>🎓 {lang==='he'?'איכות חינוך':'Education Quality'}</div>
                {healthBar(d.schoolQuality)}
                <div className="text-xs mt-2" style={{ color:'var(--text)' }}>{lang==='he'?d.schoolCost_he:d.schoolCost_en}</div>
                {numChildren > 0 && schoolCostNum > 0 && <div className="text-xs mt-1 font-medium" style={{ color:'#f59e0b' }}>≈ ₪{(schoolCostNum).toLocaleString()}/{lang==='he'?'שנה':'yr'} ({numChildren} {lang==='he'?'ילדים':'children'})</div>}
              </div>
              <div className="rounded-xl p-4" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                <div className="text-xs font-medium mb-2" style={{ color:'var(--text-muted)' }}>🏥 {lang==='he'?'נגישות רפואה':'Healthcare Access'}</div>
                {healthBar(d.healthcareAccess)}
                <div className="text-xs mt-2" style={{ color:'var(--text)' }}>{lang==='he'?d.healthcareCost_he:d.healthcareCost_en}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                { icon:'💼', key:'spouseWork', label_he: spouseWorks ? 'זכויות עבודה לבן/בת הזוג' : 'זכויות עבודה (לא רלוונטי)', label_en: spouseWorks ? 'Spouse Work Rights' : 'Work Rights (N/A)', val_he: d.spouseWorkRights_he, val_en: d.spouseWorkRights_en, show: spouseWorks },
                { icon:'👶', key:'childBenefits', label_he:'קצבת ילדים', label_en:'Child Benefits', val_he: d.childBenefits_he, val_en: d.childBenefits_en, show: numChildren > 0 },
                { icon:'🌍', key:'citizenship', label_he:'מסלול אזרחות', label_en:'Citizenship Path', val_he: d.citizenship_he, val_en: d.citizenship_en, show: true },
                { icon:'📚', key:'intlSchool', label_he:'בתי ספר בינלאומיים', label_en:'International Schools', val_he: d.intlSchool_he, val_en: d.intlSchool_en, show: numChildren > 0 },
              ].filter(item => item.show).map(item => (
                <div key={item.key} className="flex items-start gap-3 p-3 rounded-xl" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <div className="text-xs font-medium mb-0.5" style={{ color:'var(--text-muted)' }}>{lang==='he'?item.label_he:item.label_en}</div>
                    <div className="text-sm" style={{ color:'var(--text)' }}>{lang==='he'?item.val_he:item.val_en}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Israel comparison */}
            <div className="rounded-xl p-4" style={{ background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.2)' }}>
              <div className="text-xs font-semibold mb-2" style={{ color:'var(--accent)' }}>🇮🇱 {lang==='he'?'לעומת ישראל:':'Compared to Israel:'}</div>
              <ul className="space-y-1 text-xs" style={{ color:'var(--text-muted)' }}>
                <li>• {lang==='he'?'חינוך: ישראל מספקת חינוך חובה חינם. בתי ספר בינלאומיים: ₪30K-₪80K/שנה.':'Education: Israel provides free compulsory education. Intl schools: ₪30K-₪80K/yr.'}</li>
                <li>• {lang==='he'?'בריאות: ביטוח לאומי + קופות חולים. איכות גבוהה אך עומס גדול.':'Healthcare: National insurance + HMOs. High quality but heavy load.'}</li>
                {numChildren > 0 && <li>• {lang==='he'?`קצבת ילדים בישראל: ~₪150-₪200/חודש לילד.`:`Israeli child benefits: ~₪150-₪200/month per child.`}</li>}
              </ul>
            </div>
          </div>
        )}
        <p className="text-xs mt-4 text-center" style={{ color:'var(--text-muted)' }}>* {lang==='he'?'מידע כללי. בדוק נתונים עדכניים לפני קבלת החלטות.':'General information. Verify current data before making decisions.'}</p>
      </div>
    </div>
  );
}

// ─── Tax Alerts ─────────────────────────────────────────────────────────────────
interface TaxAlert { id: number; date: string; country_he: string; country_en: string; flag: string; title_he: string; title_en: string; body_he: string; body_en: string; impact: 'high'|'medium'|'low'; }

const TAX_ALERTS_DATA: TaxAlert[] = [
  { id:1, date:'2025-01', country_he:'פורטוגל', country_en:'Portugal', flag:'🇵🇹', title_he:'NHR בוטל — IFICI נכנס לתוקף', title_en:'NHR abolished — IFICI takes effect', body_he:'ישראלים שעלו לפני 31/12/2024 עדיין תחת NHR. חדשים יוכלו לבקש IFICI (25% פלאט על הכנסת חוץ) תחת תנאים חדשים.', body_en:'Israelis who registered before 31/12/2024 remain under NHR. New arrivals can apply for IFICI (25% flat on foreign income) under new conditions.', impact:'high' },
  { id:2, date:'2025-01', country_he:'איחוד האמירויות', country_en:'UAE', flag:'🇦🇪', title_he:'מס חברות 9% — בחינה מחדש לפרילנסרים', title_en:'9% Corporate Tax — Freelancer review', body_he:'מס חברות 9% בתוקף. פרילנסרים עם הכנסה מתחת AED 375K פטורים. בדוק אם עסקך עומד בתנאים.', body_en:'9% corporate tax in effect. Freelancers with income below AED 375K are exempt. Verify if your business qualifies.', impact:'medium' },
  { id:3, date:'2024-10', country_he:'ישראל', country_en:'Israel', flag:'🇮🇱', title_he:'עדכון מדרגות מס 2025 — הסף עלה', title_en:'2025 Tax Brackets Update — Threshold raised', body_he:'מדרגות המס עודכנו לפי מדד. סף פטור עלה ל-₪84,480/שנה. הגישה לגמלאות זרות השתנתה.', body_en:'Tax brackets updated for inflation. Exemption threshold raised to ₪84,480/year. Foreign pension treatment changed.', impact:'medium' },
  { id:4, date:'2024-09', country_he:'ספרד', country_en:'Spain', flag:'🇪🇸', title_he:'ויזת Nómada Digital — תנאים הוקשחו', title_en:'Digital Nomad Visa — stricter requirements', body_he:'הכנסה מינימלית עלתה ל-200% ממינימום ספרדי. נדרש ביטוח בריאות מקיף. תקופת אישור: 3-6 חודשים.', body_en:'Minimum income raised to 200% of Spanish minimum wage. Comprehensive health insurance required. Approval period: 3-6 months.', impact:'medium' },
  { id:5, date:'2024-07', country_he:'יוון', country_en:'Greece', flag:'🇬🇷', title_he:'ויזת Golden הוקשחה — מינימום €800K', title_en:'Golden Visa tightened — min €800K', body_he:'שינוי: ויזת השקעות יוון דורשת €800K בנדל"ן (מ-€250K). אפשרות חלופית: €400K בנכס יחיד מחוץ לאתונה.', body_en:'Change: Greek investment visa now requires €800K in real estate (from €250K). Alternative: €400K in single property outside Athens.', impact:'high' },
  { id:6, date:'2024-06', country_he:'קפריסין', country_en:'Cyprus', flag:'🇨🇾', title_he:'Non-Dom חידוש — ללא שינוי לישראלים', title_en:'Non-Dom renewal — no change for Israelis', body_he:'מעמד Non-Dom קפריסין אושר מחדש. ישראלים עם אמנת מס ממשיכים ליהנות מ-0% מס דיבידנד.', body_en:'Cyprus Non-Dom status reconfirmed. Israelis with tax treaty continue to enjoy 0% dividend tax.', impact:'low' },
  { id:7, date:'2024-03', country_he:'גאורגיה', country_en:'Georgia', flag:'🇬🇪', title_he:'Virtual Zone — הגדרות בוהרו', title_en:'Virtual Zone — definitions clarified', body_he:'שירותי תוכנה שיוצאים לחו"ל ממשיכים בפטור 0%. שירותי ייעוץ לחברות גאורגיות אינם זכאים. בדוק את ההגדרה.', body_en:'Software services exported abroad continue 0% exemption. Advisory services to Georgian companies ineligible. Verify classification.', impact:'medium' },
  { id:8, date:'2024-01', country_he:'גלובלי', country_en:'Global', flag:'🌍', title_he:'OECD Pillar Two — מינימום 15% לחברות גדולות', title_en:'OECD Pillar Two — 15% global minimum for large corps', body_he:'חברות עם הכנסות מעל €750M כפופות למס מינימום גלובלי 15% החל מ-2024. משפיע על holdcos גדולים.', body_en:'Companies with revenues over €750M subject to 15% global minimum tax from 2024. Affects large holdcos.', impact:'medium' },
];

function TaxAlertsPanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterImpact, setFilterImpact] = useState('all');

  const countries = ['all', ...Array.from(new Set(TAX_ALERTS_DATA.map(a => a.country_en)))];
  const filtered = TAX_ALERTS_DATA
    .filter(a => filterCountry === 'all' || a.country_en === filterCountry)
    .filter(a => filterImpact === 'all' || a.impact === filterImpact);

  const impactColor = { high:'#ef4444', medium:'#f59e0b', low:'#10b981' };
  const impactLabel = { high: {he:'גבוה',en:'High'}, medium:{he:'בינוני',en:'Medium'}, low:{he:'נמוך',en:'Low'} };

  return (
    <div style={{ flex:'1 1 0', overflowY:'auto', padding:'1.5rem', minHeight:0 }}>
      <div style={{ maxWidth:720, margin:'0 auto' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color:'var(--text)' }}>🔔 {lang==='he'?'התראות שינויי חקיקה':'Tax Law Change Alerts'}</h2>
            <p className="text-sm mt-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'שינויי מס רלוונטיים לישראלים בעולם':'Tax changes relevant to Israelis worldwide'}</p>
          </div>
          <button onClick={onClose} style={{ color:'var(--text-muted)' }}><X size={18}/></button>
        </div>

        {/* Subscribe */}
        <div className="rounded-xl p-4 mb-5" style={{ background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.2)' }}>
          <div className="text-sm font-semibold mb-2" style={{ color:'var(--accent)' }}>📧 {lang==='he'?'קבל התראות למייל':'Get email alerts'}</div>
          {subscribed ? (
            <div className="flex items-center gap-2 text-sm" style={{ color:'#10b981' }}>
              <CheckCircle2 size={16}/> {lang==='he'?`נרשמת ✓ נשלח עדכונים ל-${email}`:`Subscribed ✓ Updates will be sent to ${email}`}
            </div>
          ) : (
            <div className="flex gap-2">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={lang==='he'?'your@email.com':'your@email.com'}
                className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--text)' }}/>
              <button onClick={() => email.includes('@') && setSubscribed(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background:'var(--accent)', opacity: email.includes('@') ? 1 : 0.5 }}>
                {lang==='he'?'הרשם':'Subscribe'}
              </button>
            </div>
          )}
          <p className="text-xs mt-2" style={{ color:'var(--text-muted)' }}>{lang==='he'?'שבועי · ללא ספאם · ביטול בכל עת':'Weekly · No spam · Unsubscribe anytime'}</p>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="flex gap-1.5 items-center">
            <span className="text-xs" style={{ color:'var(--text-muted)' }}>{lang==='he'?'מדינה:':'Country:'}</span>
            <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
              className="px-2 py-1 rounded-lg text-xs" style={{ background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--text)' }}>
              <option value="all">{lang==='he'?'הכל':'All'}</option>
              {countries.filter(c=>c!=='all').map(c => {
                const a = TAX_ALERTS_DATA.find(x => x.country_en === c);
                return <option key={c} value={c}>{a?.flag} {lang==='he'?a?.country_he:c}</option>;
              })}
            </select>
          </div>
          <div className="flex gap-1.5 items-center">
            <span className="text-xs" style={{ color:'var(--text-muted)' }}>{lang==='he'?'השפעה:':'Impact:'}</span>
            {(['all','high','medium','low'] as const).map(v => (
              <button key={v} onClick={() => setFilterImpact(v)} className="px-2 py-1 rounded text-xs"
                style={{ background: filterImpact===v ? 'var(--accent-glow)' : 'var(--surface-2)', border: filterImpact===v ? '1px solid var(--accent)' : '1px solid var(--border)', color: filterImpact===v ? 'var(--accent)' : 'var(--text-muted)' }}>
                {v === 'all' ? (lang==='he'?'הכל':'All') : (lang==='he'?impactLabel[v].he:impactLabel[v].en)}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts list */}
        <div className="space-y-3">
          {filtered.map(alert => (
            <div key={alert.id} className="rounded-xl p-4" style={{ background:'var(--surface)', border:`1px solid var(--border)`, borderLeft:`3px solid ${impactColor[alert.impact]}` }}>
              <div className="flex items-start gap-3">
                <span className="text-xl">{alert.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm" style={{ color:'var(--text)' }}>{lang==='he'?alert.title_he:alert.title_en}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background:`${impactColor[alert.impact]}18`, color:impactColor[alert.impact] }}>
                      {lang==='he'?impactLabel[alert.impact].he:impactLabel[alert.impact].en}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color:'var(--text-muted)' }}>{lang==='he'?alert.body_he:alert.body_en}</p>
                  <div className="text-xs mt-1.5" style={{ color:'var(--text-muted)', opacity:0.6 }}>{alert.date} · {lang==='he'?alert.country_he:alert.country_en}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tax Optimization Score ─────────────────────────────────────────────────────
function TaxScorePanel({ lang, profile, onClose }: { lang: Lang; profile: UserProfile; onClose: () => void }) {
  const income = (profile.income.employment||0)+(profile.income.business||0)+(profile.income.capital_gains||0)+(profile.income.dividends||0)+(profile.income.other||0);
  const cg = (profile.income.capital_gains||0)+(profile.income.dividends||0);
  const crypto = profile.assets.crypto_holdings||0;
  const totalAssets = (profile.assets.stocks||0)+(profile.assets.real_estate||0)+crypto+(profile.assets.business_value||0)+(profile.assets.other||0);
  const isUS = profile.is_us_person;

  // Israel effective rate
  const isrRate = income > 720000 ? 50 : income > 480000 ? 47 : income > 290000 ? 45 : income > 180000 ? 35 : 25;
  const isrCGRate = 25;

  // Best possible rate (UAE = 0%)
  const bestRate = 0;

  // Current score: how close to optimal (100 = fully optimized, 0 = worst)
  const incomeScore = income > 0 ? Math.max(0, 100 - Math.round((isrRate - bestRate) / 50 * 100)) : 50;
  const cgScore = cg > 0 ? Math.max(0, 100 - Math.round(isrCGRate / 40 * 100)) : 50;
  const cryptoScore = crypto > 0 ? 35 : 70; // Crypto in Israel is taxed heavily
  const treatyScore = profile.is_us_person ? 30 : 75;
  const crsScore = 55; // Israel = full CRS reporting
  const overallScore = Math.round((incomeScore * 0.35 + cgScore * 0.25 + cryptoScore * 0.15 + treatyScore * 0.15 + crsScore * 0.10));

  // Best country for profile
  const bestCountry = Object.entries(FIT_DATA)
    .map(([k,d]) => {
      const s = (!isUS || d.usFriendly) ? (100 - d.taxSalary) : (100 - d.taxSalary - 15);
      return { k, d, s };
    })
    .sort((a,b) => b.s - a.s)[0];

  const potentialScore = Math.min(95, overallScore + 35);

  const [animated, setAnimated] = useState(0);
  const [animPotential, setAnimPotential] = useState(0);

  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      n += 2;
      if (n >= overallScore) { setAnimated(overallScore); clearInterval(t); }
      else setAnimated(n);
    }, 15);
    return () => clearInterval(t);
  }, [overallScore]);

  useEffect(() => {
    let n = overallScore;
    const t = setInterval(() => {
      n += 1;
      if (n >= potentialScore) { setAnimPotential(potentialScore); clearInterval(t); }
      else setAnimPotential(n);
    }, 30);
    return () => clearInterval(t);
  }, [overallScore, potentialScore]);

  const scoreColor = (s: number) => s >= 70 ? '#10b981' : s >= 45 ? '#f59e0b' : '#ef4444';
  const scoreLabel = (s: number) => s >= 70 ? (lang==='he'?'מותאם היטב':'Well Optimized') : s >= 45 ? (lang==='he'?'מותאם חלקית':'Partially Optimized') : (lang==='he'?'דורש שיפור':'Needs Improvement');

  const dimensions = [
    { key:'income', label_he:'מס הכנסה', label_en:'Income Tax', score: incomeScore, detail_he:`שיעור אפקטיבי ~${isrRate}%`, detail_en:`Effective rate ~${isrRate}%` },
    { key:'cg', label_he:'מס רווח הון', label_en:'Capital Gains', score: cgScore, detail_he:`25% על כל הכנסות ההון`, detail_en:`25% on all capital income` },
    { key:'crypto', label_he:'מיסוי קריפטו', label_en:'Crypto Taxation', score: cryptoScore, detail_he: crypto > 0 ? `25% CGT על ₪${crypto.toLocaleString()} קריפטו` : 'אין חשיפת קריפטו', detail_en: crypto > 0 ? `25% CGT on ₪${crypto.toLocaleString()} crypto` : 'No crypto exposure' },
    { key:'treaty', label_he:'אמנות מס', label_en:'Tax Treaties', score: treatyScore, detail_he: isUS ? 'חשיפת FATCA/FBAR' : 'כיסוי אמנות טוב', detail_en: isUS ? 'FATCA/FBAR exposure' : 'Good treaty coverage' },
    { key:'crs', label_he:'פרטיות פיננסית (CRS)', label_en:'Financial Privacy (CRS)', score: crsScore, detail_he:'ישראל במערכת CRS מלאה', detail_en:'Israel in full CRS system' },
  ];

  // Gauge SVG
  const radius = 80;
  const circumference = Math.PI * radius;
  const offset = circumference - (animated / 100) * circumference;

  return (
    <div style={{ flex:'1 1 0', overflowY:'auto', padding:'1.5rem', minHeight:0 }}>
      <div style={{ maxWidth:700, margin:'0 auto' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color:'var(--text)' }}>📊 {lang==='he'?'ציון אופטימיזציית מס':'Tax Optimization Score'}</h2>
            <p className="text-sm mt-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'עד כמה המבנה הנוכחי שלך מותאם לחיסכון מס':'How well your current setup is optimized for tax savings'}</p>
          </div>
          <button onClick={onClose} style={{ color:'var(--text-muted)' }}><X size={18}/></button>
        </div>

        {income === 0 && totalAssets === 0 ? (
          <div className="rounded-xl p-6 text-center" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
            <div className="text-3xl mb-2">📊</div>
            <p style={{ color:'var(--text-muted)' }}>{lang==='he'?'עדכן פרופיל כדי לראות ציון מדויק':'Update your profile to see an accurate score'}</p>
          </div>
        ) : (
          <>
            {/* Score gauges */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Current score */}
              <div className="rounded-2xl p-6 text-center" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                <div className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color:'var(--text-muted)' }}>{lang==='he'?'ציון נוכחי (ישראל)':'Current Score (Israel)'}</div>
                <svg width={200} height={110} viewBox="0 0 200 110" className="mx-auto">
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--surface-2)" strokeWidth={16} strokeLinecap="round"/>
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={scoreColor(animated)}
                    strokeWidth={16} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition:'stroke-dashoffset 0.05s linear' }}/>
                  <text x="100" y="95" textAnchor="middle" fontSize="32" fontWeight="900" fill={scoreColor(animated)}>{animated}</text>
                  <text x="100" y="108" textAnchor="middle" fontSize="9" fill="var(--text-muted)">/100</text>
                </svg>
                <div className="text-sm font-semibold mt-1" style={{ color: scoreColor(overallScore) }}>{scoreLabel(overallScore)}</div>
              </div>
              {/* Potential score */}
              <div className="rounded-2xl p-6 text-center" style={{ background:'var(--surface)', border:'1px solid rgba(16,185,129,0.3)' }}>
                <div className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color:'#10b981' }}>{lang==='he'?`פוטנציאל (${bestCountry?.d.flag} ${lang==='he'?bestCountry?.d.name:bestCountry?.k})`:`Potential (${bestCountry?.d.flag} ${bestCountry?.k})`}</div>
                <svg width={200} height={110} viewBox="0 0 200 110" className="mx-auto">
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--surface-2)" strokeWidth={16} strokeLinecap="round"/>
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#10b981"
                    strokeWidth={16} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference - (animPotential/100)*circumference} style={{ transition:'stroke-dashoffset 0.05s linear' }}/>
                  <text x="100" y="95" textAnchor="middle" fontSize="32" fontWeight="900" fill="#10b981">{animPotential}</text>
                  <text x="100" y="108" textAnchor="middle" fontSize="9" fill="var(--text-muted)">/100</text>
                </svg>
                <div className="text-sm font-semibold mt-1" style={{ color:'#10b981' }}>+{potentialScore - overallScore} {lang==='he'?'שיפור אפשרי':'possible improvement'}</div>
              </div>
            </div>

            {/* Dimension breakdown */}
            <div className="rounded-xl p-4 mb-5" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color:'var(--text)' }}>{lang==='he'?'פירוט ציונים:':'Score Breakdown:'}</h3>
              <div className="space-y-3">
                {dimensions.map(dim => (
                  <div key={dim.key} className="flex items-center gap-3">
                    <div className="w-28 text-xs" style={{ color:'var(--text-muted)' }}>{lang==='he'?dim.label_he:dim.label_en}</div>
                    <div className="flex-1 rounded-full overflow-hidden" style={{ height:8, background:'var(--surface-2)' }}>
                      <div style={{ width:`${dim.score}%`, height:'100%', background: scoreColor(dim.score), borderRadius:4, transition:'width 1s ease' }}/>
                    </div>
                    <span className="text-xs font-bold w-8 text-right" style={{ color: scoreColor(dim.score) }}>{dim.score}</span>
                    <span className="text-xs w-40" style={{ color:'var(--text-muted)' }}>{lang==='he'?dim.detail_he:dim.detail_en}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Improvement actions */}
            <div className="rounded-xl p-4" style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color:'#10b981' }}>⚡ {lang==='he'?'3 צעדים לשיפור הציון:':'3 Steps to Improve Your Score:'}</h3>
              <div className="space-y-2">
                {[
                  { n:1, he:`עבור ל${bestCountry?.d.flag||'🇦🇪'} ${lang==='he'?bestCountry?.d.name:bestCountry?.k} — מיסוי ${bestCountry?.d.taxSalary||0}% על הכנסה`, en:`Relocate to ${bestCountry?.d.flag} ${bestCountry?.k} — ${bestCountry?.d.taxSalary||0}% income tax`, gain:20 },
                  { n:2, he:'פתח מבנה Non-Dom / Holding להכנסות הון', en:'Set up Non-Dom / Holding structure for capital income', gain:12 },
                  { n:3, he:'תכנן מכירת קריפטו לפני שינוי תושבות (חסוך 25% CGT)', en:'Plan crypto sale before residency change (save 25% CGT)', gain: crypto > 50000 ? 8 : 3 },
                ].map(step => (
                  <div key={step.n} className="flex items-start gap-3 text-sm">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background:'rgba(16,185,129,0.2)', color:'#10b981' }}>{step.n}</span>
                    <span style={{ color:'var(--text)' }}>{lang==='he'?step.he:step.en}</span>
                    <span className="text-xs font-bold ml-auto flex-shrink-0" style={{ color:'#10b981' }}>+{step.gain}pt</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tax Authority Audit Simulator ───────────────────────────────────────────
interface AuditRiskItem {
  category_he: string; category_en: string;
  riskLevel: 'high' | 'medium' | 'low';
  issue_he: string; issue_en: string;
  whatAuthority_he: string; whatAuthority_en: string;
  defense_he: string; defense_en: string;
  docs_he: string[]; docs_en: string[];
}

function TaxAuditSimulatorPanel({ lang, profile, onClose }: { lang: Lang; profile: UserProfile; onClose: () => void }) {
  const income = (profile.income.employment||0)+(profile.income.business||0)+(profile.income.capital_gains||0)+(profile.income.dividends||0)+(profile.income.other||0);
  const riskItems = useMemo((): AuditRiskItem[] => {
    const items: AuditRiskItem[] = [];
    items.push({ category_he:'ניתוק תושבות', category_en:'Residency Break', riskLevel: income>500000?'high':'medium',
      issue_he:'הוכחת ניתוק מרכז חיים מישראל', issue_en:'Proving break of center of life from Israel',
      whatAuthority_he:'פקיד השומה יבדוק: ימי שהייה, מגורי משפחה, רופאים, קופת חולים, מועדונים, כתובת, נכסים', whatAuthority_en:"Tax officer examines: days in Israel, family residence, doctors, HMO, clubs, address, assets",
      defense_he:'תיעד יציאה לפני עזיבה. בנה "מרכז חיים" ברור בחו"ל.', defense_en:'Document your departure. Build a clear "center of life" abroad.',
      docs_he:['דפי דרכון עם חותמות יציאה/כניסה','חוזה שכירות בחו"ל','אישור תושבות ממדינת יעד','רישום ילדים לבית ספר בחו"ל','סגירת קופת חולים ישראלית'],
      docs_en:['Passport pages with stamps','Foreign rental contract','Residency certificate from destination','Children school registration abroad','Israeli HMO closure'] });
    if (profile.is_us_person) items.push({ category_he:'FBAR / FATCA', category_en:'FBAR / FATCA', riskLevel:'high',
      issue_he:'דיווח חשבונות זרים לרשויות האמריקאיות', issue_en:'Foreign account reporting to US authorities',
      whatAuthority_he:'IRS ו-FinCEN יבדקו: FBAR שנתי, Form 8938, חשבונות מעל $10K', whatAuthority_en:'IRS and FinCEN check: annual FBAR, Form 8938, accounts over $10K',
      defense_he:'הגש FBAR בזמן. שמור רואה חשבון אמריקאי.', defense_en:'File FBAR on time. Retain a US CPA.',
      docs_he:['טפסי FBAR (FinCEN 114)','Form 8938','דפי חשבון בנק זרים'], docs_en:['FBAR forms (FinCEN 114)','Form 8938','Foreign bank statements'] });
    if ((profile.assets.crypto_holdings||0)>50000) items.push({ category_he:'קריפטו ונכסים דיגיטליים', category_en:'Crypto & Digital Assets', riskLevel:'high',
      issue_he:'דיווח ורישום עסקאות קריפטו', issue_en:'Reporting and recording crypto transactions',
      whatAuthority_he:'רשות המסים דורשת דיווח כל מכירה. בורסות דיגיטליות ב-CRS. שיתוף פעולה עם IRS.', whatAuthority_en:'Tax authority requires reporting every sale. Digital exchanges subject to CRS. Cooperation with IRS.',
      defense_he:'שמור היסטוריית עסקאות מלאה. חשב רווח/הפסד לכל עסקה.', defense_en:'Keep full transaction history. Calculate gain/loss per trade.',
      docs_he:['ייצוא CSV מכל הבורסות','חישוב רווח/הפסד (FIFO/LIFO)','הוכחת תאריכי רכישה'], docs_en:['CSV export from all exchanges','Gain/loss calculation (FIFO/LIFO)','Proof of acquisition dates'] });
    if ((profile.assets.business_value||0)>200000) items.push({ category_he:'מס יציאה על עסק', category_en:'Business Exit Tax', riskLevel:'high',
      issue_he:'מס יציאה על שווי החברה ביום ניתוק התושבות', issue_en:'Exit tax on company value at residency break date',
      whatAuthority_he:'פקיד שומה יוציא שומת מס יציאה על שווי עסקי — עלול להגיע למיליונים.', whatAuthority_en:'Tax officer issues exit tax assessment on business value — can reach millions.',
      defense_he:'קבל הערכת שווי מוסמכת לפני עזיבה. שקול סעיף 100א.', defense_en:'Get certified valuation before departure. Consider Section 100A.',
      docs_he:['הערכת שווי עסקי (רו"ח מוסמך)','דוחות כספיים 3 שנים','הסכם דחיית מס'], docs_en:['Business valuation (certified CPA)','3 years financial statements','Tax deferral agreement'] });
    if ((profile.assets.real_estate||0)>100000) items.push({ category_he:'נדל"ן ישראלי לתושב חוץ', category_en:'Israeli Real Estate — Non-Resident', riskLevel:'medium',
      issue_he:'מיסוי השכרה ומכירה כתושב חוץ', issue_en:'Rental and sale taxation as non-resident',
      whatAuthority_he:'תושב חוץ: 35% מס שכירות ללא ניכויים, או 10% גלוי. מכירה: מס שבח ללא פטורים.', whatAuthority_en:'Non-resident: 35% rental tax without deductions or 10% flat. Sale: CGT without exemptions.',
      defense_he:'שקול מכירה לפני ניתוק תושבות לניצול פטור דירה ראשונה.', defense_en:'Consider selling before residency break to use first-home exemption.',
      docs_he:['הסכם שכירות','קבלות שכר דירה','דיווח למס הכנסה'], docs_en:['Rental agreement','Rent receipts','Income tax filing'] });
    if ((profile.income.business||0)>100000) items.push({ category_he:'מחירי העברה', category_en:'Transfer Pricing', riskLevel:'medium',
      issue_he:'תשלומים בין חברות קשורות', issue_en:'Payments between related companies',
      whatAuthority_he:'רשות המסים בודקת שתשלומים בין חברות קשורות לפי שוק: ריבית, שירותים, רישיון IP.', whatAuthority_en:"Tax authority checks related-party payments are arm's length: interest, services, IP license.",
      defense_he:'הכן תיק מחירי העברה. תעד את בסיס התמחור.', defense_en:'Prepare transfer pricing documentation. Document pricing basis.',
      docs_he:['הסכמי שירות בין-חברתיים','תיק מחירי העברה (TP Study)'], docs_en:['Intercompany service agreements','Transfer pricing study'] });
    items.push({ category_he:'ניהול ספרים ודיווח שנתי', category_en:'Bookkeeping & Annual Reporting', riskLevel:'low',
      issue_he:'עמידה בחובות דיווח ישראליות לאחר ניתוק', issue_en:'Meeting Israeli reporting obligations post-departure',
      whatAuthority_he:'גם אחרי עזיבה: חייב בדיווח שנת מס פרטית. אי-הגשה = קנסות.', whatAuthority_en:'Even after leaving: must file departure-year tax return. Non-filing = penalties.',
      defense_he:'הגש דוח שנת עזיבה. קבל אישור "ניתוק תושבות" רשמי.', defense_en:'File departure-year return. Get official residency break certificate.',
      docs_he:['דוח שנתי לשנת העזיבה','בקשה לאישור ניתוק תושבות','אישור העדר חובות'], docs_en:['Annual return for departure year','Residency break application','Tax clearance certificate'] });
    return items.sort((a,b) => ({high:0,medium:1,low:2}[a.riskLevel] - {high:0,medium:1,low:2}[b.riskLevel]));
  }, [income, profile]);

  const overallScore = Math.max(0, 100 - riskItems.filter(r=>r.riskLevel==='high').length*25 - riskItems.filter(r=>r.riskLevel==='medium').length*10);
  const [expanded, setExpanded] = useState<number|null>(null);
  const rc = (l:string) => l==='high'?'#ef4444':l==='medium'?'#f59e0b':'#10b981';
  const rl = (l:string) => l==='high'?(lang==='he'?'סיכון גבוה':'High Risk'):l==='medium'?(lang==='he'?'סיכון בינוני':'Medium Risk'):(lang==='he'?'סיכון נמוך':'Low Risk');

  return (
    <div className="flex-shrink-0 overflow-y-auto" style={{maxHeight:'72vh',background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:'1.5rem'}}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">🕵️ {lang==='he'?'סימולטור ביקורת רשות המסים':'Tax Authority Audit Simulator'}</h2>
        <button onClick={onClose} style={{color:'var(--text-muted)'}}><X size={18}/></button>
      </div>
      <div style={{background:overallScore>=70?'#10b98111':overallScore>=40?'#f59e0b11':'#ef444411',border:`1px solid ${overallScore>=70?'#10b98133':overallScore>=40?'#f59e0b33':'#ef444433'}`,borderRadius:10,padding:'1rem',marginBottom:'1.5rem',display:'flex',alignItems:'center',gap:'1.5rem'}}>
        <div style={{textAlign:'center',minWidth:80}}>
          <div style={{fontSize:'2.5rem',fontWeight:800,color:overallScore>=70?'#10b981':overallScore>=40?'#f59e0b':'#ef4444'}}>{overallScore}</div>
          <div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{lang==='he'?'ציון עמידות':'Defense Score'}</div>
        </div>
        <div>
          <div style={{fontWeight:700,marginBottom:4}}>{lang==='he'?'הערכת סיכון כוללת':'Overall Risk Assessment'}</div>
          <div style={{fontSize:'0.83rem',color:'var(--text-muted)'}}>
            {riskItems.filter(r=>r.riskLevel==='high').length} {lang==='he'?'גבוהים':'high'} · {riskItems.filter(r=>r.riskLevel==='medium').length} {lang==='he'?'בינוניים':'medium'} · {riskItems.filter(r=>r.riskLevel==='low').length} {lang==='he'?'נמוכים':'low'}
          </div>
          <div style={{fontSize:'0.8rem',color:'var(--text-muted)',marginTop:4}}>
            {overallScore>=70?(lang==='he'?'✓ תוכנית מגובה יחסית — עדיין נדרש ייעוץ מקצועי':'✓ Relatively defensible — professional advice still required'):overallScore>=40?(lang==='he'?'⚠️ פערים משמעותיים — פעל לסגירתם':'⚠️ Significant gaps — act to close them'):(lang==='he'?'🚨 סיכון גבוה — דרוש ייעוץ מיידי עם עורך דין מס':'🚨 High risk — immediate consultation with tax attorney required')}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {riskItems.map((item,idx) => (
          <div key={idx} style={{background:'var(--surface-2)',border:`1px solid ${rc(item.riskLevel)}44`,borderRadius:10,overflow:'hidden'}}>
            <button onClick={()=>setExpanded(expanded===idx?null:idx)} className="w-full flex items-center justify-between px-4 py-3" style={{textAlign:'start'}}>
              <div className="flex items-center gap-3">
                <div style={{width:8,height:8,borderRadius:'50%',background:rc(item.riskLevel),flexShrink:0}}/>
                <span style={{fontWeight:600,fontSize:'0.9rem'}}>{lang==='he'?item.category_he:item.category_en}</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{fontSize:'0.73rem',fontWeight:600,color:rc(item.riskLevel),background:rc(item.riskLevel)+'18',padding:'2px 8px',borderRadius:20}}>{rl(item.riskLevel)}</span>
                <ChevronDown size={14} style={{color:'var(--text-muted)',transform:expanded===idx?'rotate(180deg)':'none',transition:'transform 0.2s'}}/>
              </div>
            </button>
            {expanded===idx && (
              <div style={{padding:'0 1rem 1rem',borderTop:`1px solid ${rc(item.riskLevel)}22`}}>
                <p style={{fontSize:'0.85rem',color:'var(--text-muted)',margin:'0.5rem 0 0.75rem'}}>{lang==='he'?item.issue_he:item.issue_en}</p>
                <div style={{background:'#ef444411',border:'1px solid #ef444422',borderRadius:8,padding:'0.75rem',marginBottom:'0.75rem'}}>
                  <div style={{fontSize:'0.73rem',fontWeight:700,color:'#ef4444',marginBottom:4}}>🔍 {lang==='he'?'מה פקיד השומה יבדוק:':'What the tax officer will examine:'}</div>
                  <div style={{fontSize:'0.82rem'}}>{lang==='he'?item.whatAuthority_he:item.whatAuthority_en}</div>
                </div>
                <div style={{background:'#10b98111',border:'1px solid #10b98122',borderRadius:8,padding:'0.75rem',marginBottom:'0.75rem'}}>
                  <div style={{fontSize:'0.73rem',fontWeight:700,color:'#10b981',marginBottom:4}}>🛡️ {lang==='he'?'הגנה מומלצת:':'Recommended defense:'}</div>
                  <div style={{fontSize:'0.82rem'}}>{lang==='he'?item.defense_he:item.defense_en}</div>
                </div>
                <div style={{fontSize:'0.73rem',fontWeight:700,color:'var(--text-muted)',marginBottom:6}}>📁 {lang==='he'?'מסמכים לאסוף:':'Documents to gather:'}</div>
                {(lang==='he'?item.docs_he:item.docs_en).map((d,i)=>(
                  <div key={i} style={{fontSize:'0.8rem',display:'flex',gap:8,alignItems:'flex-start',marginBottom:3}}><span style={{color:'var(--accent)',flexShrink:0}}>▸</span>{d}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{marginTop:'1rem',padding:'0.75rem',background:'var(--surface-2)',borderRadius:8,fontSize:'0.75rem',color:'var(--text-muted)'}}>
        ⚠️ {lang==='he'?'סימולציה בלבד — אינה תחליף לייעוץ משפטי-מסי מוסמך.':'Simulation only — not a substitute for qualified legal-tax advice.'}
      </div>
    </div>
  );
}

// ─── Passport Optimizer ───────────────────────────────────────────────────────
const PASSPORT_PROGRAMS = [
  { country_he:'מלטה', country_en:'Malta', flag:'🇲🇹', program_he:'MEIN — Malta Exceptional Investor Naturalisation', program_en:'MEIN — Malta Exceptional Investor Naturalisation',
    minInvestK:690, timelineMonths:36, visaFreeCount:186, roiYears:4,
    taxBenefit_he:'Non-Dom: מס רק על הכנסה שמועברת למלטה. גישה מלאה לכל EU.', taxBenefit_en:'Non-Dom: tax only on income remitted to Malta. Full EU access.',
    pros_he:['דרכון EU חזק ביותר — 186 מדינות','Non-Dom מיסוי מועדף','גישה ל-27 מדינות EU'], pros_en:['Strongest EU passport — 186 countries','Non-Dom favorable taxation','Access to all 27 EU countries'],
    cons_he:['עלות גבוהה מאוד ($690K+)','12 חודשי תושבות נדרשים','תהליך בדיקה מחמיר'], cons_en:['Very high cost ($690K+)','12 months residency required','Strict due diligence'] },
  { country_he:'ונואטו', country_en:'Vanuatu', flag:'🇻🇺', program_he:'DSP — Development Support Program', program_en:'DSP — Development Support Program',
    minInvestK:130, timelineMonths:2, visaFreeCount:96, roiYears:2,
    taxBenefit_he:'0% מס הכנסה, 0% CGT, 0% ירושה — מיסוי טריטוריאלי מוחלט.', taxBenefit_en:'0% income tax, 0% CGT, 0% inheritance — fully territorial taxation.',
    pros_he:['הכי מהיר בעולם — 60 יום!','עלות נמוכה ($130K)','0% מס מוחלט','ללא דרישת מגורים'], pros_en:['Fastest in the world — 60 days!','Low cost ($130K)','Absolute 0% tax','No residency requirement'],
    cons_he:['96 מדינות בלבד — ללא Schengen','תדמית פחות חזקה','ללא גישה ל-EU'], cons_en:['Only 96 countries — no Schengen','Weaker image','No EU access'] },
  { country_he:'פנמה', country_en:'Panama', flag:'🇵🇦', program_he:'Friendly Nations → Naturalization', program_en:'Friendly Nations → Naturalization',
    minInvestK:5, timelineMonths:60, visaFreeCount:140, roiYears:3,
    taxBenefit_he:'מיסוי טריטוריאלי: 0% על הכנסה מחו"ל. ישראל ברשימת המדינות הידידותיות.', taxBenefit_en:"Territorial taxation: 0% on foreign income. Israel on 'friendly nations' list.",
    pros_he:['עלות נמוכה ביותר ($5K)','מיסוי טריטוריאלי','ישראל ברשימת "מדינות ידידותיות"'], pros_en:['Lowest cost ($5K)','Territorial taxation',"Israel on 'friendly nations' list"],
    cons_he:['5 שנות המתנה לאזרחות','ספרדית נדרשת','פנמה ב-FATF Grey List'], cons_en:['5 years wait for citizenship','Spanish required','Panama on FATF Grey List'] },
  { country_he:'קפריסין', country_en:'Cyprus', flag:'🇨🇾', program_he:'Non-Dom Residency → EU Citizenship', program_en:'Non-Dom Residency → EU Citizenship',
    minInvestK:300, timelineMonths:84, visaFreeCount:173, roiYears:3,
    taxBenefit_he:'Non-Dom: 0% על דיבידנד ורווחי הון ל-17 שנה. 12.5% מס חברות.', taxBenefit_en:'Non-Dom: 0% on dividends and capital gains for 17 years. 12.5% corporate tax.',
    pros_he:['Non-Dom — היתרון המיסי הטוב ביותר ב-EU','7 שנות מגורים → דרכון EU','קהילה ישראלית גדולה'], pros_en:['Non-Dom — best EU tax benefit','7 years residency → EU passport','Large Israeli community'],
    cons_he:['7 שנות המתנה לאזרחות','183 יום/שנה מגורים נדרשים','ביורוקרטיה גבוהה'], cons_en:['7 years wait for citizenship','183 days/year residency required','High bureaucracy'] },
  { country_he:'קריביים (St. Kitts / גרנדה)', country_en:'Caribbean (St. Kitts / Grenada)', flag:'🏝️', program_he:'CBI — Citizenship by Investment', program_en:'CBI — Citizenship by Investment',
    minInvestK:100, timelineMonths:4, visaFreeCount:140, roiYears:2,
    taxBenefit_he:'0% מס הכנסה, 0% CGT, 0% ירושה. ללא דרישת מגורים. גרנדה — גישה לאשרת E-2 לארה"ב.', taxBenefit_en:'0% income tax, 0% CGT, 0% inheritance. No residency. Grenada — US E-2 visa access.',
    pros_he:['מהיר (4 חודשים)','0% מס','ללא מגורים','גרנדה = E-2 לארה"ב'], pros_en:['Fast (4 months)','0% tax','No residency','Grenada = US E-2 visa'],
    cons_he:['140 מדינות — ללא Schengen','תדמית פחות חזקה','לא EU'], cons_en:['140 countries — no Schengen','Weaker image','Not EU'] },
];

function PassportOptimizerPanel({ lang, profile, onClose }: { lang: Lang; profile: UserProfile; onClose: () => void }) {
  const income = (profile.income.employment||0)+(profile.income.business||0)+(profile.income.capital_gains||0)+(profile.income.dividends||0)+(profile.income.other||0);
  const [selected, setSelected] = useState<number|null>(null);
  const [priority, setPriority] = useState<'tax'|'speed'|'cost'|'travel'>('tax');
  const sorted = useMemo(() => [...PASSPORT_PROGRAMS].sort((a,b) => priority==='tax'?a.roiYears-b.roiYears:priority==='speed'?a.timelineMonths-b.timelineMonths:priority==='cost'?a.minInvestK-b.minInvestK:b.visaFreeCount-a.visaFreeCount), [priority]);
  const annualSaving = income * 0.35;

  return (
    <div className="flex-shrink-0 overflow-y-auto" style={{maxHeight:'72vh',background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:'1.5rem'}}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">🏆 {lang==='he'?'מיטוב דרכון שני':'Second Passport Optimizer'}</h2>
        <button onClick={onClose} style={{color:'var(--text-muted)'}}><X size={18}/></button>
      </div>
      <div className="flex gap-2 flex-wrap mb-5">
        {([['tax',lang==='he'?'💰 מיסוי':'💰 Tax'],['speed',lang==='he'?'⚡ מהירות':'⚡ Speed'],['cost',lang==='he'?'💵 עלות':'💵 Cost'],['travel',lang==='he'?'✈️ נסיעות':'✈️ Travel']] as [string,string][]).map(([k,label])=>(
          <button key={k} onClick={()=>setPriority(k as typeof priority)}
            className="px-3 py-1.5 rounded-full text-sm font-medium"
            style={{background:priority===k?'var(--accent)':'var(--surface-2)',color:priority===k?'#fff':'var(--text-muted)',border:priority===k?'1px solid var(--accent)':'1px solid var(--border)'}}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {sorted.map((prog,idx)=>{
          const roi = annualSaving > 0 ? Math.round(prog.minInvestK*1000/annualSaving*10)/10 : '—';
          const isSel = selected===idx;
          return (
            <div key={idx} style={{background:'var(--surface-2)',border:idx===0?'1px solid var(--accent)66':'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
              <button onClick={()=>setSelected(isSel?null:idx)} className="w-full px-4 py-3 flex items-center gap-3" style={{textAlign:'start'}}>
                <span style={{fontSize:'1.5rem'}}>{prog.flag}</span>
                <div style={{flex:1}}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{fontWeight:700}}>{lang==='he'?prog.country_he:prog.country_en}</span>
                    {idx===0 && <span style={{fontSize:'0.7rem',background:'var(--accent)',color:'#fff',borderRadius:20,padding:'1px 8px',fontWeight:700}}>{lang==='he'?'מומלץ':'Recommended'}</span>}
                  </div>
                  <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:2}}>{lang==='he'?prog.program_he:prog.program_en}</div>
                </div>
                <div style={{textAlign:'end',minWidth:80}}>
                  <div style={{fontSize:'0.82rem',fontWeight:700,color:'var(--accent)'}}>${prog.minInvestK}K+</div>
                  <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{prog.timelineMonths} {lang==='he'?'חודשים':'months'}</div>
                </div>
              </button>
              {isSel && (
                <div style={{padding:'0 1rem 1rem',borderTop:'1px solid var(--border)'}}>
                  <div className="grid gap-3 mt-3 mb-3" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
                    {[
                      {val:prog.visaFreeCount,lbl:lang==='he'?'מדינות ויזה-פרי':'Visa-free',col:'var(--accent)'},
                      {val:`${roi}y`,lbl:lang==='he'?'ROI ממס':'Tax ROI',col:'#10b981'},
                      {val:`${prog.timelineMonths}m`,lbl:lang==='he'?'זמן לדרכון':'To passport',col:'#f59e0b'},
                    ].map(({val,lbl,col})=>(
                      <div key={lbl} style={{background:'var(--surface)',borderRadius:8,padding:'0.75rem',textAlign:'center'}}>
                        <div style={{fontSize:'1.4rem',fontWeight:800,color:col}}>{val}</div>
                        <div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{lbl}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:'0.83rem',color:'var(--text)',background:'#3b82f611',borderRadius:8,padding:'0.75rem',marginBottom:'0.75rem'}}>
                    {lang==='he'?prog.taxBenefit_he:prog.taxBenefit_en}
                  </div>
                  <div className="grid gap-3" style={{gridTemplateColumns:'1fr 1fr'}}>
                    <div>
                      <div style={{fontSize:'0.73rem',fontWeight:700,color:'#10b981',marginBottom:6}}>{lang==='he'?'✓ יתרונות':'✓ Pros'}</div>
                      {(lang==='he'?prog.pros_he:prog.pros_en).map((p,i)=><div key={i} style={{fontSize:'0.78rem',marginBottom:3,display:'flex',gap:6}}><span style={{color:'#10b981',flexShrink:0}}>▸</span>{p}</div>)}
                    </div>
                    <div>
                      <div style={{fontSize:'0.73rem',fontWeight:700,color:'#ef4444',marginBottom:6}}>{lang==='he'?'✗ חסרונות':'✗ Cons'}</div>
                      {(lang==='he'?prog.cons_he:prog.cons_en).map((c,i)=><div key={i} style={{fontSize:'0.78rem',marginBottom:3,display:'flex',gap:6}}><span style={{color:'#ef4444',flexShrink:0}}>▸</span>{c}</div>)}
                    </div>
                  </div>
                  {income > 0 && (
                    <div style={{marginTop:'0.75rem',padding:'0.75rem',background:'#10b98111',borderRadius:8,border:'1px solid #10b98122',fontSize:'0.82rem'}}>
                      💰 {lang==='he'?`עם הכנסה של $${(income/1000).toFixed(0)}K/שנה, ROI על ההשקעה ב${prog.country_he} צפוי תוך ${roi} שנים מחיסכון מסי בלבד.`:`With $${(income/1000).toFixed(0)}K/yr income, ROI on ${prog.country_en} investment expected in ${roi} years from tax savings alone.`}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Critical Deadlines Dashboard ─────────────────────────────────────────────
interface TaxDeadline {
  id: string; title_he: string; title_en: string; desc_he: string; desc_en: string;
  targetDate: string; severity: 'critical'|'warning'|'info'; category_he: string; category_en: string;
}

function DeadlinesDashboardPanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const today = useMemo(()=>new Date(),[]);
  const yr = today.getFullYear();
  const [deadlines, setDeadlines] = useState<TaxDeadline[]>([
    {id:'183',title_he:'183 יום — יציאה מישראל',title_en:'183 Days — Israel Departure',desc_he:'חציית 183 יום בישראל יוצרת חזקת תושבות. עצור מניינך.',desc_en:'Crossing 183 days in Israel creates residency presumption. Stop your count.',targetDate:`${yr}-12-31`,severity:'critical',category_he:'תושבות',category_en:'Residency'},
    {id:'return',title_he:'דוח מס שנתי ישראלי',title_en:'Israeli Annual Tax Return',desc_he:'מועד הגשת הדוח השנתי לרשות המסים הישראלית.',desc_en:'Filing deadline for annual tax return to Israeli Tax Authority.',targetDate:`${yr}-04-30`,severity:'warning',category_he:'דיווח',category_en:'Reporting'},
    {id:'fbar',title_he:'FBAR — דיווח חשבונות זרים',title_en:'FBAR — Foreign Account Reporting',desc_he:'FinCEN 114: אזרחי ארה"ב עם חשבונות זרים >$10K חייבים בהגשה.',desc_en:'FinCEN 114: US citizens with foreign accounts >$10K must file.',targetDate:`${yr}-04-15`,severity:'critical',category_he:'FATCA / FBAR',category_en:'FATCA / FBAR'},
    {id:'4yr',title_he:'חלון 4 השנים — עולה חדש',title_en:"4-Year Window — New Immigrant",desc_he:'תכנן מהלכים לפני תום חלון הפטור על הכנסות זרות (10 שנה).',desc_en:'Plan moves before the foreign income exemption window expires (10 years).',targetDate:`${yr+4}-12-31`,severity:'warning',category_he:'פטור עולה',category_en:'Immigrant Exemption'},
    {id:'cyprus-nd',title_he:'חידוש Non-Dom — קפריסין',title_en:'Non-Dom Renewal — Cyprus',desc_he:'סטטוס Non-Dom מתחדש שנתית. הגש חודש לפני תפוגה.',desc_en:'Non-Dom status renews annually. Apply one month before expiry.',targetDate:`${yr}-12-31`,severity:'info',category_he:'קפריסין',category_en:'Cyprus'},
    {id:'uae',title_he:'חידוש ויזת תושבות UAE',title_en:'UAE Residence Visa Renewal',desc_he:'ויזה רגילה — 2 שנים. Golden Visa — 10 שנים. אל תפספס.',desc_en:'Standard visa valid 2 years. Golden Visa — 10 years. Do not miss.',targetDate:`${yr+2}-06-01`,severity:'info',category_he:'UAE',category_en:'UAE'},
    {id:'vat',title_he:'ספי מע"מ EU — €35K',title_en:'EU VAT Threshold — €35K',desc_he:'חציית ספי מכירות ל-EU מחייבת רישום מע"מ מקומי.',desc_en:'Crossing EU sales thresholds requires local VAT registration.',targetDate:`${yr}-12-31`,severity:'warning',category_he:'מע"מ בינלאומי',category_en:'International VAT'},
    {id:'oecd',title_he:'OECD Pillar Two — 15% מינימום גלובלי',title_en:'OECD Pillar Two — 15% Global Minimum',desc_he:'חברות >€750M כפופות ל-15% מס מינימלי גלובלי. בדוק חשיפה.',desc_en:'Companies >€750M subject to 15% global minimum tax. Check exposure.',targetDate:`${yr}-12-31`,severity:'info',category_he:'OECD',category_en:'OECD'},
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [nt, setNt] = useState(''); const [nd, setNd] = useState(''); const [ns, setNs] = useState<'critical'|'warning'|'info'>('warning');
  const getDays = (d:string) => Math.ceil((new Date(d).getTime()-today.getTime())/(86400000));
  const sc = (s:string) => s==='critical'?'#ef4444':s==='warning'?'#f59e0b':'#3b82f6';
  const sorted = [...deadlines].sort((a,b)=>getDays(a.targetDate)-getDays(b.targetDate));
  const addDl = () => { if(!nt||!nd) return; setDeadlines(p=>[...p,{id:Date.now().toString(),title_he:nt,title_en:nt,desc_he:'',desc_en:'',targetDate:nd,severity:ns,category_he:'מותאם אישית',category_en:'Custom'}]); setNt('');setNd('');setShowAdd(false); };

  return (
    <div className="flex-shrink-0 overflow-y-auto" style={{maxHeight:'72vh',background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:'1.5rem'}}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">⏱️ {lang==='he'?'לוח דד-ליינים קריטיים':'Critical Tax Deadlines'}</h2>
        <button onClick={onClose} style={{color:'var(--text-muted)'}}><X size={18}/></button>
      </div>
      <div className="flex gap-3 flex-wrap mb-4">
        {([['critical','🚨','#ef4444'],[' warning','⚠️','#f59e0b'],['info','ℹ️','#3b82f6']] as [string,string,string][]).map(([s,e,c])=>(
          <div key={s} style={{background:c+'11',border:`1px solid ${c}33`,borderRadius:8,padding:'0.4rem 1rem',display:'flex',gap:8,alignItems:'center'}}>
            <span style={{fontWeight:800,color:c,fontSize:'1.1rem'}}>{deadlines.filter(d=>d.severity===s.trim()).length}</span>
            <span style={{fontSize:'0.8rem',color:c}}>{e} {lang==='he'?s.trim()==='critical'?'קריטי':s.trim()===' warning'?'אזהרה':'מידע':s.trim()}</span>
          </div>
        ))}
        <button onClick={()=>setShowAdd(f=>!f)} style={{marginLeft:'auto',background:'var(--accent)',color:'#fff',border:'none',borderRadius:8,padding:'0.4rem 1rem',fontSize:'0.8rem',fontWeight:600,cursor:'pointer'}}>
          + {lang==='he'?'תזכורת':'Reminder'}
        </button>
      </div>
      {showAdd && (
        <div style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:10,padding:'1rem',marginBottom:'1rem'}}>
          <div className="grid gap-3" style={{gridTemplateColumns:'1fr 1fr auto'}}>
            <input value={nt} onChange={e=>setNt(e.target.value)} placeholder={lang==='he'?'כותרת תזכורת...':'Reminder title...'} style={{padding:'0.4rem 0.75rem',borderRadius:6,background:'var(--surface)',border:'1px solid var(--border)',color:'var(--text)',fontSize:'0.85rem'}}/>
            <input type="date" value={nd} onChange={e=>setNd(e.target.value)} style={{padding:'0.4rem 0.75rem',borderRadius:6,background:'var(--surface)',border:'1px solid var(--border)',color:'var(--text)',fontSize:'0.85rem'}}/>
            <div style={{display:'flex',gap:6}}>
              <select value={ns} onChange={e=>setNs(e.target.value as typeof ns)} style={{padding:'0.4rem',borderRadius:6,background:'var(--surface)',border:'1px solid var(--border)',color:'var(--text)'}}>
                <option value="critical">🚨</option><option value="warning">⚠️</option><option value="info">ℹ️</option>
              </select>
              <button onClick={addDl} style={{background:'var(--accent)',color:'#fff',border:'none',borderRadius:6,padding:'0.4rem 1rem',fontWeight:600,cursor:'pointer'}}>{lang==='he'?'הוסף':'Add'}</button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {sorted.map(dl=>{
          const days=getDays(dl.targetDate); const over=days<0; const urgent=!over&&days<=30;
          return (
            <div key={dl.id} style={{background:'var(--surface-2)',border:`1px solid ${over?'#ef4444':urgent?sc(dl.severity)+'66':'var(--border)'}`,borderRadius:10,padding:'1rem',display:'flex',gap:'1rem',alignItems:'flex-start'}}>
              <div style={{minWidth:68,textAlign:'center'}}>
                <div style={{fontSize:days<=30?'2rem':'1.5rem',fontWeight:800,color:over?'#ef4444':urgent?sc(dl.severity):'var(--text)',lineHeight:1}}>
                  {over?(lang==='he'?'עבר':'Over'):days===0?(lang==='he'?'היום!':'Today!'):days}
                </div>
                {!over&&days>0&&<div style={{fontSize:'0.63rem',color:'var(--text-muted)'}}>{lang==='he'?'ימים':'days'}</div>}
              </div>
              <div style={{flex:1}}>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span style={{fontWeight:600,fontSize:'0.88rem'}}>{lang==='he'?dl.title_he:dl.title_en}</span>
                  <span style={{fontSize:'0.7rem',color:sc(dl.severity),background:sc(dl.severity)+'18',borderRadius:20,padding:'1px 7px'}}>{lang==='he'?dl.category_he:dl.category_en}</span>
                </div>
                {(lang==='he'?dl.desc_he:dl.desc_en)&&<div style={{fontSize:'0.79rem',color:'var(--text-muted)'}}>{lang==='he'?dl.desc_he:dl.desc_en}</div>}
                <div style={{fontSize:'0.73rem',color:'var(--text-muted)',marginTop:4}}>📅 {new Date(dl.targetDate).toLocaleDateString(lang==='he'?'he-IL':'en-US',{day:'numeric',month:'long',year:'numeric'})}</div>
              </div>
              <button onClick={()=>setDeadlines(p=>p.filter(d=>d.id!==dl.id))} style={{color:'var(--text-muted)',opacity:0.5,flexShrink:0}} className="hover:opacity-100"><X size={14}/></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Document Analyzer ────────────────────────────────────────────────────────
const DOC_TYPES = [
  { key:'shuma', he:'שומת מס ישראלית', en:'Israeli Tax Assessment', fields:[
    {key:'year',he:'שנת מס',en:'Tax Year',type:'number'},
    {key:'income',he:'הכנסה חייבת (₪)',en:'Taxable Income (₪)',type:'number'},
    {key:'tax',he:'מס שהוחל (₪)',en:'Tax Charged (₪)',type:'number'},
    {key:'credits',he:'נקודות זיכוי',en:'Credit Points',type:'number'},
    {key:'other',he:'הכנסה אחרת שדווחה',en:'Other Reported Income',type:'text'},
  ]},
  { key:'payslip', he:'תלוש שכר', en:'Pay Slip', fields:[
    {key:'gross',he:'ברוטו חודשי (₪)',en:'Monthly Gross (₪)',type:'number'},
    {key:'tax_withheld',he:'מס שנוכה במקור (₪)',en:'Tax Withheld (₪)',type:'number'},
    {key:'pension',he:'הפרשה לפנסיה (₪)',en:'Pension Contribution (₪)',type:'number'},
    {key:'social',he:'ביטוח לאומי (₪)',en:'National Insurance (₪)',type:'number'},
  ]},
  { key:'bank', he:'דף בנק זר', en:'Foreign Bank Statement', fields:[
    {key:'bank_name',he:'שם הבנק',en:'Bank Name',type:'text'},
    {key:'country',he:'מדינת הבנק',en:'Bank Country',type:'text'},
    {key:'balance',he:'יתרה ($)',en:'Balance ($)',type:'number'},
    {key:'interest',he:'ריבית שנתית ($)',en:'Annual Interest ($)',type:'number'},
  ]},
  { key:'corp', he:'מאזן חברה', en:'Company Balance Sheet', fields:[
    {key:'revenue',he:'הכנסות ($)',en:'Revenue ($)',type:'number'},
    {key:'profit',he:'רווח לפני מס ($)',en:'Pre-tax Profit ($)',type:'number'},
    {key:'dividends',he:'דיבידנדים שחולקו ($)',en:'Dividends Distributed ($)',type:'number'},
    {key:'equity',he:'הון עצמי ($)',en:'Total Equity ($)',type:'number'},
  ]},
];

function DocumentAnalyzerPanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [values, setValues] = useState<Record<string,string>>({});
  const [analyzed, setAnalyzed] = useState(false);
  const [dragging, setDragging] = useState(false);

  const analyze = () => setAnalyzed(true);
  const reset = () => { setValues({}); setAnalyzed(false); };

  const insights = useMemo(() => {
    if (!analyzed) return [];
    const v = values;
    const res: {text_he:string;text_en:string;level:'good'|'warn'|'risk'}[] = [];
    if (docType.key === 'shuma') {
      const inc = Number(v.income||0); const tax = Number(v.tax||0);
      const rate = inc > 0 ? tax/inc*100 : 0;
      if (rate < 15) res.push({text_he:`שיעור מס אפקטיבי ${rate.toFixed(1)}% — נמוך יחסית. בדוק שכל ניכויים נוצלו.`,text_en:`Effective rate ${rate.toFixed(1)}% — relatively low. Verify all deductions were utilized.`,level:'good'});
      else if (rate > 35) res.push({text_he:`שיעור מס אפקטיבי ${rate.toFixed(1)}% — גבוה מאוד. בדוק תכנון מס לשנה הבאה.`,text_en:`Effective rate ${rate.toFixed(1)}% — very high. Consider tax planning for next year.`,level:'risk'});
      else res.push({text_he:`שיעור מס אפקטיבי ${rate.toFixed(1)}% — ניתן לאופטימיזציה על ידי הגדלת הפרשות פנסיה.`,text_en:`Effective rate ${rate.toFixed(1)}% — can be optimized by increasing pension contributions.`,level:'warn'});
      const credits = Number(v.credits||2.25);
      if (credits < 2.25) res.push({text_he:'נקודות זיכוי פחות מהמינימום — בדוק זכאות.',text_en:'Credit points below minimum — check eligibility.',level:'risk'});
    }
    if (docType.key === 'payslip') {
      const gross = Number(v.gross||0)*12; const taxW = Number(v.tax_withheld||0)*12;
      const pension = Number(v.pension||0)*12;
      const rate = gross > 0 ? taxW/gross*100 : 0;
      if (pension/gross < 0.065) res.push({text_he:`הפרשה לפנסיה ${(pension/gross*100).toFixed(1)}% — מתחת ל-6.5% המינימום. ייתכן שמגיעים לך ניכויים נוספים.`,text_en:`Pension contribution ${(pension/gross*100).toFixed(1)}% — below 6.5% minimum. Additional deductions may apply.`,level:'warn'});
      res.push({text_he:`מס שנוכה שנתי: ₪${(taxW/1000).toFixed(0)}K — שיעור ${rate.toFixed(1)}%.`,text_en:`Annual tax withheld: ₪${(taxW/1000).toFixed(0)}K — rate ${rate.toFixed(1)}%.`,level: rate>30?'risk':rate>20?'warn':'good'});
    }
    if (docType.key === 'bank') {
      const bal = Number(v.balance||0); const int = Number(v.interest||0);
      if (bal > 10000) res.push({text_he:`יתרה $${(bal/1000).toFixed(0)}K — חשבון זה צפוי לדיווח CRS לישראל.`,text_en:`Balance $${(bal/1000).toFixed(0)}K — this account likely reported via CRS to Israel.`,level:'warn'});
      if (int > 0) res.push({text_he:`ריבית שנתית $${(int).toFixed(0)} — חייב בדיווח בישראל (25% מס).`,text_en:`Annual interest $${(int).toFixed(0)} — must be reported in Israel (25% tax).`,level:'risk'});
      res.push({text_he:'ודא שהחשבון מדווח בדוח המס השנתי.',text_en:'Ensure account is reported in your annual tax return.',level:'good'});
    }
    if (docType.key === 'corp') {
      const rev = Number(v.revenue||0); const profit = Number(v.profit||0); const div = Number(v.dividends||0);
      if (div/profit > 0.8) res.push({text_he:`דיבידנדים ${(div/profit*100).toFixed(0)}% מהרווח — בדוק אם חלוקה כשכר עדיפה מסית.`,text_en:`Dividends ${(div/profit*100).toFixed(0)}% of profit — check if salary distribution is more tax efficient.`,level:'warn'});
      const margin = rev > 0 ? profit/rev*100 : 0;
      res.push({text_he:`מרווח רווח ${margin.toFixed(1)}% — ${margin>30?'גבוה — מומלץ לבחון מבנה חברת-ביניים':'בינוני — בדוק הוצאות מותרות'}`,text_en:`Profit margin ${margin.toFixed(1)}% — ${margin>30?'high — consider holding company structure':'mid — review allowable expenses'}`,level:margin>30?'warn':'good'});
    }
    return res;
  }, [analyzed, values, docType]);

  return (
    <div className="flex-shrink-0 overflow-y-auto" style={{maxHeight:'72vh',background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:'1.5rem'}}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">📄 {lang==='he'?'אנליזת מסמכים פיננסיים':'Financial Document Analyzer'}</h2>
        <button onClick={onClose} style={{color:'var(--text-muted)'}}><X size={18}/></button>
      </div>
      {/* Drop zone */}
      <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);}}
        style={{border:`2px dashed ${dragging?'var(--accent)':'var(--border)'}`,borderRadius:12,padding:'1.5rem',textAlign:'center',marginBottom:'1.5rem',background:dragging?'var(--accent-glow)':'transparent',transition:'all 0.2s'}}>
        <div style={{fontSize:'2rem',marginBottom:8}}>📂</div>
        <div style={{fontSize:'0.85rem',color:'var(--text-muted)',marginBottom:4}}>{lang==='he'?'גרור מסמך לכאן או הכנס ערכים ידנית':'Drag document here or enter values manually'}</div>
        <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{lang==='he'?'PDF, תמונה, Excel — ניתוח ידני של ערכים מרכזיים':'PDF, image, Excel — manual entry of key values'}</div>
      </div>
      {/* Doc type selector */}
      <div className="flex gap-2 flex-wrap mb-4">
        {DOC_TYPES.map(dt=>(
          <button key={dt.key} onClick={()=>{setDocType(dt);setValues({});setAnalyzed(false);}}
            className="px-3 py-1.5 rounded-full text-sm"
            style={{background:docType.key===dt.key?'var(--accent)':'var(--surface-2)',color:docType.key===dt.key?'#fff':'var(--text-muted)',border:docType.key===dt.key?'1px solid var(--accent)':'1px solid var(--border)'}}>
            {lang==='he'?dt.he:dt.en}
          </button>
        ))}
      </div>
      {/* Fields */}
      {!analyzed ? (
        <>
          <div className="grid gap-3 mb-4" style={{gridTemplateColumns:'1fr 1fr'}}>
            {docType.fields.map(f=>(
              <div key={f.key}>
                <label style={{fontSize:'0.75rem',color:'var(--text-muted)',display:'block',marginBottom:4}}>{lang==='he'?f.he:f.en}</label>
                <input type={f.type} value={values[f.key]||''} onChange={e=>setValues(p=>({...p,[f.key]:e.target.value}))} placeholder="0"
                  style={{width:'100%',padding:'0.4rem 0.75rem',borderRadius:6,background:'var(--surface-2)',border:'1px solid var(--border)',color:'var(--text)',fontSize:'0.85rem'}}/>
              </div>
            ))}
          </div>
          <button onClick={analyze} disabled={Object.keys(values).length===0}
            style={{width:'100%',padding:'0.75rem',background:'var(--accent)',color:'#fff',border:'none',borderRadius:8,fontWeight:700,fontSize:'0.9rem',cursor:'pointer',opacity:Object.keys(values).length===0?0.5:1}}>
            🔍 {lang==='he'?'נתח מסמך':'Analyze Document'}
          </button>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-3 mb-4">
            {insights.map((ins,i)=>(
              <div key={i} style={{background:ins.level==='good'?'#10b98111':ins.level==='warn'?'#f59e0b11':'#ef444411',border:`1px solid ${ins.level==='good'?'#10b98133':ins.level==='warn'?'#f59e0b33':'#ef444433'}`,borderRadius:8,padding:'0.75rem',display:'flex',gap:10,alignItems:'flex-start'}}>
                <span style={{fontSize:'1rem',flexShrink:0}}>{ins.level==='good'?'✅':ins.level==='warn'?'⚠️':'🚨'}</span>
                <span style={{fontSize:'0.84rem'}}>{lang==='he'?ins.text_he:ins.text_en}</span>
              </div>
            ))}
          </div>
          <button onClick={reset} style={{background:'var(--surface-2)',color:'var(--text-muted)',border:'1px solid var(--border)',borderRadius:8,padding:'0.6rem 1.5rem',cursor:'pointer',fontSize:'0.85rem'}}>
            ← {lang==='he'?'ניתוח חדש':'New Analysis'}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Peer Benchmark ───────────────────────────────────────────────────────────
function PeerBenchmarkPanel({ lang, profile, onClose }: { lang: Lang; profile: UserProfile; onClose: () => void }) {
  const income = (profile.income.employment||0)+(profile.income.business||0)+(profile.income.capital_gains||0)+(profile.income.dividends||0)+(profile.income.other||0);
  const totalAssets = (profile.assets.stocks||0)+(profile.assets.real_estate||0)+(profile.assets.crypto_holdings||0)+(profile.assets.business_value||0)+(profile.assets.other||0);

  const segment = income > 500000 ? 'HNW' : income > 150000 ? 'Mid' : 'Entry';
  const hasCrypto = (profile.assets.crypto_holdings||0) > 10000;
  const hasUS = profile.is_us_person;

  const data = useMemo(() => {
    const base = segment === 'HNW' ? {
      topDest: [{flag:'🇦🇪',name_he:'UAE / דובאי',name_en:'UAE / Dubai',pct:38},{flag:'🇨🇾',name_he:'קפריסין',name_en:'Cyprus',pct:27},{flag:'🇵🇹',name_he:'פורטוגל',name_en:'Portugal',pct:14},{flag:'🇬🇪',name_he:'גאורגיה',name_en:'Georgia',pct:10},{flag:'🏝️',name_he:'אחר',name_en:'Other',pct:11}],
      avgSaving: 285000, medianTime: 14, structPct: {company:78,trust:34,holding:56,personal:22},
      percentile: Math.min(99, Math.round(55 + totalAssets/100000)),
      commonMistakes_he:['הגשת שומת עצמאית מבלי לבדוק זכויות','ניתוק מדומה ללא 183 יום אמיתיים','שמירת חשבון ישראלי כ"עיקרי"'],
      commonMistakes_en:['Self-assessment filing without checking rights','Fake residency break without real 183 days','Keeping Israeli account as "primary"'],
    } : segment === 'Mid' ? {
      topDest: [{flag:'🇬🇪',name_he:'גאורגיה',name_en:'Georgia',pct:32},{flag:'🇵🇹',name_he:'פורטוגל',name_en:'Portugal',pct:28},{flag:'🇨🇾',name_he:'קפריסין',name_en:'Cyprus',pct:21},{flag:'🇹🇭',name_he:'תאילנד',name_en:'Thailand',pct:12},{flag:'🏝️',name_he:'אחר',name_en:'Other',pct:7}],
      avgSaving: 68000, medianTime: 18, structPct: {company:52,trust:8,holding:22,personal:44},
      percentile: Math.min(95, Math.round(40 + totalAssets/50000)),
      commonMistakes_he:['פתיחת חברה בלי לנתק תושבות אישית','הסתמכות על שנת פטור בלי לנהל ספרים','שכחת דיווח הכנסות זרות לישראל'],
      commonMistakes_en:['Opening company without personal residency break','Relying on exemption year without bookkeeping','Forgetting to report foreign income to Israel'],
    } : {
      topDest: [{flag:'🇬🇪',name_he:'גאורגיה',name_en:'Georgia',pct:41},{flag:'🇹🇭',name_he:'תאילנד',name_en:'Thailand',pct:24},{flag:'🇵🇦',name_he:'פנמה',name_en:'Panama',pct:17},{flag:'🇷🇸',name_he:'סרביה',name_en:'Serbia',pct:12},{flag:'🏝️',name_he:'אחר',name_en:'Other',pct:6}],
      avgSaving: 22000, medianTime: 22, structPct: {company:34,trust:3,holding:8,personal:68},
      percentile: Math.min(85, Math.round(30 + totalAssets/20000)),
      commonMistakes_he:['עיכוב בניתוק — כל שנה עולה כסף','אי-ניצול שנת הפטור הראשונה','בחירת יעד יקר מדי ביחס לרמת הכנסה'],
      commonMistakes_en:['Delaying departure — every year costs money','Not utilizing the first exemption year','Choosing too expensive destination vs income level'],
    };
    return base;
  }, [segment, totalAssets]);

  return (
    <div className="flex-shrink-0 overflow-y-auto" style={{maxHeight:'72vh',background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:'1.5rem'}}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">🤝 {lang==='he'?'השוואת עמיתים — אנונימית':'Peer Benchmark — Anonymous'}</h2>
        <button onClick={onClose} style={{color:'var(--text-muted)'}}><X size={18}/></button>
      </div>
      {/* Segment tag */}
      <div style={{marginBottom:'1.5rem',display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{background:'var(--accent-glow)',border:'1px solid var(--accent)',borderRadius:8,padding:'0.5rem 1rem',fontSize:'0.85rem',color:'var(--accent)',fontWeight:600}}>
          {lang==='he'?`מגזר: ${segment==='HNW'?'HNW (>$500K)':segment==='Mid'?'Mid ($150K–$500K)':'Entry (<$150K)'}`:
            `Segment: ${segment==='HNW'?'HNW (>$500K)':segment==='Mid'?'Mid ($150K–$500K)':'Entry (<$150K)'}`}
        </div>
        {hasCrypto && <div style={{background:'#f59e0b11',border:'1px solid #f59e0b33',borderRadius:8,padding:'0.5rem 1rem',fontSize:'0.82rem',color:'#f59e0b'}}>₿ {lang==='he'?'משקיע קריפטו':'Crypto investor'}</div>}
        {hasUS && <div style={{background:'#3b82f611',border:'1px solid #3b82f633',borderRadius:8,padding:'0.5rem 1rem',fontSize:'0.82rem',color:'#3b82f6'}}>🇺🇸 {lang==='he'?'אדם אמריקאי':'US Person'}</div>}
      </div>
      {/* Percentile */}
      <div style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:12,padding:'1.2rem',marginBottom:'1.5rem',textAlign:'center'}}>
        <div style={{fontSize:'3rem',fontWeight:800,color:'var(--accent)',lineHeight:1}}>{data.percentile}%</div>
        <div style={{fontSize:'0.85rem',color:'var(--text-muted)',marginTop:4}}>
          {lang==='he'?`פוטנציאל חיסכון מסי גבוה יותר מ-${data.percentile}% מהאנשים עם פרופיל דומה`:`Tax saving potential higher than ${data.percentile}% of people with similar profiles`}
        </div>
      </div>
      {/* Top destinations */}
      <div style={{marginBottom:'1.5rem'}}>
        <div style={{fontSize:'0.8rem',fontWeight:700,color:'var(--text-muted)',marginBottom:'0.75rem',textTransform:'uppercase',letterSpacing:'0.05em'}}>
          {lang==='he'?'יעדים מובילים — אנשים עם פרופיל דומה בחרו:':'Top Destinations — people with similar profiles chose:'}
        </div>
        {data.topDest.map(({flag,name_he,name_en,pct})=>(
          <div key={name_en} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <span style={{fontSize:'1.1rem',width:24}}>{flag}</span>
            <span style={{fontSize:'0.85rem',minWidth:120}}>{lang==='he'?name_he:name_en}</span>
            <div style={{flex:1,background:'var(--surface-2)',borderRadius:4,height:8,overflow:'hidden'}}>
              <div style={{width:`${pct}%`,height:'100%',background:'var(--accent)',borderRadius:4}}/>
            </div>
            <span style={{fontSize:'0.8rem',fontWeight:600,color:'var(--text-muted)',minWidth:32}}>{pct}%</span>
          </div>
        ))}
      </div>
      {/* Stats grid */}
      <div className="grid gap-3 mb-5" style={{gridTemplateColumns:'1fr 1fr'}}>
        <div style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:10,padding:'1rem',textAlign:'center'}}>
          <div style={{fontSize:'1.6rem',fontWeight:800,color:'#10b981'}}>${(data.avgSaving/1000).toFixed(0)}K</div>
          <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{lang==='he'?'חיסכון שנתי ממוצע במגזר':'Avg annual saving in segment'}</div>
        </div>
        <div style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:10,padding:'1rem',textAlign:'center'}}>
          <div style={{fontSize:'1.6rem',fontWeight:800,color:'#f59e0b'}}>{data.medianTime}m</div>
          <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{lang==='he'?'זמן ממוצע לניתוק תושבות':'Median time to residency break'}</div>
        </div>
      </div>
      {/* Structures */}
      <div style={{marginBottom:'1.5rem'}}>
        <div style={{fontSize:'0.8rem',fontWeight:700,color:'var(--text-muted)',marginBottom:'0.75rem',textTransform:'uppercase',letterSpacing:'0.05em'}}>
          {lang==='he'?'מבנים שנבחרו:':'Structures chosen:'}
        </div>
        <div className="grid gap-2" style={{gridTemplateColumns:'1fr 1fr'}}>
          {([['company',lang==='he'?'חברה זרה':'Foreign Company','#3b82f6'],['holding',lang==='he'?'חברת החזקות':'Holding Co','#8b5cf6'],['trust',lang==='he'?'קרן נאמנות':'Trust','#f59e0b'],['personal',lang==='he'?'תושבות אישית':'Personal Residency','#10b981']] as [string,string,string][]).map(([k,label,col])=>(
            <div key={k} style={{background:'var(--surface-2)',borderRadius:8,padding:'0.6rem 0.75rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:'0.8rem'}}>{label}</span>
              <span style={{fontSize:'0.85rem',fontWeight:700,color:col}}>{data.structPct[k as keyof typeof data.structPct]}%</span>
            </div>
          ))}
        </div>
      </div>
      {/* Common mistakes */}
      <div style={{background:'#ef444411',border:'1px solid #ef444433',borderRadius:10,padding:'1rem'}}>
        <div style={{fontSize:'0.8rem',fontWeight:700,color:'#ef4444',marginBottom:8}}>🚨 {lang==='he'?'טעויות נפוצות במגזר שלך:':'Common mistakes in your segment:'}</div>
        {(lang==='he'?data.commonMistakes_he:data.commonMistakes_en).map((m,i)=>(
          <div key={i} style={{fontSize:'0.82rem',marginBottom:4,display:'flex',gap:8}}><span style={{color:'#ef4444',flexShrink:0}}>▸</span>{m}</div>
        ))}
      </div>
    </div>
  );
}

// ─── 2030 Tax Forecast ────────────────────────────────────────────────────────
const FORECAST_DATA: Record<string, {
  flag:string; name_he:string; name_en:string;
  stability:number; trend:'improving'|'stable'|'worsening';
  changes_he:string[]; changes_en:string[];
  risks_he:string; risks_en:string;
  outlook_he:string; outlook_en:string;
  shelfLife_he:string; shelfLife_en:string;
}> = {
  UAE: {flag:'🇦🇪',name_he:'UAE / דובאי',name_en:'UAE / Dubai',stability:8,trend:'stable',
    changes_he:['9% מס חברות מעל AED 375K נכנס בתוקף (2023)','מדיניות CRS מתרחבת — יותר מדינות בשיתוף נתונים','הגדלת Golden Visa ל-10 שנים — צפוי להישאר'],
    changes_en:['9% corporate tax above AED 375K in effect (2023)','CRS policy expanding — more countries sharing data','Golden Visa extended to 10 years — expected to remain'],
    risks_he:'לחץ OECD על מיסוי מינימלי גלובלי עלול להחמיר את שיעור מס החברות ב-2026-2028.',
    risks_en:'OECD pressure on global minimum tax may tighten corporate tax rate in 2026-2028.',
    outlook_he:'יציב לטווח קצר-בינוני. 0% מס הכנסה אישי צפוי להישאר לפחות עד 2030.',
    outlook_en:'Stable short-to-medium term. 0% personal income tax expected to remain at least until 2030.',
    shelfLife_he:'חיי מדף: 5-7 שנים לתושבות, 3-5 שנים למבנים עסקיים',
    shelfLife_en:'Shelf life: 5-7 years for residency, 3-5 years for business structures'},
  Cyprus: {flag:'🇨🇾',name_he:'קפריסין',name_en:'Cyprus',stability:7,trend:'stable',
    changes_he:['Non-Dom צפוי להישאר ל-17 שנה — שייר לעדכוני EU','הצעת חוק לביטול IP box במסגרת BEPS','הגדלת שקיפות חברות מ-2024'],
    changes_en:['Non-Dom expected to remain 17 years — watch EU updates','IP box reform proposal under BEPS','Enhanced company transparency from 2024'],
    risks_he:'לחץ EU לאיחוד בסיס מס (BEFIT) עלול לפגוע ב-12.5% מס חברות ב-2026+.',
    risks_en:'EU push for tax base unification (BEFIT) may impact 12.5% corporate tax from 2026+.',
    outlook_he:'יציב. Non-Dom הוא כלי מדיניות קפריסאית — לא צפוי לבוטל. מס חברות עלול לעלות ל-15%.',
    outlook_en:'Stable. Non-Dom is Cyprus policy tool — not expected to be abolished. Corporate tax may rise to 15%.',
    shelfLife_he:'חיי מדף: 4-6 שנים לתכנון מיסוי אישי',
    shelfLife_en:'Shelf life: 4-6 years for personal tax planning'},
  Portugal: {flag:'🇵🇹',name_he:'פורטוגל',name_en:'Portugal',stability:5,trend:'worsening',
    changes_he:['NHR בוטל ב-2024 — הוחלף ב-IFICI (NHR 2.0)','IFICI: 20% שטוח ל-10 שנים — מוגבל למקצועות ספציפיים','עלות מחיה עולה — לחץ פוליטי על המדיניות'],
    changes_en:['NHR abolished 2024 — replaced by IFICI (NHR 2.0)','IFICI: 20% flat for 10 years — limited to specific professions','Cost of living rising — political pressure on policy'],
    risks_he:'IFICI מוגבל יותר מ-NHR. לחץ פוליטי עשוי לצמצם הטבות נוספות ב-2025-2026.',
    risks_en:'IFICI more restricted than NHR. Political pressure may further limit benefits in 2025-2026.',
    outlook_he:'מגמת הידוק. מומלץ להיכנס בהקדם אם מתכנן — ההטבות צפויות להצטמצם.',
    outlook_en:'Tightening trend. Recommended to enter soon if planning — benefits expected to shrink.',
    shelfLife_he:'חיי מדף: 2-4 שנים לחלון הגישה הנוכחי',
    shelfLife_en:'Shelf life: 2-4 years for current access window'},
  Georgia: {flag:'🇬🇪',name_he:'גאורגיה',name_en:'Georgia',stability:9,trend:'stable',
    changes_he:['1% מס על הכנסה זרה עד $155K — יציב מ-2020','Virtual Zone: 0% מס IT על ייצוא — מוצלח מאוד','שקיפות בנקאית מוגבלת — לא ב-CRS מלא'],
    changes_en:['1% tax on foreign income up to $155K — stable since 2020','Virtual Zone: 0% IT tax on exports — highly successful','Limited banking transparency — not in full CRS'],
    risks_he:'לחץ OECD גובר. גאורגיה מיישמת CRS בהדרגה — בדוק עדכונים ב-2025.',
    risks_en:'Growing OECD pressure. Georgia implementing CRS gradually — check 2025 updates.',
    outlook_he:'יציב מאוד לטווח קצר-בינוני. מדיניות הכנסה זרה הוכחה כמוצלחת.',
    outlook_en:'Very stable short-to-medium term. Foreign income policy proven successful.',
    shelfLife_he:'חיי מדף: 5-8 שנים — אחת היציבות ביותר כרגע',
    shelfLife_en:'Shelf life: 5-8 years — one of the most stable currently'},
  Malta: {flag:'🇲🇹',name_he:'מלטה',name_en:'Malta',stability:7,trend:'stable',
    changes_he:['Non-Dom יציב — מוסדר בחוק מקומי','לחץ EU מתמיד אך מלטה מגנה על עצמאות מסית','MEIN: מעקב EU אחר תוכניות CBI'],
    changes_en:['Non-Dom stable — codified in local law','Constant EU pressure but Malta defends tax independence','MEIN: EU monitoring CBI programs'],
    risks_he:'EU עשויה ללחוץ על ביטול CBI (תוכניות דרכון) — כבר בוטל בקפריסין ב-2020.',
    risks_en:'EU may press for CBI abolition — already abolished in Cyprus in 2020.',
    outlook_he:'יציב. Non-Dom חזק. CBI בסיכון מסוים. דרכון EU — ערך גבוה מאוד.',
    outlook_en:'Stable. Non-Dom strong. CBI at some risk. EU passport — very high value.',
    shelfLife_he:'חיי מדף: 4-6 שנים לתכנון Non-Dom',
    shelfLife_en:'Shelf life: 4-6 years for Non-Dom planning'},
  Israel: {flag:'🇮🇱',name_he:'ישראל',name_en:'Israel',stability:4,trend:'worsening',
    changes_he:['2025: עדכון מדרגות מס — עלייה קלה לבעלי הכנסות גבוהות','לחץ גובר על עצמאים ובעלי חברות ארנק','הצעות להחמרת מס יציאה ל-3% (במקום 1%)'],
    changes_en:['2025: Tax bracket update — slight increase for high earners','Increasing pressure on freelancers and wallet companies','Proposals to increase exit tax to 3% (from 1%)'],
    risks_he:'גירעון תקציבי גובר. סבירות גבוהה להעלאות מס ב-2025-2026. מס עושר נדון.',
    risks_en:'Growing budget deficit. High probability of tax increases in 2025-2026. Wealth tax being discussed.',
    outlook_he:'מגמת הידוק ברורה. כל שנת עיכוב בתכנון עולה בממוצע $20K-$80K לבעלי הכנסה גבוהה.',
    outlook_en:'Clear tightening trend. Each year of delay in planning costs on average $20K-$80K for high earners.',
    shelfLife_he:'מגמה: החמרה — פעל מוקדם ככל האפשר',
    shelfLife_en:'Trend: tightening — act as early as possible'},
};

function TaxForecast2030Panel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [selected, setSelected] = useState<string>('UAE');
  const c = FORECAST_DATA[selected];
  const trendColor = (t:string) => t==='improving'?'#10b981':t==='stable'?'#3b82f6':'#ef4444';
  const trendLabel = (t:string) => t==='improving'?(lang==='he'?'משתפר':'Improving'):t==='stable'?(lang==='he'?'יציב':'Stable'):(lang==='he'?'מחמיר':'Worsening');
  const stabilityColor = (s:number) => s>=8?'#10b981':s>=6?'#f59e0b':'#ef4444';

  return (
    <div className="flex-shrink-0 overflow-y-auto" style={{maxHeight:'72vh',background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:'1.5rem'}}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">🔮 {lang==='he'?'תחזית מדיניות מס 2030':'2030 Tax Policy Forecast'}</h2>
        <button onClick={onClose} style={{color:'var(--text-muted)'}}><X size={18}/></button>
      </div>
      <div className="flex gap-2 flex-wrap mb-5">
        {Object.entries(FORECAST_DATA).map(([k,v])=>(
          <button key={k} onClick={()=>setSelected(k)}
            className="flex items-center gap-1 px-3 py-1 rounded-full text-sm"
            style={{background:selected===k?'var(--accent)':'var(--surface-2)',color:selected===k?'#fff':'var(--text-muted)',border:selected===k?'1px solid var(--accent)':'1px solid var(--border)'}}>
            {v.flag} {lang==='he'?v.name_he:v.name_en}
          </button>
        ))}
      </div>
      {c && (
        <>
          {/* Header */}
          <div style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:12,padding:'1.25rem',marginBottom:'1.25rem',display:'flex',gap:'1.5rem',alignItems:'center',flexWrap:'wrap'}}>
            <div style={{fontSize:'2.5rem'}}>{c.flag}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:'1.1rem',marginBottom:4}}>{lang==='he'?c.name_he:c.name_en}</div>
              <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
                <div>
                  <div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{lang==='he'?'יציבות מדיניות':'Policy Stability'}</div>
                  <div style={{display:'flex',gap:4,marginTop:2}}>
                    {[...Array(10)].map((_,i)=><div key={i} style={{width:12,height:12,borderRadius:2,background:i<c.stability?stabilityColor(c.stability):'var(--border)'}}/>)}
                  </div>
                </div>
                <div style={{background:trendColor(c.trend)+'18',border:`1px solid ${trendColor(c.trend)}33`,borderRadius:20,padding:'3px 12px',fontSize:'0.8rem',color:trendColor(c.trend),fontWeight:700}}>
                  {c.trend==='improving'?'↗':c.trend==='stable'?'→':'↘'} {trendLabel(c.trend)}
                </div>
              </div>
            </div>
          </div>
          {/* Predicted changes */}
          <div style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:10,padding:'1rem',marginBottom:'1rem'}}>
            <div style={{fontSize:'0.78rem',fontWeight:700,color:'var(--text-muted)',marginBottom:'0.75rem',textTransform:'uppercase',letterSpacing:'0.04em'}}>
              📋 {lang==='he'?'שינויים ידועים ומצפויים:':'Known & Expected Changes:'}
            </div>
            {(lang==='he'?c.changes_he:c.changes_en).map((ch,i)=>(
              <div key={i} style={{fontSize:'0.83rem',marginBottom:6,display:'flex',gap:8,alignItems:'flex-start'}}>
                <span style={{color:'var(--accent)',flexShrink:0,marginTop:2}}>▸</span>{ch}
              </div>
            ))}
          </div>
          {/* Risk */}
          <div style={{background:'#ef444411',border:'1px solid #ef444433',borderRadius:10,padding:'1rem',marginBottom:'1rem'}}>
            <div style={{fontSize:'0.78rem',fontWeight:700,color:'#ef4444',marginBottom:6}}>⚠️ {lang==='he'?'סיכונים עיקריים:':'Key Risks:'}</div>
            <div style={{fontSize:'0.83rem'}}>{lang==='he'?c.risks_he:c.risks_en}</div>
          </div>
          {/* Outlook */}
          <div style={{background:'#3b82f611',border:'1px solid #3b82f633',borderRadius:10,padding:'1rem',marginBottom:'1rem'}}>
            <div style={{fontSize:'0.78rem',fontWeight:700,color:'#3b82f6',marginBottom:6}}>🔭 {lang==='he'?'תחזית 2030:':'2030 Outlook:'}</div>
            <div style={{fontSize:'0.83rem'}}>{lang==='he'?c.outlook_he:c.outlook_en}</div>
          </div>
          {/* Shelf life */}
          <div style={{background:'#10b98111',border:'1px solid #10b98133',borderRadius:10,padding:'1rem'}}>
            <div style={{fontSize:'0.78rem',fontWeight:700,color:'#10b981',marginBottom:6}}>⏳ {lang==='he'?'חיי מדף לתכנון:':'Planning Shelf Life:'}</div>
            <div style={{fontSize:'0.85rem',fontWeight:600}}>{lang==='he'?c.shelfLife_he:c.shelfLife_en}</div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Legal Document Generator ──────────────────────────────────────────────────
const LEGAL_DOC_TEMPLATES = [
  { id: 'residency_break', he: 'הצהרת ניתוק תושבות ישראלית', en: 'Israeli Residency Break Declaration' },
  { id: 'non_dom', he: 'בקשת Non-Dom — קפריסין', en: 'Cyprus Non-Dom Application' },
  { id: 'fbar_cover', he: 'מכתב כיסוי FBAR', en: 'FBAR Cover Letter' },
  { id: 'tax_ruling', he: 'בקשת החלטת מיסוי מקדמית', en: 'Advance Tax Ruling Request' },
  { id: 'bank_letter', he: 'מכתב תושבות לבנק (CRS)', en: 'Residency Letter for Bank (CRS)' },
  { id: 'cpa_brief', he: 'תיאור מצב לרואה חשבון', en: 'CPA Situation Brief' },
];

function buildLegalDocument(id: string, profile: UserProfile, lang: Lang): string {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const totalIncome = Object.values(profile.income).reduce((a, b) => a + b, 0);
  const totalAssets = Object.values(profile.assets).reduce((a, b) => a + b, 0);
  const income = totalIncome > 0 ? `$${totalIncome.toLocaleString()}` : '[Annual Income]';
  const residency = profile.current_residency || '[Country of Residence]';
  const citizenships = profile.citizenships.join(', ') || '[Citizenships]';
  const assets = totalAssets > 0 ? `$${totalAssets.toLocaleString()}` : '[Total Assets]';
  const re = profile.assets.real_estate > 0 ? `$${profile.assets.real_estate.toLocaleString()}` : '[Real Estate]';
  const liquid = profile.assets.stocks > 0 ? `$${profile.assets.stocks.toLocaleString()}` : '[Liquid Assets]';
  const crypto = profile.assets.crypto_holdings > 0 ? `$${profile.assets.crypto_holdings.toLocaleString()}` : '[Crypto]';
  const business = profile.assets.business_value > 0 ? `$${profile.assets.business_value.toLocaleString()}` : '[Business Equity]';

  if (id === 'residency_break') return `DECLARATION OF SEVERANCE OF ISRAELI TAX RESIDENCY
===================================================
Date: ${today}

To:   Israel Tax Authority (רשות המסים בישראל)
      International Taxation Division, Jerusalem

Re:   Declaration of Severance of Israeli Tax Residency

I, the undersigned [Full Name], Israeli ID No. [ID Number], hereby declare
that I have permanently relocated my center of life from Israel to
${residency}, effective [Date of Departure].

──────────────────────────────────────────────────
SECTION 1 — FACTS OF RELOCATION
──────────────────────────────────────────────────
1. I departed Israel on [Departure Date] and established my permanent home
   in ${residency}.
2. Spouse/family status: [resides with me in ${residency} / specify if different]
3. Ties severed in Israel:
   • Employment/income source: relocated / terminated
   • Real estate: [sold on ___ / rented out — address]
   • Bank accounts: [closed / maintained for limited purpose]
   • Social/professional clubs: [resigned from / maintained]
4. Ties established in ${residency}:
   • Permanent residence: [full address]
   • Employment / business activity: [details]
   • Social/community ties: [details]
   • Days present in ${residency} (prior 12 months): [X days]

──────────────────────────────────────────────────
SECTION 2 — CENTER OF LIFE ANALYSIS (ITO §1)
──────────────────────────────────────────────────
Based on the totality of circumstances, my center of life is ${residency}:
  ✓  Habitual place of abode: ${residency}
  ✓  Family location: ${residency}
  ✓  Primary economic activity: ${residency}
  ✓  Majority of time spent: ${residency}
  ✗  Israel: [describe any remaining ties and their limited nature]

──────────────────────────────────────────────────
SECTION 3 — FINANCIAL SUMMARY (for reference)
──────────────────────────────────────────────────
  Annual income:   ${income}
  Total assets:    ${assets}
  Real estate:     ${re}
  Liquid assets:   ${liquid}

──────────────────────────────────────────────────
DECLARATION
──────────────────────────────────────────────────
I hereby solemnly declare that all information above is true and complete
to the best of my knowledge. I request formal confirmation of my status as
a non-resident of Israel for tax purposes effective [Date].

I am aware that providing false information constitutes a criminal offense.

Signed: _______________________   Date: ${today}
Name:   [Full Name]
Address (abroad): [Full Address in ${residency}]
Phone: [Phone]   Email: [Email]

Attachments:
  □ Copy of passport (departure stamps)
  □ Foreign lease / property purchase agreement
  □ Foreign employment contract or business registration
  □ Utility bills from ${residency} (last 3 months)
  □ Travel log / flight records`;

  if (id === 'non_dom') return `APPLICATION FOR NON-DOMICILED RESIDENT STATUS — CYPRUS
==========================================================
Date: ${today}

To:   Cyprus Tax Department
      Special Contribution for Defence
      Nicosia, Cyprus

Subject: Application for Non-Domiciled Resident Status
         (Special Defence Contribution Law, Cap. 117)

──────────────────────────────────────────────────
APPLICANT DETAILS
──────────────────────────────────────────────────
Full Name:            [Full Name]
Date of Birth:        [DOB]
Country of Origin:    ${citizenships}
Passport No.:         [Passport Number]
Cyprus Tax ID (TIC):  [TIC Number]
Cyprus Address:       [Full Cyprus Address]

──────────────────────────────────────────────────
ELIGIBILITY — NON-DOMICILE STATUS
──────────────────────────────────────────────────
I confirm the following:

✓  I am a Cyprus tax resident (spending 60+ days / year, or per 60-Day Rule)
✓  I was NOT a Cyprus tax resident for 17 or more of the 20 tax years
   preceding the current tax year (I became resident in [Year])
✓  Cyprus is NOT my domicile of origin (I was born in [Country])
✓  I have NOT adopted Cyprus as my domicile of choice
✓  I have not formed the intention to reside permanently in Cyprus

──────────────────────────────────────────────────
FINANCIAL PROFILE
──────────────────────────────────────────────────
  Annual income:    ${income}
  Total assets:     ${assets}
  Income sources:   □ Employment  □ Dividends  □ Interest  □ Rental  □ Other

──────────────────────────────────────────────────
EXEMPTIONS REQUESTED
──────────────────────────────────────────────────
As a Non-Dom resident, I am entitled to full exemption from Special Defence
Contribution (SDC) on:
  • Dividend income:       0%   (vs 17% for domiciled residents)
  • Interest income:       0%   (vs 30% for domiciled residents)
  • Foreign rental income: 0%

──────────────────────────────────────────────────
DECLARATION
──────────────────────────────────────────────────
I declare that all information is accurate and complete. I undertake to
notify the Cyprus Tax Department immediately if my domicile or residency
status changes.

Signed: _______________________   Date: ${today}
Name:   [Full Name]
TIC:    [TIC Number]

Attachments:
  □ Copy of passport
  □ Proof of Cyprus address (rental agreement / utility bill)
  □ Proof of prior country of residency
  □ Self-declaration of non-domicile status`;

  if (id === 'fbar_cover') return `FBAR COVER LETTER — FinCEN Form 114
======================================
Date: ${today}

To:   Financial Crimes Enforcement Network (FinCEN)
      U.S. Department of the Treasury
      P.O. Box 32621, Detroit, MI 48232-0621

Re:   Report of Foreign Bank and Financial Accounts — Tax Year [Year]
      Filer: [Full Name] | SSN: [XXX-XX-XXXX]

──────────────────────────────────────────────────
FILER INFORMATION
──────────────────────────────────────────────────
  Full Name:      [Full Name]
  SSN / TIN:      [XXX-XX-XXXX]
  US Address:     [US Address or Last Known US Address]
  Foreign Address: [Address in ${residency}]
  Filing Type:    □ Original   □ Amended (reason: ___________)
  Tax Year:       [Year]

──────────────────────────────────────────────────
ACCOUNTS REPORTED (attach Schedule B)
──────────────────────────────────────────────────
Account 1:
  Financial Institution: [Bank Name], ${residency}
  Account Number:        [Number]
  Maximum Value (Year):  $[Amount]
  Account Type:          □ Bank  □ Securities  □ Other

Account 2:
  Financial Institution: [Bank Name]
  Account Number:        [Number]
  Maximum Value (Year):  $[Amount]
  Account Type:          □ Bank  □ Securities  □ Other

(Add rows as needed — report ALL accounts exceeding $10,000 combined max)

──────────────────────────────────────────────────
STATEMENT OF REASONABLE CAUSE (if filing late)
──────────────────────────────────────────────────
I respectfully request abatement of any penalties under the reasonable
cause exception (31 CFR § 1010.820(g)). The failure to file timely was
due to [unawareness of obligation while residing abroad / reliance on
professional advice / other reason]. I have acted in good faith and am
now filing voluntarily as part of the Streamlined Filing Compliance
Procedure / standard filing.

──────────────────────────────────────────────────
DECLARATION
──────────────────────────────────────────────────
I declare that all information in this filing is true, correct, and
complete to the best of my knowledge.

Signed: _______________________   Date: ${today}
Name:   [Full Name]
Phone:  [Phone]   Email: [Email]

Note: This letter accompanies the FinCEN 114 filed electronically via
BSA E-Filing System at bsaefiling.fincen.treas.gov`;

  if (id === 'tax_ruling') return `REQUEST FOR ADVANCE TAX RULING
====================================
Date: ${today}

To:   Israel Tax Authority
      Professional Division — International Taxation
      Agron 125, Jerusalem

Re:   Request for Advance Tax Ruling — Residency Status &
      Tax Treatment of [Describe Transaction/Situation]

Applicant:      [Full Name], ID [Number]
Tax File No.:   [Number]
Representative: [Name], CPA/Adv., License No. [Number]

──────────────────────────────────────────────────
EXECUTIVE SUMMARY
──────────────────────────────────────────────────
We respectfully request an advance ruling pursuant to Section 158B of the
Israeli Income Tax Ordinance (ITO) on the following questions arising from
the applicant's relocation to ${residency}.

──────────────────────────────────────────────────
FACTS
──────────────────────────────────────────────────
1. The applicant is an Israeli citizen who relocated to ${residency}
   on [Date of Departure].
2. Annual income: ${income} (sources: [details])
3. Total assets: ${assets}
   - Real estate: ${re}
   - Liquid: ${liquid}
   - Crypto: ${crypto}
   - Business equity: ${business}
4. The applicant is ${profile.is_us_person ? 'a US person subject to FATCA/FBAR' : 'not a US person'}.
5. [Describe specific transaction or situation requiring ruling]

──────────────────────────────────────────────────
LEGAL QUESTIONS
──────────────────────────────────────────────────
Q1: Is the applicant a "resident of Israel" under ITO §1 from [Date]?
Q2: What is the source characterization of income from [source]?
Q3: Do the benefits of the Israel-${residency} Tax Treaty apply,
    and specifically which articles govern [income type]?
Q4: [Additional specific question]

──────────────────────────────────────────────────
LEGAL ANALYSIS
──────────────────────────────────────────────────
[Summary of applicable ITO sections, treaties, and relevant case law —
to be completed by representing attorney/CPA]

──────────────────────────────────────────────────
RULING REQUESTED
──────────────────────────────────────────────────
We request a ruling confirming:
1. The applicant is NOT a resident of Israel from [Date]
2. [Income type] is not taxable in Israel
3. [Any additional specific ruling]

All facts are complete, accurate, and not hypothetical.

Respectfully submitted,

[Name, CPA/Adv.]          [Full Name — Applicant]
[Firm Name]               Date: ${today}
[Contact Details]`;

  if (id === 'bank_letter') return `SELF-CERTIFICATION OF TAX RESIDENCY (CRS / FATCA)
====================================================
Date: ${today}

To:   [Bank Name]
      [Branch Address]
      [City, Country]

Account Holder: [Full Name]
Account No.:    [Account Number(s)]

──────────────────────────────────────────────────
PART A — PERSONAL DETAILS
──────────────────────────────────────────────────
  Full Name:          [Full Name]
  Date of Birth:      [DOB]
  Passport / ID No.:  [Number]
  Current Address:    [Full Address in ${residency}]
  Phone:              [Phone]   Email: [Email]

──────────────────────────────────────────────────
PART B — TAX RESIDENCY (CRS Self-Certification)
──────────────────────────────────────────────────
Country of Tax Residency:   ${residency}
Tax Identification No. (TIN): [TIN in ${residency}]

Additional tax residencies (list all):
  Country: [___________]   TIN: [___________]
  Country: [___________]   TIN: [___________]

I confirm I am NOT a tax resident of any country not listed above.

──────────────────────────────────────────────────
PART C — FATCA (US Persons)
──────────────────────────────────────────────────
US Person Status: ${profile.is_us_person
  ? 'YES — I am a US citizen / Green Card holder\n  W-9 / W-8BEN is attached separately'
  : 'NO — I am not a US citizen or Green Card holder\n  I have no substantial presence in the US'}

──────────────────────────────────────────────────
PART D — FINANCIAL SUMMARY (for KYC purposes)
──────────────────────────────────────────────────
  Annual income:    ${income}
  Net worth:        ${assets}
  Source of funds:  [Employment / Business / Inheritance / Investment]
  PEP / Sanctions:  □ Not a Politically Exposed Person

──────────────────────────────────────────────────
DECLARATION
──────────────────────────────────────────────────
I declare that the information provided is true and complete. I undertake
to notify [Bank Name] within 30 days if my tax residency changes.

I understand that this information may be reported to tax authorities
under CRS / FATCA obligations.

Signed: _______________________   Date: ${today}
Name:   [Full Name]
[Notarized stamp if required by bank]`;

  if (id === 'cpa_brief') return `SITUATION BRIEF FOR TAX ADVISOR
===================================
Prepared by Tax Master AI — ${today}
[CONFIDENTIAL — FOR PROFESSIONAL USE ONLY]

──────────────────────────────────────────────────
CLIENT PROFILE
──────────────────────────────────────────────────
  Citizenships:        ${citizenships}
  Current Residency:   ${residency}
  US Person (FATCA):   ${profile.is_us_person ? 'YES — FATCA + FBAR reporting required' : 'No'}

──────────────────────────────────────────────────
FINANCIAL SNAPSHOT
──────────────────────────────────────────────────
  Annual Income:       ${income}
  Total Assets:        ${assets}
    Real Estate:       ${re}
    Liquid Assets:     ${liquid}
    Retirement Accts:  $${(profile.assets.other || 0).toLocaleString()}
    Crypto Holdings:   ${crypto}
    Business Equity:   ${business}

──────────────────────────────────────────────────
CLIENT GOALS
──────────────────────────────────────────────────
${profile.goals.join(', ') || '  (Not specified — please complete profile)'}

──────────────────────────────────────────────────
CONSTRAINTS & CONCERNS
──────────────────────────────────────────────────
${profile.constraints.join(', ') || '  (Not specified)'}

──────────────────────────────────────────────────
ADDITIONAL CONTEXT
──────────────────────────────────────────────────
${profile.notes || '  (None provided)'}

──────────────────────────────────────────────────
AI-IDENTIFIED OPPORTUNITIES (preliminary)
──────────────────────────────────────────────────
  • Residency optimization: potential to reduce effective rate significantly
  • ${profile.assets.crypto_holdings > 0 ? `Crypto position (${crypto}) — jurisdiction-specific CGT treatment` : 'No crypto flagged'}
  • ${profile.is_us_person ? 'PFIC / FBAR compliance review required' : 'CRS reporting in current jurisdiction to verify'}
  • ${profile.assets.business_value > 0 ? `Business equity (${business}) — exit structure planning` : 'No business equity flagged'}

──────────────────────────────────────────────────
SUGGESTED AGENDA FOR FIRST MEETING
──────────────────────────────────────────────────
  1. Confirm exit tax exposure under ${residency} rules
  2. Optimal holding structure for income + assets
  3. Treaty benefits: ${residency} ↔ ${citizenships}
  4. Timeline for any proposed residency change
  5. ${profile.is_us_person ? 'FBAR/FATCA compliance calendar' : 'CRS self-certification review'}

──────────────────────────────────────────────────
DISCLAIMER
──────────────────────────────────────────────────
This brief was generated by Tax Master AI for informational purposes only.
It does not constitute legal or tax advice. All figures should be verified
with the client. Professional judgment must be applied before acting.`;

  return '';
}

function LegalDocGeneratorPanel({ lang, profile, onClose }: { lang: Lang; profile: UserProfile; onClose: () => void }) {
  const [selectedDoc, setSelectedDoc] = useState(LEGAL_DOC_TEMPLATES[0].id);
  const [generated, setGenerated] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = () => { setGenerated(buildLegalDocument(selectedDoc, profile, lang)); setCopied(false); };

  const copy = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const download = () => {
    const blob = new Blob([generated], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${selectedDoc}_${new Date().toISOString().slice(0,10)}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '82vh' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(59,130,246,0.08))' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>📝 {lang === 'he' ? 'מחולל מסמכים משפטיים' : 'Legal Document Generator'}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {lang === 'he' ? 'מסמכים מוכנים להגשה — ממולאים אוטומטית מהפרופיל שלך' : 'Ready-to-submit documents — auto-filled from your profile'}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
      </div>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Doc type list */}
        <div style={{ width: 210, borderInlineEnd: '1px solid var(--border)', padding: 10, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '4px 4px 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {lang === 'he' ? 'בחר מסמך' : 'Select Document'}
          </div>
          {LEGAL_DOC_TEMPLATES.map(doc => (
            <button key={doc.id}
              onClick={() => { setSelectedDoc(doc.id); setGenerated(''); }}
              style={{ textAlign: 'start', padding: '10px 12px', borderRadius: 8, border: selectedDoc === doc.id ? '1px solid var(--accent)' : '1px solid transparent', background: selectedDoc === doc.id ? 'var(--accent-glow)' : 'var(--surface-2)', color: selectedDoc === doc.id ? 'var(--accent)' : 'var(--text)', fontSize: '0.82rem', cursor: 'pointer', lineHeight: 1.4, fontWeight: selectedDoc === doc.id ? 600 : 400 }}>
              {lang === 'he' ? doc.he : doc.en}
            </button>
          ))}
          <div style={{ marginTop: 'auto', padding: '10px 4px 4px', borderTop: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {lang === 'he' ? '⚙️ ממולא אוטומטית:' : '⚙️ Auto-filled from:'}
            <div style={{ color: 'var(--accent)', marginTop: 3 }}>
              {profile.current_residency || '?'} · {profile.citizenships.join(', ') || '?'}
            </div>
          </div>
        </div>
        {/* Output */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {!generated ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 40 }}>
              <div style={{ fontSize: '3.5rem' }}>📄</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  {lang === 'he' ? (LEGAL_DOC_TEMPLATES.find(d=>d.id===selectedDoc)?.he) : (LEGAL_DOC_TEMPLATES.find(d=>d.id===selectedDoc)?.en)}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 320 }}>
                  {lang === 'he' ? 'המסמך יימולא אוטומטית בנתונים מהפרופיל שלך. ערוך את הסוגריים המרובעים לפני הגשה.' : 'Document will be pre-filled with your profile data. Edit the bracketed fields before submitting.'}
                </div>
              </div>
              <button onClick={generate}
                style={{ padding: '12px 32px', borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', boxShadow: '0 4px 14px rgba(139,92,246,0.35)' }}>
                ✨ {lang === 'he' ? 'צור מסמך' : 'Generate Document'}
              </button>
            </div>
          ) : (
            <>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={copy} style={{ padding: '6px 14px', borderRadius: 8, background: copied ? 'var(--success)' : 'var(--surface-2)', color: copied ? 'white' : 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s' }}>
                  {copied ? '✓ ' + (lang === 'he' ? 'הועתק!' : 'Copied!') : '📋 ' + (lang === 'he' ? 'העתק' : 'Copy')}
                </button>
                <button onClick={download} style={{ padding: '6px 14px', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                  ⬇️ {lang === 'he' ? 'הורד .txt' : 'Download .txt'}
                </button>
                <button onClick={() => setGenerated('')} style={{ padding: '6px 12px', borderRadius: 8, background: 'none', color: 'var(--text-muted)', border: '1px solid transparent', cursor: 'pointer', fontSize: '0.82rem' }}>
                  ← {lang === 'he' ? 'חזור' : 'Back'}
                </button>
                <div style={{ marginInlineStart: 'auto', fontSize: '0.72rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  ⚠️ {lang === 'he' ? 'יש להתאים עם עו"ד לפני הגשה' : 'Have a lawyer review before submitting'}
                </div>
              </div>
              <pre style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', margin: 0, fontFamily: '"Courier New", monospace', fontSize: '0.8rem', lineHeight: 1.75, color: 'var(--text)', background: 'var(--surface-2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {generated}
              </pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Advisor Portal ─────────────────────────────────────────────────────────────
function AdvisorPortalPanel({ lang, profile, onClose }: { lang: Lang; profile: UserProfile; onClose: () => void }) {
  const [accessCode] = useState(() => Math.random().toString(36).slice(2, 8).toUpperCase());
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'share' | 'preview'>('share');
  const shareUrl = `https://taxmaster.ai/advisor-view/${accessCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const income = Object.values(profile.income).reduce((a, b) => a + b, 0);
  const assets = Object.values(profile.assets).reduce((a, b) => a + b, 0);
  const estimatedSaving = Math.round(income * 0.25);

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '82vh' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(59,130,246,0.08))' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>🤝 {lang === 'he' ? 'פורטל שיתוף עם יועץ מס' : 'Advisor Sharing Portal'}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {lang === 'he' ? 'שתף את הפרופיל שלך עם רואה חשבון או עורך דין באופן מאובטח' : 'Share your profile securely with your CPA or tax attorney'}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
      </div>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {(['share', 'preview'] as const).map(tab => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ flex: 1, padding: '10px', border: 'none', borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent', background: 'none', color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: activeTab === tab ? 600 : 400 }}>
            {tab === 'share' ? (lang === 'he' ? '🔗 שתף גישה' : '🔗 Share Access') : (lang === 'he' ? '👁 תצוגת יועץ' : '👁 Advisor Preview')}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {activeTab === 'share' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Access code */}
            <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 20, border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                {lang === 'he' ? 'קוד גישה חד-פעמי' : 'One-Time Access Code'}
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '0.15em', color: 'var(--accent)', fontFamily: 'monospace', marginBottom: 8 }}>
                {accessCode}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {lang === 'he' ? 'תוקף: 7 ימים · גישת קריאה בלבד' : 'Expires: 7 days · Read-only access'}
              </div>
            </div>
            {/* Share link */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                {lang === 'he' ? 'קישור לשיתוף' : 'Share Link'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {shareUrl}
                </div>
                <button onClick={copyLink} style={{ padding: '10px 18px', borderRadius: 8, background: copied ? 'var(--success)' : 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0, transition: 'all 0.2s' }}>
                  {copied ? '✓' : (lang === 'he' ? 'העתק' : 'Copy')}
                </button>
              </div>
            </div>
            {/* What advisor sees */}
            <div style={{ background: 'rgba(59,130,246,0.07)', borderRadius: 12, padding: 16, border: '1px solid rgba(59,130,246,0.2)' }}>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '0.88rem' }}>
                {lang === 'he' ? '📋 מה היועץ יראה:' : '📋 What your advisor will see:'}
              </div>
              {[
                lang === 'he' ? '✓ פרופיל פיננסי מלא (הכנסה, נכסים, מטרות)' : '✓ Full financial profile (income, assets, goals)',
                lang === 'he' ? '✓ ניתוח אופטימיזציית מס' : '✓ Tax optimization analysis',
                lang === 'he' ? '✓ השוואת מדינות מותאמת אישית' : '✓ Personalized country comparison',
                lang === 'he' ? '✓ רשימת מסמכים נדרשים' : '✓ Required documents checklist',
                lang === 'he' ? '✗ היסטוריית שיחות (פרטית)' : '✗ Chat history (private)',
              ].map((item, i) => (
                <div key={i} style={{ fontSize: '0.82rem', color: item.startsWith('✓') ? 'var(--success)' : 'var(--text-muted)', marginBottom: 4 }}>{item}</div>
              ))}
            </div>
            {/* Instructions */}
            <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 14, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              💡 {lang === 'he'
                ? 'שלח את הקישור לרואה החשבון שלך. הוא/היא יוכלו לצפות בפרופיל ולהוסיף הערות — ללא צורך בחשבון.'
                : 'Send the link to your CPA. They can view your profile and add notes — no account required.'}
            </div>
          </div>
        ) : (
          /* Advisor Preview */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', fontSize: '0.8rem', color: 'var(--warning)' }}>
              {lang === 'he' ? '👁 זו תצוגה מקדימה של מה שהיועץ שלך יראה' : '👁 This is a preview of what your advisor will see'}
            </div>
            {/* Profile card */}
            <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                CLIENT PROFILE — Tax Master AI
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: lang === 'he' ? 'תושבות' : 'Residency', value: profile.current_residency || '—' },
                  { label: lang === 'he' ? 'אזרחויות' : 'Citizenships', value: profile.citizenships.join(', ') || '—' },
                  { label: lang === 'he' ? 'הכנסה שנתית' : 'Annual Income', value: income ? `$${income.toLocaleString()}` : '—' },
                  { label: lang === 'he' ? 'סה"כ נכסים' : 'Total Assets', value: assets ? `$${assets.toLocaleString()}` : '—' },
                  { label: 'US Person', value: profile.is_us_person ? 'YES ⚠️' : 'No' },
                  { label: lang === 'he' ? 'חיסכון פוטנציאלי' : 'Est. Annual Saving', value: estimatedSaving ? `$${estimatedSaving.toLocaleString()}` : '—' },
                ].map((item, i) => (
                  <div key={i} style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Goals */}
            {(profile.goals.length > 0 || profile.notes) && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 14, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.85rem' }}>
                  {lang === 'he' ? 'מטרות ומגבלות' : 'Goals & Constraints'}
                </div>
                {profile.goals.length > 0 && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6 }}><strong>Goals:</strong> {profile.goals.join(', ')}</div>}
                {profile.constraints.length > 0 && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6 }}><strong>Constraints:</strong> {profile.constraints.join(', ')}</div>}
                {profile.notes && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}><strong>Context:</strong> {profile.notes}</div>}
              </div>
            )}
            {/* Advisor notes placeholder */}
            <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 14, border: '1px dashed var(--border)' }}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.85rem' }}>
                📝 {lang === 'he' ? 'הערות יועץ' : 'Advisor Notes'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {lang === 'he' ? 'היועץ יוכל להוסיף הערות כאן...' : 'Your advisor can add notes here...'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Calendar Sync ──────────────────────────────────────────────────────────────
interface CalDeadline { id: string; title_he: string; title_en: string; desc_he: string; desc_en: string; month: number; day: number; category: 'reporting' | 'residency' | 'compliance' | 'planning'; }

const CAL_DEADLINES: CalDeadline[] = [
  { id: 'fbar', title_he: 'FBAR — FinCEN 114', title_en: 'FBAR — FinCEN 114 Deadline', desc_he: 'הגשת דוח חשבונות בנק זרים (אמריקאים)', desc_en: 'Report of Foreign Bank Accounts (US persons)', month: 10, day: 15, category: 'compliance' },
  { id: 'us_tax', title_he: 'דוח מס אמריקאי (extension)', title_en: 'US Tax Return — Extension Deadline', desc_he: 'מועד אחרון לדוח מס אמריקאי עם הארכה', desc_en: 'Final deadline for US return with extension', month: 10, day: 15, category: 'reporting' },
  { id: 'israel_tax', title_he: 'דוח שנתי — ישראל', title_en: 'Israeli Annual Tax Return', desc_he: 'הגשת דוח שנתי לרשות המסים', desc_en: 'Annual filing to Israel Tax Authority', month: 4, day: 30, category: 'reporting' },
  { id: 'day183', title_he: '183 יום — בדיקת תושבות', title_en: '183-Day Residency Check', desc_he: 'רב שנת המס — בדוק כמה ימים בילית בכל מדינה', desc_en: 'Mid-year — verify your day count per country', month: 7, day: 1, category: 'residency' },
  { id: 'cyprus_60', title_he: '60 יום קפריסין — בדיקה', title_en: 'Cyprus 60-Day Rule — Verification', desc_he: 'ודא שעמדת בדרישת ה-60 יום לתושבות קפריסין', desc_en: 'Confirm you met Cyprus 60-day residency minimum', month: 11, day: 30, category: 'residency' },
  { id: 'uae_visa', title_he: 'חידוש ויזת UAE', title_en: 'UAE Residence Visa Renewal', desc_he: 'חדש ויזת תושב UAE לפני פקיעתה', desc_en: 'Renew UAE residence visa before expiry', month: 12, day: 1, category: 'compliance' },
  { id: 'q4_planning', title_he: 'תכנון מס Q4', title_en: 'Q4 Tax Planning Review', desc_he: 'עיון בתכנית המס לפני סוף השנה — הזדמנות אחרונה', desc_en: 'End-of-year tax plan review — last opportunity', month: 10, day: 1, category: 'planning' },
  { id: 'eu_vat', title_he: 'דו"ח VAT רבעוני — EU', title_en: 'EU VAT Quarterly Return', desc_he: 'הגשת דוח מע"מ רבעוני לגורמי EU', desc_en: 'Quarterly VAT filing for EU-based entities', month: 4, day: 30, category: 'reporting' },
  { id: 'pillar2', title_he: 'OECD Pillar Two — בדיקה', title_en: 'OECD Pillar Two Compliance Check', desc_he: 'בדוק חשיפה ל-15% מינימום גלובלי', desc_en: 'Review exposure to global 15% minimum tax', month: 6, day: 30, category: 'compliance' },
  { id: 'crs', title_he: 'CRS — עדכון הצהרת תושבות', title_en: 'CRS Self-Certification Update', desc_he: 'עדכן הצהרת תושבות לבנקים אם מצבך השתנה', desc_en: 'Update residency self-certification if status changed', month: 1, day: 31, category: 'compliance' },
];

const CAT_COLORS: Record<string, string> = { reporting: '#3b82f6', residency: '#10b981', compliance: '#f59e0b', planning: '#8b5cf6' };
const CAT_LABELS_HE: Record<string, string> = { reporting: 'דיווח', residency: 'תושבות', compliance: 'ציות', planning: 'תכנון' };
const CAT_LABELS_EN: Record<string, string> = { reporting: 'Reporting', residency: 'Residency', compliance: 'Compliance', planning: 'Planning' };

function CalendarSyncPanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(CAL_DEADLINES.map(d => d.id)));
  const year = new Date().getFullYear();

  const toggleAll = () => {
    if (selected.size === CAL_DEADLINES.length) setSelected(new Set());
    else setSelected(new Set(CAL_DEADLINES.map(d => d.id)));
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  const downloadICS = () => {
    const items = CAL_DEADLINES.filter(d => selected.has(d.id));
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tax Master AI//Tax Deadlines//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      ...items.flatMap(d => {
        const dt = `${year}${pad(d.month)}${pad(d.day)}`;
        const uid = `${d.id}-${year}@taxmaster.ai`;
        return [
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTART;VALUE=DATE:${dt}`,
          `DTEND;VALUE=DATE:${dt}`,
          `SUMMARY:🗓 ${lang === 'he' ? d.title_he : d.title_en}`,
          `DESCRIPTION:${lang === 'he' ? d.desc_he : d.desc_en} — Tax Master AI`,
          `CATEGORIES:${lang === 'he' ? CAT_LABELS_HE[d.category] : CAT_LABELS_EN[d.category]}`,
          'BEGIN:VALARM', 'TRIGGER:-P7D', 'ACTION:DISPLAY', `DESCRIPTION:Reminder: ${lang === 'he' ? d.title_he : d.title_en}`, 'END:VALARM',
          'END:VEVENT',
        ];
      }),
      'END:VCALENDAR',
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `tax-deadlines-${year}.ics`; a.click();
    URL.revokeObjectURL(url);
  };

  const googleLink = (d: CalDeadline) => {
    const dt = `${year}${pad(d.month)}${pad(d.day)}`;
    const title = encodeURIComponent((lang === 'he' ? d.title_he : d.title_en));
    const desc = encodeURIComponent(lang === 'he' ? d.desc_he : d.desc_en);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dt}/${dt}&details=${desc}`;
  };

  const sortedDeadlines = [...CAL_DEADLINES].sort((a, b) => a.month - b.month || a.day - b.day);

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '82vh' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(16,185,129,0.08))' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>📅 {lang === 'he' ? 'סנכרון יומן' : 'Calendar Sync'}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {lang === 'he' ? `${selected.size} דד-ליינים נבחרו — ייצא ל-Google Calendar / Apple Calendar` : `${selected.size} deadlines selected — export to Google Calendar / Apple Calendar`}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
      </div>
      {/* Action bar */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={downloadICS} disabled={selected.size === 0}
          style={{ padding: '8px 18px', borderRadius: 8, background: selected.size > 0 ? 'var(--accent)' : 'var(--surface-2)', color: selected.size > 0 ? 'white' : 'var(--text-muted)', border: 'none', cursor: selected.size > 0 ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: '0.85rem' }}>
          ⬇️ {lang === 'he' ? `הורד .ics (${selected.size})` : `Download .ics (${selected.size})`}
        </button>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {lang === 'he' ? 'עובד עם Apple Calendar, Outlook, וכל תוכנת יומן' : 'Works with Apple Calendar, Outlook & any calendar app'}
        </div>
        <button onClick={toggleAll} style={{ marginInlineStart: 'auto', padding: '6px 12px', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.78rem' }}>
          {selected.size === CAL_DEADLINES.length ? (lang === 'he' ? 'בטל הכל' : 'Deselect All') : (lang === 'he' ? 'בחר הכל' : 'Select All')}
        </button>
      </div>
      {/* Deadline list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sortedDeadlines.map(d => {
          const isSelected = selected.has(d.id);
          const color = CAT_COLORS[d.category];
          const monthName = new Date(year, d.month - 1, 1).toLocaleString(lang === 'he' ? 'he-IL' : 'en-US', { month: 'short' });
          return (
            <div key={d.id}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: isSelected ? `rgba(${color === '#3b82f6' ? '59,130,246' : color === '#10b981' ? '16,185,129' : color === '#f59e0b' ? '245,158,11' : '139,92,246'},0.08)` : 'var(--surface-2)', border: `1px solid ${isSelected ? color+'44' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.15s' }}
              onClick={() => toggle(d.id)}>
              <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSelected ? color : 'var(--border)'}`, background: isSelected ? color : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                {isSelected && <span style={{ color: 'white', fontSize: '0.65rem', fontWeight: 800 }}>✓</span>}
              </div>
              <div style={{ width: 46, textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color }}>{pad(d.day)}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{monthName}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>
                  {lang === 'he' ? d.title_he : d.title_en}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {lang === 'he' ? d.desc_he : d.desc_en}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 20, background: color+'22', color }}>
                  {lang === 'he' ? CAT_LABELS_HE[d.category] : CAT_LABELS_EN[d.category]}
                </span>
                <a href={googleLink(d)} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                  title="Add to Google Calendar">
                  G+
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PDF Report ─────────────────────────────────────────────────────────────────
function PdfReportPanel({ lang, profile, onClose }: { lang: Lang; profile: UserProfile; onClose: () => void }) {
  const [printing, setPrinting] = useState(false);

  const income = Object.values(profile.income).reduce((a, b) => a + b, 0);
  const assets = Object.values(profile.assets).reduce((a, b) => a + b, 0);

  const topCountries = Object.entries(FIT_DATA)
    .map(([country, data]) => {
      const rate = profile.is_us_person ? Math.max(data.taxSalary / 100, 0.15) : data.taxSalary / 100;
      const saving = income > 0 ? Math.round(income * (0.35 - rate)) : 0;
      return { country, rate, saving, data };
    })
    .filter(c => c.saving > 0)
    .sort((a, b) => b.saving - a.saving)
    .slice(0, 5);

  const handlePrint = () => {
    setPrinting(true);
    const year = new Date().getFullYear();
    const today = new Date().toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const html = `<!DOCTYPE html>
<html lang="${lang === 'he' ? 'he' : 'en'}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<title>Tax Master AI — Tax Strategy Report ${year}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; background: white; padding: 0; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px; }
  .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); color: white; padding: 40px; margin: -40px -40px 40px; }
  .logo { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px; }
  .subtitle { font-size: 0.85rem; opacity: 0.7; margin-bottom: 24px; }
  .report-title { font-size: 2rem; font-weight: 800; margin-bottom: 6px; }
  .report-date { font-size: 0.85rem; opacity: 0.6; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: rgba(255,255,255,0.2); margin-top: 12px; }
  section { margin-bottom: 36px; }
  h2 { font-size: 1.15rem; font-weight: 700; color: #0f3460; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
  .card-label { font-size: 0.72rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .card-value { font-size: 1.2rem; font-weight: 700; color: #1a1a2e; }
  .card-value.green { color: #10b981; }
  .country-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px; border: 1px solid #e2e8f0; }
  .rank { width: 28px; height: 28px; border-radius: 50%; background: #0f3460; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; }
  .rank.gold { background: #f59e0b; }
  .rank.silver { background: #94a3b8; }
  .rank.bronze { background: #cd7f32; }
  .country-name { font-weight: 600; font-size: 0.95rem; flex: 1; }
  .country-rate { font-size: 0.8rem; color: #64748b; }
  .saving-chip { background: #dcfce7; color: #166534; border-radius: 20px; padding: 3px 10px; font-size: 0.78rem; font-weight: 700; }
  .alert-box { background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 12px 16px; font-size: 0.82rem; color: #713f12; line-height: 1.6; }
  .action-item { display: flex; gap: 10px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
  .action-num { width: 24px; height: 24px; border-radius: 50%; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
  .action-text { font-size: 0.85rem; line-height: 1.5; }
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 0.72rem; color: #94a3b8; line-height: 1.6; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo">💡 Tax Master AI</div>
    <div class="subtitle">${lang === 'he' ? 'יועץ מס גלובלי' : 'Global Tax Advisor'}</div>
    <div class="report-title">${lang === 'he' ? 'דוח אסטרטגיית מס' : 'Tax Strategy Report'}</div>
    <div class="report-date">${lang === 'he' ? 'הופק בתאריך:' : 'Generated:'} ${today}</div>
    <div class="badge">CONFIDENTIAL — ${lang === 'he' ? 'לשימוש פרטי בלבד' : 'Private & Confidential'}</div>
  </div>

  <section>
    <h2>${lang === 'he' ? '📊 תמצית פרופיל פיננסי' : '📊 Financial Profile Summary'}</h2>
    <div class="grid2">
      <div class="card">
        <div class="card-label">${lang === 'he' ? 'תושבות נוכחית' : 'Current Residency'}</div>
        <div class="card-value">${profile.current_residency || '—'}</div>
      </div>
      <div class="card">
        <div class="card-label">${lang === 'he' ? 'אזרחויות' : 'Citizenships'}</div>
        <div class="card-value" style="font-size:1rem">${profile.citizenships.join(', ') || '—'}</div>
      </div>
      <div class="card">
        <div class="card-label">${lang === 'he' ? 'הכנסה שנתית' : 'Annual Income'}</div>
        <div class="card-value">${income ? '$' + income.toLocaleString() : '—'}</div>
      </div>
      <div class="card">
        <div class="card-label">${lang === 'he' ? 'סה"כ נכסים' : 'Total Assets'}</div>
        <div class="card-value">${assets ? '$' + assets.toLocaleString() : '—'}</div>
      </div>
      <div class="card">
        <div class="card-label">${lang === 'he' ? 'חיסכון פוטנציאלי מקסימלי' : 'Maximum Potential Saving'}</div>
        <div class="card-value green">${topCountries[0] ? '$' + topCountries[0].saving.toLocaleString() + '/yr' : '—'}</div>
      </div>
      <div class="card">
        <div class="card-label">US Person (FATCA)</div>
        <div class="card-value" style="font-size:1rem">${profile.is_us_person ? '⚠️ YES' : '✓ No'}</div>
      </div>
    </div>
  </section>

  ${topCountries.length > 0 ? `
  <section>
    <h2>🌍 ${lang === 'he' ? 'מדינות מומלצות לאופטימיזציה' : 'Top Recommended Jurisdictions'}</h2>
    ${topCountries.map((c, i) => `
    <div class="country-row">
      <div class="rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</div>
      <div>
        <div class="country-name">${c.country}</div>
        <div class="country-rate">${lang === 'he' ? 'שיעור מס:' : 'Tax rate:'} ${(c.rate * 100).toFixed(1)}%</div>
      </div>
      <div class="saving-chip">${lang === 'he' ? 'חיסכון:' : 'Save:'} $${c.saving.toLocaleString()}/yr</div>
    </div>`).join('')}
    <p style="font-size:0.75rem;color:#64748b;margin-top:10px">
      * ${lang === 'he' ? 'חיסכון מחושב ביחס לשיעור מס שולי של 35% במדינת המוצא' : 'Savings calculated vs. assumed 35% marginal rate in origin country'}
    </p>
  </section>` : ''}

  ${profile.is_us_person ? `
  <section>
    <div class="alert-box">
      ⚠️ <strong>FATCA / FBAR Notice:</strong><br>
      ${lang === 'he'
        ? 'כאמריקאי, חייב בהגשת FBAR עד 15 אוקטובר על חשבונות זרים מעל $10,000. חובת דיווח גלובלית גם לאחר מעבר מגורים.'
        : 'As a US person, you must file FBAR by Oct 15 for foreign accounts exceeding $10,000 combined maximum. Global income reporting applies regardless of residency.'}
    </div>
  </section>` : ''}

  <section>
    <h2>✅ ${lang === 'he' ? 'צעדים מומלצים לפעולה' : 'Recommended Action Steps'}</h2>
    ${[
      lang === 'he' ? 'קבל ייעוץ מרואה חשבון מוסמך בינלאומי לפני כל שינוי תושבות' : 'Consult a qualified international tax CPA before any residency change',
      lang === 'he' ? `בדוק זכאותך לסטטוס Non-Dom ב${topCountries[0]?.country || 'המדינה המומלצת'}` : `Check Non-Dom / territorial tax eligibility in ${topCountries[0]?.country || 'top jurisdiction'}`,
      lang === 'he' ? 'תחשב מס יציאה לפני ניתוק תושבות' : 'Calculate exit tax exposure before severing residency',
      profile.is_us_person ? (lang === 'he' ? 'ודא שכל דוחות FBAR ו-FATCA מעודכנים' : 'Ensure all FBAR / FATCA filings are current') : (lang === 'he' ? 'עדכן הצהרות CRS בכל הבנקים' : 'Update CRS self-certifications with all banks'),
      lang === 'he' ? 'קבע תזכורות ליומן לכל הדד-ליינים הקריטיים' : 'Set calendar reminders for all critical deadlines',
    ].map((item, i) => `
    <div class="action-item">
      <div class="action-num">${i + 1}</div>
      <div class="action-text">${item}</div>
    </div>`).join('')}
  </section>

  <div class="footer">
    <strong>Disclaimer:</strong> This report was generated by Tax Master AI for informational purposes only. It does not constitute legal, tax, or financial advice. Always consult qualified professionals before making tax-related decisions. Figures are estimates based on publicly available tax rates and may not reflect all applicable taxes, surcharges, or treaty provisions.
    <br><br>
    Generated by Tax Master AI · ${today} · taxmaster.ai
  </div>
</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) { setPrinting(false); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); setPrinting(false); }, 600);
  };

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '82vh' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(239,68,68,0.08))' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>📊 {lang === 'he' ? 'דוח PDF מקצועי' : 'Professional PDF Report'}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {lang === 'he' ? 'דוח מלא להגשה ליועץ, לבנק, או לארכיון אישי' : 'Full report for your advisor, bank, or personal archive'}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Preview cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: lang === 'he' ? 'תושבות נוכחית' : 'Current Residency', value: profile.current_residency || '—' },
            { label: lang === 'he' ? 'הכנסה שנתית' : 'Annual Income', value: income ? `$${income.toLocaleString()}` : '—' },
            { label: lang === 'he' ? 'חיסכון פוטנציאלי' : 'Top Potential Saving', value: topCountries[0] ? `$${topCountries[0].saving.toLocaleString()}/yr` : '—', green: true },
            { label: lang === 'he' ? 'מדינה מומלצת' : 'Top Recommendation', value: topCountries[0]?.country || '—' },
          ].map((item, i) => (
            <div key={i} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: (item as {green?:boolean}).green ? 'var(--success)' : 'var(--text)' }}>{item.value}</div>
            </div>
          ))}
        </div>
        {/* Report contents */}
        <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.88rem' }}>
            {lang === 'he' ? '📋 הדוח יכלול:' : '📋 Report includes:'}
          </div>
          {[
            lang === 'he' ? '✓ תמצית פרופיל פיננסי' : '✓ Financial profile summary',
            lang === 'he' ? '✓ 5 מדינות מומלצות עם חיסכון מחושב' : '✓ Top 5 jurisdictions with calculated savings',
            lang === 'he' ? '✓ אזהרות FATCA / FBAR (אם רלוונטי)' : '✓ FATCA / FBAR warnings (if applicable)',
            lang === 'he' ? '✓ רשימת צעדים מומלצים לפעולה' : '✓ Recommended action steps',
            lang === 'he' ? '✓ כתב ויתור (Disclaimer) לשימוש מקצועי' : '✓ Professional disclaimer',
          ].map((item, i) => (
            <div key={i} style={{ fontSize: '0.83rem', color: 'var(--text)', marginBottom: 6, display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--success)' }}>✓</span>
              <span>{item.replace('✓ ', '')}</span>
            </div>
          ))}
        </div>
        {/* Tip */}
        <div style={{ background: 'rgba(59,130,246,0.08)', borderRadius: 10, padding: 14, border: '1px solid rgba(59,130,246,0.2)', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          💡 {lang === 'he'
            ? 'הדוח ייפתח בחלון חדש. בחר "שמור כ-PDF" בתפריט ההדפסה (בדפדפן Chrome/Safari). מומלץ לשתף עם רואה החשבון לפגישה ראשונה.'
            : 'The report opens in a new window. Select "Save as PDF" in the print dialog (Chrome/Safari). Great for sharing with your CPA at a first meeting.'}
        </div>
        {/* Print button */}
        <button onClick={handlePrint} disabled={printing}
          style={{ padding: '16px', borderRadius: 12, background: printing ? 'var(--surface-2)' : 'linear-gradient(135deg,#f59e0b,#ef4444)', color: printing ? 'var(--text-muted)' : 'white', border: 'none', cursor: printing ? 'wait' : 'pointer', fontWeight: 800, fontSize: '1rem', boxShadow: printing ? 'none' : '0 4px 18px rgba(245,158,11,0.4)', transition: 'all 0.2s' }}>
          {printing ? (lang === 'he' ? '⏳ מייצר...' : '⏳ Generating...') : `🖨️ ${lang === 'he' ? 'הפק דוח PDF' : 'Generate PDF Report'}`}
        </button>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          {lang === 'he' ? 'הדוח מיוצר בדפדפן — לא נשלח לשרת. פרטיך נשארים אצלך.' : 'Report generated locally in your browser — never sent to any server. Your data stays private.'}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────────
interface DashboardProps {
  lang: Lang;
  profile: UserProfile;
  onOpenTool: (tool: string) => void;
  onChat: (msg: string) => void;
}

function Dashboard({ lang, profile, onOpenTool, onChat }: DashboardProps) {
  const isHe = lang === 'he';
  const totalIncome = Object.values(profile.income).reduce((a, b) => a + b, 0);
  const totalAssets = Object.values(profile.assets).reduce((a, b) => a + b, 0);

  // Compute top 3 countries by savings
  const top3 = Object.entries(FIT_DATA)
    .map(([code, d]) => {
      const effectiveRate = profile.is_us_person
        ? Math.max(d.taxSalary / 100, 0.15)
        : d.taxSalary / 100;
      const currentRate = 0.35; // conservative baseline
      const saving = totalIncome > 0 ? Math.round(totalIncome * (currentRate - effectiveRate)) : 0;
      return { code, d, effectiveRate, saving };
    })
    .filter(x => x.saving > 0)
    .sort((a, b) => b.saving - a.saving)
    .slice(0, 3);

  const maxSaving = top3[0]?.saving ?? 0;

  // Optimization score (0-100): how much you could save vs income
  const optScore = totalIncome > 0
    ? Math.min(100, Math.round((maxSaving / totalIncome) * 180))
    : 0;

  // Score color
  const scoreColor = optScore >= 60 ? '#ef4444' : optScore >= 30 ? '#f59e0b' : '#10b981';

  // SVG ring
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = circ * (optScore / 100);

  // Upcoming deadlines (static, always relevant)
  const now = new Date();
  const deadlines = [
    { date: new Date(now.getFullYear(), 3, 15), label: isHe ? 'הגשת החזר מס ארה"ב' : 'US Tax Return', emoji: '🇺🇸' },
    { date: new Date(now.getFullYear(), 5, 30), label: isHe ? 'הגשה ישראלית' : 'Israel Tax Filing', emoji: '🇮🇱' },
    { date: new Date(now.getFullYear(), 3, 15), label: isHe ? 'FBAR' : 'FBAR', emoji: '📋' },
    { date: new Date(now.getFullYear(), 5, 15), label: isHe ? 'Form 8938 (FATCA)' : 'Form 8938 (FATCA)', emoji: '📝' },
    { date: new Date(now.getFullYear(), 8, 15), label: isHe ? 'מקדמת מס רבעונית' : 'Quarterly Tax Payment', emoji: '💸' },
  ]
    .map(d => {
      let target = d.date;
      if (target < now) target = new Date(target.getFullYear() + 1, target.getMonth(), target.getDate());
      const daysLeft = Math.ceil((target.getTime() - now.getTime()) / 86400000);
      return { ...d, daysLeft, target };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  const fmt = (n: number) => n >= 1000000
    ? `$${(n / 1000000).toFixed(1)}M`
    : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;

  const urgencyColor = (days: number) =>
    days <= 30 ? '#ef4444' : days <= 90 ? '#f59e0b' : '#10b981';

  const quickTools = [
    { icon: '🏆', label: isHe ? 'מיטוב דרכון' : 'Passport', tool: 'passportOptimizer' },
    { icon: '💰', label: isHe ? 'חיסכון מס' : 'Savings', tool: 'savings' },
    { icon: '🕵️', label: isHe ? 'סימולטור ביקורת' : 'Audit Sim', tool: 'taxAudit' },
    { icon: '📄', label: isHe ? 'אנליזת מסמך' : 'Doc Analyze', tool: 'docAnalyzer' },
    { icon: '📊', label: isHe ? 'דוח PDF' : 'PDF Report', tool: 'pdfReport' },
    { icon: '📅', label: isHe ? 'יומן מס' : 'Calendar', tool: 'calendarSync' },
    { icon: '🔮', label: isHe ? 'תחזית 2030' : 'Forecast', tool: 'taxForecast' },
    { icon: '🤝', label: isHe ? 'השוואת עמיתים' : 'Benchmark', tool: 'peerBenchmark' },
  ];

  const nextAction = top3[0]
    ? {
        emoji: '🎯',
        title: isHe ? `שקול מעבר ל-${top3[0].d.name}` : `Consider relocating to ${top3[0].code}`,
        desc: isHe
          ? `חיסכון שנתי פוטנציאלי של ${fmt(top3[0].saving)} במס`
          : `Potential annual tax saving of ${fmt(top3[0].saving)}`,
        action: isHe
          ? `כמה מס אחסוך אם אעבור ל${top3[0].code}?`
          : `How much tax would I save moving to ${top3[0].code}?`,
      }
    : null;

  return (
    <div className="slide-in pb-8" dir={isHe ? 'rtl' : 'ltr'}>
      {/* Hero row */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        {/* Overpayment hero */}
        <div className="flex-1 rounded-2xl p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0f3460 0%, #1a1a2e 100%)', border: '1px solid rgba(59,130,246,0.25)' }}>
          <div className="text-xs font-semibold mb-1 opacity-60" style={{ color: '#93c5fd' }}>
            {isHe ? '💸 אתה משלם יותר מדי מדי שנה' : '💸 You overpay every year'}
          </div>
          <div className="text-3xl font-black mb-1" style={{ color: '#f87171' }}>
            {maxSaving > 0 ? fmt(maxSaving) : isHe ? 'הכנס פרופיל' : 'Add income'}
          </div>
          <div className="text-xs opacity-50" style={{ color: '#e2e8f0' }}>
            {maxSaving > 0
              ? (isHe ? `חיסכון פוטנציאלי שנתי אם תעבור ל${top3[0]?.code}` : `Potential annual savings moving to ${top3[0]?.code}`)
              : (isHe ? 'עדכן את ההכנסה שלך בפרופיל' : 'Update your income in profile')}
          </div>
          <div className="absolute bottom-3 end-4 text-5xl opacity-10 select-none">💸</div>
        </div>

        {/* Optimization score ring */}
        <div className="rounded-2xl p-5 flex flex-col items-center justify-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', minWidth: 140 }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
            <circle cx="50" cy="50" r={r} fill="none" stroke={scoreColor} strokeWidth="10"
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dasharray 1s ease' }} />
            <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
              style={{ fontSize: 20, fontWeight: 800, fill: scoreColor }}>
              {optScore}
            </text>
          </svg>
          <div className="text-xs text-center mt-1 font-semibold" style={{ color: 'var(--text-muted)' }}>
            {isHe ? 'ציון אופטימיזציה' : 'Opt. Score'}
          </div>
          <div className="text-xs text-center" style={{ color: scoreColor }}>
            {optScore >= 60 ? (isHe ? '⚠️ דחוף לטפל' : '⚠️ Act now')
              : optScore >= 30 ? (isHe ? '🔶 יש מה לשפר' : '🔶 Room to improve')
              : (isHe ? '✅ מצוין' : '✅ Well optimized')}
          </div>
        </div>
      </div>

      {/* Top 3 countries */}
      {top3.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
            {isHe ? '🌍 המדינות הטובות ביותר עבורך' : '🌍 Best countries for you'}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {top3.map((c, i) => (
              <button key={c.code}
                onClick={() => onChat(isHe ? `ספר לי עוד על מיסוי ב${c.code}` : `Tell me about taxes in ${c.code}`)}
                className="rounded-xl p-3 text-center transition-all hover:opacity-80 hover:scale-105"
                style={{
                  background: i === 0 ? 'rgba(245,158,11,0.1)' : 'var(--surface)',
                  border: i === 0 ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border)',
                }}>
                <div className="text-2xl mb-1">{c.d.flag}</div>
                <div className="text-xs font-bold mb-1">{c.code}</div>
                <div className="text-xs font-black" style={{ color: '#10b981' }}>
                  {fmt(c.saving)}
                </div>
                <div className="text-xs opacity-50">{isHe ? 'חיסכון/שנה' : '/yr saved'}</div>
                {i === 0 && <div className="text-xs mt-1">🏆</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Deadlines + Next action row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Deadlines */}
        <div className="flex-1 rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
            ⏱️ {isHe ? 'דד-ליינים קרובים' : 'Upcoming deadlines'}
          </div>
          {deadlines.map((dl, i) => (
            <div key={i} className="flex items-center gap-2 mb-2 last:mb-0">
              <span className="text-lg">{dl.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{dl.label}</div>
                <div className="text-xs" style={{ color: urgencyColor(dl.daysLeft) }}>
                  {dl.daysLeft === 0 ? (isHe ? 'היום!' : 'Today!')
                    : isHe ? `בעוד ${dl.daysLeft} ימים` : `${dl.daysLeft} days`}
                </div>
              </div>
              <div className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${urgencyColor(dl.daysLeft)}20`, color: urgencyColor(dl.daysLeft) }}>
                {dl.daysLeft <= 7 ? (isHe ? 'דחוף' : 'Urgent')
                  : dl.daysLeft <= 30 ? (isHe ? 'קרוב' : 'Soon') : (isHe ? 'תכנן' : 'Plan')}
              </div>
            </div>
          ))}
          <button onClick={() => onOpenTool('calendarSync')}
            className="mt-3 w-full text-xs py-1.5 rounded-lg font-semibold transition-all hover:opacity-80"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
            {isHe ? '📅 הוסף ליומן' : '📅 Sync to Calendar'}
          </button>
        </div>

        {/* Next action */}
        {nextAction && (
          <div className="flex-1 rounded-xl p-4"
            style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(16,185,129,0.08) 100%)', border: '1px solid rgba(59,130,246,0.25)' }}>
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
              {isHe ? '🎯 הצעד הבא המומלץ' : '🎯 Recommended next step'}
            </div>
            <div className="text-2xl mb-2">{nextAction.emoji}</div>
            <div className="text-sm font-bold mb-1">{nextAction.title}</div>
            <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{nextAction.desc}</div>
            <button onClick={() => onChat(nextAction.action)}
              className="w-full py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80"
              style={{ background: 'var(--accent)', color: 'white' }}>
              {isHe ? '💬 שאל את ה-AI' : '💬 Ask AI'}
            </button>
          </div>
        )}
      </div>

      {/* Quick tools grid */}
      <div>
        <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
          {isHe ? '⚡ כלים מהירים' : '⚡ Quick tools'}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {quickTools.map((t, i) => (
            <button key={i} onClick={() => onOpenTool(t.tool)}
              className="rounded-xl p-3 text-center transition-all hover:opacity-80 hover:scale-105"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xl mb-1">{t.icon}</div>
              <div className="text-xs font-medium leading-tight">{t.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Financial overview bar */}
      <div className="mt-4 rounded-xl p-4 flex gap-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {[
          { label: isHe ? 'הכנסה שנתית' : 'Annual Income', value: fmt(totalIncome), icon: '💰' },
          { label: isHe ? 'סך נכסים' : 'Total Assets', value: fmt(totalAssets), icon: '🏦' },
          { label: isHe ? 'שיעור מס נוכחי' : 'Est. Tax Rate', value: totalIncome > 0 ? '~35%' : '—', icon: '📊' },
          { label: isHe ? 'שיעור מס אופטימלי' : 'Optimal Rate', value: top3[0] ? `${Math.round(top3[0].effectiveRate * 100)}%` : '—', icon: '🎯' },
        ].map((stat, i) => (
          <div key={i} className="flex-1 text-center">
            <div className="text-lg mb-0.5">{stat.icon}</div>
            <div className="text-sm font-bold">{stat.value}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── My Plan Wizard ────────────────────────────────────────────────────────────
interface PlanStep {
  id: string;
  phase: 'immediate'|'1-3mo'|'3-6mo'|'post-move'|'ongoing';
  urgency: 'critical'|'high'|'medium'|'low';
  category: 'tax'|'legal'|'financial'|'personal'|'business';
  title_he: string; title_en: string;
  desc_he: string; desc_en: string;
}

const PLAN_COUNTRIES = [
  { code: 'pt', flag: '🇵🇹', name_he: 'פורטוגל', name_en: 'Portugal' },
  { code: 'ae', flag: '🇦🇪', name_he: 'איחוד האמירויות', name_en: 'UAE' },
  { code: 'cy', flag: '🇨🇾', name_he: 'קפריסין', name_en: 'Cyprus' },
  { code: 'mt', flag: '🇲🇹', name_he: 'מלטה', name_en: 'Malta' },
  { code: 'gr', flag: '🇬🇷', name_he: 'יוון', name_en: 'Greece' },
  { code: 'it', flag: '🇮🇹', name_he: 'איטליה', name_en: 'Italy' },
  { code: 'es', flag: '🇪🇸', name_he: 'ספרד', name_en: 'Spain' },
  { code: 'pa', flag: '🇵🇦', name_he: 'פנמה', name_en: 'Panama' },
  { code: 'th', flag: '🇹🇭', name_he: 'תאילנד', name_en: 'Thailand' },
  { code: 'sg', flag: '🇸🇬', name_he: 'סינגפור', name_en: 'Singapore' },
  { code: 'hr', flag: '🇭🇷', name_he: "קרואטיה", name_en: 'Croatia' },
  { code: 'me', flag: '🇲🇪', name_he: 'מונטנגרו', name_en: 'Montenegro' },
  { code: 'mx', flag: '🇲🇽', name_he: 'מקסיקו', name_en: 'Mexico' },
  { code: 'ge', flag: '🇬🇪', name_he: 'גאורגיה', name_en: 'Georgia' },
];

function generatePlan(profile: UserProfile, country: string, timeline: string, goal: string): PlanStep[] {
  const steps: PlanStep[] = [];
  const totalIncome = (profile.income.employment||0)+(profile.income.business||0)+(profile.income.capital_gains||0)+(profile.income.dividends||0)+(profile.income.other||0);
  const totalAssets = (profile.assets.stocks||0)+(profile.assets.real_estate||0)+(profile.assets.crypto_holdings||0)+(profile.assets.business_value||0)+(profile.assets.other||0);
  const hasCrypto = (profile.assets.crypto_holdings||0) > 0;
  const hasCompany = (profile.assets.business_value||0) > 50000;
  const hasRE = (profile.assets.real_estate||0) > 0;
  const needsExitTax = totalAssets > 1800000;
  const isUSPerson = profile.is_us_person;

  // Phase: Immediate (0-30 days)
  steps.push({ id:'1', phase:'immediate', urgency:'critical', category:'tax',
    title_he:'פגישת ייעוץ עם רו"ח בינלאומי', title_en:'Consult International Tax CPA',
    desc_he:'קבע פגישה עם רו"ח המתמחה במיסוי בינלאומי לפני כל צעד אחר. זה הבסיס לכל התכנון.', desc_en:'Schedule meeting with an international tax CPA before any other step. This is the foundation of all planning.' });

  steps.push({ id:'2', phase:'immediate', urgency:'critical', category:'legal',
    title_he:'תחקיר מעמד תושב מס בישראל', title_en:'Research Israeli Tax Residency Status',
    desc_he:'הבן מהם הכללים לניתוק תושבות (מרכז חיים, ימי שהייה) ומה הצפוי בתהליך ניתוק.', desc_en:'Understand the rules for breaking tax residency (center of life, days of stay) and what to expect in the process.' });

  if (needsExitTax) {
    steps.push({ id:'3', phase:'immediate', urgency:'critical', category:'tax',
      title_he:'הכן חישוב מס יציאה', title_en:'Prepare Exit Tax Calculation',
      desc_he:`סך נכסיך מעל 1.8M ₪ — מס יציאה עשוי לחול. חשב את החבות ותכנן תשלום או פריסה.`, desc_en:`Your assets exceed ILS 1.8M — exit tax may apply. Calculate liability and plan payment or installment.` });
  }

  if (hasCrypto) {
    steps.push({ id:'4', phase:'immediate', urgency:'high', category:'tax',
      title_he:'תיעוד עלות מקורית של קריפטו', title_en:'Document Crypto Cost Basis',
      desc_he:'אסוף את כל רכישות הקריפטו בתאריכים ומחירים. בישראל — מיסוי לפי FIFO, 25% מס רווח הון.', desc_en:'Collect all crypto purchases with dates and prices. Israel taxes crypto as capital gains at 25% FIFO.' });
  }

  if (hasCompany) {
    steps.push({ id:'5', phase:'immediate', urgency:'high', category:'business',
      title_he:'בדוק אפשרויות לרה-ארגון החברה', title_en:'Review Company Restructuring Options',
      desc_he:'שקול האם למשוך דיבידנד, להמיר ל-holdco, או לדחות עד לאחר מעבר המגורים.', desc_en:'Consider whether to distribute dividends, convert to holdco, or defer until after residency change.' });
  }

  // Phase: 1-3 months
  steps.push({ id:'6', phase:'1-3mo', urgency:'high', category:'legal',
    title_he:`חקור ויזת מגורים ב${PLAN_COUNTRIES.find(c=>c.code===country)?.[goal==='he_label'?'name_he':'name_en']||country}`, title_en:`Research Residency Visa in Target Country`,
    desc_he:'בדוק סוגי ויזות זמינות: ויזת גמלאים, remote worker, השקעה, NHR (פורטוגל) וכד.', desc_en:"Check available visa types: retiree, remote worker, investment, NHR (Portugal), etc." });

  steps.push({ id:'7', phase:'1-3mo', urgency:'high', category:'financial',
    title_he:'פתח חשבון בנק בינלאומי', title_en:'Open an International Bank Account',
    desc_he:'פתח חשבון ב-Wise, Revolut, או בנק מקומי במדינת היעד. זה יקל על העברת כספים ובניית היסטוריה בנקאית.', desc_en:'Open an account with Wise, Revolut, or a local bank in the target country. This eases fund transfers and builds banking history.' });

  if (isUSPerson) {
    steps.push({ id:'8', phase:'1-3mo', urgency:'critical', category:'tax',
      title_he:'ייעוץ FATCA / FBAR', title_en:'FATCA / FBAR Compliance Review',
      desc_he:'כאזרח/תושב ארה"ב, חייב להגיש FBAR ו-Form 8938 על חשבונות זרים. היוועץ עם רו"ח אמריקאי.', desc_en:"As a US person, you must file FBAR and Form 8938 for foreign accounts. Consult a US-qualified CPA." });
  }

  steps.push({ id:'9', phase:'1-3mo', urgency:'medium', category:'personal',
    title_he:'ביקור סיור במדינת היעד', title_en:'Exploratory Visit to Target Country',
    desc_he:'בלה לפחות 1-2 שבועות במדינת היעד לבדיקת סביבת מגורים, עלות חיים, שכונות מתאימות.', desc_en:'Spend at least 1-2 weeks in the target country to check living environment, cost of living, suitable neighborhoods.' });

  // Phase: 3-6 months
  steps.push({ id:'10', phase:'3-6mo', urgency:'high', category:'legal',
    title_he:'הגש בקשה לויזת מגורים', title_en:'Apply for Residency Visa',
    desc_he:'הגש בקשה רשמית לויזת מגורים ואסוף מסמכים נדרשים (רשומות רפואיות, עבר פלילי, הוכחת הכנסה).', desc_en:'Submit official residency visa application and gather required documents (medical records, police clearance, proof of income).' });

  if (hasRE) {
    steps.push({ id:'11', phase:'3-6mo', urgency:'medium', category:'financial',
      title_he:'החלט על גורל הנדל"ן בישראל', title_en:'Decide on Israeli Real Estate',
      desc_he:'שקול: מכירה לפני עזיבה (פטור ממס שבח אפשרי), השכרה, או החזקה לטווח ארוך.', desc_en:'Consider: selling before departure (possible capital gains exemption), renting out, or long-term holding.' });
  }

  steps.push({ id:'12', phase:'3-6mo', urgency:'high', category:'tax',
    title_he:'מסור הצהרת תושבות לרשות המסים', title_en:'Submit Residency Declaration to Tax Authority',
    desc_he:'הגש טופס 1301 או הצהרת ניתוק תושבות לרשות המסים בישראל. שמור עותקים לכל החיים.', desc_en:'File Form 1301 or residency severance declaration with the Israeli Tax Authority. Keep copies permanently.' });

  steps.push({ id:'13', phase:'3-6mo', urgency:'medium', category:'personal',
    title_he:'מצא מגורים במדינת היעד', title_en:'Find Housing in Target Country',
    desc_he:'מצא דירה להשכרה לשנה ראשונה לפחות. שמור חוזה שכירות — הוא מסמך מפתח לביסוס תושבות.', desc_en:'Find a rental apartment for at least the first year. Keep the lease — it is a key document for establishing residency.' });

  // Phase: Post-move
  steps.push({ id:'14', phase:'post-move', urgency:'high', category:'legal',
    title_he:'בטל ביטוח לאומי ישראלי', title_en:'Cancel Israeli National Insurance',
    desc_he:'הודע לביטוח לאומי על עזיבתך. בדוק זכויות פנסיה ושמירת קצבאות עתידיות.', desc_en:"Notify the National Insurance Institute of your departure. Check pension rights and future benefit preservation." });

  steps.push({ id:'15', phase:'post-move', urgency:'high', category:'tax',
    title_he:'הגש דו"ח שנתי אחרון לישראל', title_en:'File Final Israeli Tax Return',
    desc_he:'הגש דו"ח מס שנתי לשנת העזיבה. כלול ימי שהייה, הכנסות עד תאריך ניתוק, ומס יציאה אם רלוונטי.', desc_en:'File annual tax return for the year of departure. Include days of stay, income until severance date, and exit tax if applicable.' });

  // Ongoing
  steps.push({ id:'16', phase:'ongoing', urgency:'medium', category:'tax',
    title_he:'עקוב אחר ימי שהייה בישראל', title_en:'Track Days in Israel',
    desc_he:'שמור יומן ימי שהייה מדויק. עד 183 ימים לשנה. הימנע מחציית הרף למשך 4 שנים לפחות.', desc_en:'Keep an accurate log of days in Israel. Up to 183 days per year. Avoid crossing the threshold for at least 4 years.' });

  steps.push({ id:'17', phase:'ongoing', urgency:'low', category:'financial',
    title_he:'עדכן צוואה ומסמכים משפטיים', title_en:'Update Will and Legal Documents',
    desc_he:'עדכן צוואה לפי חוקי ירושה במדינת המגורים החדשה. שקול שימוש ב-trust בינלאומי.', desc_en:"Update will according to inheritance laws in new country of residence. Consider using an international trust." });

  if (timeline === '6mo') {
    steps.forEach(s => { if (s.phase === 'post-move' || s.phase === 'ongoing') s.urgency = 'critical'; });
  }

  return steps;
}

function MyPlanPanel({ lang, profile, onClose }: { lang: Lang; profile: UserProfile; onClose: () => void }) {
  const tr = useTranslation(lang);
  const [country, setCountry] = useState('pt');
  const [timeline, setTimeline] = useState('1yr');
  const [goal, setGoal] = useState('tax');
  const [started, setStarted] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const plan = useMemo(() => started ? generatePlan(profile, country, timeline, goal) : [], [started, profile, country, timeline, goal]);

  const phaseOrder: PlanStep['phase'][] = ['immediate','1-3mo','3-6mo','post-move','ongoing'];
  const phaseLabels: Record<PlanStep['phase'], {he:string;en:string}> = {
    'immediate': {he:'מיידי (0-30 יום)', en:'Immediate (0-30 days)'},
    '1-3mo': {he:'1-3 חודשים', en:'1-3 Months'},
    '3-6mo': {he:'3-6 חודשים', en:'3-6 Months'},
    'post-move': {he:'אחרי המעבר', en:'After the Move'},
    'ongoing': {he:'שוטף', en:'Ongoing'},
  };
  const urgencyColor: Record<PlanStep['urgency'], string> = {
    critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#10b981'
  };
  const catIcon: Record<PlanStep['category'], string> = {
    tax:'💰', legal:'⚖️', financial:'🏦', personal:'👤', business:'🏢'
  };

  const countryObj = PLAN_COUNTRIES.find(c => c.code === country);
  const doneCount = checked.size;
  const totalCount = plan.length;

  const handlePrint = () => window.print();

  return (
    <div style={{ flex:'1 1 0', overflowY:'auto', padding:'1.5rem', minHeight:0 }}>
      <div style={{ maxWidth:760, margin:'0 auto' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color:'var(--text)' }}>🗺️ {lang==='he'?'תוכנית פעולה אישית':'Personalized Action Plan'}</h2>
            <p className="text-sm mt-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'תוכנית שלב-אחר-שלב בהתאם לפרופיל שלך':'Step-by-step plan tailored to your profile'}</p>
          </div>
          <div className="flex items-center gap-2">
            {started && <button onClick={handlePrint} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium no-print" style={{ background:'var(--surface-2)', color:'var(--text-muted)', border:'1px solid var(--border)' }}><Printer size={12}/>{lang==='he'?'הדפס':'Print'}</button>}
            <button onClick={onClose} className="no-print" style={{ color:'var(--text-muted)' }}><X size={18}/></button>
          </div>
        </div>

        {!started ? (
          <div className="rounded-2xl p-6" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
            <h3 className="font-semibold mb-4" style={{ color:'var(--text)' }}>{lang==='he'?'הגדר את היעד שלך':'Define Your Goal'}</h3>
            <div className="grid grid-cols-1 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color:'var(--text-muted)' }}>{lang==='he'?'מדינת יעד':'Target Country'}</label>
                <div className="grid grid-cols-3 gap-2">
                  {PLAN_COUNTRIES.map(c => (
                    <button key={c.code} onClick={() => setCountry(c.code)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
                      style={{ background: country===c.code ? 'var(--accent-glow)' : 'var(--surface-2)', border: country===c.code ? '1px solid var(--accent)' : '1px solid var(--border)', color: country===c.code ? 'var(--accent)' : 'var(--text)' }}>
                      <span>{c.flag}</span><span>{lang==='he'?c.name_he:c.name_en}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color:'var(--text-muted)' }}>{lang==='he'?'ציר זמן':'Timeline'}</label>
                <div className="flex gap-2 flex-wrap">
                  {([['6mo', lang==='he'?'6 חודשים':'6 Months'],['1yr', lang==='he'?'שנה 1':'1 Year'],['2yr', lang==='he'?'2+ שנים':'2+ Years']] as [string,string][]).map(([v,l]) => (
                    <button key={v} onClick={() => setTimeline(v)}
                      className="px-4 py-2 rounded-lg text-sm"
                      style={{ background: timeline===v ? 'var(--accent-glow)' : 'var(--surface-2)', border: timeline===v ? '1px solid var(--accent)' : '1px solid var(--border)', color: timeline===v ? 'var(--accent)' : 'var(--text)' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color:'var(--text-muted)' }}>{lang==='he'?'מטרה עיקרית':'Primary Goal'}</label>
                <div className="flex gap-2 flex-wrap">
                  {([['tax', lang==='he'?'💰 חיסכון במס':'💰 Tax Savings'],['relocate', lang==='he'?'🏠 העתקת מגורים':'🏠 Full Relocation'],['remote', lang==='he'?'💻 עבודה מרחוק':'💻 Remote Work'],['explore', lang==='he'?'🔍 בחינה בלבד':'🔍 Exploring Options']] as [string,string][]).map(([v,l]) => (
                    <button key={v} onClick={() => setGoal(v)}
                      className="px-4 py-2 rounded-lg text-sm"
                      style={{ background: goal===v ? 'var(--accent-glow)' : 'var(--surface-2)', border: goal===v ? '1px solid var(--accent)' : '1px solid var(--border)', color: goal===v ? 'var(--accent)' : 'var(--text)' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setStarted(true)}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
              style={{ background:'var(--accent)' }}>
              {lang==='he'?`⚡ צור תוכנית ל${countryObj?.[lang==='he'?'name_he':'name_en']||country}`:`⚡ Generate Plan for ${countryObj?.name_en||country}`}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-4 mb-6 p-4 rounded-xl" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
              <div className="text-3xl">{countryObj?.flag}</div>
              <div className="flex-1">
                <div className="font-semibold" style={{ color:'var(--text)' }}>{lang==='he'?`תוכנית מעבר ל${countryObj?.name_he}`:`Relocation Plan to ${countryObj?.name_en}`}</div>
                <div className="text-sm mt-0.5" style={{ color:'var(--text-muted)' }}>{totalCount} {lang==='he'?'צעדים':'steps'}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color:'var(--accent)' }}>{doneCount}/{totalCount}</div>
                <div className="text-xs" style={{ color:'var(--text-muted)' }}>{lang==='he'?'הושלם':'done'}</div>
              </div>
              <button onClick={() => setStarted(false)} className="text-xs px-3 py-1.5 rounded-lg" style={{ background:'var(--surface-2)', color:'var(--text-muted)', border:'1px solid var(--border)' }}>{lang==='he'?'ערוך':'Edit'}</button>
            </div>

            {phaseOrder.map(phase => {
              const phaseSteps = plan.filter(s => s.phase === phase);
              if (phaseSteps.length === 0) return null;
              return (
                <div key={phase} className="mb-6">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color:'var(--text-muted)' }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent)', display:'inline-block' }}/>
                    {phaseLabels[phase][lang==='he'?'he':'en']}
                  </h3>
                  <div className="space-y-2">
                    {phaseSteps.map(step => (
                      <div key={step.id}
                        className="flex items-start gap-3 p-3 rounded-xl transition-all"
                        style={{ background:'var(--surface)', border:`1px solid ${checked.has(step.id) ? 'var(--border)' : 'var(--border)'}`, opacity: checked.has(step.id) ? 0.6 : 1 }}>
                        <input type="checkbox" checked={checked.has(step.id)} onChange={() => setChecked(prev => { const n = new Set(prev); n.has(step.id) ? n.delete(step.id) : n.add(step.id); return n; })}
                          className="mt-0.5 cursor-pointer" style={{ width:16, height:16, accentColor:'var(--accent)' }}/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span style={{ fontSize:'0.8rem' }}>{catIcon[step.category]}</span>
                            <span className="font-medium text-sm" style={{ color: checked.has(step.id) ? 'var(--text-muted)' : 'var(--text)', textDecoration: checked.has(step.id) ? 'line-through' : 'none' }}>
                              {lang==='he' ? step.title_he : step.title_en}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background:`${urgencyColor[step.urgency]}22`, color:urgencyColor[step.urgency] }}>
                              {step.urgency === 'critical' ? (lang==='he'?'קריטי':'Critical') : step.urgency === 'high' ? (lang==='he'?'גבוה':'High') : step.urgency === 'medium' ? (lang==='he'?'בינוני':'Medium') : (lang==='he'?'נמוך':'Low')}
                            </span>
                          </div>
                          <p className="text-xs mt-1" style={{ color:'var(--text-muted)' }}>{lang==='he' ? step.desc_he : step.desc_en}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-center mt-4" style={{ color:'var(--text-muted)' }}>* {lang==='he'?'תוכנית זו היא כלי עזר בלבד. חובה להתייעץ עם אנשי מקצוע לפני קבלת החלטות.':'This plan is a guide only. Always consult professionals before making decisions.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Country Comparison Matrix ──────────────────────────────────────────────────
const COMP_MATRIX_DATA: Record<string, { flag: string; name_he: string; name_en: string; taxIncome: string; taxCG: string; taxDiv: string; vatRate: string; treatyIsrael: string; crs: string; exitTaxRisk: string; visaDifficulty: string; colIndex: string; stability: string; banking: string; crypto: string; }> = {
  pt: { flag:'🇵🇹', name_he:'פורטוגל', name_en:'Portugal', taxIncome:'0% (NHR)', taxCG:'28%', taxDiv:'28%', vatRate:'23%', treatyIsrael:'✅', crs:'✅ מדווח', exitTaxRisk:'נמוך', visaDifficulty:'בינוני', colIndex:'65', stability:'גבוהה', banking:'✅ קל', crypto:'28%', },
  ae: { flag:'🇦🇪', name_he:'איחוד האמירויות', name_en:'UAE', taxIncome:'0%', taxCG:'0%', taxDiv:'0%', vatRate:'5%', treatyIsrael:'✅', crs:'✅ מדווח', exitTaxRisk:'נמוך', visaDifficulty:'קל', colIndex:'80', stability:'גבוהה', banking:'בינוני', crypto:'0%', },
  cy: { flag:'🇨🇾', name_he:'קפריסין', name_en:'Cyprus', taxIncome:'0-35%', taxCG:'0%', taxDiv:'0% (non-dom)', vatRate:'19%', treatyIsrael:'✅', crs:'✅ מדווח', exitTaxRisk:'נמוך', visaDifficulty:'קל', colIndex:'60', stability:'בינונית', banking:'בינוני', crypto:'0%', },
  mt: { flag:'🇲🇹', name_he:'מלטה', name_en:'Malta', taxIncome:'0-35%', taxCG:'0%', taxDiv:'0% (non-dom)', vatRate:'18%', treatyIsrael:'✅', crs:'✅ מדווח', exitTaxRisk:'נמוך', visaDifficulty:'בינוני', colIndex:'65', stability:'גבוהה', banking:'בינוני', crypto:'0%', },
  gr: { flag:'🇬🇷', name_he:'יוון', name_en:'Greece', taxIncome:'7% (גמלאים)', taxCG:'15%', taxDiv:'5%', vatRate:'24%', treatyIsrael:'✅', crs:'✅ מדווח', exitTaxRisk:'נמוך', visaDifficulty:'קל', colIndex:'55', stability:'בינונית', banking:'קשה', crypto:'15%', },
  it: { flag:'🇮🇹', name_he:'איטליה', name_en:'Italy', taxIncome:'100K€ פאושל', taxCG:'26%', taxDiv:'26%', vatRate:'22%', treatyIsrael:'✅', crs:'✅ מדווח', exitTaxRisk:'בינוני', visaDifficulty:'בינוני', colIndex:'70', stability:'גבוהה', banking:'בינוני', crypto:'26%', },
  pa: { flag:'🇵🇦', name_he:'פנמה', name_en:'Panama', taxIncome:'0% (הכנסות חוץ)', taxCG:'0% (חוץ)', taxDiv:'0%', vatRate:'7%', treatyIsrael:'❌', crs:'✅ מדווח', exitTaxRisk:'נמוך', visaDifficulty:'קל', colIndex:'60', stability:'בינונית', banking:'בינוני', crypto:'0%', },
  ge: { flag:'🇬🇪', name_he:'גאורגיה', name_en:'Georgia', taxIncome:'0% (VZS)', taxCG:'0%', taxDiv:'0%', vatRate:'18%', treatyIsrael:'✅', crs:'❌ לא מדווח', exitTaxRisk:'נמוך', visaDifficulty:'קל', colIndex:'40', stability:'בינונית', banking:'קל', crypto:'0%', },
  sg: { flag:'🇸🇬', name_he:'סינגפור', name_en:'Singapore', taxIncome:'0-24%', taxCG:'0%', taxDiv:'0%', vatRate:'9%', treatyIsrael:'✅', crs:'✅ מדווח', exitTaxRisk:'נמוך', visaDifficulty:'קשה', colIndex:'95', stability:'גבוהה', banking:'קל', crypto:'0%', },
  th: { flag:'🇹🇭', name_he:'תאילנד', name_en:'Thailand', taxIncome:'0-35%', taxCG:'0%', taxDiv:'0%', vatRate:'7%', treatyIsrael:'✅', crs:'✅ מדווח', exitTaxRisk:'נמוך', visaDifficulty:'קל', colIndex:'45', stability:'בינונית', banking:'בינוני', crypto:'15%', },
  hr: { flag:'🇭🇷', name_he:'קרואטיה', name_en:'Croatia', taxIncome:'0-30%', taxCG:'10%', taxDiv:'10%', vatRate:'25%', treatyIsrael:'✅', crs:'✅ מדווח', exitTaxRisk:'נמוך', visaDifficulty:'בינוני', colIndex:'55', stability:'גבוהה', banking:'בינוני', crypto:'10%', },
  me: { flag:'🇲🇪', name_he:'מונטנגרו', name_en:'Montenegro', taxIncome:'9-15%', taxCG:'9%', taxDiv:'9%', vatRate:'21%', treatyIsrael:'❌', crs:'✅ מדווח', exitTaxRisk:'נמוך', visaDifficulty:'קל', colIndex:'45', stability:'בינונית', banking:'בינוני', crypto:'9%', },
};

function CompMatrixPanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const tr = useTranslation(lang);
  const allCodes = Object.keys(COMP_MATRIX_DATA);
  const [selected, setSelected] = useState<string[]>(['pt','ae','cy','mt']);

  const toggleCountry = (code: string) => {
    setSelected(prev => {
      if (prev.includes(code)) return prev.length > 2 ? prev.filter(c=>c!==code) : prev;
      return prev.length < 6 ? [...prev, code] : prev;
    });
  };

  const rows: {key: string; label_he: string; label_en: string; field: keyof typeof COMP_MATRIX_DATA[string]}[] = [
    {key:'taxIncome', label_he:'מס הכנסה', label_en:'Income Tax', field:'taxIncome'},
    {key:'taxCG', label_he:'מס רווח הון', label_en:'Capital Gains Tax', field:'taxCG'},
    {key:'taxDiv', label_he:'מס דיבידנד', label_en:'Dividend Tax', field:'taxDiv'},
    {key:'crypto', label_he:'מס קריפטו', label_en:'Crypto Tax', field:'crypto'},
    {key:'vatRate', label_he:'מע"מ', label_en:'VAT', field:'vatRate'},
    {key:'treatyIsrael', label_he:'אמנת מס עם ישראל', label_en:'Tax Treaty w/ Israel', field:'treatyIsrael'},
    {key:'crs', label_he:'CRS (דיווח לישראל)', label_en:'CRS Reporting', field:'crs'},
    {key:'exitTaxRisk', label_he:'סיכון מס יציאה', label_en:'Exit Tax Risk', field:'exitTaxRisk'},
    {key:'visaDifficulty', label_he:'קושי ויזה', label_en:'Visa Difficulty', field:'visaDifficulty'},
    {key:'colIndex', label_he:'עלות חיים (100=ישראל)', label_en:'Cost of Living (100=IL)', field:'colIndex'},
    {key:'stability', label_he:'יציבות פוליטית', label_en:'Political Stability', field:'stability'},
    {key:'banking', label_he:'פתיחת חשבון בנק', label_en:'Bank Account Access', field:'banking'},
  ];

  const selectedData = selected.map(code => ({ code, ...COMP_MATRIX_DATA[code] }));

  return (
    <div style={{ flex:'1 1 0', overflowY:'auto', padding:'1.5rem', minHeight:0 }}>
      <div style={{ maxWidth:900, margin:'0 auto' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color:'var(--text)' }}>📊 {lang==='he'?'מטריצת השוואת מדינות':'Country Comparison Matrix'}</h2>
            <p className="text-sm mt-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'השווה 2-6 מדינות זה לצד זה':'Compare 2-6 countries side by side'}</p>
          </div>
          <button onClick={onClose} style={{ color:'var(--text-muted)' }}><X size={18}/></button>
        </div>

        <div className="mb-5">
          <p className="text-xs mb-2 font-medium" style={{ color:'var(--text-muted)' }}>{lang==='he'?`בחר מדינות (${selected.length}/6):`:`Select countries (${selected.length}/6):`}</p>
          <div className="flex flex-wrap gap-2">
            {allCodes.map(code => {
              const d = COMP_MATRIX_DATA[code];
              const isSelected = selected.includes(code);
              return (
                <button key={code} onClick={() => toggleCountry(code)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all"
                  style={{ background: isSelected ? 'var(--accent-glow)' : 'var(--surface-2)', border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)', color: isSelected ? 'var(--accent)' : 'var(--text-muted)', fontWeight: isSelected ? 600 : 400 }}>
                  {d.flag} {lang==='he'?d.name_he:d.name_en}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl" style={{ border:'1px solid var(--border)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth: 400 + selected.length*120 }}>
            <thead>
              <tr style={{ background:'var(--surface-2)' }}>
                <th className="text-xs font-semibold px-4 py-3" style={{ color:'var(--text-muted)', textAlign: lang==='he'?'right':'left', borderBottom:'1px solid var(--border)', minWidth:160 }}>{lang==='he'?'קריטריון':'Criterion'}</th>
                {selectedData.map(d => (
                  <th key={d.code} className="text-sm font-semibold px-4 py-3 text-center" style={{ color:'var(--text)', borderBottom:'1px solid var(--border)', minWidth:120, borderLeft:'1px solid var(--border)' }}>
                    <div>{d.flag}</div>
                    <div className="text-xs mt-0.5">{lang==='he'?d.name_he:d.name_en}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.key} style={{ background: i%2===0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                  <td className="px-4 py-2.5 text-sm font-medium" style={{ color:'var(--text)', borderBottom:'1px solid var(--border)' }}>{lang==='he'?row.label_he:row.label_en}</td>
                  {selectedData.map(d => {
                    const val = String(d[row.field]);
                    const isGood = val.includes('0%') || val.includes('✅') || val === 'נמוך' || val === 'קל' || val === 'גבוהה';
                    const isBad = val.includes('❌') || val === 'קשה' || val === 'גבוה';
                    return (
                      <td key={d.code} className="px-4 py-2.5 text-sm text-center" style={{ color: isGood ? '#10b981' : isBad ? '#ef4444' : 'var(--text)', borderBottom:'1px solid var(--border)', borderLeft:'1px solid var(--border)' }}>
                        {lang==='he' ? val : val.replace('מדווח','Reporting').replace('לא מדווח','No Reporting').replace('נמוך','Low').replace('בינוני','Medium').replace('קשה','Hard').replace('קל','Easy').replace('גבוהה','High').replace('בינונית','Medium').replace('גבוה','High')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs mt-3 text-center" style={{ color:'var(--text-muted)' }}>* {lang==='he'?'נתונים כלליים בלבד. ייעוץ מקצועי חובה.':'General data only. Professional advice required.'}</p>
      </div>
    </div>
  );
}

// ─── Estate / Inheritance Planner ──────────────────────────────────────────────
const ESTATE_DATA: Record<string, {flag:string;name_he:string;name_en:string;inheritanceTax:string;forcedHeirship:string;trustAllowed:boolean;probate:string;tip_he:string;tip_en:string}> = {
  pt: {flag:'🇵🇹',name_he:'פורטוגל',name_en:'Portugal',inheritanceTax:'10% (stamp duty)',forcedHeirship:'כן — בן/בת זוג + ילדים',trustAllowed:true,probate:'1-3 שנים',tip_he:'שקול Madeira International Trust לנכסים מחוץ לפורטוגל',tip_en:'Consider a Madeira International Trust for non-Portuguese assets'},
  ae: {flag:'🇦🇪',name_he:'איחוד האמירויות',name_en:'UAE',inheritanceTax:'0%',forcedHeirship:'כן — שריעה לא-תושבים',trustAllowed:true,probate:'משתנה',tip_he:'DIFC Wills Service Centre — רישום צוואה לתושבים שאינם מוסלמים',tip_en:'DIFC Wills Service Centre — register will for non-Muslim residents'},
  cy: {flag:'🇨🇾',name_he:'קפריסין',name_en:'Cyprus',inheritanceTax:'0%',forcedHeirship:'לא',trustAllowed:true,probate:'1-2 שנים',tip_he:'Cyprus International Trust מאפשר הגנה על נכסים עולמיים',tip_en:'Cyprus International Trust allows protection of worldwide assets'},
  mt: {flag:'🇲🇹',name_he:'מלטה',name_en:'Malta',inheritanceTax:'0% (relative to EU)',forcedHeirship:'כן — 25-50%',trustAllowed:true,probate:'1-3 שנים',tip_he:'Malta Private Foundation — כלי יעיל לניהול עושר משפחתי',tip_en:'Malta Private Foundation — effective tool for family wealth management'},
  gr: {flag:'🇬🇷',name_he:'יוון',name_en:'Greece',inheritanceTax:'1-40%',forcedHeirship:'כן — 25-50%',trustAllowed:false,probate:'1-2 שנים',tip_he:'מיסוי ירושה בין 1% (ילדים) ל-40% (עד רחוק)',tip_en:'Inheritance tax ranges from 1% (children) to 40% (distant relatives)'},
  it: {flag:'🇮🇹',name_he:'איטליה',name_en:'Italy',inheritanceTax:'4-8%',forcedHeirship:'כן — 25-50%',trustAllowed:true,probate:'6-18 חודשים',tip_he:'ניתן להשתמש ב-Italian Trust לנהל ירושות חוצות גבולות',tip_en:'Italian Trust can be used to manage cross-border inheritances'},
  pa: {flag:'🇵🇦',name_he:'פנמה',name_en:'Panama',inheritanceTax:'0% (נכסים מחוץ לפנמה)',forcedHeirship:'לא (נכסים בפנמה)',trustAllowed:true,probate:'6-12 חודשים',tip_he:'Panama Private Interest Foundation — הגנה מעולה ואנונימיות',tip_en:'Panama Private Interest Foundation — excellent protection and anonymity'},
  sg: {flag:'🇸🇬',name_he:'סינגפור',name_en:'Singapore',inheritanceTax:'0%',forcedHeirship:'לא',trustAllowed:true,probate:'6-12 חודשים',tip_he:'Singapore Trust — מהאמינים ביותר בעולם לניהול עושר',tip_en:'Singapore Trust — among the most reliable globally for wealth management'},
  ge: {flag:'🇬🇪',name_he:'גאורגיה',name_en:'Georgia',inheritanceTax:'0%',forcedHeirship:'לא',trustAllowed:false,probate:'6-12 חודשים',tip_he:'אין חוקי trust — שקול שימוש בחברת החזקות ג\'ורג\'ית',tip_en:"No trust laws — consider using a Georgian holding company"},
};

function EstatePlannerPanel({ lang, profile, onClose }: { lang: Lang; profile: UserProfile; onClose: () => void }) {
  const [country, setCountry] = useState('cy');
  const totalAssets = (profile.assets.stocks||0)+(profile.assets.real_estate||0)+(profile.assets.crypto_holdings||0)+(profile.assets.business_value||0)+(profile.assets.other||0);
  const d = ESTATE_DATA[country];

  const inheritanceTaxAmount = () => {
    if (!d) return 0;
    if (d.inheritanceTax.includes('0%')) return 0;
    const pct = parseFloat(d.inheritanceTax);
    if (!isNaN(pct)) return totalAssets * (pct/100);
    return null;
  };

  const taxAmt = inheritanceTaxAmount();

  return (
    <div style={{ flex:'1 1 0', overflowY:'auto', padding:'1.5rem', minHeight:0 }}>
      <div style={{ maxWidth:700, margin:'0 auto' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color:'var(--text)' }}>🏰 {lang==='he'?'תכנון ירושה חוצה-גבולות':'Cross-Border Estate Planner'}</h2>
            <p className="text-sm mt-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'הבן השלכות ירושה ומסי עיזבון לפי מדינה':'Understand inheritance implications and estate taxes by country'}</p>
          </div>
          <button onClick={onClose} style={{ color:'var(--text-muted)' }}><X size={18}/></button>
        </div>

        <div className="rounded-xl p-4 mb-5" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
          <p className="text-sm font-medium mb-3" style={{ color:'var(--text-muted)' }}>{lang==='he'?'סך נכסים מוערכים:':'Estimated Total Assets:'}</p>
          <div className="text-2xl font-bold" style={{ color:'var(--accent)' }}>₪{totalAssets.toLocaleString()}</div>
          {totalAssets === 0 && <p className="text-xs mt-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'עדכן נכסים בפרופיל לחישוב מדויק':'Update assets in profile for accurate calculation'}</p>}
        </div>

        <div className="mb-5">
          <p className="text-sm font-medium mb-2" style={{ color:'var(--text-muted)' }}>{lang==='he'?'בחר מדינת מגורים:':'Select Country of Residence:'}</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ESTATE_DATA).map(([code, data]) => (
              <button key={code} onClick={() => setCountry(code)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
                style={{ background: country===code ? 'var(--accent-glow)' : 'var(--surface-2)', border: country===code ? '1px solid var(--accent)' : '1px solid var(--border)', color: country===code ? 'var(--accent)' : 'var(--text-muted)' }}>
                {data.flag} {lang==='he'?data.name_he:data.name_en}
              </button>
            ))}
          </div>
        </div>

        {d && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl p-4" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                <div className="text-xs font-medium mb-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'מס ירושה/עיזבון':'Inheritance / Estate Tax'}</div>
                <div className="text-lg font-bold" style={{ color: d.inheritanceTax.includes('0%') ? '#10b981' : '#f59e0b' }}>{d.inheritanceTax}</div>
                {taxAmt !== null && taxAmt > 0 && (
                  <div className="text-sm mt-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?`≈ ₪${Math.round(taxAmt).toLocaleString()} על נכסיך`:`≈ ₪${Math.round(taxAmt).toLocaleString()} on your assets`}</div>
                )}
              </div>
              <div className="rounded-xl p-4" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                <div className="text-xs font-medium mb-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'ירושה כפויה':'Forced Heirship'}</div>
                <div className="text-lg font-bold" style={{ color: d.forcedHeirship==='לא'||d.forcedHeirship==='No' ? '#10b981' : '#f59e0b' }}>{lang==='he'?d.forcedHeirship:d.forcedHeirship.replace('כן — בן/בת זוג + ילדים','Yes — Spouse + Children').replace('כן — 25-50%','Yes — 25-50%').replace('כן — 25-50% ','Yes — 25-50%').replace('לא','No')}</div>
              </div>
              <div className="rounded-xl p-4" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                <div className="text-xs font-medium mb-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'Trust מותר?':'Trust Allowed?'}</div>
                <div className="text-lg font-bold" style={{ color: d.trustAllowed ? '#10b981' : '#ef4444' }}>{d.trustAllowed ? '✅ כן' : '❌ לא'}</div>
              </div>
              <div className="rounded-xl p-4" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                <div className="text-xs font-medium mb-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'זמן צוואה / עיזבון':'Probate Duration'}</div>
                <div className="text-lg font-bold" style={{ color:'var(--text)' }}>{d.probate}</div>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.2)' }}>
              <div className="text-xs font-semibold mb-1" style={{ color:'var(--accent)' }}>💡 {lang==='he'?'המלצה מרכזית':'Key Recommendation'}</div>
              <p className="text-sm" style={{ color:'var(--text)' }}>{lang==='he'?d.tip_he:d.tip_en}</p>
            </div>

            <div className="rounded-xl p-4" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
              <div className="text-sm font-semibold mb-3" style={{ color:'var(--text)' }}>{lang==='he'?'שיקולים נוספים':'Additional Considerations'}</div>
              <ul className="space-y-2 text-sm" style={{ color:'var(--text-muted)' }}>
                <li>• {lang==='he'?'ישראל אינה מטילה מס ירושה — אך ייתכן מס רווח הון על מכירת נכסים עיזבון':'Israel does not impose inheritance tax — but capital gains tax may apply on sale of estate assets'}</li>
                <li>• {lang==='he'?'אמנות מס ישראל עם מדינות רבות אינן מכסות ירושה — בדוק לפי מדינה':'Israeli tax treaties with many countries do not cover inheritance — check per country'}</li>
                <li>• {lang==='he'?'נכסי קריפטו לרוב אינם מכוסים בצוואה סטנדרטית — צור "קריפטו וויל" נפרד':'Crypto assets are often not covered by a standard will — create a separate "crypto will"'}</li>
                {(profile.is_us_person) && <li style={{ color:'#f59e0b' }}>• {lang==='he'?'כאזרח/תושב ארה"ב: Federal Estate Tax חל על נכסים מעל $13.6M (2024). ייעוץ מומחה הכרחי.':'As a US person: Federal Estate Tax applies to assets over $13.6M (2024). Expert advice required.'}</li>}
              </ul>
            </div>
          </div>
        )}
        <p className="text-xs mt-4 text-center" style={{ color:'var(--text-muted)' }}>* {lang==='he'?'מידע כללי בלבד. ירושה בינלאומית מורכבת — חובה עורך דין.':'General information only. International inheritance is complex — lawyer required.'}</p>
      </div>
    </div>
  );
}

// ─── Portfolio Tax Optimizer ────────────────────────────────────────────────────
interface StockHolding { id: number; ticker: string; shares: number; costBasis: number; currentPrice: number; }

function PortfolioOptPanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [holdings, setHoldings] = useState<StockHolding[]>([
    { id:1, ticker:'AAPL', shares:100, costBasis:120, currentPrice:190 },
    { id:2, ticker:'MSFT', shares:50, costBasis:200, currentPrice:420 },
    { id:3, ticker:'TSLA', shares:30, costBasis:300, currentPrice:180 },
    { id:4, ticker:'NVDA', shares:20, costBasis:50, currentPrice:900 },
  ]);
  const [nextId, setNextId] = useState(5);
  const [residency, setResidency] = useState<'il'|'abroad'>('il');
  const [isUSPerson, setIsUSPerson] = useState(false);

  const IL_CGT = 0.25;
  const IL_CGT_HIGH = 0.30; // 30% for substantial shareholder
  const US_FEDERAL = 0.20;
  const US_NIIT = 0.038;

  const calcGain = (h: StockHolding) => (h.currentPrice - h.costBasis) * h.shares;
  const taxRate = residency === 'il' ? IL_CGT : IL_CGT * 0.5; // simplified; abroad = 0% on foreign gains

  const rows = holdings.map(h => {
    const gain = calcGain(h);
    const isLoss = gain < 0;
    const ilTax = isLoss ? 0 : gain * IL_CGT;
    const usTax = isUSPerson ? (isLoss ? 0 : gain * (US_FEDERAL + US_NIIT)) : 0;
    const net = (h.currentPrice * h.shares) - ilTax - usTax;
    return { ...h, gain, isLoss, ilTax, usTax, net };
  });

  const totalGain = rows.reduce((sum, r) => sum + r.gain, 0);
  const totalILTax = rows.reduce((sum, r) => sum + r.ilTax, 0);
  const totalUSTax = rows.reduce((sum, r) => sum + r.usTax, 0);
  const lossRows = rows.filter(r => r.isLoss);
  const gainRows = rows.filter(r => !r.isLoss).sort((a,b) => b.gain - a.gain);

  const addRow = () => { setHoldings(prev => [...prev, {id: nextId, ticker:'', shares:0, costBasis:0, currentPrice:0}]); setNextId(n=>n+1); };
  const removeRow = (id: number) => setHoldings(prev => prev.filter(h => h.id !== id));
  const updateRow = (id: number, field: keyof StockHolding, value: string) => {
    setHoldings(prev => prev.map(h => h.id === id ? { ...h, [field]: field==='ticker' ? value : parseFloat(value)||0 } : h));
  };

  return (
    <div style={{ flex:'1 1 0', overflowY:'auto', padding:'1.5rem', minHeight:0 }}>
      <div style={{ maxWidth:800, margin:'0 auto' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color:'var(--text)' }}>📈 {lang==='he'?'אופטימייזר תיק ניירות ערך':'Portfolio Tax Optimizer'}</h2>
            <p className="text-sm mt-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'חשב מס רווחי הון וסדר מכירה אופטימלי':'Calculate capital gains tax and optimal sell order'}</p>
          </div>
          <button onClick={onClose} style={{ color:'var(--text-muted)' }}><X size={18}/></button>
        </div>

        <div className="flex gap-4 mb-5 flex-wrap">
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
            <span className="text-sm font-medium" style={{ color:'var(--text-muted)' }}>{lang==='he'?'תושבות:':'Residency:'}</span>
            <button onClick={() => setResidency('il')} className="px-3 py-1 rounded-lg text-sm" style={{ background: residency==='il' ? 'var(--accent-glow)' : 'var(--surface-2)', color: residency==='il' ? 'var(--accent)' : 'var(--text-muted)', border: residency==='il' ? '1px solid var(--accent)' : '1px solid transparent' }}>{lang==='he'?'🇮🇱 ישראל':'🇮🇱 Israel'}</button>
            <button onClick={() => setResidency('abroad')} className="px-3 py-1 rounded-lg text-sm" style={{ background: residency==='abroad' ? 'var(--accent-glow)' : 'var(--surface-2)', color: residency==='abroad' ? 'var(--accent)' : 'var(--text-muted)', border: residency==='abroad' ? '1px solid var(--accent)' : '1px solid transparent' }}>{lang==='he'?'🌍 חוץ לארץ':'🌍 Abroad'}</button>
          </div>
          <label className="flex items-center gap-2 p-3 rounded-xl cursor-pointer" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
            <input type="checkbox" checked={isUSPerson} onChange={e => setIsUSPerson(e.target.checked)} style={{ accentColor:'var(--accent)' }}/>
            <span className="text-sm" style={{ color:'var(--text-muted)' }}>{lang==='he'?'אזרח / תושב ארה"ב (FATCA)':'US Person (FATCA)'}</span>
          </label>
        </div>

        <div className="overflow-x-auto rounded-xl mb-4" style={{ border:'1px solid var(--border)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
            <thead>
              <tr style={{ background:'var(--surface-2)' }}>
                {[lang==='he'?'נייר':'Ticker', lang==='he'?'מניות':'Shares', lang==='he'?'עלות':'Cost', lang==='he'?'שווי עכשיו':'Current', lang==='he'?'רווח/הפסד':'Gain/Loss', lang==='he'?'מס ישראל':'IL Tax', isUSPerson&&(lang==='he'?'מס ארה"ב':'US Tax'), lang==='he'?'נטו':'Net', ''].filter(Boolean).map((h,i) => (
                  <th key={i} className="px-3 py-2.5 text-xs font-semibold text-center" style={{ color:'var(--text-muted)', borderBottom:'1px solid var(--border)', borderLeft: i>0 ? '1px solid var(--border)' : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ background: i%2===0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                  <td className="px-2 py-1.5" style={{ borderBottom:'1px solid var(--border)' }}>
                    <input value={r.ticker} onChange={e => updateRow(r.id, 'ticker', e.target.value)} className="w-20 px-2 py-1 rounded text-sm text-center font-mono" style={{ background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--text)' }} placeholder="AAPL"/>
                  </td>
                  {(['shares','costBasis','currentPrice'] as (keyof StockHolding)[]).map((field, fi) => (
                    <td key={field} className="px-2 py-1.5" style={{ borderBottom:'1px solid var(--border)', borderLeft:'1px solid var(--border)' }}>
                      <input type="number" value={r[field] as number || ''} onChange={e => updateRow(r.id, field, e.target.value)} className="w-24 px-2 py-1 rounded text-sm text-center" style={{ background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--text)' }}/>
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-sm text-center font-medium" style={{ color: r.isLoss ? '#10b981' : '#f59e0b', borderBottom:'1px solid var(--border)', borderLeft:'1px solid var(--border)' }}>{r.isLoss ? '📉' : '📈'} ${Math.abs(r.gain).toFixed(0)}</td>
                  <td className="px-3 py-1.5 text-sm text-center" style={{ color: r.isLoss ? '#10b981' : '#ef4444', borderBottom:'1px solid var(--border)', borderLeft:'1px solid var(--border)' }}>{r.isLoss ? '—' : `$${r.ilTax.toFixed(0)}`}</td>
                  {isUSPerson && <td className="px-3 py-1.5 text-sm text-center" style={{ color: r.isLoss ? '#10b981' : '#ef4444', borderBottom:'1px solid var(--border)', borderLeft:'1px solid var(--border)' }}>{r.isLoss ? '—' : `$${r.usTax.toFixed(0)}`}</td>}
                  <td className="px-3 py-1.5 text-sm text-center font-medium" style={{ color:'var(--text)', borderBottom:'1px solid var(--border)', borderLeft:'1px solid var(--border)' }}>${r.net.toFixed(0)}</td>
                  <td className="px-2 py-1.5 text-center" style={{ borderBottom:'1px solid var(--border)', borderLeft:'1px solid var(--border)' }}>
                    <button onClick={() => removeRow(r.id)} style={{ color:'var(--text-muted)' }}><X size={12}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={addRow} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm mb-5" style={{ background:'var(--surface-2)', color:'var(--text-muted)', border:'1px solid var(--border)' }}>
          <Plus size={14}/>{lang==='he'?'הוסף נייר':'Add Holding'}
        </button>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="rounded-xl p-4 text-center" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
            <div className="text-xs mb-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'סך רווח/הפסד':'Total Gain/Loss'}</div>
            <div className="text-xl font-bold" style={{ color: totalGain >= 0 ? '#f59e0b' : '#10b981' }}>${Math.abs(totalGain).toFixed(0)}</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
            <div className="text-xs mb-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'סך מס ישראל':'Total IL Tax'}</div>
            <div className="text-xl font-bold" style={{ color:'#ef4444' }}>${totalILTax.toFixed(0)}</div>
          </div>
          {isUSPerson && (
            <div className="rounded-xl p-4 text-center" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
              <div className="text-xs mb-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'סך מס ארה"ב':'Total US Tax'}</div>
              <div className="text-xl font-bold" style={{ color:'#ef4444' }}>${totalUSTax.toFixed(0)}</div>
            </div>
          )}
        </div>

        {lossRows.length > 0 && gainRows.length > 0 && (
          <div className="rounded-xl p-4 mb-4" style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)' }}>
            <div className="text-sm font-semibold mb-2" style={{ color:'#10b981' }}>💡 {lang==='he'?'אופטימיזציה: Tax Loss Harvesting':'Optimization: Tax Loss Harvesting'}</div>
            <p className="text-sm" style={{ color:'var(--text)' }}>
              {lang==='he'
                ? `מכור ${lossRows.map(r=>r.ticker||'?').join(', ')} להפסד מוכר של $${Math.abs(lossRows.reduce((s,r)=>s+r.gain,0)).toFixed(0)}, שיקזז את הרווחים של ${gainRows.slice(0,2).map(r=>r.ticker||'?').join(', ')}.`
                : `Sell ${lossRows.map(r=>r.ticker||'?').join(', ')} to realize a loss of $${Math.abs(lossRows.reduce((s,r)=>s+r.gain,0)).toFixed(0)}, offsetting gains from ${gainRows.slice(0,2).map(r=>r.ticker||'?').join(', ')}.`}
            </p>
          </div>
        )}

        <p className="text-xs text-center" style={{ color:'var(--text-muted)' }}>* {lang==='he'?'חישוב פשטני לצורך הדמיה. פנה לרו"ח לחישוב מדויק.':'Simplified calculation for illustration. Consult a CPA for accurate figures.'}</p>
      </div>
    </div>
  );
}

// ─── FX / Debt Calculator ───────────────────────────────────────────────────────
function FxCalcPanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [loanAmountILS, setLoanAmountILS] = useState(1000000);
  const [interestRate, setInterestRate] = useState(5.5);
  const [remainingYears, setRemainingYears] = useState(20);
  const [currentIncomeCurrency, setCurrentIncomeCurrency] = useState<'ILS'|'USD'|'EUR'>('ILS');
  const [targetIncomeCurrency, setTargetIncomeCurrency] = useState<'USD'|'EUR'|'GBP'>('USD');
  const [monthlyIncome, setMonthlyIncome] = useState(30000);
  const [fxRateTarget, setFxRateTarget] = useState(3.6); // ILS per USD

  // Simplified FX rates (ILS per unit)
  const FX: Record<string, number> = { ILS:1, USD:3.65, EUR:3.95, GBP:4.6 };

  const monthlyPaymentILS = () => {
    const r = interestRate / 100 / 12;
    const n = remainingYears * 12;
    if (r === 0) return loanAmountILS / n;
    return loanAmountILS * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1);
  };

  const mp = monthlyPaymentILS();
  const incomeInILS = monthlyIncome * (currentIncomeCurrency === 'ILS' ? 1 : FX[currentIncomeCurrency]);
  const targetIncomeInILS = monthlyIncome * FX[targetIncomeCurrency];

  const currentDebtRatio = mp / incomeInILS * 100;
  const targetDebtRatio = mp / targetIncomeInILS * 100;

  const breakEvenRate = mp / monthlyIncome; // ILS per target currency unit

  const fxRiskPercent = Math.abs((fxRateTarget - FX[targetIncomeCurrency]) / FX[targetIncomeCurrency] * 100);
  const scenarioPayment = mp / fxRateTarget;

  return (
    <div style={{ flex:'1 1 0', overflowY:'auto', padding:'1.5rem', minHeight:0 }}>
      <div style={{ maxWidth:700, margin:'0 auto' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color:'var(--text)' }}>💱 {lang==='he'?'מחשבון חוב / FX':'Debt / FX Calculator'}</h2>
            <p className="text-sm mt-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'בדוק סיכון FX כשהכנסות משנות מטבע':'Check FX risk when your income currency changes'}</p>
          </div>
          <button onClick={onClose} style={{ color:'var(--text-muted)' }}><X size={18}/></button>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6">
          <div className="rounded-xl p-5" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color:'var(--text)' }}>🏠 {lang==='he'?'פרטי הלוואה (ILS)':'Loan Details (ILS)'}</h3>
            <div className="grid grid-cols-3 gap-3">
              {([
                [lang==='he'?'יתרת הלוואה (₪)':'Loan Balance (₪)', loanAmountILS, setLoanAmountILS, 100000, 10000000, 100000],
                [lang==='he'?'ריבית שנתית (%)':'Annual Rate (%)', interestRate, setInterestRate, 1, 15, 0.1],
                [lang==='he'?'שנים נותרות':'Remaining Years', remainingYears, setRemainingYears, 1, 30, 1],
              ] as [string, number, (v:number)=>void, number, number, number][]).map(([label, val, setter, min, max, step]) => (
                <div key={label}>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color:'var(--text-muted)' }}>{label}</label>
                  <input type="number" value={val} min={min} max={max} step={step} onChange={e => setter(parseFloat(e.target.value)||0)}
                    className="w-full px-3 py-2 rounded-lg text-sm" style={{ background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--text)' }}/>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-5" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color:'var(--text)' }}>💼 {lang==='he'?'הכנסה חודשית':'Monthly Income'}</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color:'var(--text-muted)' }}>{lang==='he'?'הכנסה עכשיו':'Current Income'}</label>
                <input type="number" value={monthlyIncome} onChange={e => setMonthlyIncome(parseFloat(e.target.value)||0)}
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--text)' }}/>
              </div>
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color:'var(--text-muted)' }}>{lang==='he'?'מטבע עכשיו':'Current Currency'}</label>
                <select value={currentIncomeCurrency} onChange={e => setCurrentIncomeCurrency(e.target.value as 'ILS'|'USD'|'EUR')}
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--text)' }}>
                  <option value="ILS">🇮🇱 ILS</option><option value="USD">🇺🇸 USD</option><option value="EUR">🇪🇺 EUR</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color:'var(--text-muted)' }}>{lang==='he'?'מטבע לאחר מעבר':'Post-Move Currency'}</label>
                <select value={targetIncomeCurrency} onChange={e => setTargetIncomeCurrency(e.target.value as 'USD'|'EUR'|'GBP')}
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--text)' }}>
                  <option value="USD">🇺🇸 USD</option><option value="EUR">🇪🇺 EUR</option><option value="GBP">🇬🇧 GBP</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="rounded-xl p-4 text-center" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
            <div className="text-xs mb-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'תשלום חודשי (₪)':'Monthly Payment (₪)'}</div>
            <div className="text-2xl font-bold" style={{ color:'var(--text)' }}>₪{mp.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
            <div className="text-xs mb-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'יחס חוב-הכנסה (כיום)':'Debt-to-Income (Current)'}</div>
            <div className="text-2xl font-bold" style={{ color: currentDebtRatio > 40 ? '#ef4444' : '#10b981' }}>{currentDebtRatio.toFixed(1)}%</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
            <div className="text-xs mb-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?`יחס חוב-הכנסה (${targetIncomeCurrency})`:`DTI in ${targetIncomeCurrency}`}</div>
            <div className="text-2xl font-bold" style={{ color: targetDebtRatio > 40 ? '#ef4444' : '#10b981' }}>{targetDebtRatio.toFixed(1)}%</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
            <div className="text-xs mb-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?`שע"ח שיוון (₪ ל-${targetIncomeCurrency})`:`Break-Even FX (₪ per ${targetIncomeCurrency})`}</div>
            <div className="text-2xl font-bold" style={{ color:'var(--accent)' }}>{breakEvenRate.toFixed(2)}</div>
          </div>
        </div>

        <div className="rounded-xl p-4 mb-4" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color:'var(--text)' }}>📉 {lang==='he'?'תרחיש FX':'FX Scenario'}</h3>
          <div className="flex items-center gap-3 mb-3">
            <label className="text-xs" style={{ color:'var(--text-muted)' }}>{lang==='he'?`שע"ח עתידי (₪ ל-${targetIncomeCurrency}):`:` Future FX Rate (₪ per ${targetIncomeCurrency}):`}</label>
            <input type="number" value={fxRateTarget} step={0.05} onChange={e => setFxRateTarget(parseFloat(e.target.value)||1)}
              className="px-3 py-1.5 rounded-lg text-sm w-24" style={{ background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--text)' }}/>
            <span className="text-xs" style={{ color: fxRiskPercent > 10 ? '#ef4444' : '#f59e0b' }}>{fxRateTarget < FX[targetIncomeCurrency] ? '📉' : '📈'} {fxRiskPercent.toFixed(1)}% {lang==='he'?'שינוי':'change'}</span>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs" style={{ color:'var(--text-muted)' }}>{lang==='he'?'תשלום בחו"ל (תרחיש)':'Payment abroad (scenario)'}</div>
              <div className="text-lg font-bold" style={{ color: scenarioPayment > monthlyIncome*0.4 ? '#ef4444' : '#10b981' }}>{targetIncomeCurrency} {scenarioPayment.toFixed(0)}</div>
            </div>
            <div className="text-xs flex-1" style={{ color:'var(--text-muted)' }}>
              {scenarioPayment > monthlyIncome*0.4
                ? (lang==='he'?'⚠️ יחס חוב גבוה — שקול גידור FX או מחזור הלוואה לפני עזיבה':'⚠️ High debt ratio — consider FX hedging or loan refinancing before departure')
                : (lang==='he'?'✅ יחס חוב סביר גם בתרחיש זה':'✅ Reasonable debt ratio in this scenario')}
            </div>
          </div>
        </div>
        <p className="text-xs text-center" style={{ color:'var(--text-muted)' }}>* {lang==='he'?'שערי חליפין משוערים בלבד. בדוק שערים עדכניים לפני קבלת החלטות.':'Approximate exchange rates only. Check current rates before making decisions.'}</p>
      </div>
    </div>
  );
}

// ─── Professional Directory ─────────────────────────────────────────────────────
const PRO_DIRECTORY = [
  { country_he:'ישראל', country_en:'Israel', flag:'🇮🇱', specialists:[
    { name:'Nir Weisman & Co.', role_he:'רו"ח בינלאומי', role_en:'International CPA', specialty_he:'מיסוי יציאה ו-FATCA', specialty_en:'Exit tax & FATCA', contact:'www.nw-tax.co.il', tier:'top' },
    { name:'Dr. Alon Kaplan', role_he:'עו"ד בינלאומי', role_en:'International Lawyer', specialty_he:'trusts ומבנים בינלאומיים', specialty_en:'Trusts & international structures', contact:'www.kaplanleker.com', tier:'top' },
    { name:'Tamir Fishman CPA', role_he:'רו"ח', role_en:'CPA', specialty_he:'ניתוק תושבות ורילוקיישן', specialty_en:'Tax residency severance & relocation', contact:'www.tamir-fishman.co.il', tier:'recommended' },
  ]},
  { country_he:'פורטוגל', country_en:'Portugal', flag:'🇵🇹', specialists:[
    { name:'Blevins Franks', role_he:'יועץ מס', role_en:'Tax Advisor', specialty_he:'NHR ומיסוי עולים', specialty_en:'NHR & expat taxation', contact:'www.blevinsfranks.com', tier:'top' },
    { name:'Lexidy Law Boutique', role_he:'עו"ד', role_en:'Lawyer', specialty_he:'ויזות וגרין קארד פורטוגל', specialty_en:'Portuguese visas & D7/D8', contact:'www.lexidy.com', tier:'recommended' },
  ]},
  { country_he:'איחוד האמירויות', country_en:'UAE', flag:'🇦🇪', specialists:[
    { name:'Jumeira Tax Advisors', role_he:'יועץ מס', role_en:'Tax Advisor', specialty_he:'מבנה חברה ב-Dubai + DIFC', specialty_en:'Dubai company structure + DIFC', contact:'www.jumeiratax.com', tier:'recommended' },
    { name:'Al Tamimi & Company', role_he:'עו"ד', role_en:'Lawyer', specialty_he:'ויזות בכירים ורישוי עסקים', specialty_en:'Executive visas & business licensing', contact:'www.tamimi.com', tier:'top' },
  ]},
  { country_he:'קפריסין', country_en:'Cyprus', flag:'🇨🇾', specialists:[
    { name:'KPMG Cyprus', role_he:'רו"ח', role_en:'CPA', specialty_he:'non-dom status ומיסוי חברות', specialty_en:'Non-dom status & corporate tax', contact:'www.kpmg.com.cy', tier:'top' },
    { name:'Chelco VAT', role_he:'יועץ מס', role_en:'Tax Advisor', specialty_he:'מיסוי קריפטו ב-VAT', specialty_en:'Crypto VAT advisory', contact:'www.chelco.com', tier:'recommended' },
  ]},
  { country_he:'גאורגיה', country_en:'Georgia', flag:'🇬🇪', specialists:[
    { name:'Expat CPA Georgia', role_he:'רו"ח', role_en:'CPA', specialty_he:'ויזת VZS ו-Virtual Zone', specialty_en:'VZS visa & Virtual Zone status', contact:'www.expatcpageorgia.com', tier:'recommended' },
  ]},
  { country_he:'גלובלי', country_en:'Global', flag:'🌍', specialists:[
    { name:'Greenback Tax Services', role_he:'רו"ח אמריקאי', role_en:'US CPA', specialty_he:'FATCA, FBAR, Form 1040 לעולים', specialty_en:'FATCA, FBAR, Form 1040 for expats', contact:'www.greenbacktaxservices.com', tier:'top' },
    { name:'Nomad Capitalist Advisory', role_he:'יועץ גלובלי', role_en:'Global Advisor', specialty_he:'אסטרטגיית דרכון שני ואזרחות', specialty_en:'Second passport & citizenship strategy', contact:'www.nomadcapitalist.com', tier:'recommended' },
  ]},
];

function ProDirectoryPanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterTier, setFilterTier] = useState<string>('all');

  const countries = ['all', ...PRO_DIRECTORY.map(g => g.country_en)];
  const filtered = PRO_DIRECTORY.filter(g => filterCountry === 'all' || g.country_en === filterCountry)
    .map(g => ({ ...g, specialists: g.specialists.filter(s => filterTier === 'all' || s.tier === filterTier) }))
    .filter(g => g.specialists.length > 0);

  return (
    <div style={{ flex:'1 1 0', overflowY:'auto', padding:'1.5rem', minHeight:0 }}>
      <div style={{ maxWidth:750, margin:'0 auto' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color:'var(--text)' }}>📋 {lang==='he'?'מומחים מומלצים':'Recommended Professionals'}</h2>
            <p className="text-sm mt-1" style={{ color:'var(--text-muted)' }}>{lang==='he'?'רשימת מומחים לתכנון מיסוי ורילוקיישן':'List of professionals for tax planning & relocation'}</p>
          </div>
          <button onClick={onClose} style={{ color:'var(--text-muted)' }}><X size={18}/></button>
        </div>

        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="flex gap-2 items-center">
            <span className="text-xs font-medium" style={{ color:'var(--text-muted)' }}>{lang==='he'?'מדינה:':'Country:'}</span>
            <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm" style={{ background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--text)' }}>
              <option value="all">{lang==='he'?'הכל':'All'}</option>
              {PRO_DIRECTORY.map(g => <option key={g.country_en} value={g.country_en}>{g.flag} {lang==='he'?g.country_he:g.country_en}</option>)}
            </select>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs font-medium" style={{ color:'var(--text-muted)' }}>{lang==='he'?'רמה:':'Tier:'}</span>
            <div className="flex gap-1">
              {(['all','top','recommended'] as string[]).map(t => (
                <button key={t} onClick={() => setFilterTier(t)}
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ background: filterTier===t ? 'var(--accent-glow)' : 'var(--surface-2)', border: filterTier===t ? '1px solid var(--accent)' : '1px solid var(--border)', color: filterTier===t ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {t === 'all' ? (lang==='he'?'הכל':'All') : t === 'top' ? '⭐ Top' : (lang==='he'?'מומלץ':'Recommended')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {filtered.map(group => (
            <div key={group.country_en}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color:'var(--text-muted)' }}>
                <span>{group.flag}</span>
                <span>{lang==='he'?group.country_he:group.country_en}</span>
              </h3>
              <div className="space-y-2">
                {group.specialists.map((s, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                    <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background:'var(--surface-2)' }}>
                      {s.role_en.includes('CPA') ? '📊' : s.role_en.includes('Lawyer') ? '⚖️' : '💼'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color:'var(--text)' }}>{s.name}</span>
                        {s.tier === 'top' && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background:'rgba(245,158,11,0.12)', color:'#f59e0b' }}>⭐ Top</span>}
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background:'var(--surface-2)', color:'var(--text-muted)', border:'1px solid var(--border)' }}>{lang==='he'?s.role_he:s.role_en}</span>
                      </div>
                      <p className="text-xs mt-1" style={{ color:'var(--text-muted)' }}>🎯 {lang==='he'?s.specialty_he:s.specialty_en}</p>
                      <p className="text-xs mt-0.5" style={{ color:'var(--accent)' }}>🔗 {s.contact}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs mt-5 text-center" style={{ color:'var(--text-muted)' }}>* {lang==='he'?'רשימה זו אינה המלצה מקצועית רשמית. בצע בדיקת נאותות עצמאית.':'This list is not an official professional endorsement. Conduct independent due diligence.'}</p>
      </div>
    </div>
  );
}

// ─── Crypto Tax Calculator ────────────────────────────────────────────────────
interface CryptoTx { id: number; date: string; type: 'buy'|'sell'|'staking'; coin: string; qty: number; price: number; }

function CryptoTaxPanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [method, setMethod] = useState<'fifo'|'avg'>('fifo');
  const [txs, setTxs] = useState<CryptoTx[]>([
    { id:1, date:'2023-01-15', type:'buy',  coin:'BTC', qty:0.5,  price:20000 },
    { id:2, date:'2024-03-10', type:'buy',  coin:'BTC', qty:0.3,  price:35000 },
    { id:3, date:'2024-11-01', type:'sell', coin:'BTC', qty:0.4,  price:65000 },
    { id:4, date:'2024-12-01', type:'staking', coin:'ETH', qty:0.2, price:3200 },
  ]);
  const [nextId, setNextId] = useState(5);
  const ISRAEL_CGT = 0.25;
  const ISRAEL_STAKING = 0.25;

  const addTx = () => {
    setTxs(p => [...p, { id: nextId, date: new Date().toISOString().slice(0,10), type:'buy', coin:'BTC', qty:0, price:0 }]);
    setNextId(n => n+1);
  };
  const updateTx = (id: number, field: keyof CryptoTx, val: string|number) =>
    setTxs(p => p.map(t => t.id===id ? {...t, [field]: val} : t));
  const removeTx = (id: number) => setTxs(p => p.filter(t => t.id!==id));

  const results = useMemo(() => {
    const coins: Record<string, {lots: {qty:number; price:number}[]; totalQty:number; totalCost:number}> = {};
    const realized: {coin:string; qty:number; costBasis:number; proceeds:number; gain:number; type:'sell'|'staking'}[] = [];

    const sorted = [...txs].sort((a,b) => a.date.localeCompare(b.date));
    for (const tx of sorted) {
      if (!coins[tx.coin]) coins[tx.coin] = { lots:[], totalQty:0, totalCost:0 };
      const c = coins[tx.coin];
      if (tx.type === 'buy') {
        c.lots.push({ qty: tx.qty, price: tx.price });
        c.totalQty += tx.qty;
        c.totalCost += tx.qty * tx.price;
      } else if (tx.type === 'sell' || tx.type === 'staking') {
        const proceeds = tx.qty * tx.price;
        let costBasis = 0;
        let remaining = tx.qty;
        if (method === 'fifo') {
          while (remaining > 0 && c.lots.length > 0) {
            const lot = c.lots[0];
            const used = Math.min(lot.qty, remaining);
            costBasis += used * lot.price;
            lot.qty -= used;
            remaining -= used;
            if (lot.qty <= 0) c.lots.shift();
          }
        } else {
          const avgPrice = c.totalQty > 0 ? c.totalCost / c.totalQty : 0;
          costBasis = tx.qty * avgPrice;
          c.totalQty = Math.max(0, c.totalQty - tx.qty);
          c.totalCost = c.totalQty * avgPrice;
        }
        realized.push({ coin: tx.coin, qty: tx.qty, costBasis, proceeds, gain: proceeds - costBasis, type: tx.type as 'sell'|'staking' });
      }
    }
    const totalGain = realized.reduce((s,r) => s + (r.gain > 0 ? r.gain : 0), 0);
    const totalLoss = realized.reduce((s,r) => s + (r.gain < 0 ? r.gain : 0), 0);
    const netGain = totalGain + totalLoss;
    const taxOwed = Math.max(0, netGain) * ISRAEL_CGT;
    return { realized, totalGain, totalLoss, netGain, taxOwed };
  }, [txs, method]);

  const fmt = (n: number) => `$${n.toLocaleString('en', {maximumFractionDigits:0})}`;
  const fmtN = (n: number) => n >= 0 ? `+${fmt(n)}` : fmt(n);

  return (
    <div className="flex-shrink-0 overflow-y-auto" style={{ maxHeight:'75vh', background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'1.5rem' }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <span style={{fontSize:'1.1rem'}}>₿</span>
          {lang==='he'?'מחשבון מס קריפטו — ישראל 25%':'Crypto Tax Calculator — Israel 25%'}
        </h2>
        <button onClick={onClose} style={{color:'var(--text-muted)'}}><X size={18}/></button>
      </div>

      {/* Method */}
      <div className="flex gap-3 mb-4 items-center">
        <span className="text-sm" style={{color:'var(--text-muted)'}}>{lang==='he'?'שיטת חישוב:':'Method:'}</span>
        {(['fifo','avg'] as const).map(m => (
          <button key={m} onClick={()=>setMethod(m)}
            className="px-3 py-1 rounded text-sm"
            style={{ background: method===m?'var(--accent)':'var(--surface-2)', color: method===m?'#fff':'var(--text-muted)', border:'1px solid var(--border)' }}>
            {m==='fifo'?'FIFO':(lang==='he'?'ממוצע':'Avg Cost')}
          </button>
        ))}
        <span className="text-xs ml-auto" style={{color:'var(--text-muted)'}}>{lang==='he'?'* בישראל מקובל FIFO':'* FIFO is standard in Israel'}</span>
      </div>

      {/* Transaction table */}
      <div className="overflow-x-auto mb-3">
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem'}}>
          <thead>
            <tr style={{background:'var(--surface-2)'}}>
              {[lang==='he'?'תאריך':'Date', lang==='he'?'סוג':'Type', lang==='he'?'מטבע':'Coin',
                lang==='he'?'כמות':'Qty', lang==='he'?'מחיר $':'Price $', ''].map(h => (
                <th key={h} style={{padding:'6px 8px',textAlign:'right',color:'var(--text-muted)',fontWeight:600,borderBottom:'1px solid var(--border)'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {txs.map(tx => (
              <tr key={tx.id} style={{borderBottom:'1px solid var(--border)'}}>
                <td style={{padding:'4px 6px'}}><input type="date" value={tx.date} onChange={e=>updateTx(tx.id,'date',e.target.value)} style={{background:'var(--surface-2)',border:'none',color:'var(--text)',fontSize:'0.78rem',padding:'2px 4px',borderRadius:4,width:110}}/></td>
                <td style={{padding:'4px 6px'}}>
                  <select value={tx.type} onChange={e=>updateTx(tx.id,'type',e.target.value)} style={{background:'var(--surface-2)',border:'none',color: tx.type==='buy'?'#10b981':tx.type==='sell'?'#ef4444':'#f59e0b',fontSize:'0.78rem',padding:'2px 4px',borderRadius:4}}>
                    <option value="buy">{lang==='he'?'קנייה':'Buy'}</option>
                    <option value="sell">{lang==='he'?'מכירה':'Sell'}</option>
                    <option value="staking">Staking</option>
                  </select>
                </td>
                <td style={{padding:'4px 6px'}}><input value={tx.coin} onChange={e=>updateTx(tx.id,'coin',e.target.value.toUpperCase())} style={{background:'var(--surface-2)',border:'none',color:'var(--text)',fontSize:'0.78rem',padding:'2px 4px',borderRadius:4,width:60}} maxLength={6}/></td>
                <td style={{padding:'4px 6px'}}><input type="number" value={tx.qty||''} onChange={e=>updateTx(tx.id,'qty',parseFloat(e.target.value)||0)} style={{background:'var(--surface-2)',border:'none',color:'var(--text)',fontSize:'0.78rem',padding:'2px 4px',borderRadius:4,width:80}}/></td>
                <td style={{padding:'4px 6px'}}><input type="number" value={tx.price||''} onChange={e=>updateTx(tx.id,'price',parseFloat(e.target.value)||0)} style={{background:'var(--surface-2)',border:'none',color:'var(--text)',fontSize:'0.78rem',padding:'2px 4px',borderRadius:4,width:90}}/></td>
                <td style={{padding:'4px 6px'}}><button onClick={()=>removeTx(tx.id)} style={{color:'#ef4444',opacity:0.7}}><X size={12}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addTx} className="flex items-center gap-1 text-sm px-3 py-1 rounded mb-4" style={{background:'var(--surface-2)',color:'var(--accent)',border:'1px solid var(--accent)'}}><Plus size={13}/>{lang==='he'?'הוסף עסקה':'Add Transaction'}</button>

      {/* Results */}
      {results.realized.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="grid gap-2" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
            {[
              { label: lang==='he'?'רווח גולמי':'Gross Gain', val: results.totalGain, color:'#10b981' },
              { label: lang==='he'?'הפסד':'Losses', val: results.totalLoss, color:'#ef4444' },
              { label: lang==='he'?'רווח נטו':'Net Gain', val: results.netGain, color: results.netGain>=0?'#10b981':'#ef4444' },
              { label: lang==='he'?'מס לתשלום (25%)':'Tax Owed (25%)', val: results.taxOwed, color:'var(--accent)' },
            ].map(({label,val,color}) => (
              <div key={label} style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:8,padding:'0.75rem',textAlign:'center'}}>
                <div className="text-xs mb-1" style={{color:'var(--text-muted)'}}>{label}</div>
                <div className="font-bold text-sm" style={{color}}>{fmt(Math.abs(val))}</div>
              </div>
            ))}
          </div>
          <div style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:8,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.78rem'}}>
              <thead><tr style={{background:'var(--surface)'}}>
                {[lang==='he'?'מטבע':'Coin',lang==='he'?'כמות':'Qty',lang==='he'?'עלות':'Cost',lang==='he'?'תמורה':'Proceeds',lang==='he'?'רווח/הפסד':'Gain/Loss'].map(h=>(
                  <th key={h} style={{padding:'6px 8px',textAlign:'right',color:'var(--text-muted)',borderBottom:'1px solid var(--border)'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {results.realized.map((r,i) => (
                  <tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                    <td style={{padding:'5px 8px',color:'var(--accent)',fontWeight:600}}>{r.coin} {r.type==='staking'?'(staking)':''}</td>
                    <td style={{padding:'5px 8px'}}>{r.qty.toFixed(4)}</td>
                    <td style={{padding:'5px 8px'}}>{fmt(r.costBasis)}</td>
                    <td style={{padding:'5px 8px'}}>{fmt(r.proceeds)}</td>
                    <td style={{padding:'5px 8px',color:r.gain>=0?'#10b981':'#ef4444',fontWeight:600}}>{fmtN(r.gain)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs" style={{color:'var(--text-muted)'}}>{lang==='he'?'* מס 25% חל על רווחי הון וסטייקינג. קיזוז הפסדים אפשרי מול רווחים באותה שנת מס.':'* 25% tax applies to capital gains and staking income. Losses may offset gains in the same tax year.'}</p>
        </div>
      )}
    </div>
  );
}

// ─── CRS / FATCA Checker ──────────────────────────────────────────────────────
const CRS_DATA: Record<string, { flag:string; name_he:string; name_en:string; crs:boolean; reportToIsrael:boolean; fatca:boolean; threshold_he:string; threshold_en:string; note_he:string; note_en:string; }> = {
  UAE:         { flag:'🇦🇪', name_he:'איחוד האמירויות', name_en:'UAE',         crs:true,  reportToIsrael:true,  fatca:true,  threshold_he:'חשבון > $250K', threshold_en:'Account > $250K', note_he:'CRS פעיל — ממסר מידע לישראל מ-2018', note_en:'CRS active — reports to Israel since 2018' },
  Brazil:      { flag:'🇧🇷', name_he:'ברזיל',          name_en:'Brazil',       crs:false, reportToIsrael:false, fatca:false, threshold_he:'ללא CRS', threshold_en:'No CRS', note_he:'ברזיל אינה חברה ב-CRS ואינה חתומה על הסכם FATCA — מידע לא מועבר לישראל', note_en:'Brazil is not in CRS and has no FATCA IGA — info is NOT shared with Israel' },
  Cyprus:      { flag:'🇨🇾', name_he:'קפריסין',        name_en:'Cyprus',       crs:true,  reportToIsrael:true,  fatca:true,  threshold_he:'חשבון > $50K', threshold_en:'Account > $50K', note_he:'CRS + FATCA פעיל — מדווח לישראל', note_en:'CRS + FATCA active — reports to Israel' },
  Portugal:    { flag:'🇵🇹', name_he:'פורטוגל',        name_en:'Portugal',     crs:true,  reportToIsrael:true,  fatca:true,  threshold_he:'חשבון > $50K', threshold_en:'Account > $50K', note_he:'CRS + FATCA. ה-NHR אינו חוסם דיווח CRS', note_en:'CRS + FATCA. NHR status does not block CRS reporting' },
  Georgia:     { flag:'🇬🇪', name_he:'גאורגיה',        name_en:'Georgia',      crs:true,  reportToIsrael:true,  fatca:false, threshold_he:'חשבון > $50K', threshold_en:'Account > $50K', note_he:'CRS פעיל אך אין הסכם FATCA מלא', note_en:'CRS active but no full FATCA IGA' },
  Panama:      { flag:'🇵🇦', name_he:'פנמה',           name_en:'Panama',       crs:true,  reportToIsrael:true,  fatca:false, threshold_he:'חשבון > $250K', threshold_en:'Account > $250K', note_he:'CRS פעיל מ-2018 — לא מקלט מס עוד', note_en:'CRS active since 2018 — no longer a tax haven' },
  Singapore:   { flag:'🇸🇬', name_he:'סינגפור',        name_en:'Singapore',    crs:true,  reportToIsrael:true,  fatca:true,  threshold_he:'חשבון > $50K', threshold_en:'Account > $50K', note_he:'CRS + FATCA מחמירים מאוד — בנקים קפדנים בזיהוי', note_en:'Strict CRS + FATCA — banks are rigorous in classification' },
  Thailand:    { flag:'🇹🇭', name_he:'תאילנד',         name_en:'Thailand',     crs:true,  reportToIsrael:true,  fatca:false, threshold_he:'חשבון > $250K', threshold_en:'Account > $250K', note_he:'CRS פעיל אך אכיפה מוגבלת בחשבונות קטנים', note_en:'CRS active but limited enforcement on small accounts' },
  Serbia:      { flag:'🇷🇸', name_he:'סרביה',          name_en:'Serbia',       crs:false, reportToIsrael:false, fatca:false, threshold_he:'ללא CRS', threshold_en:'No CRS', note_he:'סרביה אינה חברה ב-CRS — מידע לא מועבר אוטומטית', note_en:'Serbia not in CRS — information is not shared automatically' },
  Montenegro:  { flag:'🇲🇪', name_he:'מונטנגרו',       name_en:'Montenegro',   crs:false, reportToIsrael:false, fatca:false, threshold_he:'ללא CRS', threshold_en:'No CRS', note_he:'מונטנגרו אינה חברה ב-CRS — פרטיות גבוהה יותר', note_en:'Montenegro not in CRS — higher privacy' },
  Malta:       { flag:'🇲🇹', name_he:'מלטה',           name_en:'Malta',        crs:true,  reportToIsrael:true,  fatca:true,  threshold_he:'חשבון > $50K', threshold_en:'Account > $50K', note_he:'CRS + FATCA מלא כחלק מה-EU', note_en:'Full CRS + FATCA as EU member' },
  Hungary:     { flag:'🇭🇺', name_he:'הונגריה',        name_en:'Hungary',      crs:true,  reportToIsrael:true,  fatca:true,  threshold_he:'חשבון > $50K', threshold_en:'Account > $50K', note_he:'CRS + FATCA מלא כחלק מה-EU', note_en:'Full CRS + FATCA as EU member' },
  Mexico:      { flag:'🇲🇽', name_he:'מקסיקו',         name_en:'Mexico',       crs:true,  reportToIsrael:true,  fatca:true,  threshold_he:'חשבון > $50K', threshold_en:'Account > $50K', note_he:'CRS + FATCA פעיל — בנקים מסחריים מדווחים', note_en:'CRS + FATCA active — commercial banks report' },
  Colombia:    { flag:'🇨🇴', name_he:'קולומביה',       name_en:'Colombia',     crs:true,  reportToIsrael:false, fatca:false, threshold_he:'חשבון > $250K', threshold_en:'Account > $250K', note_he:'CRS חבר אך לא חתם על הסכם עם ישראל ספציפית', note_en:'CRS member but no specific agreement with Israel' },
  Netherlands: { flag:'🇳🇱', name_he:'הולנד',          name_en:'Netherlands',  crs:true,  reportToIsrael:true,  fatca:true,  threshold_he:'חשבון > $50K', threshold_en:'Account > $50K', note_he:'CRS + FATCA מחמיר מאוד', note_en:'Very strict CRS + FATCA' },
  Estonia:     { flag:'🇪🇪', name_he:'אסטוניה',        name_en:'Estonia',      crs:true,  reportToIsrael:true,  fatca:true,  threshold_he:'חשבון > $50K', threshold_en:'Account > $50K', note_he:'CRS + FATCA כחלק מה-EU. e-Residency אינה מקנה תושבות מס', note_en:'Full CRS + FATCA as EU member. e-Residency does NOT grant tax residency' },
  Greece:      { flag:'🇬🇷', name_he:'יוון',           name_en:'Greece',       crs:true,  reportToIsrael:true,  fatca:true,  threshold_he:'חשבון > $50K', threshold_en:'Account > $50K', note_he:'CRS + FATCA מלא', note_en:'Full CRS + FATCA' },
  Italy:       { flag:'🇮🇹', name_he:'איטליה',         name_en:'Italy',        crs:true,  reportToIsrael:true,  fatca:true,  threshold_he:'חשבון > $50K', threshold_en:'Account > $50K', note_he:'CRS + FATCA מלא', note_en:'Full CRS + FATCA' },
};

function CRSCheckerPanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [filter, setFilter] = useState<'all'|'reports'|'no-report'>('all');
  const rows = Object.entries(CRS_DATA).filter(([,c]) => {
    if (filter === 'reports') return c.reportToIsrael;
    if (filter === 'no-report') return !c.reportToIsrael;
    return true;
  });
  return (
    <div className="flex-shrink-0 overflow-y-auto" style={{ maxHeight:'75vh', background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'1.5rem' }}>
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <span style={{fontSize:'1.1rem'}}>🔍</span>
          {lang==='he'?'בודק CRS / FATCA — האם מדינת היעד מדווחת לישראל?':'CRS / FATCA Checker — Does your destination report to Israel?'}
        </h2>
        <button onClick={onClose} style={{color:'var(--text-muted)'}}><X size={18}/></button>
      </div>
      <p className="text-xs mb-4" style={{color:'var(--text-muted)'}}>{lang==='he'?'CRS (Common Reporting Standard) — מסגרת OECD להחלפת מידע בנקאי אוטומטי בין מדינות. חשבון בנק במדינה שחברה ב-CRS מדווח לרשות המסים הישראלית.':'CRS — OECD framework for automatic exchange of banking information between countries.'}</p>

      <div className="flex gap-2 mb-4">
        {[['all', lang==='he'?'הכל':'All'], ['reports', lang==='he'?'מדווח לישראל':'Reports to Israel'], ['no-report', lang==='he'?'לא מדווח':'Does Not Report']] .map(([val,label]) => (
          <button key={val} onClick={()=>setFilter(val as typeof filter)}
            className="px-3 py-1 rounded-full text-xs"
            style={{ background: filter===val ? 'var(--accent)':'var(--surface-2)', color: filter===val?'#fff':'var(--text-muted)', border:'1px solid var(--border)' }}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {rows.map(([key, c]) => (
          <div key={key} style={{ background:'var(--surface-2)', border:`1px solid ${c.reportToIsrael?'#ef444433':'#10b98133'}`, borderRadius:8, padding:'0.75rem 1rem', display:'flex', alignItems:'flex-start', gap:12 }}>
            <span className="text-xl" style={{flexShrink:0,marginTop:2}}>{c.flag}</span>
            <div style={{flex:1}}>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{lang==='he'?c.name_he:c.name_en}</span>
                <span style={{ background: c.reportToIsrael?'#ef444422':'#10b98122', color: c.reportToIsrael?'#ef4444':'#10b981', borderRadius:12, padding:'1px 8px', fontSize:'0.7rem', fontWeight:700 }}>
                  {c.reportToIsrael ? (lang==='he'?'📤 מדווח לישראל':'📤 Reports to Israel') : (lang==='he'?'🔒 לא מדווח':'🔒 Not Reported')}
                </span>
                {c.fatca && <span style={{background:'#3b82f622',color:'#3b82f6',borderRadius:12,padding:'1px 6px',fontSize:'0.65rem'}}>FATCA</span>}
              </div>
              <p className="text-xs" style={{color:'var(--text-muted)'}}>{lang==='he'?c.note_he:c.note_en}</p>
              <p className="text-xs mt-1" style={{color:'var(--accent)'}}>{lang==='he'?c.threshold_he:c.threshold_en}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs mt-4" style={{color:'var(--text-muted)'}}>{lang==='he'?'* מידע לצורך הבנה כללית בלבד. מצב הסכמי CRS משתנה. בדוק עם יועץ מס לפני קבלת החלטות.':'* For general information only. CRS agreements change. Verify with a tax advisor before making decisions.'}</p>
    </div>
  );
}

// ─── Remote Worker Tax Calculator ────────────────────────────────────────────
const REMOTE_COUNTRIES: Record<string, { flag:string; name_he:string; name_en:string; daysResident:number; peTrigger:number; incomeTax:number; specialVisa_he:string; specialVisa_en:string; risk:'low'|'medium'|'high'; }> = {
  UAE:       { flag:'🇦🇪', name_he:'UAE / דובאי',   name_en:'UAE / Dubai',   daysResident:183, peTrigger:90,  incomeTax:0,    specialVisa_he:'Remote Work Visa זמין (1 שנה, מתחדש)', specialVisa_en:'Remote Work Visa available (1 yr, renewable)', risk:'low' },
  Portugal:  { flag:'🇵🇹', name_he:'פורטוגל',       name_en:'Portugal',      daysResident:183, peTrigger:183, incomeTax:20,   specialVisa_he:'D8 Digital Nomad Visa — €3,280/חודש הכנסה מינ׳', specialVisa_en:'D8 Digital Nomad Visa — min €3,280/mo income', risk:'low' },
  Georgia:   { flag:'🇬🇪', name_he:'גאורגיה',       name_en:'Georgia',       daysResident:183, peTrigger:90,  incomeTax:1,    specialVisa_he:'Remotely from Georgia (Wanderer Visa) — ללא תנאי הכנסה', specialVisa_en:'Remotely from Georgia (Wanderer Visa) — no income requirement', risk:'low' },
  Cyprus:    { flag:'🇨🇾', name_he:'קפריסין',       name_en:'Cyprus',        daysResident:60,  peTrigger:60,  incomeTax:0,    specialVisa_he:'60-day rule — תושבות מס עם רק 60 יום!', specialVisa_en:'60-day rule — tax residency in just 60 days!', risk:'medium' },
  Brazil:    { flag:'🇧🇷', name_he:'ברזיל',         name_en:'Brazil',        daysResident:183, peTrigger:90,  incomeTax:27.5, specialVisa_he:'Visto VITEM XIV — Digital Nomad ($1,500/חודש מינ׳)', specialVisa_en:'Visto VITEM XIV — Digital Nomad ($1,500/mo min)', risk:'high' },
  Thailand:  { flag:'🇹🇭', name_he:'תאילנד',        name_en:'Thailand',      daysResident:180, peTrigger:180, incomeTax:0,    specialVisa_he:'LTR Visa (Long Term Resident) — עובד מרחוק מוכר', specialVisa_en:'LTR Visa (Long Term Resident) — remote workers recognized', risk:'low' },
  Greece:    { flag:'🇬🇷', name_he:'יוון',           name_en:'Greece',        daysResident:183, peTrigger:183, incomeTax:7,    specialVisa_he:'Digital Nomad Visa — הכנסה $3,500/חודש מינ׳', specialVisa_en:'Digital Nomad Visa — $3,500/mo min income', risk:'low' },
  Estonia:   { flag:'🇪🇪', name_he:'אסטוניה',       name_en:'Estonia',       daysResident:183, peTrigger:183, incomeTax:20,   specialVisa_he:'Digital Nomad Visa — €3,504 מינ׳/חודש', specialVisa_en:'Digital Nomad Visa — €3,504/mo minimum', risk:'low' },
  Colombia:  { flag:'🇨🇴', name_he:'קולומביה',      name_en:'Colombia',      daysResident:183, peTrigger:90,  incomeTax:0,    specialVisa_he:'Digital Nomad Visa — $684/חודש מינ׳', specialVisa_en:'Digital Nomad Visa — $684/mo minimum', risk:'low' },
  Mexico:    { flag:'🇲🇽', name_he:'מקסיקו',        name_en:'Mexico',        daysResident:183, peTrigger:90,  incomeTax:0,    specialVisa_he:'Residente Temporal — territorial tax לשנה ראשונה', specialVisa_en:'Residente Temporal — territorial tax for first year', risk:'medium' },
};

function RemoteWorkerPanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [salary, setSalary] = useState(120000);
  const [daysAbroad, setDaysAbroad] = useState(200);
  const [destination, setDestination] = useState('UAE');
  const [employerCountry, setEmployerCountry] = useState<'israel'|'foreign'>('israel');

  const dest = REMOTE_COUNTRIES[destination];
  const isResident = daysAbroad >= dest.daysResident;
  const isPETrigger = daysAbroad >= dest.peTrigger && employerCountry === 'israel';
  const israelDays = 365 - daysAbroad;
  const isStillIsraeli = israelDays >= 183;

  const israelTax = salary * 0.47 * (isStillIsraeli ? 1 : 0.5);
  const destTax = isResident ? salary * (dest.incomeTax / 100) : 0;
  const estimatedTax = isStillIsraeli ? israelTax : Math.max(israelTax * 0.3, destTax);

  const riskColor = { low:'#10b981', medium:'#f59e0b', high:'#ef4444' };
  const riskLabel = { he: { low:'סיכון נמוך', medium:'סיכון בינוני', high:'סיכון גבוה' }, en: { low:'Low Risk', medium:'Medium Risk', high:'High Risk' } };

  return (
    <div className="flex-shrink-0 overflow-y-auto" style={{ maxHeight:'75vh', background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'1.5rem' }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <span style={{fontSize:'1.1rem'}}>💻</span>
          {lang==='he'?'מחשבון עובד מרחוק — מיסוי ו-PE Risk':'Remote Worker Calculator — Tax & PE Risk'}
        </h2>
        <button onClick={onClose} style={{color:'var(--text-muted)'}}><X size={18}/></button>
      </div>

      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns:'1fr 1fr' }}>
        <div>
          <label className="text-xs mb-1 block" style={{color:'var(--text-muted)'}}>{lang==='he'?'שכר שנתי ($)':'Annual Salary ($)'}</label>
          <input type="number" value={salary} onChange={e=>setSalary(Number(e.target.value))} className="w-full text-sm px-2 py-1 rounded" style={{background:'var(--surface-2)',border:'1px solid var(--border)',color:'var(--text)'}}/>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{color:'var(--text-muted)'}}>{lang==='he'?'ימים בחו"ל בשנה':'Days Abroad per Year'}</label>
          <input type="number" value={daysAbroad} onChange={e=>setDaysAbroad(Math.min(365,Number(e.target.value)))} className="w-full text-sm px-2 py-1 rounded" style={{background:'var(--surface-2)',border:'1px solid var(--border)',color:'var(--text)'}}/>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{color:'var(--text-muted)'}}>{lang==='he'?'מדינת עבודה':'Working From'}</label>
          <select value={destination} onChange={e=>setDestination(e.target.value)} className="w-full text-sm px-2 py-1 rounded" style={{background:'var(--surface-2)',border:'1px solid var(--border)',color:'var(--text)'}}>
            {Object.entries(REMOTE_COUNTRIES).map(([k,c]) => <option key={k} value={k}>{c.flag} {lang==='he'?c.name_he:c.name_en}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{color:'var(--text-muted)'}}>{lang==='he'?'מקום המעסיק':'Employer Location'}</label>
          <select value={employerCountry} onChange={e=>setEmployerCountry(e.target.value as 'israel'|'foreign')} className="w-full text-sm px-2 py-1 rounded" style={{background:'var(--surface-2)',border:'1px solid var(--border)',color:'var(--text)'}}>
            <option value="israel">{lang==='he'?'🇮🇱 מעסיק ישראלי':'🇮🇱 Israeli Employer'}</option>
            <option value="foreign">{lang==='he'?'🌍 מעסיק זר':'🌍 Foreign Employer'}</option>
          </select>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid gap-2 mb-4" style={{ gridTemplateColumns:'1fr 1fr 1fr' }}>
        <div style={{ background:'var(--surface-2)', border:`1px solid ${isStillIsraeli?'#ef444444':'#10b98144'}`, borderRadius:8, padding:'0.75rem', textAlign:'center' }}>
          <div className="text-xs mb-1" style={{color:'var(--text-muted)'}}>{lang==='he'?'תושב ישראל?':'Israeli Resident?'}</div>
          <div className="font-bold text-sm" style={{color:isStillIsraeli?'#ef4444':'#10b981'}}>{isStillIsraeli?(lang==='he'?'✓ כן':'✓ Yes'):(lang==='he'?'✗ לא':'✗ No')}</div>
          <div className="text-xs" style={{color:'var(--text-muted)'}}>{israelDays} {lang==='he'?'ימים בישראל':'days in Israel'}</div>
        </div>
        <div style={{ background:'var(--surface-2)', border:`1px solid ${isResident?'#10b98144':'var(--border)'}`, borderRadius:8, padding:'0.75rem', textAlign:'center' }}>
          <div className="text-xs mb-1" style={{color:'var(--text-muted)'}}>{lang==='he'?`תושב ${dest.flag}?`:`Resident of ${dest.flag}?`}</div>
          <div className="font-bold text-sm" style={{color:isResident?'#10b981':'var(--text-muted)'}}>{isResident?(lang==='he'?'✓ כן':'✓ Yes'):(lang==='he'?'✗ לא':'✗ No')}</div>
          <div className="text-xs" style={{color:'var(--text-muted)'}}>{lang==='he'?`סף: ${dest.daysResident} יום`:`Threshold: ${dest.daysResident} days`}</div>
        </div>
        <div style={{ background:'var(--surface-2)', border:`1px solid ${isPETrigger?'#ef444444':'var(--border)'}`, borderRadius:8, padding:'0.75rem', textAlign:'center' }}>
          <div className="text-xs mb-1" style={{color:'var(--text-muted)'}}>PE Risk</div>
          <div className="font-bold text-sm" style={{color:isPETrigger?'#ef4444':'#10b981'}}>{isPETrigger?(lang==='he'?'⚠️ קיים':'⚠️ Exists'):(lang==='he'?'✓ נמוך':'✓ Low')}</div>
          <div className="text-xs" style={{color:'var(--text-muted)'}}>{lang==='he'?`סף: ${dest.peTrigger} יום`:`Threshold: ${dest.peTrigger} days`}</div>
        </div>
      </div>

      {/* Visa info */}
      <div style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:8, padding:'0.75rem 1rem', marginBottom:'1rem' }}>
        <div className="flex items-center gap-2 mb-1">
          <span style={{color: riskColor[dest.risk], fontWeight:700, fontSize:'0.75rem'}}>{riskLabel[lang][dest.risk]}</span>
          <span className="text-sm font-semibold">{dest.flag} {lang==='he'?dest.name_he:dest.name_en}</span>
          <span className="text-xs ml-auto" style={{color:'var(--accent)'}}>{lang==='he'?'מס הכנסה:':'Income Tax:'} {dest.incomeTax}%</span>
        </div>
        <p className="text-xs" style={{color:'var(--text-muted)'}}>{lang==='he'?dest.specialVisa_he:dest.specialVisa_en}</p>
      </div>

      {/* Tax estimate */}
      <div style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:8, padding:'1rem' }}>
        <h3 className="font-semibold text-sm mb-3">{lang==='he'?'הערכת חבות מס שנתית':'Estimated Annual Tax Liability'}</h3>
        <div className="flex flex-col gap-2">
          {[
            { label: lang==='he'?'🇮🇱 מס ישראלי (47% מדרגה עליונה)':'🇮🇱 Israeli Tax (47% top bracket)', val: israelTax, show: true },
            { label: lang==='he'?`${dest.flag} מס מקומי (${dest.incomeTax}%)`:`${dest.flag} Local Tax (${dest.incomeTax}%)`, val: destTax, show: isResident && dest.incomeTax > 0 },
            { label: lang==='he'?'הערכה כוללת (בתנאי הנוכחיים)':'Total Estimate (current conditions)', val: estimatedTax, show: true, highlight: true },
          ].filter(r => r.show).map(({label,val,highlight}) => (
            <div key={label} className="flex justify-between items-center text-sm" style={{ padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{color:'var(--text-muted)'}}>{label}</span>
              <span style={{fontWeight: highlight?700:400, color: highlight?'var(--accent)':'var(--text)'}}>${val.toLocaleString('en',{maximumFractionDigits:0})}</span>
            </div>
          ))}
        </div>
      </div>

      {isPETrigger && (
        <div className="mt-3 p-3 rounded text-xs" style={{background:'#ef444411',border:'1px solid #ef444433',color:'#ef4444'}}>
          ⚠️ {lang==='he'?`PE Risk: עבודה מ${dest.flag} עבור מעסיק ישראלי מעל ${dest.peTrigger} יום עלולה ליצור "מוסד קבע" ולחשוף את המעסיק למס חברות במדינת היעד.`:`PE Risk: working from ${dest.flag} for an Israeli employer over ${dest.peTrigger} days may create a Permanent Establishment, exposing your employer to corporate tax in that country.`}
        </div>
      )}
      <p className="text-xs mt-3" style={{color:'var(--text-muted)'}}>{lang==='he'?'* חישוב משוער בלבד. אינו כולל ביטוח לאומי, אמנות מס ופרטים אישיים.':'* Rough estimate only. Excludes NII, tax treaties, and personal circumstances.'}</p>
    </div>
  );
}

// ─── Red Flags Radar ──────────────────────────────────────────────────────────
interface RedFlag { severity: 'high'|'medium'|'low'; title_he: string; title_en: string; desc_he: string; desc_en: string; action_he: string; action_en: string; }

function buildRedFlags(profile: UserProfile): RedFlag[] {
  const flags: RedFlag[] = [];
  const totalIncome = (profile.income.employment||0)+(profile.income.business||0)+(profile.income.capital_gains||0)+(profile.income.dividends||0)+(profile.income.crypto||0)+(profile.income.rental||0)+(profile.income.other||0);
  const totalAssets = (profile.assets.stocks||0)+(profile.assets.real_estate||0)+(profile.assets.crypto_holdings||0)+(profile.assets.business_value||0)+(profile.assets.other||0);

  if (totalAssets > 1800000)
    flags.push({ severity:'high', title_he:'מס יציאה פוטנציאלי', title_en:'Exit Tax Exposure', desc_he:`נכסים מעל ₪1.8M (${(totalAssets/1000000).toFixed(1)}M ₪) — בעת עזיבת ישראל ייתכן אירוע מס רעיוני על כל הנכסים.`, desc_en:`Assets above ₪1.8M (${(totalAssets/1000000).toFixed(1)}M ₪) — leaving Israel may trigger deemed disposal tax on all assets.`, action_he:'בצע חישוב מס יציאה לפני קביעת תאריך עזיבה. שקול פריסת מכירה לפני העלייה.', action_en:'Run exit tax calculation before setting departure date. Consider pre-departure asset restructuring.' });

  if (profile.is_us_person)
    flags.push({ severity:'high', title_he:'חשיפת FATCA + FBAR', title_en:'FATCA + FBAR Exposure', desc_he:'כאזרח/ית ארה"ב, חובת דיווח גלובלית ל-IRS לעולם אינה פוקעת — גם לאחר עזיבת ישראל. PFIC, FBAR ו-Form 8938 רלוונטיים.', desc_en:'As a US person, global IRS reporting obligation never ends — even after leaving Israel. PFIC, FBAR and Form 8938 apply.', action_he:'התייעץ עם CPA אמריקאי מוסמך. בדוק חשיפת PFIC בקרנות נאמנות ישראליות.', action_en:'Consult a US-qualified CPA. Review PFIC exposure in Israeli mutual funds.' });

  if (profile.income.crypto > 0)
    flags.push({ severity:'medium', title_he:'מיסוי קריפטו — נכסי תושב', title_en:'Crypto Tax Residency Trap', desc_he:'מכירת קריפטו לאחר העלייה למדינה חדשה עדיין חייבת מס ישראלי על הרווח שנצבר בתקופת תושבות ישראל.', desc_en:'Selling crypto after relocation may still trigger Israeli tax on gains accrued during Israeli residency.', action_he:'תעד עלות מקורית ותאריכי רכישה. שקול מכירה לפני עזיבת ישראל אם יש הפסד או רווח נמוך.', action_en:'Document cost basis and acquisition dates. Consider disposing before leaving Israel if at low gain.' });

  if (profile.assets.business_value > 500000)
    flags.push({ severity:'high', title_he:'חברת ניהול / CFC', title_en:'Controlled Foreign Company Risk', desc_he:'חברה ישראלית בשליטת תושב חוץ עלולה להיחשב CFC ולהיות חייבת במס ישראלי על רווחים פאסיביים שלא חולקו.', desc_en:'An Israeli company controlled by a foreign resident may be deemed a CFC and taxed in Israel on undistributed passive income.', action_he:'בדוק מבנה אחזקות לפני שינוי תושבות. שקול פירוק או שינוי מבנה מראש.', action_en:'Review ownership structure before changing residency. Consider pre-departure restructuring or dissolution.' });

  if ((profile.income.rental||0) > 30000)
    flags.push({ severity:'medium', title_he:'הכנסת שכירות — דיווח כפול', title_en:'Foreign Rental Income — Dual Reporting', desc_he:'הכנסת שכירות מנדל"ן בחו"ל חייבת בדיווח הן בישראל והן במדינת הנכס. חשוב לנצל זיכוי מס זר נכון.', desc_en:'Foreign rental income must be reported in both Israel and the property\'s country. Proper foreign tax credit is critical.', action_he:'הכן דוח רווח/הפסד נפרד לכל נכס. צרף טפסים 150 ו-1301.', action_en:'Prepare separate P&L per property. Attach forms 150 and 1301.' });

  if (totalIncome > 250000 && profile.current_residency === 'ישראל')
    flags.push({ severity:'medium', title_he:'ביטוח לאומי על הכנסות גבוהות', title_en:'High NII Exposure', desc_he:`הכנסה שנתית של ~$${(totalIncome/1000).toFixed(0)}K חשופה לדמי ביטוח לאומי עד 17.83% על רכיב ההכנסה הגבוהה.`, desc_en:`Annual income ~$${(totalIncome/1000).toFixed(0)}K is exposed to National Insurance at up to 17.83% on the high-income bracket.`, action_he:'בדוק האם ניתן לנתב הכנסות דרך חברה להפחתת ביטוח לאומי.', action_en:'Check whether routing income through a company reduces NII exposure.' });

  if (profile.current_residency === 'ישראל' && profile.goals.some(g => /בר[זס]יל|brazil/i.test(g)))
    flags.push({ severity:'medium', title_he:'ברזיל — ללא אמנת מס עם ישראל', title_en:'Brazil — No Tax Treaty with Israel', desc_he:'ברזיל ואיסראל אין אמנת מס. הכנסה עשויה להיות כפופה למיסוי כפול. ברזיל מטילה 27.5% על הכנסה ו-ITCMD 4-8% על ירושות.', desc_en:'Brazil and Israel have no tax treaty. Income may be subject to double taxation. Brazil levies 27.5% on income and ITCMD 4-8% on inheritances.', action_he:'שקול מבנה החזקות דרך הולנד/קפריסין לניצול אמנות. התייעץ עם עו"ד ברזילאי לפני המעבר.', action_en:'Consider holding via Netherlands/Cyprus for treaty access. Consult a Brazilian tax lawyer before moving.' });

  if (flags.length === 0)
    flags.push({ severity:'low', title_he:'לא זוהו סיכונים מיידיים', title_en:'No Immediate Risks Detected', desc_he:'על בסיס הנתונים שהזנת, לא זוהו סיכוני מס קריטיים. מלא את הפרופיל שלך לניתוח מדויק יותר.', desc_en:'Based on your profile data, no critical tax risks were detected. Complete your profile for a more accurate analysis.', action_he:'המשך לעדכן את הפרופיל שלך לניתוח מדויק.', action_en:'Keep your profile updated for accurate analysis.' });

  return flags;
}

function RedFlagsPanel({ lang, profile, onClose }: { lang: Lang; profile: UserProfile; onClose: () => void }) {
  const flags = buildRedFlags(profile);
  const sevColor = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
  const sevLabel = { he: { high:'גבוה', medium:'בינוני', low:'נמוך' }, en: { high:'High', medium:'Medium', low:'Low' } };
  return (
    <div className="flex-shrink-0 overflow-y-auto" style={{ maxHeight:'72vh', background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'1.5rem' }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2"><AlertTriangle size={18} style={{color:'#ef4444'}}/>{lang==='he'?'רדאר סיכונים — איתור בעיות בתוכנית שלך':'Risk Radar — Detect Issues in Your Plan'}</h2>
        <button onClick={onClose} style={{color:'var(--text-muted)'}}><X size={18}/></button>
      </div>
      <div className="flex flex-col gap-3">
        {flags.map((f,i) => (
          <div key={i} style={{ background:'var(--surface-2)', border:`1px solid ${sevColor[f.severity]}33`, borderRadius:10, padding:'1rem' }}>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ background:`${sevColor[f.severity]}22`, color:sevColor[f.severity], borderRadius:6, padding:'2px 8px', fontSize:'0.72rem', fontWeight:700 }}>{sevLabel[lang][f.severity]}</span>
              <span className="font-semibold text-sm">{lang==='he'?f.title_he:f.title_en}</span>
            </div>
            <p className="text-sm mb-2" style={{color:'var(--text-muted)'}}>{lang==='he'?f.desc_he:f.desc_en}</p>
            <p className="text-xs flex items-start gap-1" style={{color:'var(--accent)'}}><CheckCircle2 size={12} style={{marginTop:2,flexShrink:0}}/>{lang==='he'?f.action_he:f.action_en}</p>
          </div>
        ))}
      </div>
      <p className="text-xs mt-4" style={{color:'var(--text-muted)'}}>{lang==='he'?'* ניתוח אוטומטי בלבד — אינו מהווה ייעוץ משפטי או מקצועי.':'* Automated analysis only — not legal or professional advice.'}</p>
    </div>
  );
}

// ─── Decision Timeline ────────────────────────────────────────────────────────
interface TimelineStep { phase: string; month_he: string; month_en: string; steps_he: string[]; steps_en: string[]; done?: boolean; }

const TIMELINE_STEPS: TimelineStep[] = [
  { phase:'prep', month_he:'חודש 1-3: הכנה', month_en:'Month 1-3: Preparation', steps_he:['פגישת ייעוץ עם רו"ח ועו"ד מיסים','חישוב מס יציאה מדויק','בחירת מדינת יעד סופית (Fit Score)','פתיחת חשבון בנק במדינת היעד','הגשת בקשת ויזה / רשיון שהייה'] , steps_en:['Consult tax attorney + CPA','Run exact exit tax calculation','Finalize destination country (Fit Score)','Open bank account in target country','Submit visa / residency application'] },
  { phase:'before', month_he:'חודש 4-6: לפני העזיבה', month_en:'Month 4-6: Before Leaving', steps_he:['מכירה אסטרטגית של נכסים (אם נדרש)','העברת קרנות פנסיה / גמל — בדיקת אפשרויות','הודעה למעסיק / ביטוח לאומי','סגירת עסקים / ניהול CFC','תיעוד כל עלויות מקוריות של נכסים'] , steps_en:['Strategic asset disposal (if needed)','Review pension/provident fund options','Notify employer + NII office','Wind down or restructure Israeli companies','Document all asset cost bases'] },
  { phase:'move', month_he:'חודש 7: יציאה', month_en:'Month 7: Departure', steps_he:['עזיבה רשמית — יום הניתוק מישראל','שמור ראיות: כרטיסי טיסה, חוזה שכירות/רכישה','עדכון כתובת בבנקים, ביטוחים, ממשלה','הצהרת תושבות חדשה לרשות המסים'] , steps_en:['Official departure — severance day from Israel','Keep proof: flights, rental/purchase contract','Update address with banks, insurers, government','File residency declaration with ITA'] },
  { phase:'year1', month_he:'שנה ראשונה', month_en:'Year 1 Post-Move', steps_he:['הגשת דוח מס שנתי לישראל (אחרון)','רישום תושב במדינת היעד','פתיחת תיק מס חדש','הצהרת נכסים ל-CRS אם נדרש','שמור > 183 יום במדינת היעד'] , steps_en:['File final annual Israeli tax return','Register as resident in new country','Open new tax file','Asset declaration for CRS if required','Maintain >183 days in destination'] },
  { phase:'ongoing', month_he:'שנה 2 ואילך', month_en:'Year 2+: Ongoing', steps_he:['מעקב שוטף — אל תחצה 183 יום בישראל','עדכן מבנה אחזקות לפי שינויים','דיווח שנתי במדינת המגורים החדשה','בדיקת שינויי אמנות מס','תכנון ירושה ועיזבון'] , steps_en:['Ongoing: never cross 183 days back in Israel','Update holding structure as needed','Annual filing in new country','Monitor tax treaty changes','Estate and succession planning'] },
];

function DecisionTimelinePanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [checked, setChecked] = useState<Record<string,boolean>>({});
  const toggle = (key: string) => setChecked(p => ({...p, [key]: !p[key]}));
  const phaseColor: Record<string,string> = { prep:'#3b82f6', before:'#f59e0b', move:'#ef4444', year1:'#10b981', ongoing:'#8b5cf6' };
  return (
    <div className="flex-shrink-0 overflow-y-auto" style={{ maxHeight:'72vh', background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'1.5rem' }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2"><CalendarClock size={18} style={{color:'var(--accent)'}}/>{lang==='he'?'ציר זמן — צעדים לביצוע':'Timeline — Steps to Take'}</h2>
        <button onClick={onClose} style={{color:'var(--text-muted)'}}><X size={18}/></button>
      </div>
      <div className="flex flex-col gap-4">
        {TIMELINE_STEPS.map(ts => {
          const steps = lang==='he' ? ts.steps_he : ts.steps_en;
          const done = steps.every((_,i) => checked[`${ts.phase}-${i}`]);
          return (
            <div key={ts.phase} style={{ border:`1px solid ${phaseColor[ts.phase]}44`, borderRadius:10, overflow:'hidden' }}>
              <div style={{ background:`${phaseColor[ts.phase]}18`, padding:'0.6rem 1rem', borderBottom:`1px solid ${phaseColor[ts.phase]}33`, display:'flex', alignItems:'center', gap:8 }}>
                <CircleDot size={14} style={{color: phaseColor[ts.phase]}}/>
                <span className="font-semibold text-sm" style={{color: phaseColor[ts.phase]}}>{lang==='he'?ts.month_he:ts.month_en}</span>
                {done && <span className="ml-auto text-xs" style={{color:'#10b981'}}>✓ {lang==='he'?'הושלם':'Done'}</span>}
              </div>
              <div style={{ padding:'0.75rem 1rem', display:'flex', flexDirection:'column', gap:6 }}>
                {steps.map((s,i) => (
                  <label key={i} className="flex items-start gap-2 cursor-pointer text-sm" style={{color: checked[`${ts.phase}-${i}`] ? 'var(--text-muted)' : 'var(--text)', textDecoration: checked[`${ts.phase}-${i}`] ? 'line-through' : 'none'}}>
                    <input type="checkbox" checked={!!checked[`${ts.phase}-${i}`]} onChange={()=>toggle(`${ts.phase}-${i}`)} style={{marginTop:3,accentColor:'var(--accent)',flexShrink:0}}/>
                    {s}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs mt-4" style={{color:'var(--text-muted)'}}>{lang==='he'?'* ציר הזמן הוא הכוונה כללית בלבד. פרטים אישיים עשויים לשנות את הסדר.':'* Timeline is general guidance only. Individual circumstances may alter the order.'}</p>
    </div>
  );
}

// ─── Wealth Preservation Simulator ───────────────────────────────────────────
const WEALTH_COUNTRIES: Record<string, { name_he: string; name_en: string; flag: string; incomeTax: number; cgTax: number; wealthTax: number; }> = {
  Israel:    { name_he:'ישראל (נוכחי)', name_en:'Israel (current)', flag:'🇮🇱', incomeTax:47, cgTax:25, wealthTax:0 },
  UAE:       { name_he:'איחוד האמירויות', name_en:'UAE', flag:'🇦🇪', incomeTax:0, cgTax:0, wealthTax:0 },
  Cyprus:    { name_he:'קפריסין', name_en:'Cyprus', flag:'🇨🇾', incomeTax:35, cgTax:0, wealthTax:0 },
  Portugal:  { name_he:'פורטוגל (NHR)', name_en:'Portugal (NHR)', flag:'🇵🇹', incomeTax:20, cgTax:28, wealthTax:0 },
  Malta:     { name_he:'מלטה', name_en:'Malta', flag:'🇲🇹', incomeTax:15, cgTax:0, wealthTax:0 },
  Singapore: { name_he:'סינגפור', name_en:'Singapore', flag:'🇸🇬', incomeTax:22, cgTax:0, wealthTax:0 },
  Greece:    { name_he:'יוון (Flat Tax)', name_en:'Greece (Flat Tax)', flag:'🇬🇷', incomeTax:7, cgTax:15, wealthTax:0 },
  Italy:     { name_he:'איטליה (Flat Tax)', name_en:'Italy (Flat Tax)', flag:'🇮🇹', incomeTax:0, cgTax:26, wealthTax:0 },
  Brazil:    { name_he:'ברזיל', name_en:'Brazil', flag:'🇧🇷', incomeTax:27.5, cgTax:15, wealthTax:0 },
};

function WealthSimPanel({ lang, profile, onClose }: { lang: Lang; profile: UserProfile; onClose: () => void }) {
  const defIncome = (profile.income.employment||0)+(profile.income.business||0);
  const defCG = profile.income.capital_gains||0;
  const defAssets = (profile.assets.stocks||0)+(profile.assets.real_estate||0)+(profile.assets.crypto_holdings||0)+(profile.assets.business_value||0)+(profile.assets.other||0);

  const [income, setIncome] = useState(defIncome||150000);
  const [cgGain, setCgGain] = useState(defCG||50000);
  const [startWealth, setStartWealth] = useState(defAssets||1000000);
  const [years, setYears] = useState(10);
  const [growthPct, setGrowthPct] = useState(7);

  const results = useMemo(() => {
    return Object.entries(WEALTH_COUNTRIES).map(([key, c]) => {
      let wealth = startWealth;
      let totalTaxPaid = 0;
      const isItaly = key === 'Italy';
      for (let y = 0; y < years; y++) {
        const annualGrowth = wealth * (growthPct / 100);
        const taxableIncome = key === 'Israel' ? income : income * 0.8; // simplified foreign source
        const incomeTaxRate = isItaly ? (income > 0 ? Math.min(c.incomeTax, (100000/income)*100) : 0) : c.incomeTax;
        const incomeTax = taxableIncome * (incomeTaxRate/100);
        const cgTax = cgGain * (c.cgTax/100);
        const growthTax = annualGrowth * (c.cgTax/100) * 0.3; // assume 30% realized annually
        const yearlyTax = incomeTax + cgTax + growthTax;
        totalTaxPaid += yearlyTax;
        wealth = wealth + annualGrowth - yearlyTax;
      }
      return { key, c, finalWealth: Math.max(0, wealth), totalTax: totalTaxPaid };
    }).sort((a,b) => b.finalWealth - a.finalWealth);
  }, [income, cgGain, startWealth, years, growthPct]);

  const best = results[0];
  const israelResult = results.find(r => r.key === 'Israel')!;

  const fmt = (n: number) => n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : `$${(n/1000).toFixed(0)}K`;

  return (
    <div className="flex-shrink-0 overflow-y-auto" style={{ maxHeight:'72vh', background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'1.5rem' }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2"><Coins size={18} style={{color:'#10b981'}}/>{lang==='he'?'סימולטור שימור עושר':'Wealth Preservation Simulator'}</h2>
        <button onClick={onClose} style={{color:'var(--text-muted)'}}><X size={18}/></button>
      </div>
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns:'1fr 1fr 1fr' }}>
        {[
          { label: lang==='he'?'הכנסה שנתית ($)':'Annual Income ($)', val:income, set:setIncome },
          { label: lang==='he'?'רווחי הון שנתיים ($)':'Annual Cap. Gains ($)', val:cgGain, set:setCgGain },
          { label: lang==='he'?'עושר נוכחי ($)':'Current Wealth ($)', val:startWealth, set:setStartWealth },
          { label: lang==='he'?'שנות השוואה':'Years', val:years, set:setYears },
          { label: lang==='he'?'תשואה שנתית (%)':'Annual Return (%)', val:growthPct, set:setGrowthPct },
        ].map(({label,val,set}) => (
          <div key={label}>
            <label className="text-xs mb-1 block" style={{color:'var(--text-muted)'}}>{label}</label>
            <input type="number" value={val} onChange={e=>set(Number(e.target.value))} className="w-full text-sm px-2 py-1 rounded" style={{background:'var(--surface-2)',border:'1px solid var(--border)',color:'var(--text)'}}/>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {results.map(({key, c, finalWealth, totalTax}, idx) => {
          const saving = finalWealth - (israelResult?.finalWealth || finalWealth);
          const isBest = idx === 0;
          const isIsrael = key === 'Israel';
          return (
            <div key={key} style={{ background:'var(--surface-2)', border: isBest ? '1px solid #10b98188' : '1px solid var(--border)', borderRadius:8, padding:'0.75rem 1rem', display:'flex', alignItems:'center', gap:12 }}>
              <span className="text-xl" style={{width:28}}>{c.flag}</span>
              <div style={{flex:1}}>
                <div className="text-sm font-semibold">{lang==='he'?c.name_he:c.name_en}</div>
                <div className="text-xs" style={{color:'var(--text-muted)'}}>{lang==='he'?'מס הכנסה':'Income Tax'}: {c.incomeTax}% &nbsp;|&nbsp; {lang==='he'?'רווחי הון':'CGT'}: {c.cgTax}%</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm">{fmt(finalWealth)}</div>
                <div className="text-xs" style={{color: isIsrael ? 'var(--text-muted)' : saving >= 0 ? '#10b981' : '#ef4444'}}>
                  {!isIsrael && (saving >= 0 ? `+${fmt(saving)}` : fmt(saving))}
                  {isIsrael && <span style={{color:'var(--text-muted)'}}>baseline</span>}
                </div>
              </div>
              {isBest && <span style={{background:'#10b98122',color:'#10b981',borderRadius:6,padding:'2px 6px',fontSize:'0.7rem',fontWeight:700}}>{lang==='he'?'מיטבי':'Best'}</span>}
            </div>
          );
        })}
      </div>
      <p className="text-xs mt-3" style={{color:'var(--text-muted)'}}>{lang==='he'?'* הדמייה פשוטה — לא כוללת ביטוח לאומי, מס עיזבון, חישוב מס יציאה ועמלות ניהול.':'* Simplified model — excludes NII, estate tax, exit tax, and management fees.'}</p>
    </div>
  );
}

// ─── Bank & Asset Migration Guide ────────────────────────────────────────────
interface BankCountry { flag: string; name_he: string; name_en: string; banks_he: string[]; banks_en: string[]; docs_he: string[]; docs_en: string[]; tips_he: string; tips_en: string; time_he: string; time_en: string; }

const BANK_GUIDE: Record<string, BankCountry> = {
  UAE: { flag:'🇦🇪', name_he:'איחוד האמירויות', name_en:'UAE',
    banks_he:['Emirates NBD — אחד הגדולים, ידידותי לישראלים','ADCB — טוב לעסקים','Mashreq Bank — ניתן לפתוח Online'],
    banks_en:['Emirates NBD — largest, Israeli-friendly','ADCB — good for business','Mashreq Bank — can open online'],
    docs_he:['פספורט ישראלי בתוקף','תעודת תושבות ב-UAE (Visa/Emirates ID)','הוכחת כתובת (Utility bill / חוזה שכירות)','אסמכתא על מקור הכנסה','צילומי תמונה'],
    docs_en:['Valid Israeli passport','UAE residency (Visa/Emirates ID)','Proof of address (utility bill / lease)','Source of funds documentation','Photos'],
    tips_he:'פתיחת חשבון ב-UAE כישראלי אפשרית לחלוטין מ-2020 (הסכמי אברהם). מומלץ להגיע פיזית לסניף.',
    tips_en:'Opening UAE account as Israeli is fully possible since 2020 (Abraham Accords). Best to visit branch in person.',
    time_he:'2-4 שבועות', time_en:'2-4 weeks' },
  Brazil: { flag:'🇧🇷', name_he:'ברזיל', name_en:'Brazil',
    banks_he:['Banco do Brasil — הבנק הלאומי','Itaú — הגדול ביותר, app מעולה','Nubank — דיגיטלי, קל לפתיחה (לתושבים)','Bradesco — נפוץ'],
    banks_en:['Banco do Brasil — national bank','Itaú — largest, excellent app','Nubank — digital, easy to open (residents)','Bradesco — widespread'],
    docs_he:['CPF (מספר מזהה ברזילאי — חובה לקבל ראשון)','פספורט + Visto בתוקף','הוכחת כתובת ברזילאית','CASV / מסמך כניסה'],
    docs_en:['CPF (Brazilian tax ID — must get first)','Passport + valid Visto','Brazilian proof of address','CASV / entry document'],
    tips_he:'CPF הוא שלב ראשון ומחייב. ניתן להגיש בקונסוליה ברזילאית בישראל. Nubank הכי פשוט לפתיחה ראשונית. ברזיל אינה ב-CRS — מידע לא מועבר אוטומטית לישראל.',
    tips_en:'CPF is mandatory first step. Can apply at Brazilian consulate in Israel. Nubank is easiest for initial account. Brazil is not in CRS — info is not automatically shared with Israel.',
    time_he:'4-8 שבועות (CPF + חשבון)', time_en:'4-8 weeks (CPF + account)' },
  Cyprus: { flag:'🇨🇾', name_he:'קפריסין', name_en:'Cyprus',
    banks_he:['Bank of Cyprus — הגדול','Hellenic Bank','RCB Bank — ידידותי ליזמים'],
    banks_en:['Bank of Cyprus — largest','Hellenic Bank','RCB Bank — entrepreneur-friendly'],
    docs_he:['פספורט','Yellow Slip (הוכחת תושבות)','הוכחת כתובת (AML חזק בקפריסין)','מקור הכנסה מפורט','לעיתים: Business plan לחשבון עסקי'],
    docs_en:['Passport','Yellow Slip (residency proof)','Proof of address (Cyprus KYC is strict)','Detailed source of funds','Sometimes: Business plan for corporate account'],
    tips_he:'AML/KYC בקפריסין קשוח. מומלץ לפתוח בנק עם עורך דין מקומי. חשבון Non-Dom חוסך מס דיבידנד.',
    tips_en:'AML/KYC in Cyprus is strict. Recommend opening with a local lawyer. Non-Dom account saves dividend tax.',
    time_he:'3-6 שבועות', time_en:'3-6 weeks' },
  Portugal: { flag:'🇵🇹', name_he:'פורטוגל', name_en:'Portugal',
    banks_he:['Millennium BCP — ידידותי לעולים','Banco Santander Portugal','ActivoBank — דיגיטלי'],
    banks_en:['Millennium BCP — expat-friendly','Banco Santander Portugal','ActivoBank — digital'],
    docs_he:['NIF (מספר מזהה פורטוגזי — ראשון!)','פספורט','הוכחת כתובת פורטוגזית','מקור הכנסה'],
    docs_en:['NIF (Portuguese tax ID — first!)','Passport','Portuguese proof of address','Source of funds'],
    tips_he:'NIF ניתן להשיג דרך עורך דין מקומי גם מרחוק. ה-NHR פג ב-2024 — בדוק מסלול NHR 2.0 (IFICI).',
    tips_en:'NIF can be obtained via a local lawyer remotely. NHR ended 2024 — check NHR 2.0 (IFICI) status.',
    time_he:'2-4 שבועות', time_en:'2-4 weeks' },
  Singapore: { flag:'🇸🇬', name_he:'סינגפור', name_en:'Singapore',
    banks_he:['DBS Bank — הגדול, app מצוין','OCBC Bank','UOB — טוב לעסקים'],
    banks_en:['DBS Bank — largest, excellent app','OCBC Bank','UOB — good for business'],
    docs_he:['פספורט','ויזת עבודה / EP / DP (נדרשת!)','הוכחת כתובת בסינגפור','מקור הכנסה'],
    docs_en:['Passport','Work pass / EP / DP (required!)','Singapore proof of address','Source of funds'],
    tips_he:'ללא Work Pass קשה מאוד לפתוח חשבון בסינגפור. שקול מבנה חברה מקומי ראשית.',
    tips_en:'Without a Work Pass it is very difficult to open a Singapore account. Consider setting up a local company first.',
    time_he:'1-3 שבועות (עם Pass)', time_en:'1-3 weeks (with Pass)' },
};

function BankMigrationPanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [selected, setSelected] = useState<string>('UAE');
  const c = BANK_GUIDE[selected];
  return (
    <div className="flex-shrink-0 overflow-y-auto" style={{ maxHeight:'72vh', background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'1.5rem' }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2"><Landmark size={18} style={{color:'var(--accent)'}}/>{lang==='he'?'מדריך הגירת נכסים ובנקאות':'Asset Migration & Banking Guide'}</h2>
        <button onClick={onClose} style={{color:'var(--text-muted)'}}><X size={18}/></button>
      </div>
      <div className="flex gap-2 flex-wrap mb-5">
        {Object.entries(BANK_GUIDE).map(([k,v]) => (
          <button key={k} onClick={()=>setSelected(k)}
            className="flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-all"
            style={{ background: selected===k ? 'var(--accent)' : 'var(--surface-2)', color: selected===k ? '#fff' : 'var(--text-muted)', border: selected===k ? '1px solid var(--accent)' : '1px solid var(--border)' }}>
            {v.flag} {lang==='he'?v.name_he:v.name_en}
          </button>
        ))}
      </div>
      {c && (
        <div className="flex flex-col gap-4">
          <div style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:10,padding:'1rem'}}>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><Landmark size={14} style={{color:'var(--accent)'}}/>{lang==='he'?'בנקים מומלצים':'Recommended Banks'}</h3>
            {(lang==='he'?c.banks_he:c.banks_en).map((b,i) => (
              <div key={i} className="text-sm py-1 flex items-start gap-2" style={{borderBottom:'1px solid var(--border)',color:'var(--text)'}}><span style={{color:'var(--accent)',flexShrink:0}}>▸</span>{b}</div>
            ))}
          </div>
          <div style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:10,padding:'1rem'}}>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><CheckCircle2 size={14} style={{color:'#10b981'}}/>{lang==='he'?'מסמכים נדרשים':'Required Documents'}</h3>
            {(lang==='he'?c.docs_he:c.docs_en).map((d,i) => (
              <div key={i} className="text-sm py-1 flex items-start gap-2" style={{color:'var(--text)'}}><span style={{color:'#10b981',flexShrink:0}}>✓</span>{d}</div>
            ))}
          </div>
          <div style={{background:'#3b82f611',border:'1px solid #3b82f633',borderRadius:10,padding:'1rem'}}>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><AlertTriangle size={14} style={{color:'#3b82f6'}}/>{lang==='he'?'טיפים חשובים':'Key Tips'}</h3>
            <p className="text-sm" style={{color:'var(--text)'}}>{lang==='he'?c.tips_he:c.tips_en}</p>
          </div>
          <div className="flex items-center gap-2 text-sm" style={{color:'var(--text-muted)'}}>
            <CalendarClock size={14}/>{lang==='he'?'זמן משוער:':'Estimated time:'} <span style={{color:'var(--accent)',fontWeight:600}}>{lang==='he'?c.time_he:c.time_en}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Visa & Residency Panel ───────────────────────────────────────────────────
interface VisaEntry {
  name: string;
  type: 'digital_nomad' | 'investor' | 'golden' | 'retirement' | 'work';
  minIncomeMo?: number;
  minInvestK?: number;
  processingWk: number;
  prYears: number;
  passportYears?: number;
  notes: string;
}
interface VisaCountryInfo { flag: string; name: string; featured?: boolean; visas: VisaEntry[]; taxHighlight: string; treaty: boolean; community: 'large' | 'medium' | 'small'; col: 'low' | 'medium' | 'high'; }

const VISA_DB: Record<string, VisaCountryInfo> = {
  Brazil:   { flag:'🇧🇷', name:'ברזיל', featured:true, treaty:false, community:'medium', col:'medium',
    taxHighlight:'⚡ אין אמנת מס עם ישראל — פוטנציאל תכנון ייחודי. 27.5% מס לתושב. ITCMD (עיזבון) רק 4–8%. ברזיל לא מדווחת CRS לישראל.',
    visas:[
      {name:'Digital Nomad',      type:'digital_nomad', minIncomeMo:1500, processingWk:8,  prYears:4, notes:'הכנסה מחוץ לברזיל. ניתן לחדש. אין חובת נוכחות רציפה.'},
      {name:'VITEM V (משקיע)',    type:'investor',       minInvestK:100,   processingWk:12, prYears:2, passportYears:5, notes:'R$500K + 10 עובדים ברזילאים. PR בשנתיים. דרכון בשנה 5.'},
      {name:'Passive Income',     type:'retirement',     minIncomeMo:1200, processingWk:10, prYears:2, passportYears:5, notes:'R$6,000/חודש הכנסה פסיבית — פנסיה, שכירות, דיבידנד.'},
      {name:'VIPER (השקעה ישירה)',type:'golden',          minInvestK:200,   processingWk:16, prYears:0, passportYears:4, notes:'R$1M השקעה → PR מיידית. דרכון ברזילאי בשנה 4.'},
    ]},
  UAE:      { flag:'🇦🇪', name:'UAE / דובאי', treaty:true, community:'large', col:'high',
    taxHighlight:'0% מס הכנסה, 0% CGT, 0% ירושה. 9% מס חברות מעל AED 375K. אמנת מס עם ישראל.',
    visas:[
      {name:'Freelancer / Free Zone', type:'digital_nomad', minIncomeMo:3000, processingWk:3,  prYears:0, notes:'IFZA/DMCC/Dubai South. ~$2,000/שנה. מחדש שנתי. Work permit כלול.'},
      {name:'Golden Visa (נדל"ן)',     type:'golden',          minInvestK:545,   processingWk:4,  prYears:0, notes:'AED 2M נדל"ן. תושבות 10 שנים מתחדשת. הכי פופולרי לישראלים.'},
      {name:'Golden Visa (כישרון)',    type:'work',                              processingWk:8,  prYears:0, notes:'ד"ר, מהנדס בכיר, יזם, חוקר. ועדה ממשלתית. לא דורש השקעה.'},
    ]},
  Cyprus:   { flag:'🇨🇾', name:'קפריסין', treaty:true, community:'large', col:'medium',
    taxHighlight:'Non-Dom: 0% מס על דיבידנד ורווחי הון ל-17 שנה. 12.5% מס חברות. אמנת מס עם ישראל.',
    visas:[
      {name:'Non-Dom + Company',   type:'work',       processingWk:6,  prYears:5, passportYears:7, notes:'הקם חברה → Non-Dom → 0% דיבידנד 17 שנה. הכי פופולרי.'},
      {name:'Digital Nomad',       type:'digital_nomad', minIncomeMo:3500, processingWk:7, prYears:5, passportYears:7, notes:'הכנסה מחוץ לקפריסין. ניתן להביא משפחה.'},
      {name:'Category F (פסיבי)', type:'retirement',  minIncomeMo:2167, processingWk:10, prYears:5, passportYears:7, notes:'€26K/שנה הכנסה זרה. 183 יום מגורים בשנה.'},
    ]},
  Portugal: { flag:'🇵🇹', name:'פורטוגל', treaty:true, community:'medium', col:'medium',
    taxHighlight:'NHR 2.0: 20% מס שטוח ל-10 שנים (הייטק/R&D/קיפ). דרכון EU לאחר 5 שנים. CGT 28%.',
    visas:[
      {name:'Digital Nomad D8',  type:'digital_nomad', minIncomeMo:1070, processingWk:8,  prYears:5, passportYears:10, notes:'~€1,070/חודש. גישה לשנגן. ניתן לחדש לתושבות.'},
      {name:'NHR 2.0 / IFICI',   type:'work',          processingWk:12, prYears:5, passportYears:10, notes:'20% מס שטוח ל-10 שנות מגורים. מקצועות הייטק/R&D.'},
      {name:'Passive D7',        type:'retirement',    minIncomeMo:1070, processingWk:8,  prYears:5, passportYears:10, notes:'פנסיה/שכירות/דיבידנד. מינימום €760/חודש.'},
    ]},
  Georgia:  { flag:'🇬🇪', name:'גאורגיה', treaty:false, community:'large', col:'low',
    taxHighlight:'1% מס על הכנסה מחו"ל (מתחת $155K). Virtual Zone: 0% מס IT. הכי מהיר ופשוט לישראלים.',
    visas:[
      {name:'ללא ויזה (ישראלים)',    type:'digital_nomad', processingWk:0, prYears:6, passportYears:10, notes:'365 יום ללא ויזה! פתיחת בנק ביום. הכנסה מחו"ל: 1% מס בלבד.'},
      {name:'Virtual Zone Company', type:'work', minInvestK:2, processingWk:1, prYears:6, passportYears:10, notes:'חברת IT: 0% מס על ייצוא שירותים. הקמה בשבוע. עלות $200 בלבד.'},
    ]},
  Malta:    { flag:'🇲🇹', name:'מלטה', treaty:true, community:'small', col:'high',
    taxHighlight:'Non-Dom: מס רק על הכנסה שמועברת למלטה. CGT 8%. דרכון מלטזי = דרכון EU.',
    visas:[
      {name:'Nomad Residence',   type:'digital_nomad', minIncomeMo:2700, processingWk:6,  prYears:5, passportYears:5, notes:'EU Residence. €2,700+/חודש. גישה לשנגן.'},
      {name:'Global Residence',  type:'golden',         minInvestK:220,   processingWk:16, prYears:5, passportYears:5, notes:'€220K–€275K נדל"ן. 15% מס על מה שמועבר למלטה.'},
    ]},
  Panama:   { flag:'🇵🇦', name:'פנמה', treaty:false, community:'medium', col:'medium',
    taxHighlight:'מיסוי טריטוריאלי: 0% על הכנסה מחוץ לפנמה. 0% CGT נכסים זרים. פנמה לא חתומה CRS!',
    visas:[
      {name:'Friendly Nations', type:'work',      minInvestK:5,   processingWk:8,  prYears:2, passportYears:7, notes:'ישראל ב"רשימה ידידותית"! $5K בבנק + PR בשנתיים. הכי קל.'},
      {name:'Pensionado',       type:'retirement', minIncomeMo:1000, processingWk:10, prYears:0, notes:'$1,000/חודש הכנסה פנסיונית. הנחות 25–50% בכל מקום.'},
    ]},
  Thailand: { flag:'🇹🇭', name:'תאילנד', treaty:true, community:'large', col:'low',
    taxHighlight:'הכנסה זרה שלא הועברה לתאילנד: 0% מס. הועברה: עד 35%. חיים נהדרים בעלות נמוכה.',
    visas:[
      {name:'LTR Visa (10 שנים)',  type:'digital_nomad', minIncomeMo:7000, processingWk:6, prYears:0, notes:'10 שנות ויזה. $80K/שנה הכנסה. Work permit כלול. 17% מס שטוח.'},
      {name:'Thailand Elite',      type:'investor',       minInvestK:30,    processingWk:4, prYears:0, notes:'20 שנות ויזה ב-$30K. הכנסה זרה שלא הועברה = 0% מס.'},
      {name:'Non-Imm O-A (50+)',   type:'retirement',     minIncomeMo:2300, processingWk:4, prYears:0, notes:'800K THB בבנק (~$23K). גיל 50+ בלבד. מחדש שנתי.'},
    ]},
  Hungary:  { flag:'🇭🇺', name:'הונגריה', treaty:true, community:'medium', col:'low',
    taxHighlight:'15% מס הכנסה שטוח — הכי נמוך ב-EU. 9% מס חברות — הכי נמוך ב-EU. דרכון EU.',
    visas:[
      {name:'Guest Investor Visa', type:'golden',          minInvestK:250,   processingWk:8, prYears:10, notes:'EU Residency. €250K+ נכס. ללא חובת מגורים. הכי קל להשיג EU residency.'},
      {name:'White Card (Nomad)',  type:'digital_nomad',   minIncomeMo:2000, processingWk:4, prYears:0,  notes:'12 חודשים. EU access. לא מוביל לתושבות.'},
    ]},
  Serbia:   { flag:'🇷🇸', name:'סרביה', treaty:false, community:'small', col:'low',
    taxHighlight:'15% מס הכנסה. 15% CGT. 15% מס חברות. אין מס ירושה על ילדים. כניסה פשוטה.',
    visas:[
      {name:'Business Residency', type:'work', processingWk:2, prYears:5, passportYears:10, notes:'פתח D.O.O (€100) → תושבות מיידית. ישראלים: 90 יום ללא ויזה.'},
    ]},
  Greece:   { flag:'🇬🇷', name:'יוון', treaty:true, community:'small', col:'medium',
    taxHighlight:'50% הנחה על מס הכנסה ל-7 שנות מגורים. 7% מס שטוח על פנסיה זרה ל-10 שנים. CGT 15%.',
    visas:[
      {name:'Digital Nomad',     type:'digital_nomad', minIncomeMo:3500, processingWk:8,  prYears:5, passportYears:7, notes:'50% הנחה על מס הכנסה ל-7 שנים ראשונות. גישה ל-EU.'},
      {name:'Golden Visa (נדל"ן)',type:'golden',         minInvestK:250,   processingWk:16, prYears:5, passportYears:7, notes:'€250K–€800K נדל"ן לפי אזור. EU residency. ללא חובת מגורים.'},
    ]},
};

const VISA_TYPE_COLOR: Record<string, string> = { digital_nomad:'#06b6d4', investor:'#f59e0b', golden:'#d4a017', retirement:'#10b981', work:'#8b5cf6' };

function VisaPanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [filter, setFilter] = useState<'all'|'digital_nomad'|'investor'|'golden'|'retirement'>('all');
  const [expanded, setExpanded] = useState<string|null>('Brazil');

  const typeLabel = (t: string) => ({ digital_nomad: lang==='he'?'דיגיטל נומד':'Digital Nomad', investor: lang==='he'?'משקיע':'Investor', golden:'Golden Visa', retirement: lang==='he'?'פנסיה/פסיבי':'Retirement', work: lang==='he'?'עסק/עבודה':'Business' }[t] || t);
  const colLabel  = (c: string) => ({ low: lang==='he'?'נמוך':'Low', medium: lang==='he'?'בינוני':'Med', high: lang==='he'?'גבוה':'High' }[c] || c);
  const commLabel = (c: string) => ({ large: lang==='he'?'גדולה 🟢':'Large 🟢', medium: lang==='he'?'בינונית 🟡':'Med 🟡', small: lang==='he'?'קטנה 🔴':'Small 🔴' }[c] || c);

  const visible = Object.entries(VISA_DB).filter(([, v]) =>
    filter==='all' || v.visas.some(vis => vis.type===filter)
  );
  const sorted = [...visible.filter(([k])=>k==='Brazil'), ...visible.filter(([k])=>k!=='Brazil')];

  const FILTERS: {key: typeof filter; label: string}[] = [
    {key:'all',          label: lang==='he'?'הכל':'All'},
    {key:'digital_nomad',label: lang==='he'?'דיגיטל נומד':'Digital Nomad'},
    {key:'investor',     label: lang==='he'?'משקיע':'Investor'},
    {key:'golden',       label:'Golden Visa'},
    {key:'retirement',   label: lang==='he'?'פנסיה/פסיבי':'Retirement'},
  ];

  return (
    <div className="border-b overflow-y-auto" style={{borderColor:'var(--border)',background:'var(--surface)',maxHeight:'70vh'}}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2"><Plane size={18} style={{color:'var(--accent)'}}/>{lang==='he'?'ויזות ותושבות':'Visas & Residency'}</h2>
            <p className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>{lang==='he'?'כל הדרכים לתושבות חוקית בחו"ל — עם דגש על ישראלים':'All paths to legal residency abroad — focused on Israelis'}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{color:'var(--text-muted)'}}><X size={16}/></button>
        </div>

        <div className="flex gap-2 flex-wrap mb-4">
          {FILTERS.map(f=>(
            <button key={f.key} onClick={()=>setFilter(f.key)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={{background:filter===f.key?'var(--accent)':'var(--surface-2)',color:filter===f.key?'white':'var(--text-muted)',border:filter===f.key?'none':'1px solid var(--border)'}}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {sorted.map(([key, c])=>(
            <div key={key} className="rounded-xl overflow-hidden" style={{border:key==='Brazil'?'1px solid rgba(99,102,241,0.5)':'1px solid var(--border)'}}>
              <div className="p-3 cursor-pointer hover:opacity-90 transition-all" style={{background:key==='Brazil'?'rgba(99,102,241,0.06)':'var(--surface-2)'}}
                onClick={()=>setExpanded(expanded===key?null:key)}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{c.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-sm">{c.name}</span>
                      {c.featured && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{background:'rgba(99,102,241,0.15)',color:'var(--accent)'}}>⭐ {lang==='he'?'מומלץ':'Featured'}</span>}
                      {c.treaty
                        ? <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{background:'rgba(16,185,129,0.1)',color:'#10b981'}}>{lang==='he'?'אמנה ✓':'Treaty ✓'}</span>
                        : <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{background:'rgba(245,158,11,0.1)',color:'#f59e0b'}}>{lang==='he'?'ללא אמנה':'No Treaty'}</span>}
                      <span className="text-xs" style={{color:'var(--text-muted)'}}>{lang==='he'?'קהילה:':'Community:'} {commLabel(c.community)}</span>
                      <span className="text-xs" style={{color:'var(--text-muted)'}}>{lang==='he'?'יוקר:':'Cost:'} {colLabel(c.col)}</span>
                    </div>
                    <div className="flex gap-1 flex-wrap mb-2">
                      {c.visas.map((v,i)=>(
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{background:`${VISA_TYPE_COLOR[v.type]}18`,color:VISA_TYPE_COLOR[v.type]}}>
                          {typeLabel(v.type)}{v.minIncomeMo?` $${v.minIncomeMo}/mo`:''}{v.minInvestK?` $${v.minInvestK}K`:''}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs" style={{color:key==='Brazil'?'var(--accent)':'var(--text-muted)'}}>{c.taxHighlight}</p>
                  </div>
                  <ChevronDown size={14} style={{color:'var(--text-muted)',transform:expanded===key?'rotate(180deg)':'none',transition:'transform 0.2s',flexShrink:0,marginTop:4}}/>
                </div>
              </div>

              {expanded===key && (
                <div className="p-3 space-y-2" style={{background:key==='Brazil'?'rgba(99,102,241,0.03)':'var(--surface-2)',borderTop:'1px solid var(--border)'}}>
                  {c.visas.map((v,i)=>(
                    <div key={i} className="rounded-lg p-2.5" style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm">{v.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{background:`${VISA_TYPE_COLOR[v.type]}18`,color:VISA_TYPE_COLOR[v.type]}}>{typeLabel(v.type)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs flex-shrink-0" style={{color:'var(--text-muted)'}}>
                          {v.processingWk>0 && <span>⏱ {v.processingWk}{lang==='he'?'שב\'':'wk'}</span>}
                          <span>PR: {v.prYears===0?(lang==='he'?'מיידי':'Now'):`${v.prYears}Y`}</span>
                          {v.passportYears && <span>🛂{v.passportYears}Y</span>}
                        </div>
                      </div>
                      <div className="flex gap-3 text-xs mb-1.5 flex-wrap">
                        {v.minIncomeMo && <span style={{color:'#10b981'}}>💰 ${v.minIncomeMo.toLocaleString()}/mo</span>}
                        {v.minInvestK  && <span style={{color:'#f59e0b'}}>💵 ${v.minInvestK}K</span>}
                        {!v.minIncomeMo && !v.minInvestK && <span style={{color:'#10b981'}}>✓ {lang==='he'?'ללא דרישה מינימלית':'No min. requirement'}</span>}
                      </div>
                      <p className="text-xs" style={{color:'var(--text-muted)'}}>{v.notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs mt-3 text-center" style={{color:'var(--text-muted)'}}>
          ⚠️ {lang==='he'?'מידע כללי בלבד. דרישות משתנות — בדוק עם עו"ד הגירה לפני החלטה':'General information only. Verify with an immigration attorney before acting.'}
        </p>
      </div>
    </div>
  );
}

// ─── Country Fit Score ─────────────────────────────────────────────────────────
const FIT_DATA: Record<string, {flag:string;name:string;taxSalary:number;taxCG:number;taxPassive:number;visaEase:number;stability:number;colCheap:number;community:number;treatyIsrael:boolean;usFriendly:boolean}> = {
  UAE:      {flag:'🇦🇪',name:'UAE / דובאי',   taxSalary:0,    taxCG:0,   taxPassive:0,   visaEase:85,stability:80,colCheap:30,community:95,treatyIsrael:true, usFriendly:true},
  Cyprus:   {flag:'🇨🇾',name:'קפריסין',        taxSalary:0,    taxCG:0,   taxPassive:0,   visaEase:80,stability:75,colCheap:55,community:90,treatyIsrael:true, usFriendly:true},
  Georgia:  {flag:'🇬🇪',name:'גאורגיה',        taxSalary:1,    taxCG:5,   taxPassive:5,   visaEase:98,stability:58,colCheap:90,community:85,treatyIsrael:false,usFriendly:false},
  Portugal: {flag:'🇵🇹',name:'פורטוגל',        taxSalary:20,   taxCG:28,  taxPassive:28,  visaEase:70,stability:85,colCheap:60,community:70,treatyIsrael:true, usFriendly:true},
  Malta:    {flag:'🇲🇹',name:'מלטה',           taxSalary:15,   taxCG:8,   taxPassive:0,   visaEase:72,stability:85,colCheap:45,community:50,treatyIsrael:true, usFriendly:true},
  Hungary:  {flag:'🇭🇺',name:'הונגריה',        taxSalary:15,   taxCG:15,  taxPassive:15,  visaEase:68,stability:65,colCheap:72,community:60,treatyIsrael:true, usFriendly:true},
  Panama:   {flag:'🇵🇦',name:'פנמה',           taxSalary:0,    taxCG:0,   taxPassive:0,   visaEase:88,stability:68,colCheap:68,community:70,treatyIsrael:false,usFriendly:false},
  Brazil:   {flag:'🇧🇷',name:'ברזיל',          taxSalary:27.5, taxCG:22,  taxPassive:22,  visaEase:75,stability:58,colCheap:68,community:65,treatyIsrael:false,usFriendly:false},
  Thailand: {flag:'🇹🇭',name:'תאילנד',         taxSalary:0,    taxCG:0,   taxPassive:0,   visaEase:78,stability:62,colCheap:88,community:80,treatyIsrael:true, usFriendly:false},
  Serbia:   {flag:'🇷🇸',name:'סרביה',          taxSalary:15,   taxCG:15,  taxPassive:15,  visaEase:90,stability:58,colCheap:85,community:40,treatyIsrael:false,usFriendly:false},
  Greece:      {flag:'🇬🇷',name:'יוון',           taxSalary:15,  taxCG:15,  taxPassive:15,  visaEase:72,stability:68,colCheap:62,community:50,treatyIsrael:true, usFriendly:true},
  Italy:       {flag:'🇮🇹',name:'איטליה',         taxSalary:43,  taxCG:26,  taxPassive:26,  visaEase:68,stability:68,colCheap:45,community:50,treatyIsrael:true, usFriendly:true},
  Singapore:   {flag:'🇸🇬',name:'סינגפור',        taxSalary:22,  taxCG:0,   taxPassive:0,   visaEase:55,stability:96,colCheap:25,community:70,treatyIsrael:false,usFriendly:true},
  Montenegro:  {flag:'🇲🇪',name:'מונטנגרו',       taxSalary:9,   taxCG:9,   taxPassive:9,   visaEase:90,stability:62,colCheap:80,community:45,treatyIsrael:false,usFriendly:false},
  Mexico:      {flag:'🇲🇽',name:'מקסיקו',         taxSalary:0,   taxCG:10,  taxPassive:10,  visaEase:82,stability:55,colCheap:75,community:72,treatyIsrael:false,usFriendly:false},
  Colombia:    {flag:'🇨🇴',name:'קולומביה',       taxSalary:0,   taxCG:10,  taxPassive:10,  visaEase:85,stability:52,colCheap:85,community:60,treatyIsrael:false,usFriendly:false},
  Netherlands: {flag:'🇳🇱',name:'הולנד',          taxSalary:30,  taxCG:0,   taxPassive:31,  visaEase:70,stability:92,colCheap:30,community:55,treatyIsrael:true, usFriendly:true},
  Estonia:     {flag:'🇪🇪',name:'אסטוניה',        taxSalary:20,  taxCG:20,  taxPassive:20,  visaEase:75,stability:88,colCheap:62,community:42,treatyIsrael:false,usFriendly:true},
};

function calcFit(key: string, d: typeof FIT_DATA[string], profile: UserProfile, lang: Lang) {
  const income = (profile.income.employment||0) + (profile.income.business||0) + (profile.income.capital_gains||0) + (profile.income.dividends||0) + (profile.income.other||0);
  const isUS = profile.is_us_person;
  // Italy flat tax: €100K/yr fixed — great for income >$400K
  const effectiveRate = key==='Italy' && income>400000 ? (110000/income)*100 : d.taxSalary;
  let taxS = effectiveRate===0?40:effectiveRate<=5?35:effectiveRate<=15?25:effectiveRate<=20?18:effectiveRate<=28?10:4;
  if (isUS && !d.usFriendly) taxS = Math.max(0, taxS-15);
  const visaS = Math.round(d.visaEase*0.20);
  const colS  = Math.round(d.colCheap*0.15);
  const commS = Math.round(d.community*0.10);
  const stabS = Math.round(d.stability*0.15);
  const total = Math.min(100, taxS+visaS+colS+commS+stabS);
  const reasons = [
    effectiveRate===0?(lang==='he'?'0% מס':'0% tax'):`${effectiveRate.toFixed(0)}% ${lang==='he'?'מס':'tax'}`,
    d.community>=85?(lang==='he'?'קהילה גדולה':'large community'):'',
    d.colCheap>=85?(lang==='he'?'יוקר נמוך':'low cost'):'',
    d.visaEase>=90?(lang==='he'?'ויזה פשוטה':'easy visa'):'',
  ].filter(Boolean);
  return { total, taxS, visaS, colS, commS, stabS, topReason: reasons[0]||'' };
}

function CountryFitPanel({ lang, profile, onClose }: { lang: Lang; profile: UserProfile; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string|null>(null);
  const hasProfile = ((profile.income.employment||0)+(profile.income.business||0))>0 || !!profile.current_residency;

  const scored = useMemo(()=>
    Object.entries(FIT_DATA)
      .map(([key,d])=>({key,d,...calcFit(key,d,profile,lang)}))
      .sort((a,b)=>b.total-a.total),
  [profile,lang]);

  const medals = ['🥇','🥈','🥉'];

  return (
    <div className="border-b overflow-y-auto" style={{borderColor:'var(--border)',background:'var(--surface)',maxHeight:'70vh'}}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2"><Award size={18} style={{color:'var(--accent)'}}/>Country Fit Score</h2>
            <p className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>{lang==='he'?'דירוג מדינות לפי ההתאמה לפרופיל שלך — מס, ויזה, עלות חיים, קהילה':'Country ranking based on your profile — tax, visa, cost of living, community'}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{color:'var(--text-muted)'}}><X size={16}/></button>
        </div>

        {!hasProfile && (
          <div className="rounded-xl p-3 mb-3 text-sm flex items-center gap-2" style={{background:'rgba(99,102,241,0.1)',border:'1px solid var(--accent)',color:'var(--accent)'}}>
            ℹ️ {lang==='he'?'מלא את הפרופיל הפיננסי לציונים מדויקים יותר לפי ההכנסה וסטטוס US Person':'Fill your financial profile for more accurate scores'}
          </div>
        )}

        <div className="space-y-2">
          {scored.map(({key,d,total,taxS,visaS,colS,commS,stabS,topReason},idx)=>(
            <div key={key}>
              <div className="rounded-xl p-3 cursor-pointer hover:opacity-90 transition-all"
                style={{background:'var(--surface-2)',border:`1px solid ${idx===0?'rgba(99,102,241,0.5)':idx<3?'rgba(99,102,241,0.2)':'var(--border)'}`}}
                onClick={()=>setExpanded(expanded===key?null:key)}>
                <div className="flex items-center gap-2">
                  <span className="w-5 text-center text-sm">{idx<3?medals[idx]:''}</span>
                  <span className="text-lg">{d.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{d.name}</span>
                      <div className="flex items-center gap-2">
                        {topReason && <span className="text-xs px-2 py-0.5 rounded-full hidden sm:block" style={{background:'rgba(99,102,241,0.12)',color:'var(--accent)'}}>{topReason}</span>}
                        <span className="font-bold text-lg" style={{color:idx===0?'var(--accent)':idx<3?'#10b981':'var(--text)',minWidth:'2.5rem',textAlign:'end'}}>{total}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{background:'var(--border)'}}>
                      <div className="h-full rounded-full transition-all" style={{width:`${total}%`,background:idx===0?'var(--accent)':idx<3?'#10b981':'var(--text-muted)'}}/>
                    </div>
                  </div>
                  <ChevronDown size={13} style={{color:'var(--text-muted)',transform:expanded===key?'rotate(180deg)':'none',transition:'transform 0.2s',flexShrink:0}}/>
                </div>
              </div>

              {expanded===key && (
                <div className="rounded-xl p-3 mt-1 space-y-2" style={{background:'rgba(99,102,241,0.05)',border:'1px solid rgba(99,102,241,0.2)'}}>
                  {[
                    {label:lang==='he'?'יתרון מס':'Tax advantage',      s:taxS,  max:40},
                    {label:lang==='he'?'נגישות ויזה':'Visa ease',        s:visaS, max:20},
                    {label:lang==='he'?'יוקר מחיה':'Cost of living',     s:colS,  max:15},
                    {label:lang==='he'?'קהילה ישראלית':'Israeli community',s:commS,max:10},
                    {label:lang==='he'?'יציבות':'Stability',             s:stabS, max:15},
                  ].map((b,i)=>(
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-32 flex-shrink-0" style={{color:'var(--text-muted)'}}>{b.label}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'var(--border)'}}>
                        <div className="h-full rounded-full" style={{width:`${(b.s/b.max)*100}%`,background:'var(--accent)'}}/>
                      </div>
                      <span className="w-10 text-end font-semibold">{b.s}/{b.max}</span>
                    </div>
                  ))}
                  {d.treatyIsrael && <p className="text-xs" style={{color:'#10b981'}}>✓ {lang==='he'?'אמנת מס עם ישראל':'Tax treaty with Israel'}</p>}
                  {profile.is_us_person && !d.usFriendly && <p className="text-xs" style={{color:'#f59e0b'}}>⚠️ {lang==='he'?'US Person: אין אמנת מס עם ארה"ב — שקול בזהירות':'US Person: no US treaty — consider carefully'}</p>}
                  {key==='Italy' && ((profile.income.employment||0)+(profile.income.business||0))>400000 && <p className="text-xs" style={{color:'var(--accent)'}}>⭐ {lang==='he'?'Flat Tax: €100K/שנה ללא תלות בגובה ההכנסה — מעולה להכנסות גבוהות':'Flat Tax: €100K/yr fixed — excellent for high earners'}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs mt-3 text-center" style={{color:'var(--text-muted)'}}>
          {lang==='he'?'הציון: מס 40%, ויזה 20%, יוקר 15%, קהילה 10%, יציבות 15%':'Score: tax 40%, visa 20%, cost 15%, community 10%, stability 15%'}
        </p>
      </div>
    </div>
  );
}

// ─── Real Estate Abroad Calculator ────────────────────────────────────────────
const REA_COUNTRIES: Record<string, { name: string; cgtRate: number; rentalRate: number; cgtExemptYears?: number }> = {
  UAE:      { name: 'UAE / Dubai',  cgtRate: 0,    rentalRate: 0 },
  Cyprus:   { name: 'Cyprus',       cgtRate: 0,    rentalRate: 0 },
  Portugal: { name: 'Portugal',     cgtRate: 0.28, rentalRate: 0.28 },
  Germany:  { name: 'Germany',      cgtRate: 0,    rentalRate: 0.15, cgtExemptYears: 10 },
  Greece:   { name: 'Greece',       cgtRate: 0.15, rentalRate: 0.15 },
  Spain:    { name: 'Spain',        cgtRate: 0.19, rentalRate: 0.24 },
  USA:      { name: 'USA',          cgtRate: 0.20, rentalRate: 0.30 },
  Thailand: { name: 'Thailand',     cgtRate: 0,    rentalRate: 0.15 },
  Georgia:  { name: 'Georgia',      cgtRate: 0.05, rentalRate: 0.20 },
  Turkey:   { name: 'Turkey',       cgtRate: 0,    rentalRate: 0.15, cgtExemptYears: 5 },
  Malta:    { name: 'Malta',        cgtRate: 0.08, rentalRate: 0.15 },
  Italy:    { name: 'Italy',        cgtRate: 0.26, rentalRate: 0.21, cgtExemptYears: 5 },
};

function RealEstateAbroadPanel({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const tr = useTranslation(lang);
  const [country, setCountry] = useState('UAE');
  const [purchasePrice, setPurchasePrice] = useState(1000000);
  const [salePrice, setSalePrice] = useState(1300000);
  const [rentalIncome, setRentalIncome] = useState(60000);
  const [holdingYears, setHoldingYears] = useState(5);
  const [savedMsg, setSavedMsg] = useState(false);

  const results = useMemo(() => {
    const c = REA_COUNTRIES[country];
    const gain = Math.max(0, salePrice - purchasePrice);
    const isCgtExempt = c.cgtExemptYears != null && holdingYears >= c.cgtExemptYears;
    const effectiveCgt = isCgtExempt ? 0 : c.cgtRate;
    const cgtDest = Math.round(gain * effectiveCgt);
    const rentalTaxDest = Math.round(rentalIncome * c.rentalRate);
    const israelCgt = Math.round(gain * 0.25);
    const foreignCredit = Math.min(israelCgt, cgtDest);
    const netIsraelTax = Math.max(0, israelCgt - foreignCredit);
    const totalCgt = cgtDest + netIsraelTax;
    const totalTax = totalCgt + rentalTaxDest;
    const netRate = gain > 0 ? (totalCgt / gain) * 100 : 0;
    return { gain, cgtDest, rentalTaxDest, israelCgt, foreignCredit, netIsraelTax, totalCgt, totalTax, netRate, effectiveCgt, isCgtExempt };
  }, [country, purchasePrice, salePrice, rentalIncome, holdingYears]);

  const fmt = (n: number) => Math.round(n).toLocaleString();

  const saveCalc = () => {
    const saved = JSON.parse(localStorage.getItem('taxmaster_saved_calcs') || '[]');
    saved.unshift({
      id: Date.now(),
      type: 'realEstateAbroad',
      country,
      purchasePrice,
      salePrice,
      rentalIncome,
      holdingYears,
      results,
      savedAt: new Date().toISOString(),
    });
    localStorage.setItem('taxmaster_saved_calcs', JSON.stringify(saved.slice(0, 20)));
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const Field = ({ label, val, setter, step = 10000 }: { label: string; val: number; setter: (v: number) => void; step?: number }) => (
    <div>
      <div className="text-xs mb-1 font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <input type="number" value={val} step={step}
        onChange={e => setter(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
    </div>
  );

  const Row = ({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) => (
    <div className="flex justify-between items-center py-1.5 text-sm border-b" style={{ borderColor: 'var(--border)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className={bold ? 'font-bold text-base' : 'font-semibold'} style={{ color: color || 'var(--text)' }}>{value}</span>
    </div>
  );

  return (
    <div className="border-b overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--surface)', maxHeight: '70vh' }}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Globe size={18} style={{ color: 'var(--accent)' }} />
              {tr.realEstateAbroadTitle}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.realEstateAbroadSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div className="mb-3">
            <div className="text-xs mb-1 font-semibold" style={{ color: 'var(--text-muted)' }}>{tr.reaCountry}</div>
            <select value={country} onChange={e => setCountry(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              {Object.entries(REA_COUNTRIES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr.reaPurchasePrice} val={purchasePrice} setter={setPurchasePrice} />
            <Field label={tr.reaSalePrice} val={salePrice} setter={setSalePrice} />
            <Field label={tr.reaRentalIncome} val={rentalIncome} setter={setRentalIncome} step={1000} />
            <Field label={tr.reaHoldingYears} val={holdingYears} setter={setHoldingYears} step={1} />
          </div>
          {REA_COUNTRIES[country].cgtExemptYears != null && (
            <p className="text-xs mt-2" style={{ color: 'var(--accent)' }}>
              ℹ️ {country === 'Germany'
                ? (lang === 'he' ? 'גרמניה: פטור ממס שבח לאחר 10 שנות החזקה' : 'Germany: CGT exempt after 10 years of ownership')
                : country === 'Turkey'
                ? (lang === 'he' ? 'טורקיה: פטור ממס שבח לאחר 5 שנות החזקה' : 'Turkey: CGT exempt after 5 years of ownership')
                : (lang === 'he' ? `פטור ממס שבח לאחר ${REA_COUNTRIES[country].cgtExemptYears} שנים` : `CGT exempt after ${REA_COUNTRIES[country].cgtExemptYears} years`)}
              {results.isCgtExempt && <span style={{ color: '#10b981' }}>{lang === 'he' ? ' — פטור חל!' : ' — Exemption applies!'}</span>}
            </p>
          )}
        </div>

        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold text-sm mb-3">{lang === 'he' ? 'סיכום מס' : 'Tax Summary'}</h3>
          <Row label={lang === 'he' ? 'רווח הון' : 'Capital Gain'} value={fmt(results.gain)} />
          <Row label={`${tr.reaCgtDest} (${(results.effectiveCgt * 100).toFixed(0)}%)`} value={fmt(results.cgtDest)} color="#f59e0b" />
          <Row label={tr.reaIsraelTax} value={fmt(results.israelCgt)} color="#f59e0b" />
          <Row label={`${tr.reaForeignCredit} (−)`} value={fmt(results.foreignCredit)} color="#10b981" />
          <div className="border-t mt-2 pt-2" style={{ borderColor: 'var(--border)' }}>
            <Row label={tr.reaNetIsraelTax} value={fmt(results.netIsraelTax)} color="#ef4444" bold />
            <Row label={lang === 'he' ? 'סה"כ מס שבח (שתי מדינות)' : 'Total CGT (both countries)'} value={fmt(results.totalCgt)} color="#ef4444" bold />
            <Row label={tr.reaRentalTaxDest} value={`${fmt(results.rentalTaxDest)}/yr`} color="#f59e0b" />
            <Row label={tr.reaNetRate} value={results.netRate.toFixed(1) + '%'} />
          </div>
        </div>

        <div className="rounded-xl p-3 mb-4 text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'var(--text-muted)' }}>
          ⚠️ {tr.reaNote}
        </div>

        <button onClick={saveCalc}
          className="w-full py-2 rounded-xl text-sm font-semibold hover:opacity-80 transition-all"
          style={{ background: savedMsg ? 'rgba(16,185,129,0.15)' : 'var(--surface-2)', color: savedMsg ? '#10b981' : 'var(--text-muted)', border: `1px solid ${savedMsg ? '#10b981' : 'var(--border)'}` }}>
          {savedMsg ? tr.calcSaved : `💾 ${tr.saveCalc}`}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdvisorPage() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Lang>('he');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showSavings, setShowSavings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showExitTax, setShowExitTax] = useState(false);
  const [showIsraelWizard, setShowIsraelWizard] = useState(false);
  const [showCompanyOptimizer, setShowCompanyOptimizer] = useState(false);
  const [showTaxUpdates, setShowTaxUpdates] = useState(false);
  const [showLetterGenerator, setShowLetterGenerator] = useState(false);
  const [showSideBySide, setShowSideBySide] = useState(false);
  const [showFatca, setShowFatca] = useState(false);
  const [showScenarioDiff, setShowScenarioDiff] = useState(false);
  const [showDocChecklist, setShowDocChecklist] = useState(false);
  const [showTimingCalc, setShowTimingCalc] = useState(false);
  const [showTreatyLookup, setShowTreatyLookup] = useState(false);
  const [showCountryProfiles, setShowCountryProfiles] = useState(false);
  const [showRealEstateCalc, setShowRealEstateCalc] = useState(false);
  const [showPensionCalc, setShowPensionCalc] = useState(false);
  const [showSection100A, setShowSection100A] = useState(false);
  const [showDtaaCalc, setShowDtaaCalc] = useState(false);
  const [showAnnualTax, setShowAnnualTax] = useState(false);
  const [showDaysTracker, setShowDaysTracker] = useState(false);
  const [showEmigROI, setShowEmigROI] = useState(false);
  const [showMultiYear, setShowMultiYear] = useState(false);
  const [showRealEstateAbroad, setShowRealEstateAbroad] = useState(false);
  const [showVisaPanel, setShowVisaPanel] = useState(false);
  const [showCountryFit, setShowCountryFit] = useState(false);
  const [showRedFlags, setShowRedFlags] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showWealthSim, setShowWealthSim] = useState(false);
  const [showBankMigration, setShowBankMigration] = useState(false);
  const [showCryptoCalc, setShowCryptoCalc] = useState(false);
  const [showCRSChecker, setShowCRSChecker] = useState(false);
  const [showRemoteWorker, setShowRemoteWorker] = useState(false);
  const [showPensionGuide, setShowPensionGuide] = useState(false);
  const [showBusinessExit, setShowBusinessExit] = useState(false);
  const [showMyPlan, setShowMyPlan] = useState(false);
  const [showCompMatrix, setShowCompMatrix] = useState(false);
  const [showEstatePlanner, setShowEstatePlanner] = useState(false);
  const [showPortfolioOpt, setShowPortfolioOpt] = useState(false);
  const [showFxCalc, setShowFxCalc] = useState(false);
  const [showProDirectory, setShowProDirectory] = useState(false);
  const [showTaxMap, setShowTaxMap] = useState(false);
  const [showLifetimeSavings, setShowLifetimeSavings] = useState(false);
  const [showFamilyImpact, setShowFamilyImpact] = useState(false);
  const [showTaxAlerts, setShowTaxAlerts] = useState(false);
  const [showTaxScore, setShowTaxScore] = useState(false);
  const [showTaxAudit, setShowTaxAudit] = useState(false);
  const [showPassportOptimizer, setShowPassportOptimizer] = useState(false);
  const [showDeadlines, setShowDeadlines] = useState(false);
  const [showDocAnalyzer, setShowDocAnalyzer] = useState(false);
  const [showPeerBenchmark, setShowPeerBenchmark] = useState(false);
  const [showTaxForecast, setShowTaxForecast] = useState(false);
  const [showLegalDocs, setShowLegalDocs] = useState(false);
  const [showAdvisorPortal, setShowAdvisorPortal] = useState(false);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const [showPdfReport, setShowPdfReport] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [devilMode, setDevilMode] = useState(false);
  const [planMode, setPlanMode] = useState(false);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'claude'>('gemini');
  const [savingsData, setSavingsData] = useState<SavingsAnalysis | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; row: Parameters<typeof CountryDetailModal>[0]['savingsRow'] } | null>(null);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [profileSaved, setProfileSaved] = useState(false);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const conversationHistoryRef = useRef<Array<{ role: string; content: string }>>([]);

  const tr = useTranslation(lang);
  const dir = lang === 'he' ? 'rtl' : 'ltr';

  useEffect(() => {
    const saved = localStorage.getItem('tax_master_profile');
    const savedHistory = localStorage.getItem('tax_master_sessions');
    if (saved) { try { setProfile(JSON.parse(saved)); setProfileSaved(true); } catch {} }

    // Language priority: URL ?lang param → shared wl_lang key → app-specific key → browser
    const urlLang = new URLSearchParams(window.location.search).get('lang') as Lang;
    const wlLang  = localStorage.getItem('wl_lang') as Lang;
    const savedLang = localStorage.getItem('tax_master_lang') as Lang;
    const resolved = [urlLang, wlLang, savedLang].find(l => l && ['he','en','pt','es'].includes(l));
    if (resolved) {
      setLang(resolved);
      localStorage.setItem('wl_lang', resolved);
      localStorage.setItem('tax_master_lang', resolved);
    } else {
      const bl = (navigator.language || 'en').toLowerCase();
      if (bl.startsWith('pt')) setLang('pt');
      else if (bl.startsWith('es')) setLang('es');
      else setLang('en');
    }

    if (savedHistory) { try { setSavedSessions(JSON.parse(savedHistory)); } catch {} }
    setMounted(true);
  }, []);

  const persistSessions = (sessions: SavedSession[]) => {
    setSavedSessions(sessions);
    localStorage.setItem('tax_master_sessions', JSON.stringify(sessions.slice(0, 20)));
  };

  const saveCurrentSession = () => {
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return;
    const title = userMessages[0].content.slice(0, 70) + (userMessages[0].content.length > 70 ? '…' : '');
    const session: SavedSession = {
      id: Date.now().toString(),
      title,
      messages,
      history: conversationHistoryRef.current,
      savedAt: new Date().toISOString(),
    };
    persistSessions([session, ...savedSessions]);
  };

  const loadSession = (session: SavedSession) => {
    setMessages(session.messages);
    conversationHistoryRef.current = session.history;
    setShowHistory(false);
  };

  const deleteSession = (id: string) => {
    persistSessions(savedSessions.filter(s => s.id !== id));
  };

  const handleFileUpload = async (file: File) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: `📎 ${file.name}`, timestamp: new Date() };
    const assistantMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', tools: [], timestamp: new Date() };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      const result = await analyzeDocument(file.name, b64, file.type || 'application/pdf', lang);
      const text = result.analysis || (result.error ? `❌ ${result.error}` : '❌ Error');
      setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: text }; return u; });
    } catch {
      setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: '❌ Upload failed.' }; return u; });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveProfile = () => {
    localStorage.setItem('tax_master_profile', JSON.stringify(profile));
    setProfileSaved(true);
    setShowProfile(false);
  };

  const toggleLang = () => {
    const next: Lang = lang === 'he' ? 'en' : lang === 'en' ? 'pt' : lang === 'pt' ? 'es' : 'he';
    setLang(next);
    localStorage.setItem('tax_master_lang', next);
    localStorage.setItem('wl_lang', next);  // shared cross-app key
  };

  const sendMessage = useCallback(async (text?: string) => {
    const raw = text || input.trim();
    if (!raw || isLoading) return;
    const messageText = devilMode && !text
      ? (lang === 'he'
          ? `😈 מצב עו"ד שטן — ישבתי בנעלי פקיד שומה ישראלי ואנסה לפרוץ את התוכנית הזו:\n\n${raw}\n\nנתח את התוכנית מנקודת המבט של רשות המסים: 1) אילו טיעונים תעלה הרשות לדחות את ניתוק התושבות? 2) אילו "מרכז חיים" יסמנו ישראל ולא לחו"ל? 3) מה הסיכויים בבית המשפט? 4) אילו מהלכים מקדימים יכולים לחזק את המעמד? 5) מה ממש לא יעבוד ולמה?`
          : `😈 Devil's Advocate — playing the role of the Israeli Tax Authority against this plan:\n\n${raw}\n\nAnalyze from the Tax Authority's perspective: 1) Arguments to reject non-residency claim? 2) Center-of-life factors pointing to Israel? 3) Realistic court challenge risk? 4) Which steps strengthen or weaken the case? 5) What definitely won't work and why?`)
      : planMode && !text
        ? (lang === 'he'
            ? `📋 בדיקת תוכנית מס:\n${raw}\n\nנא לנתח את התוכנית הזו ולזהות: 1) סיכוני מס ומלכודות, 2) שלבים חסרים, 3) שיקולי תזמון, 4) חלופות טובות יותר, 5) מה נכון בתוכנית.`
            : `📋 Tax Plan Review:\n${raw}\n\nPlease analyze this plan and identify: 1) Tax risks and pitfalls, 2) Missing steps, 3) Timing considerations, 4) Better alternatives, 5) What's correct.`)
        : raw;

    setInput('');
    setIsLoading(true);
    setShowCompare(false);

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: messageText, timestamp: new Date() };
    const assistantMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', tools: [], timestamp: new Date() };

    setMessages(prev => [...prev, userMsg, assistantMsg]);

    try {
      for await (const event of streamChat(messageText, profileSaved ? profile : null, conversationHistoryRef.current, aiProvider)) {
        if (event.type === 'text_delta') {
          setMessages(prev => {
            const upd = [...prev];
            const last = upd[upd.length - 1];
            if (last.role === 'assistant') upd[upd.length - 1] = { ...last, content: last.content + event.text };
            return upd;
          });
        } else if (event.type === 'tool_start' || event.type === 'tool_result') {
          setMessages(prev => {
            const upd = [...prev];
            const last = upd[upd.length - 1];
            if (last.role === 'assistant') upd[upd.length - 1] = { ...last, tools: [...(last.tools || []), event as ToolEvent] };
            return upd;
          });
        } else if (event.type === 'error') {
          setMessages(prev => {
            const upd = [...prev];
            const last = upd[upd.length - 1];
            if (last.role === 'assistant') upd[upd.length - 1] = { ...last, content: `❌ Error: ${event.message}` };
            return upd;
          });
        }
      }

      setMessages(prev => {
        const lastAssistant = prev[prev.length - 1];
        if (lastAssistant.role === 'assistant' && lastAssistant.content) {
          conversationHistoryRef.current = [
            ...conversationHistoryRef.current,
            { role: 'user', content: messageText },
            { role: 'assistant', content: lastAssistant.content },
          ].slice(-20);
        }
        return prev;
      });
    } catch {
      setMessages(prev => {
        const upd = [...prev];
        const last = upd[upd.length - 1];
        if (last.role === 'assistant') upd[upd.length - 1] = { ...last, content: '❌ Connection error. Please try again.' };
        return upd;
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, profile, profileSaved, planMode, devilMode, lang]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const buildTaxSummary = (): string => {
    const totalIncome = Object.values(profile.income).reduce((a, b) => a + b, 0);
    const fmt = (n: number) => `$${n.toLocaleString()}`;
    const lines: string[] = ['=== WizeTax Summary ==='];

    const residency = profile.current_residency || 'Unknown';
    lines.push(`Current country: ${residency}`);
    lines.push(`Annual income: ${fmt(totalIncome)}`);

    const incomeBreakdown = Object.entries(profile.income)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `  ${k.replace(/_/g, ' ')}: ${fmt(v)}`)
      .join('\n');
    if (incomeBreakdown) lines.push(`Income breakdown:\n${incomeBreakdown}`);

    if (savingsData && !savingsData.error) {
      const rate = savingsData.current_effective_rate;
      const tax = savingsData.current_tax;
      lines.push(`Current effective tax: ${rate}% (${fmt(tax)}/yr)`);

      const topDests = savingsData.results
        .filter(r => r.annual_savings > 0)
        .slice(0, 5);

      if (topDests.length > 0) {
        lines.push('');
        lines.push('Top destinations by tax savings:');
        topDests.forEach(r => {
          const regimes = r.special_regimes.length > 0 ? ` [${r.special_regimes.join(', ')}]` : '';
          lines.push(`• ${r.name}: ${r.effective_rate}% effective rate, saving ${fmt(r.annual_savings)}/yr${regimes}`);
        });
      }

      if (savingsData.exit_tax_info?.note) {
        lines.push('');
        lines.push(`Exit tax note: ${savingsData.exit_tax_info.note}`);
      }
    } else {
      lines.push('(Run the Savings Analysis panel to include destination comparisons)');
    }

    const assets = Object.entries(profile.assets).filter(([, v]) => v > 0);
    if (assets.length > 0) {
      lines.push('');
      lines.push('Assets:');
      assets.forEach(([k, v]) => lines.push(`  ${k.replace(/_/g, ' ')}: ${fmt(v)}`));
    }

    if (profile.goals.length > 0) lines.push(`Goals: ${profile.goals.join(', ')}`);
    if (profile.constraints.length > 0) lines.push(`Constraints: ${profile.constraints.join(', ')}`);
    if (profile.timeline) lines.push(`Timeline: ${profile.timeline}`);
    if (profile.notes) lines.push(`Notes: ${profile.notes}`);

    return lines.join('\n');
  };

  const handleCopySummary = async () => {
    const summary = buildTaxSummary();
    try {
      await navigator.clipboard.writeText(summary);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      // fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = summary;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    }
  };

  return (
    <>
    <div dir={dir} style={{ position: 'fixed', inset: 0, display: 'flex', background: 'var(--background)' }}>
      {/* ── Sidebar ── */}
      <div style={{ width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
        {/* Logo + lang toggle */}
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
              style={{ background: 'var(--accent)' }}>💰</div>
            <div>
              <div className="font-bold text-sm">{tr.appName}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{tr.appSubtitle}</div>
            </div>
          </div>
          <button onClick={toggleLang}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all hover:opacity-80"
            style={{ background: 'var(--surface-2)', color: 'var(--accent)', border: '1px solid var(--border)' }}
            title={lang === 'he' ? 'Switch to English' : lang === 'en' ? 'Português' : lang === 'pt' ? 'Español' : 'עברית'}>
            <Globe size={11} />
            {lang === 'he' ? 'EN' : lang === 'en' ? 'PT' : lang === 'pt' ? 'ES' : 'עב'}
          </button>
        </div>

        {/* Actions */}
        <div className="p-3 space-y-1.5">
          <button onClick={() => { saveCurrentSession(); setMessages([]); conversationHistoryRef.current = []; setShowSavings(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
            <RotateCcw size={14} />
            {tr.newChat}
          </button>
          <button onClick={() => { setShowProfile(!showProfile); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: profileSaved ? 'var(--accent-glow)' : 'var(--surface-2)', color: profileSaved ? 'var(--accent)' : 'var(--text-muted)', border: profileSaved ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <Settings size={14} />
            {profileSaved ? tr.profileSaved : tr.profile}
          </button>
          <button onClick={() => { setShowCompare(!showCompare); setShowProfile(false); setShowSavings(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
            <BarChart3 size={14} />
            {tr.compare}
          </button>
          <button onClick={() => { setShowSavings(!showSavings); setShowProfile(false); setShowCompare(false); setShowExitTax(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showSavings ? 'var(--accent-glow)' : 'var(--surface-2)', color: showSavings ? 'var(--accent)' : 'var(--text-muted)', border: showSavings ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <TrendingDown size={14} />
            {tr.savings}
          </button>
          <button onClick={() => { setShowExitTax(!showExitTax); setShowSavings(false); setShowProfile(false); setShowCompare(false); setShowIsraelWizard(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showExitTax ? 'var(--accent-glow)' : 'var(--surface-2)', color: showExitTax ? 'var(--accent)' : 'var(--text-muted)', border: showExitTax ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <Calculator size={14} />
            {tr.exitTaxCalc}
          </button>
          <button onClick={() => { setShowIsraelWizard(!showIsraelWizard); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); setShowCompanyOptimizer(false); setShowTaxUpdates(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showIsraelWizard ? 'var(--accent-glow)' : 'var(--surface-2)', color: showIsraelWizard ? 'var(--accent)' : 'var(--text-muted)', border: showIsraelWizard ? '1px solid var(--accent)' : '1px solid transparent' }}>
            🇮🇱 {tr.israelWizard}
          </button>
          <button onClick={() => { setShowCompanyOptimizer(!showCompanyOptimizer); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); setShowTaxUpdates(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showCompanyOptimizer ? 'var(--accent-glow)' : 'var(--surface-2)', color: showCompanyOptimizer ? 'var(--accent)' : 'var(--text-muted)', border: showCompanyOptimizer ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <Building2 size={14} />
            {tr.companyOptimizer}
          </button>
          <button onClick={() => { setShowTaxUpdates(!showTaxUpdates); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); setShowLetterGenerator(false); setShowSideBySide(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showTaxUpdates ? 'var(--accent-glow)' : 'var(--surface-2)', color: showTaxUpdates ? 'var(--accent)' : 'var(--text-muted)', border: showTaxUpdates ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <Bell size={14} />
            {tr.taxUpdates}
          </button>
          <button onClick={() => { setShowLetterGenerator(!showLetterGenerator); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); setShowSideBySide(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showLetterGenerator ? 'var(--accent-glow)' : 'var(--surface-2)', color: showLetterGenerator ? 'var(--accent)' : 'var(--text-muted)', border: showLetterGenerator ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <Mail size={14} />
            {tr.letterGenerator}
          </button>
          <button onClick={() => { setShowSideBySide(!showSideBySide); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showSideBySide ? 'var(--accent-glow)' : 'var(--surface-2)', color: showSideBySide ? 'var(--accent)' : 'var(--text-muted)', border: showSideBySide ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <GitCompare size={14} />
            {tr.sideByCompare}
          </button>
          <button onClick={() => { setShowFatca(!showFatca); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); setShowScenarioDiff(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showFatca ? 'var(--accent-glow)' : 'var(--surface-2)', color: showFatca ? 'var(--accent)' : 'var(--text-muted)', border: showFatca ? '1px solid var(--accent)' : '1px solid transparent' }}>
            🇺🇸 {tr.fatcaPanel}
          </button>
          <button onClick={() => { setShowScenarioDiff(!showScenarioDiff); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showScenarioDiff ? 'var(--accent-glow)' : 'var(--surface-2)', color: showScenarioDiff ? 'var(--accent)' : 'var(--text-muted)', border: showScenarioDiff ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <GitCompare size={14} />
            {tr.scenarioDiff}
          </button>
          <button onClick={() => { setShowDocChecklist(!showDocChecklist); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); setShowTimingCalc(false); setShowTreatyLookup(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showDocChecklist ? 'var(--accent-glow)' : 'var(--surface-2)', color: showDocChecklist ? 'var(--accent)' : 'var(--text-muted)', border: showDocChecklist ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <ClipboardCheck size={14} />
            {tr.docChecklist}
          </button>
          <button onClick={() => { setShowTimingCalc(!showTimingCalc); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); setShowTreatyLookup(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showTimingCalc ? 'var(--accent-glow)' : 'var(--surface-2)', color: showTimingCalc ? 'var(--accent)' : 'var(--text-muted)', border: showTimingCalc ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <Clock size={14} />
            {tr.timingCalc}
          </button>
          <button onClick={() => { setShowTreatyLookup(!showTreatyLookup); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); setShowCountryProfiles(false); setShowRealEstateCalc(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showTreatyLookup ? 'var(--accent-glow)' : 'var(--surface-2)', color: showTreatyLookup ? 'var(--accent)' : 'var(--text-muted)', border: showTreatyLookup ? '1px solid var(--accent)' : '1px solid transparent' }}>
            🤝 {tr.treatyLookup}
          </button>
          <button onClick={() => { setShowCountryProfiles(!showCountryProfiles); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); setShowRealEstateCalc(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showCountryProfiles ? 'var(--accent-glow)' : 'var(--surface-2)', color: showCountryProfiles ? 'var(--accent)' : 'var(--text-muted)', border: showCountryProfiles ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <Globe size={14} />
            {tr.countryProfiles}
          </button>
          <button onClick={() => { setShowRealEstateCalc(!showRealEstateCalc); setShowCountryProfiles(false); setShowPensionCalc(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showRealEstateCalc ? 'var(--accent-glow)' : 'var(--surface-2)', color: showRealEstateCalc ? 'var(--accent)' : 'var(--text-muted)', border: showRealEstateCalc ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <Home size={14} />
            {tr.realEstate}
          </button>
          <button onClick={() => { setShowPensionCalc(!showPensionCalc); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showPensionCalc ? 'var(--accent-glow)' : 'var(--surface-2)', color: showPensionCalc ? 'var(--accent)' : 'var(--text-muted)', border: showPensionCalc ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <PiggyBank size={14} />
            {tr.pensionCalc}
          </button>
          <button onClick={() => { setShowSection100A(!showSection100A); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowDtaaCalc(false); setShowAnnualTax(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showSection100A ? 'var(--accent-glow)' : 'var(--surface-2)', color: showSection100A ? 'var(--accent)' : 'var(--text-muted)', border: showSection100A ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <Calculator size={14} />
            {tr.section100a}
          </button>
          <button onClick={() => { setShowDtaaCalc(!showDtaaCalc); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowAnnualTax(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showDtaaCalc ? 'var(--accent-glow)' : 'var(--surface-2)', color: showDtaaCalc ? 'var(--accent)' : 'var(--text-muted)', border: showDtaaCalc ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <Globe size={14} />
            {tr.dtaaCalc}
          </button>
          <button onClick={() => { setShowAnnualTax(!showAnnualTax); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showAnnualTax ? 'var(--accent-glow)' : 'var(--surface-2)', color: showAnnualTax ? 'var(--accent)' : 'var(--text-muted)', border: showAnnualTax ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <TrendingUp size={14} />
            {tr.annualTax}
          </button>
          <button onClick={() => { setShowDaysTracker(!showDaysTracker); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowEmigROI(false); setShowMultiYear(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showDaysTracker ? 'var(--accent-glow)' : 'var(--surface-2)', color: showDaysTracker ? 'var(--accent)' : 'var(--text-muted)', border: showDaysTracker ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <Calendar size={14} />
            {tr.daysTracker}
          </button>
          <button onClick={() => { setShowEmigROI(!showEmigROI); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowMultiYear(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showEmigROI ? 'var(--accent-glow)' : 'var(--surface-2)', color: showEmigROI ? 'var(--accent)' : 'var(--text-muted)', border: showEmigROI ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <TrendingDown size={14} />
            {tr.emigROI}
          </button>
          <button onClick={() => { setShowMultiYear(!showMultiYear); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showMultiYear ? 'var(--accent-glow)' : 'var(--surface-2)', color: showMultiYear ? 'var(--accent)' : 'var(--text-muted)', border: showMultiYear ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <BarChart3 size={14} />
            {tr.multiYear}
          </button>
          <button onClick={() => { setShowRealEstateAbroad(!showRealEstateAbroad); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showRealEstateAbroad ? 'var(--accent-glow)' : 'var(--surface-2)', color: showRealEstateAbroad ? 'var(--accent)' : 'var(--text-muted)', border: showRealEstateAbroad ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <Globe size={14} />
            {tr.realEstateAbroad}
          </button>
          <button onClick={() => { setShowVisaPanel(!showVisaPanel); setShowRealEstateAbroad(false); setShowCountryFit(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showVisaPanel ? 'var(--accent-glow)' : 'var(--surface-2)', color: showVisaPanel ? 'var(--accent)' : 'var(--text-muted)', border: showVisaPanel ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <Plane size={14} />
            {tr.visaPanel}
          </button>
          <button onClick={() => { setShowCountryFit(!showCountryFit); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showCountryFit ? 'var(--accent-glow)' : 'var(--surface-2)', color: showCountryFit ? 'var(--accent)' : 'var(--text-muted)', border: showCountryFit ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <Award size={14} />
            {tr.fitScore}
          </button>
          <button onClick={() => { setShowRedFlags(f => !f); setShowCountryFit(false); setShowVisaPanel(false); setShowTimeline(false); setShowWealthSim(false); setShowBankMigration(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showRedFlags ? 'rgba(239,68,68,0.12)' : 'var(--surface-2)', color: showRedFlags ? '#ef4444' : 'var(--text-muted)', border: showRedFlags ? '1px solid rgba(239,68,68,0.4)' : '1px solid transparent' }}>
            <AlertTriangle size={14} />
            {tr.redFlags}
          </button>
          <button onClick={() => { setShowTimeline(t => !t); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowWealthSim(false); setShowBankMigration(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showTimeline ? 'var(--accent-glow)' : 'var(--surface-2)', color: showTimeline ? 'var(--accent)' : 'var(--text-muted)', border: showTimeline ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <CalendarClock size={14} />
            {tr.decisionTimeline}
          </button>
          <button onClick={() => { setShowWealthSim(w => !w); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowBankMigration(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showWealthSim ? 'var(--accent-glow)' : 'var(--surface-2)', color: showWealthSim ? 'var(--accent)' : 'var(--text-muted)', border: showWealthSim ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <Coins size={14} />
            {tr.wealthSim}
          </button>
          <button onClick={() => { setShowBankMigration(b => !b); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showBankMigration ? 'var(--accent-glow)' : 'var(--surface-2)', color: showBankMigration ? 'var(--accent)' : 'var(--text-muted)', border: showBankMigration ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <Landmark size={14} />
            {tr.bankMigration}
          </button>
          <button onClick={() => { setShowCryptoCalc(c => !c); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowCRSChecker(false); setShowRemoteWorker(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showCryptoCalc ? 'var(--accent-glow)' : 'var(--surface-2)', color: showCryptoCalc ? 'var(--accent)' : 'var(--text-muted)', border: showCryptoCalc ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>₿</span>
            {tr.cryptoCalc}
          </button>
          <button onClick={() => { setShowCRSChecker(c => !c); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRemoteWorker(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showCRSChecker ? 'var(--accent-glow)' : 'var(--surface-2)', color: showCRSChecker ? 'var(--accent)' : 'var(--text-muted)', border: showCRSChecker ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>🔍</span>
            {tr.crsChecker}
          </button>
          <button onClick={() => { setShowRemoteWorker(r => !r); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showRemoteWorker ? 'var(--accent-glow)' : 'var(--surface-2)', color: showRemoteWorker ? 'var(--accent)' : 'var(--text-muted)', border: showRemoteWorker ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>💻</span>
            {tr.remoteWorker}
          </button>
          <button onClick={() => { setShowPensionGuide(p => !p); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowBusinessExit(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showPensionGuide ? 'var(--accent-glow)' : 'var(--surface-2)', color: showPensionGuide ? 'var(--accent)' : 'var(--text-muted)', border: showPensionGuide ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>🏛️</span>
            {tr.pensionGuide}
          </button>
          <button onClick={() => { setShowBusinessExit(b => !b); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showBusinessExit ? 'var(--accent-glow)' : 'var(--surface-2)', color: showBusinessExit ? 'var(--accent)' : 'var(--text-muted)', border: showBusinessExit ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>🏢</span>
            {tr.businessExit}
          </button>
          <button onClick={() => { setShowMyPlan(p=>!p); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowCompMatrix(false); setShowEstatePlanner(false); setShowPortfolioOpt(false); setShowFxCalc(false); setShowProDirectory(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showMyPlan ? 'var(--accent-glow)' : 'var(--surface-2)', color: showMyPlan ? 'var(--accent)' : 'var(--text-muted)', border: showMyPlan ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>🗺️</span>
            {tr.myPlan}
          </button>
          <button onClick={() => { setShowCompMatrix(p=>!p); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowEstatePlanner(false); setShowPortfolioOpt(false); setShowFxCalc(false); setShowProDirectory(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showCompMatrix ? 'var(--accent-glow)' : 'var(--surface-2)', color: showCompMatrix ? 'var(--accent)' : 'var(--text-muted)', border: showCompMatrix ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>📊</span>
            {tr.compMatrix}
          </button>
          <button onClick={() => { setShowEstatePlanner(p=>!p); setShowCompMatrix(false); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowPortfolioOpt(false); setShowFxCalc(false); setShowProDirectory(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showEstatePlanner ? 'var(--accent-glow)' : 'var(--surface-2)', color: showEstatePlanner ? 'var(--accent)' : 'var(--text-muted)', border: showEstatePlanner ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>🏰</span>
            {tr.estatePlanner}
          </button>
          <button onClick={() => { setShowPortfolioOpt(p=>!p); setShowEstatePlanner(false); setShowCompMatrix(false); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowFxCalc(false); setShowProDirectory(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showPortfolioOpt ? 'var(--accent-glow)' : 'var(--surface-2)', color: showPortfolioOpt ? 'var(--accent)' : 'var(--text-muted)', border: showPortfolioOpt ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>📈</span>
            {tr.portfolioOpt}
          </button>
          <button onClick={() => { setShowFxCalc(p=>!p); setShowPortfolioOpt(false); setShowEstatePlanner(false); setShowCompMatrix(false); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowProDirectory(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showFxCalc ? 'var(--accent-glow)' : 'var(--surface-2)', color: showFxCalc ? 'var(--accent)' : 'var(--text-muted)', border: showFxCalc ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>💱</span>
            {tr.fxCalc}
          </button>
          <button onClick={() => { setShowProDirectory(p=>!p); setShowFxCalc(false); setShowPortfolioOpt(false); setShowEstatePlanner(false); setShowCompMatrix(false); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); setShowTaxMap(false); setShowLifetimeSavings(false); setShowFamilyImpact(false); setShowTaxAlerts(false); setShowTaxScore(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showProDirectory ? 'var(--accent-glow)' : 'var(--surface-2)', color: showProDirectory ? 'var(--accent)' : 'var(--text-muted)', border: showProDirectory ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>📋</span>
            {tr.proDirectory}
          </button>
          <button onClick={() => { setShowTaxMap(p=>!p); setShowProDirectory(false); setShowFxCalc(false); setShowPortfolioOpt(false); setShowEstatePlanner(false); setShowCompMatrix(false); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); setShowLifetimeSavings(false); setShowFamilyImpact(false); setShowTaxAlerts(false); setShowTaxScore(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showTaxMap ? 'var(--accent-glow)' : 'var(--surface-2)', color: showTaxMap ? 'var(--accent)' : 'var(--text-muted)', border: showTaxMap ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>🗺️</span>
            {tr.taxMap}
          </button>
          <button onClick={() => { setShowLifetimeSavings(p=>!p); setShowTaxMap(false); setShowProDirectory(false); setShowFxCalc(false); setShowPortfolioOpt(false); setShowEstatePlanner(false); setShowCompMatrix(false); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); setShowFamilyImpact(false); setShowTaxAlerts(false); setShowTaxScore(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showLifetimeSavings ? 'var(--accent-glow)' : 'var(--surface-2)', color: showLifetimeSavings ? 'var(--accent)' : 'var(--text-muted)', border: showLifetimeSavings ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>💸</span>
            {tr.lifetimeSavings}
          </button>
          <button onClick={() => { setShowFamilyImpact(p=>!p); setShowLifetimeSavings(false); setShowTaxMap(false); setShowProDirectory(false); setShowFxCalc(false); setShowPortfolioOpt(false); setShowEstatePlanner(false); setShowCompMatrix(false); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); setShowTaxAlerts(false); setShowTaxScore(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showFamilyImpact ? 'var(--accent-glow)' : 'var(--surface-2)', color: showFamilyImpact ? 'var(--accent)' : 'var(--text-muted)', border: showFamilyImpact ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>👨‍👩‍👧</span>
            {tr.familyImpact}
          </button>
          <button onClick={() => { setShowTaxAlerts(p=>!p); setShowFamilyImpact(false); setShowLifetimeSavings(false); setShowTaxMap(false); setShowProDirectory(false); setShowFxCalc(false); setShowPortfolioOpt(false); setShowEstatePlanner(false); setShowCompMatrix(false); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); setShowTaxScore(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showTaxAlerts ? 'var(--accent-glow)' : 'var(--surface-2)', color: showTaxAlerts ? 'var(--accent)' : 'var(--text-muted)', border: showTaxAlerts ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>🔔</span>
            {tr.taxAlerts}
          </button>
          <button onClick={() => { setShowTaxScore(p=>!p); setShowTaxAlerts(false); setShowFamilyImpact(false); setShowLifetimeSavings(false); setShowTaxMap(false); setShowProDirectory(false); setShowFxCalc(false); setShowPortfolioOpt(false); setShowEstatePlanner(false); setShowCompMatrix(false); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showTaxScore ? 'var(--accent-glow)' : 'var(--surface-2)', color: showTaxScore ? 'var(--accent)' : 'var(--text-muted)', border: showTaxScore ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>📊</span>
            {tr.taxScore}
          </button>
          <button onClick={() => { setShowTaxAudit(p=>!p); setShowTaxScore(false); setShowTaxForecast(false); setShowPeerBenchmark(false); setShowDocAnalyzer(false); setShowDeadlines(false); setShowPassportOptimizer(false); setShowTaxAlerts(false); setShowFamilyImpact(false); setShowLifetimeSavings(false); setShowTaxMap(false); setShowProDirectory(false); setShowFxCalc(false); setShowPortfolioOpt(false); setShowEstatePlanner(false); setShowCompMatrix(false); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showTaxAudit ? 'var(--accent-glow)' : 'var(--surface-2)', color: showTaxAudit ? 'var(--accent)' : 'var(--text-muted)', border: showTaxAudit ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>🕵️</span>
            {tr.taxAudit}
          </button>
          <button onClick={() => { setShowPassportOptimizer(p=>!p); setShowTaxAudit(false); setShowTaxScore(false); setShowTaxForecast(false); setShowPeerBenchmark(false); setShowDocAnalyzer(false); setShowDeadlines(false); setShowTaxAlerts(false); setShowFamilyImpact(false); setShowLifetimeSavings(false); setShowTaxMap(false); setShowProDirectory(false); setShowFxCalc(false); setShowPortfolioOpt(false); setShowEstatePlanner(false); setShowCompMatrix(false); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showPassportOptimizer ? 'var(--accent-glow)' : 'var(--surface-2)', color: showPassportOptimizer ? 'var(--accent)' : 'var(--text-muted)', border: showPassportOptimizer ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>🏆</span>
            {tr.passportOptimizer}
          </button>
          <button onClick={() => { setShowDeadlines(p=>!p); setShowPassportOptimizer(false); setShowTaxAudit(false); setShowTaxScore(false); setShowTaxForecast(false); setShowPeerBenchmark(false); setShowDocAnalyzer(false); setShowTaxAlerts(false); setShowFamilyImpact(false); setShowLifetimeSavings(false); setShowTaxMap(false); setShowProDirectory(false); setShowFxCalc(false); setShowPortfolioOpt(false); setShowEstatePlanner(false); setShowCompMatrix(false); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showDeadlines ? 'var(--accent-glow)' : 'var(--surface-2)', color: showDeadlines ? 'var(--accent)' : 'var(--text-muted)', border: showDeadlines ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>⏱️</span>
            {tr.deadlines}
          </button>
          <button onClick={() => { setShowDocAnalyzer(p=>!p); setShowDeadlines(false); setShowPassportOptimizer(false); setShowTaxAudit(false); setShowTaxScore(false); setShowTaxForecast(false); setShowPeerBenchmark(false); setShowTaxAlerts(false); setShowFamilyImpact(false); setShowLifetimeSavings(false); setShowTaxMap(false); setShowProDirectory(false); setShowFxCalc(false); setShowPortfolioOpt(false); setShowEstatePlanner(false); setShowCompMatrix(false); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showDocAnalyzer ? 'var(--accent-glow)' : 'var(--surface-2)', color: showDocAnalyzer ? 'var(--accent)' : 'var(--text-muted)', border: showDocAnalyzer ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>📄</span>
            {tr.docAnalyzer}
          </button>
          <button onClick={() => { setShowPeerBenchmark(p=>!p); setShowDocAnalyzer(false); setShowDeadlines(false); setShowPassportOptimizer(false); setShowTaxAudit(false); setShowTaxScore(false); setShowTaxForecast(false); setShowTaxAlerts(false); setShowFamilyImpact(false); setShowLifetimeSavings(false); setShowTaxMap(false); setShowProDirectory(false); setShowFxCalc(false); setShowPortfolioOpt(false); setShowEstatePlanner(false); setShowCompMatrix(false); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showPeerBenchmark ? 'var(--accent-glow)' : 'var(--surface-2)', color: showPeerBenchmark ? 'var(--accent)' : 'var(--text-muted)', border: showPeerBenchmark ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>🤝</span>
            {tr.peerBenchmark}
          </button>
          <button onClick={() => { setShowTaxForecast(p=>!p); setShowPeerBenchmark(false); setShowDocAnalyzer(false); setShowDeadlines(false); setShowPassportOptimizer(false); setShowTaxAudit(false); setShowTaxScore(false); setShowTaxAlerts(false); setShowFamilyImpact(false); setShowLifetimeSavings(false); setShowTaxMap(false); setShowProDirectory(false); setShowFxCalc(false); setShowPortfolioOpt(false); setShowEstatePlanner(false); setShowCompMatrix(false); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showTaxForecast ? 'var(--accent-glow)' : 'var(--surface-2)', color: showTaxForecast ? 'var(--accent)' : 'var(--text-muted)', border: showTaxForecast ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>🔮</span>
            {tr.taxForecast}
          </button>
          <button onClick={() => { setShowLegalDocs(p=>!p); setShowTaxForecast(false); setShowPeerBenchmark(false); setShowDocAnalyzer(false); setShowDeadlines(false); setShowPassportOptimizer(false); setShowTaxAudit(false); setShowTaxScore(false); setShowTaxAlerts(false); setShowFamilyImpact(false); setShowLifetimeSavings(false); setShowTaxMap(false); setShowProDirectory(false); setShowFxCalc(false); setShowPortfolioOpt(false); setShowEstatePlanner(false); setShowCompMatrix(false); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); setShowAdvisorPortal(false); setShowCalendarSync(false); setShowPdfReport(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showLegalDocs ? 'var(--accent-glow)' : 'var(--surface-2)', color: showLegalDocs ? 'var(--accent)' : 'var(--text-muted)', border: showLegalDocs ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>📝</span>
            {tr.legalDocs}
          </button>
          <button onClick={() => { setShowAdvisorPortal(p=>!p); setShowLegalDocs(false); setShowTaxForecast(false); setShowPeerBenchmark(false); setShowDocAnalyzer(false); setShowDeadlines(false); setShowPassportOptimizer(false); setShowTaxAudit(false); setShowTaxScore(false); setShowTaxAlerts(false); setShowFamilyImpact(false); setShowLifetimeSavings(false); setShowTaxMap(false); setShowProDirectory(false); setShowFxCalc(false); setShowPortfolioOpt(false); setShowEstatePlanner(false); setShowCompMatrix(false); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); setShowCalendarSync(false); setShowPdfReport(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showAdvisorPortal ? 'var(--accent-glow)' : 'var(--surface-2)', color: showAdvisorPortal ? 'var(--accent)' : 'var(--text-muted)', border: showAdvisorPortal ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>🤝</span>
            {tr.advisorPortal}
          </button>
          <button onClick={() => { setShowCalendarSync(p=>!p); setShowAdvisorPortal(false); setShowLegalDocs(false); setShowTaxForecast(false); setShowPeerBenchmark(false); setShowDocAnalyzer(false); setShowDeadlines(false); setShowPassportOptimizer(false); setShowTaxAudit(false); setShowTaxScore(false); setShowTaxAlerts(false); setShowFamilyImpact(false); setShowLifetimeSavings(false); setShowTaxMap(false); setShowProDirectory(false); setShowFxCalc(false); setShowPortfolioOpt(false); setShowEstatePlanner(false); setShowCompMatrix(false); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); setShowPdfReport(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showCalendarSync ? 'var(--accent-glow)' : 'var(--surface-2)', color: showCalendarSync ? 'var(--accent)' : 'var(--text-muted)', border: showCalendarSync ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>📅</span>
            {tr.calendarSync}
          </button>
          <button onClick={() => { setShowPdfReport(p=>!p); setShowCalendarSync(false); setShowAdvisorPortal(false); setShowLegalDocs(false); setShowTaxForecast(false); setShowPeerBenchmark(false); setShowDocAnalyzer(false); setShowDeadlines(false); setShowPassportOptimizer(false); setShowTaxAudit(false); setShowTaxScore(false); setShowTaxAlerts(false); setShowFamilyImpact(false); setShowLifetimeSavings(false); setShowTaxMap(false); setShowProDirectory(false); setShowFxCalc(false); setShowPortfolioOpt(false); setShowEstatePlanner(false); setShowCompMatrix(false); setShowMyPlan(false); setShowBusinessExit(false); setShowPensionGuide(false); setShowRemoteWorker(false); setShowCRSChecker(false); setShowCryptoCalc(false); setShowBankMigration(false); setShowWealthSim(false); setShowTimeline(false); setShowRedFlags(false); setShowCountryFit(false); setShowVisaPanel(false); setShowRealEstateAbroad(false); setShowMultiYear(false); setShowEmigROI(false); setShowDaysTracker(false); setShowAnnualTax(false); setShowDtaaCalc(false); setShowSection100A(false); setShowPensionCalc(false); setShowRealEstateCalc(false); setShowCountryProfiles(false); setShowTreatyLookup(false); setShowTimingCalc(false); setShowDocChecklist(false); setShowScenarioDiff(false); setShowFatca(false); setShowSideBySide(false); setShowLetterGenerator(false); setShowTaxUpdates(false); setShowCompanyOptimizer(false); setShowIsraelWizard(false); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showPdfReport ? 'var(--accent-glow)' : 'var(--surface-2)', color: showPdfReport ? 'var(--accent)' : 'var(--text-muted)', border: showPdfReport ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <span style={{fontSize:'0.85rem',lineHeight:1}}>📊</span>
            {tr.pdfReport}
          </button>
          <button onClick={() => setDevilMode(d => !d)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: devilMode ? 'rgba(239,68,68,0.12)' : 'var(--surface-2)', color: devilMode ? '#ef4444' : 'var(--text-muted)', border: devilMode ? '1px solid rgba(239,68,68,0.4)' : '1px solid transparent' }}>
            <Swords size={14} />
            {devilMode ? tr.devilModeActive : tr.devilMode}
          </button>
          <button onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
            <div className="flex items-center gap-2">
              <History size={14} />
              {tr.history}
            </div>
            {savedSessions.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: 'var(--accent)', color: 'white' }}>
                {savedSessions.length}
              </span>
            )}
          </button>
        </div>

        {/* History list */}
        {showHistory && (
          <div className="px-3 pb-2">
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {savedSessions.length === 0 ? (
                <div className="px-3 py-4 text-xs text-center" style={{ color: 'var(--text-muted)' }}>{tr.noHistory}</div>
              ) : (
                savedSessions.map(s => (
                  <div key={s.id} className="group flex items-start gap-1.5 px-2 py-2 border-b last:border-b-0 hover:opacity-80 cursor-pointer transition-all"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                    <Clock size={11} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <button className="flex-1 text-left text-xs truncate" style={{ color: 'var(--text)' }}
                      onClick={() => loadSession(s)}>
                      {s.title}
                    </button>
                    <button onClick={() => deleteSession(s.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      style={{ color: 'var(--text-muted)' }}>
                      <X size={10} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Quick questions */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
            {tr.quickQuestions}
          </div>
          <div className="space-y-1.5">
            {tr.sampleQuestions.slice(0, 6).map((q, i) => (
              <button key={i} onClick={() => sendMessage(q)} disabled={isLoading}
                className="w-full text-xs px-2 py-2 rounded-lg transition-all hover:opacity-80 text-left"
                dir="ltr"
                style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', textAlign: lang === 'he' ? 'right' : 'left' }}>
                {q.length > 65 ? q.slice(0, 65) + '…' : q}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          <div className="flex items-center gap-1">
            <Zap size={10} className="text-yellow-400" />
            {tr.modelInfo}
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, minHeight: 0 }}>
        {/* Panels */}
        {showProfile && (
          <ProfilePanel lang={lang} profile={profile} setProfile={setProfile}
            onSave={saveProfile} onClose={() => setShowProfile(false)} />
        )}
        {showCompare && (
          <ComparePanel lang={lang} profile={profile}
            onCompare={msg => sendMessage(msg)} onClose={() => setShowCompare(false)} />
        )}
        {showSavings && (
          <SavingsPanel lang={lang} profile={profile}
            onAsk={msg => sendMessage(msg)}
            onDetail={(code, row) => setSelectedCountry({ code, row })}
            onSavingsLoaded={d => setSavingsData(d)}
            onClose={() => setShowSavings(false)} />
        )}
        {showExitTax && (
          <ExitTaxPanel lang={lang} profile={profile} savingsData={savingsData}
            onClose={() => setShowExitTax(false)} />
        )}
        {showIsraelWizard && (
          <IsraelExitWizard lang={lang} profile={profile}
            onAsk={msg => { sendMessage(msg); setShowIsraelWizard(false); }}
            onClose={() => setShowIsraelWizard(false)} />
        )}
        {showCompanyOptimizer && (
          <CompanyOptimizer lang={lang} onClose={() => setShowCompanyOptimizer(false)} />
        )}
        {showTaxUpdates && (
          <TaxUpdatesFeed lang={lang} onClose={() => setShowTaxUpdates(false)} />
        )}
        {showLetterGenerator && (
          <LetterGeneratorPanel lang={lang} profile={profile} onClose={() => setShowLetterGenerator(false)} />
        )}
        {showSideBySide && (
          <SideBySideComparison lang={lang} profile={profile} savingsData={savingsData}
            onClose={() => setShowSideBySide(false)}
            onFetchSavings={() => { setShowSideBySide(false); setShowSavings(true); }} />
        )}
        {showFatca && (
          <FatcaAdvisoryPanel lang={lang} profile={profile} setProfile={p => { setProfile(p); setProfileSaved(true); localStorage.setItem('tax_master_profile', JSON.stringify(p)); }}
            onAsk={msg => { sendMessage(msg); setShowFatca(false); }}
            onClose={() => setShowFatca(false)} />
        )}
        {showScenarioDiff && (
          <ScenarioDiff lang={lang} onClose={() => setShowScenarioDiff(false)} />
        )}
        {showDocChecklist && (
          <DocumentChecklist lang={lang} onClose={() => setShowDocChecklist(false)} />
        )}
        {showTimingCalc && (
          <ExitTimingCalculator lang={lang} profile={profile} onClose={() => setShowTimingCalc(false)} />
        )}
        {showTreatyLookup && (
          <TreatyLookupPanel lang={lang}
            onAsk={msg => { sendMessage(msg); setShowTreatyLookup(false); }}
            onClose={() => setShowTreatyLookup(false)} />
        )}
        {showCountryProfiles && (
          <CountryProfilesPanel lang={lang}
            onAsk={msg => { sendMessage(msg); setShowCountryProfiles(false); }}
            onClose={() => setShowCountryProfiles(false)} />
        )}
        {showRealEstateCalc && (
          <RealEstateCalcPanel lang={lang} onClose={() => setShowRealEstateCalc(false)} />
        )}
        {showPensionCalc && (
          <PensionCalcPanel lang={lang}
            onAsk={msg => { sendMessage(msg); setShowPensionCalc(false); }}
            onClose={() => setShowPensionCalc(false)} />
        )}
        {showSection100A && (
          <Section100APanel lang={lang}
            onAsk={msg => { sendMessage(msg); setShowSection100A(false); }}
            onClose={() => setShowSection100A(false)} />
        )}
        {showDtaaCalc && (
          <DtaaCalcPanel lang={lang}
            onAsk={msg => { sendMessage(msg); setShowDtaaCalc(false); }}
            onClose={() => setShowDtaaCalc(false)} />
        )}
        {showAnnualTax && (
          <AnnualTaxPanel lang={lang} onClose={() => setShowAnnualTax(false)} />
        )}
        {showDaysTracker && (
          <DaysTrackerPanel lang={lang}
            onAsk={msg => { sendMessage(msg); setShowDaysTracker(false); }}
            onClose={() => setShowDaysTracker(false)} />
        )}
        {showEmigROI && (
          <EmigROIPanel lang={lang}
            onAsk={msg => { sendMessage(msg); setShowEmigROI(false); }}
            onClose={() => setShowEmigROI(false)} />
        )}
        {showMultiYear && (
          <MultiYearPanel lang={lang}
            onAsk={msg => { sendMessage(msg); setShowMultiYear(false); }}
            onClose={() => setShowMultiYear(false)} />
        )}
        {showRealEstateAbroad && (
          <RealEstateAbroadPanel lang={lang} onClose={() => setShowRealEstateAbroad(false)} />
        )}
        {showVisaPanel && (
          <VisaPanel lang={lang} onClose={() => setShowVisaPanel(false)} />
        )}
        {showCountryFit && (
          <CountryFitPanel lang={lang} profile={profile} onClose={() => setShowCountryFit(false)} />
        )}
        {showRedFlags && (
          <RedFlagsPanel lang={lang} profile={profile} onClose={() => setShowRedFlags(false)} />
        )}
        {showTimeline && (
          <DecisionTimelinePanel lang={lang} onClose={() => setShowTimeline(false)} />
        )}
        {showWealthSim && (
          <WealthSimPanel lang={lang} profile={profile} onClose={() => setShowWealthSim(false)} />
        )}
        {showBankMigration && (
          <BankMigrationPanel lang={lang} onClose={() => setShowBankMigration(false)} />
        )}
        {showCryptoCalc && (
          <CryptoTaxPanel lang={lang} onClose={() => setShowCryptoCalc(false)} />
        )}
        {showCRSChecker && (
          <CRSCheckerPanel lang={lang} onClose={() => setShowCRSChecker(false)} />
        )}
        {showRemoteWorker && (
          <RemoteWorkerPanel lang={lang} onClose={() => setShowRemoteWorker(false)} />
        )}
        {showPensionGuide && (
          <PensionGuidePanel lang={lang} onClose={() => setShowPensionGuide(false)} />
        )}
        {showBusinessExit && (
          <BusinessExitPanel lang={lang} profile={profile} onClose={() => setShowBusinessExit(false)} />
        )}
        {showMyPlan && (
          <MyPlanPanel lang={lang} profile={profile} onClose={() => setShowMyPlan(false)} />
        )}
        {showCompMatrix && (
          <CompMatrixPanel lang={lang} onClose={() => setShowCompMatrix(false)} />
        )}
        {showEstatePlanner && (
          <EstatePlannerPanel lang={lang} profile={profile} onClose={() => setShowEstatePlanner(false)} />
        )}
        {showPortfolioOpt && (
          <PortfolioOptPanel lang={lang} onClose={() => setShowPortfolioOpt(false)} />
        )}
        {showFxCalc && (
          <FxCalcPanel lang={lang} onClose={() => setShowFxCalc(false)} />
        )}
        {showProDirectory && (
          <ProDirectoryPanel lang={lang} onClose={() => setShowProDirectory(false)} />
        )}
        {showTaxMap && (
          <WorldTaxMapPanel lang={lang} profile={profile} onClose={() => setShowTaxMap(false)} />
        )}
        {showLifetimeSavings && (
          <LifetimeSavingsPanel lang={lang} profile={profile} onClose={() => setShowLifetimeSavings(false)} />
        )}
        {showFamilyImpact && (
          <FamilyImpactPanel lang={lang} onClose={() => setShowFamilyImpact(false)} />
        )}
        {showTaxAlerts && (
          <TaxAlertsPanel lang={lang} onClose={() => setShowTaxAlerts(false)} />
        )}
        {showTaxScore && (
          <TaxScorePanel lang={lang} profile={profile} onClose={() => setShowTaxScore(false)} />
        )}
        {showTaxAudit && (
          <TaxAuditSimulatorPanel lang={lang} profile={profile} onClose={() => setShowTaxAudit(false)} />
        )}
        {showPassportOptimizer && (
          <PassportOptimizerPanel lang={lang} profile={profile} onClose={() => setShowPassportOptimizer(false)} />
        )}
        {showDeadlines && (
          <DeadlinesDashboardPanel lang={lang} onClose={() => setShowDeadlines(false)} />
        )}
        {showDocAnalyzer && (
          <DocumentAnalyzerPanel lang={lang} onClose={() => setShowDocAnalyzer(false)} />
        )}
        {showPeerBenchmark && (
          <PeerBenchmarkPanel lang={lang} profile={profile} onClose={() => setShowPeerBenchmark(false)} />
        )}
        {showTaxForecast && (
          <TaxForecast2030Panel lang={lang} onClose={() => setShowTaxForecast(false)} />
        )}
        {showLegalDocs && (
          <LegalDocGeneratorPanel lang={lang} profile={profile} onClose={() => setShowLegalDocs(false)} />
        )}
        {showAdvisorPortal && (
          <AdvisorPortalPanel lang={lang} profile={profile} onClose={() => setShowAdvisorPortal(false)} />
        )}
        {showCalendarSync && (
          <CalendarSyncPanel lang={lang} onClose={() => setShowCalendarSync(false)} />
        )}
        {showPdfReport && (
          <PdfReportPanel lang={lang} profile={profile} onClose={() => setShowPdfReport(false)} />
        )}

        {/* ── Chat section ── */}
        <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

        {/* Devil mode indicator */}
        {devilMode && (
          <div className="flex-shrink-0 px-4 py-2 flex items-center gap-2 text-xs font-semibold"
            style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
            <Swords size={12} />
            {lang === 'he' ? '😈 מצב עו"ד שטן פעיל — ה-AI יאתגר את התוכנית שלך מנקודת מבט רשות המסים' : '😈 Devil\'s Advocate active — AI challenges your plan as the Tax Authority would'}
            <button onClick={() => setDevilMode(false)} className="mr-auto ml-auto hover:opacity-70"><X size={12} /></button>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: '1 1 0', overflowY: 'auto', padding: '1rem' }}>
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 && (() => {
              const dashboardTotalIncome = Object.values(profile.income).reduce((a, b) => a + b, 0);
              const showDashboard = profileSaved && dashboardTotalIncome > 0;

              const handleOpenTool = (tool: string) => {
                const map: Record<string, () => void> = {
                  passportOptimizer: () => setShowPassportOptimizer(true),
                  savings: () => setShowSavings(true),
                  taxAudit: () => setShowTaxAudit(true),
                  docAnalyzer: () => setShowDocAnalyzer(true),
                  pdfReport: () => setShowPdfReport(true),
                  calendarSync: () => setShowCalendarSync(true),
                  taxForecast: () => setShowTaxForecast(true),
                  peerBenchmark: () => setShowPeerBenchmark(true),
                };
                map[tool]?.();
              };

              if (showDashboard) {
                return (
                  <div className="max-w-3xl mx-auto pt-4">
                    <Dashboard
                      lang={lang}
                      profile={profile}
                      onOpenTool={handleOpenTool}
                      onChat={(msg) => sendMessage(msg)}
                    />
                  </div>
                );
              }

              return (
                <div className="slide-in">
                  <div className="text-center pt-8 pb-6">
                    <div className="text-5xl mb-3">🌍</div>
                    <h1 className="text-2xl font-bold mb-2">{tr.welcomeTitle}</h1>
                    <p className="max-w-md mx-auto text-sm" style={{ color: 'var(--text-muted)' }}>
                      {tr.welcomeSubtitle}
                    </p>
                  </div>

                  {!profileSaved && (
                    <div className="max-w-2xl mx-auto mb-4 rounded-xl p-3 flex items-center justify-between"
                      style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid var(--accent)' }}>
                      <span className="text-sm" style={{ color: 'var(--accent)' }}>{tr.setupProfile}</span>
                      <div className="flex gap-2">
                        <button onClick={() => setShowOnboarding(true)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                          style={{ background: 'var(--accent)', color: 'white' }}>
                          ✨ {lang === 'he' ? 'שאלון מהיר' : 'Quick Quiz'}
                        </button>
                        <button onClick={() => setShowProfile(true)}
                          className="px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          {lang === 'he' ? 'טופס' : 'Form'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Israeli quick-start actions */}
                  {lang === 'he' && (
                    <div className="max-w-2xl mx-auto mb-4">
                      <div className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--text-muted)' }}>🇮🇱 כלים לישראלים</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { icon: '📊', label: 'כמה אחסוך בחו"ל?', action: () => setShowSavings(true) },
                          { icon: '🇮🇱', label: 'תכנון עזיבת ישראל', action: () => setShowIsraelWizard(true) },
                          { icon: '⚖️', label: 'מחשבון מס יציאה', action: () => setShowExitTax(true) },
                          { icon: '🔍', label: 'בדוק תוכנית מס', action: () => setPlanMode(true) },
                        ].map((card, i) => (
                          <button key={i} onClick={card.action}
                            className="rounded-xl p-3 text-center transition-all hover:opacity-80"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <div className="text-2xl mb-1">{card.icon}</div>
                            <div className="text-xs font-medium">{card.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="max-w-2xl mx-auto">
                    <div className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--text-muted)' }}>{tr.quickQuestions}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {tr.sampleQuestions.map((q, i) => (
                        <button key={i} onClick={() => sendMessage(q)}
                          className="p-3 rounded-xl text-sm transition-all hover:opacity-80"
                          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', textAlign: lang === 'he' ? 'right' : 'left' }}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {messages.map(msg => (
              <div key={msg.id} className="slide-in">
                {msg.role === 'user' ? (
                  <div className={`flex ${lang === 'he' ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-lg px-4 py-3 rounded-2xl text-sm"
                      style={{ background: 'var(--accent)', color: 'white', borderRadius: lang === 'he' ? '18px 18px 18px 4px' : '18px 18px 4px 18px' }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className={`flex gap-3 ${lang === 'he' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      💰
                    </div>
                    <div className="flex-1 min-w-0">
                      <ToolActivity tools={msg.tools || []} lang={lang} />
                      {msg.content ? (
                        <div className="prose-dark text-sm" dir="ltr">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex gap-1 py-2">
                          {[0, 1, 2].map(i => (
                            <div key={i} className={`w-2 h-2 rounded-full typing-dot`}
                              style={{ background: 'var(--text-muted)', animationDelay: `${i * 0.2}s` }} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div style={{ marginTop: 'auto', flex: '0 0 auto', padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div className="max-w-3xl mx-auto">
            {devilMode && (
              <div className="mb-2 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }}>
                <Swords size={12} />
                {lang === 'he' ? '😈 עו"ד שטן פעיל — תאר את תוכנית המס שלך' : '😈 Devil\'s Advocate — describe your tax plan'}
              </div>
            )}
            {!devilMode && planMode && (
              <div className="mb-2 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                <ClipboardCheck size={12} />
                {tr.checkPlanActive} — {lang === 'he' ? 'תאר את תוכנית המס שלך לניתוח מעמיק' : 'Describe your tax plan for deep analysis'}
              </div>
            )}
            {/* Smart prompt chips — single scrollable row */}
            {!devilMode && !planMode && messages.length === 0 && (
              <div className="mb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                <div className="flex gap-2" style={{ width: 'max-content' }}>
                  {(lang === 'he' ? [
                    'כמה מס יציאה אשלם?',
                    'האם UAE מתאים לי?',
                    'מה הסיכון ל-PE של החברה שלי?',
                    'כמה ימים אני יכול לבלות בישראל?',
                    'מה ההבדל בין ברזיל לקפריסין?',
                    'תסביר לי על כלל 183 יום',
                  ] : [
                    'How much exit tax will I pay?',
                    'Is UAE right for me?',
                    'What\'s my company\'s PE risk?',
                    'How many days can I stay in Israel?',
                    'Brazil vs Cyprus — key differences?',
                    'Explain the 183-day rule',
                  ]).map(q => (
                    <button key={q} onClick={() => sendMessage(q)} disabled={isLoading}
                      className="text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-80 flex-shrink-0"
                      style={{ background:'var(--surface-2)', color:'var(--text-muted)', border:'1px solid var(--border)', whiteSpace:'nowrap' }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 items-end rounded-2xl p-2"
              style={{ background: 'var(--surface-2)', border: `1px solid ${planMode ? 'var(--accent)' : 'var(--border)'}` }}>
              <input ref={fileInputRef} type="file" accept=".pdf,.txt,.png,.jpg,.jpeg" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={isLoading}
                title={tr.uploadDoc}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:opacity-70 disabled:opacity-30"
                style={{ color: 'var(--text-muted)' }}>
                <FileText size={15} />
              </button>
              <button onClick={() => window.print()}
                title={tr.exportPdf}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}>
                <Printer size={15} />
              </button>
              <button
                onClick={handleCopySummary}
                title="Copy tax summary to clipboard for WizeLife AI"
                className="flex items-center gap-1 px-2 h-8 rounded-lg flex-shrink-0 transition-all hover:opacity-80 text-xs font-medium"
                style={{
                  background: copiedSummary ? 'rgba(16,185,129,0.12)' : 'transparent',
                  color: copiedSummary ? '#10b981' : 'var(--text-muted)',
                  border: `1px solid ${copiedSummary ? 'rgba(16,185,129,0.3)' : 'transparent'}`,
                  whiteSpace: 'nowrap',
                }}>
                {copiedSummary ? '✓ Copied!' : '📋 Export to WizeLife AI'}
              </button>
              <button onClick={() => setPlanMode(p => !p)} disabled={isLoading}
                title={tr.checkPlan}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:opacity-70"
                style={{ color: planMode ? 'var(--accent)' : 'var(--text-muted)', background: planMode ? 'rgba(99,102,241,0.12)' : 'transparent' }}>
                <ClipboardCheck size={15} />
              </button>
              <button
                onClick={() => setAiProvider(p => p === 'gemini' ? 'claude' : 'gemini')}
                disabled={isLoading}
                title={aiProvider === 'claude' ? 'Claude (Anthropic) — לחץ לעבור ל-Gemini' : 'Gemini (Google) — לחץ לעבור ל-Claude'}
                className="h-7 px-2 rounded-lg flex items-center gap-1 flex-shrink-0 transition-all hover:opacity-80 text-xs font-bold"
                style={{
                  background: aiProvider === 'claude' ? 'rgba(212,160,23,0.15)' : 'rgba(66,133,244,0.12)',
                  color: aiProvider === 'claude' ? '#d4a017' : '#4285f4',
                  border: `1px solid ${aiProvider === 'claude' ? 'rgba(212,160,23,0.3)' : 'rgba(66,133,244,0.3)'}`,
                }}>
                {aiProvider === 'claude' ? '✦ Claude' : '✦ Gemini'}
              </button>
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown} disabled={isLoading}
                placeholder={planMode ? tr.checkPlanPlaceholder : tr.inputPlaceholder} rows={1}
                dir={lang === 'he' ? 'rtl' : 'ltr'}
                className="flex-1 bg-transparent outline-none resize-none text-sm px-2 py-1"
                style={{ color: 'var(--text)', minHeight: '36px', maxHeight: '120px' }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                }} />
              <button onClick={() => sendMessage()} disabled={!input.trim() || isLoading}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:opacity-80 disabled:opacity-40"
                style={{ background: 'var(--accent)', color: 'white' }}>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
        </div>{/* end chat section wrapper */}
      </div>
    </div>

    {selectedCountry && (
      <CountryDetailModal
        code={selectedCountry.code}
        savingsRow={selectedCountry.row}
        lang={lang}
        onAsk={msg => { sendMessage(msg); setSelectedCountry(null); }}
        onClose={() => setSelectedCountry(null)}
      />
    )}
    {showOnboarding && (
      <ConversationalOnboarding
        lang={lang}
        profile={profile}
        onComplete={p => {
          setProfile(p);
          setProfileSaved(true);
          localStorage.setItem('tax_master_profile', JSON.stringify(p));
          setShowOnboarding(false);
        }}
        onClose={() => setShowOnboarding(false)}
      />
    )}
    </>
  );
}
