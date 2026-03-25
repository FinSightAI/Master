'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, Settings, ChevronDown, ChevronUp, Zap,
  RotateCcw, Globe, BarChart3, X, Plus, TrendingDown, History, Clock,
  FileText, Download, Calculator, ClipboardCheck
} from 'lucide-react';
import { streamChat, fetchSavings, fetchCountry, analyzeDocument, fetchIsraelAnalysis } from '../../lib/api';
import { UserProfile, ChatMessage, ToolEvent, DEFAULT_PROFILE, TOOL_DISPLAY_NAMES, TOOL_ICONS, SavingsAnalysis, SavedSession, IsraelProfile, DEFAULT_ISRAEL_PROFILE, IsraelAnalysis } from '../../lib/types';
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

  const updIp = (field: keyof IsraelProfile, value: number | boolean) =>
    setIp(p => ({ ...p, [field]: value }));

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetchIsraelAnalysis(profile, ip);
      setAnalysis(res);
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
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {/* Step tabs */}
        {analysis && (
          <div className="flex gap-1 mb-4 flex-wrap">
            {[tr.israelStep0, tr.israelStep1, tr.israelStep2, tr.israelStep3].map((label, i) => (
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
                  <div className="rounded p-1.5 text-center col-span-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div style={{ color: 'var(--text-muted)' }}>{tr.israelCommunity}</div>
                    <div className="font-medium">{isHe ? c.israeli_community : c.israeli_community_en}</div>
                  </div>
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
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdvisorPage() {
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
  const [planMode, setPlanMode] = useState(false);
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
    const messageText = planMode && !text
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
      for await (const event of streamChat(messageText, profileSaved ? profile : null, conversationHistoryRef.current)) {
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
  }, [input, isLoading, profile, profileSaved]);

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
          <button onClick={() => { setShowIsraelWizard(!showIsraelWizard); setShowExitTax(false); setShowSavings(false); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showIsraelWizard ? 'var(--accent-glow)' : 'var(--surface-2)', color: showIsraelWizard ? 'var(--accent)' : 'var(--text-muted)', border: showIsraelWizard ? '1px solid var(--accent)' : '1px solid transparent' }}>
            🇮🇱 {tr.israelWizard}
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-12 slide-in">
                <div className="text-6xl mb-4">🌍</div>
                <h1 className="text-2xl font-bold mb-2">{tr.welcomeTitle}</h1>
                <p className="mb-6 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
                  {tr.welcomeSubtitle}
                </p>
                {!profileSaved && (
                  <button onClick={() => setShowProfile(true)}
                    className="mb-6 px-4 py-2 rounded-lg text-sm transition-all hover:opacity-80 inline-flex items-center gap-2"
                    style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                    <Plus size={14} />
                    {tr.setupProfile}
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
                  {tr.sampleQuestions.map((q, i) => (
                    <button key={i} onClick={() => sendMessage(q)}
                      className="p-3 rounded-xl text-sm transition-all hover:opacity-80"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', textAlign: lang === 'he' ? 'right' : 'left' }}>
                      {q}
                    </button>
                  ))}
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
            {planMode && (
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
    </>
  );
}
