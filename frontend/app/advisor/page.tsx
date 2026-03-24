'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, Settings, ChevronDown, ChevronUp, Zap,
  RotateCcw, Globe, BarChart3, X, Plus, TrendingDown, History, Clock
} from 'lucide-react';
import { streamChat, fetchSavings } from '../../lib/api';
import { UserProfile, ChatMessage, ToolEvent, DEFAULT_PROFILE, TOOL_DISPLAY_NAMES, TOOL_ICONS, SavingsAnalysis, SavedSession } from '../../lib/types';
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

// ─── Savings Panel ─────────────────────────────────────────────────────────────
function SavingsPanel({ lang, profile, onAsk, onClose }: {
  lang: Lang; profile: UserProfile; onAsk: (msg: string) => void; onClose: () => void;
}) {
  const tr = useTranslation(lang);
  const [data, setData] = useState<SavingsAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavings(profile)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [profile]);

  const fmt = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `$${(n / 1000).toFixed(0)}K`;
    return `$${n.toLocaleString()}`;
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
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
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
                  onClick={() => {
                    const msg = lang === 'he'
                      ? `ספר לי יותר על תכנון מס ב${r.name} — אני יכול לחסוך ${fmt(r.annual_savings)} לשנה. מה הדרישות והצעדים הנדרשים?`
                      : `Tell me more about moving to ${r.name} for tax purposes — I could save ${fmt(r.annual_savings)}/year. What are the requirements and key steps?`;
                    onAsk(msg); onClose();
                  }}>
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
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [profileSaved, setProfileSaved] = useState(false);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

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
          <button onClick={() => { setShowSavings(!showSavings); setShowProfile(false); setShowCompare(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: showSavings ? 'var(--accent-glow)' : 'var(--surface-2)', color: showSavings ? 'var(--accent)' : 'var(--text-muted)', border: showSavings ? '1px solid var(--accent)' : '1px solid transparent' }}>
            <TrendingDown size={14} />
            {tr.savings}
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
            onAsk={msg => sendMessage(msg)} onClose={() => setShowSavings(false)} />
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
            <div className="flex gap-2 items-end rounded-2xl p-2"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown} disabled={isLoading}
                placeholder={tr.inputPlaceholder} rows={1}
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
  );
}
