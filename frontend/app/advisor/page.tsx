'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, Settings, ChevronDown, ChevronUp, Zap,
  RotateCcw, Globe, BarChart3, X, Plus, TrendingDown, History, Clock,
  FileText, Download, Calculator, ClipboardCheck, Building2, Bell, Bookmark, Calendar,
  Swords, Mail, GitCompare, TrendingUp, Shuffle, Home, PiggyBank
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

  const update = (field: keyof UserProfile, value: unknown) =>
    setProfile({ ...profile, [field]: value });

  const updateIncome = (field: string, value: string) =>
    setProfile({ ...profile, income: { ...profile.income, [field]: parseFloat(value) || 0 } });

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
            <h3 className="font-semibold mb-3 text-sm">{tr.annualIncome}</h3>
            <div className="space-y-2">
              {(Object.entries(tr.income) as [string, string][]).map(([field, label]) => (
                <div key={field} className="flex items-center gap-2">
                  <span className="text-xs flex-shrink-0 w-32" style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <input type="number"
                    value={(profile.income as unknown as Record<string, number>)[field] || ''}
                    onChange={e => updateIncome(field, e.target.value)}
                    placeholder="0"
                    className="flex-1 px-2 py-1.5 rounded text-sm outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
              ))}
            </div>
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
  const [trips, setTrips] = useState<DtTrip[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const nextId = useRef(Date.now());
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  }, [trips]);

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

        <button onClick={() => onAsk(lang === 'he'
          ? `מונה ימי שהייה: ${summary.map(([c,d]) => `${c}: ${d} ימים`).join(', ')}. מה הסיכון לתושבות מס כפולה? מה לעשות?`
          : `Days tracker: ${summary.map(([c,d]) => `${c}: ${d} days`).join(', ')}. What is my dual-residency tax risk?`)}
          className="w-full py-2 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
          style={{ background: 'var(--accent)', color: 'white' }}>
          🤖 {lang === 'he' ? 'שאל AI על סיכון תושבות כפולה' : 'Ask AI about dual-residency risk'}
        </button>
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [devilMode, setDevilMode] = useState(false);
  const [planMode, setPlanMode] = useState(false);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'claude'>('gemini');
  const [savingsData, setSavingsData] = useState<SavingsAnalysis | null>(null);
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
    const savedLang = localStorage.getItem('tax_master_lang') as Lang;
    const savedHistory = localStorage.getItem('tax_master_sessions');
    if (saved) { try { setProfile(JSON.parse(saved)); setProfileSaved(true); } catch {} }
    if (savedLang) setLang(savedLang);
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
    const next: Lang = lang === 'he' ? 'en' : 'he';
    setLang(next);
    localStorage.setItem('tax_master_lang', next);
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

  return (
    <>
    <div className="flex h-screen overflow-hidden" dir={dir} style={{ background: 'var(--background)' }}>
      {/* ── Sidebar ── */}
      <div className="w-60 flex-shrink-0 flex flex-col border-r"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
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
            title={lang === 'he' ? 'Switch to English' : 'עברית'}>
            <Globe size={11} />
            {lang === 'he' ? 'EN' : 'עב'}
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
      <div className="flex-1 flex flex-col overflow-hidden">
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
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 && (
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
            )}

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
        <div className="flex-shrink-0 p-4 border-t" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
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
            <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              {tr.disclaimer}
            </p>
          </div>
        </div>
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
