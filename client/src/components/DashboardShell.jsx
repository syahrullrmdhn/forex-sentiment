import { useEffect, useMemo, useState } from 'react';
import PriceChart from './PriceChart.jsx';
import { SkeletonCard, SkeletonChart } from './SkeletonLoading.jsx';

function formatPrice(pair, value) {
  const decimals = pair.includes('JPY') ? 3 : 5;
  return Number(value || 0).toFixed(decimals);
}

function formatPercent(value) {
  const number = Number(value || 0);
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`;
}

function relativeTime(iso) {
  const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  return `${Math.floor(diffSeconds / 3600)}h ago`;
}

function freshnessState(source) {
  const ageSeconds = Math.floor((Date.now() - new Date(source.updatedAt).getTime()) / 1000);
  return ageSeconds <= source.maxAgeSec ? 'fresh' : 'stale';
}

function TableNavIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>;
}

const FAVORITES_KEY = 'forex-sentiment.favorites';
function getFavorites() { try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch { return []; } }

export default function DashboardShell({
  user, pairs, selectedPair, onPairChange, overview,
  onLogout, isLoading, error, onNavigateCommunity,
}) {
  const [favorites, setFavorites] = useState(getFavorites);
  const [timeRange, setTimeRange] = useState('1D');
  const [mounted, setMounted] = useState(false);
  const freshnessEntries = Object.entries(overview?.freshness || {});
  const hasStaleSource = freshnessEntries.some(([, s]) => freshnessState(s) === 'stale');

  useEffect(() => { setMounted(true); }, []);

  const toggleFavorite = (pair) => {
    setFavorites((prev) => {
      const next = prev.includes(pair) ? prev.filter((p) => p !== pair) : [...prev, pair];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Filter history based on time range
  const chartData = useMemo(() => {
    if (!overview?.price?.history) return [];
    const all = overview.price.history;
    switch (timeRange) {
      case '1H': return all.slice(-20);
      case '4H': return all.slice(-50);
      case '1D': return all;
      case '1W': return all;
      default: return all;
    }
  }, [overview?.price?.history, timeRange]);

  const isFav = favorites.includes(selectedPair);

  return (
    <main className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="card mb-6 p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="badge" style={{ background: 'var(--accent-cyan-soft)', color: 'var(--accent-cyan)' }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />Live Market
                </span>
                <FreshnessBadge stale={hasStaleSource} updatedAt={overview?.updatedAt} />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Forex Sentiment</h1>
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">{selectedPair} retail positioning, news mood, and price context</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={onNavigateCommunity} className="btn-secondary flex items-center gap-2"><TableNavIcon />Community</button>
              <div className="relative">
                <select value={selectedPair} onChange={(e) => onPairChange(e.target.value)} className="input-field py-2 pr-10 pl-4 appearance-none cursor-pointer" style={{ width: 'auto', minWidth: '140px' }}>
                  {pairs.map((p) => <option key={p.value} value={p.value} style={{ background: 'var(--surface-elevated)' }}>{p.label}</option>)}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => toggleFavorite(selectedPair)} className={`flex h-8 w-8 items-center justify-center rounded-full transition ${isFav ? 'text-amber-400 bg-amber-400/10' : 'text-[var(--text-muted)] hover:text-amber-400 hover:bg-white/5'}`} title={isFav ? 'Remove favorite' : 'Add favorite'}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </button>
                <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold" style={{ background: 'var(--accent-cyan-soft)', color: 'var(--accent-cyan)' }}>{user.username.charAt(0).toUpperCase()}</div>
                <button type="button" onClick={onLogout} className="btn-secondary">Logout</button>
              </div>
            </div>
          </div>

          {/* Favorite chips */}
          {favorites.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="text-[11px] text-[var(--text-muted)] mr-1">Favorites:</span>
              {favorites.map((fav) => (
                <button key={fav} onClick={() => onPairChange(fav)} className={`badge text-[11px] transition ${fav === selectedPair ? 'text-amber-300' : 'text-[var(--text-secondary)]'}`} style={{ background: fav === selectedPair ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.05)' }}>
                  {fav}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Metrics */}
        {mounted && overview ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
            <MetricCard label="Spot Price" value={formatPrice(selectedPair, overview.price.current)} hint={overview.price.trend} isPositive={overview.price.changePct >= 0} />
            <MetricCard label="12-Point Move" value={formatPercent(overview.price.changePct)} hint="Price impulse" isPositive={overview.price.changePct >= 0} />
            <MetricCard label="Retail Bias" value={overview.sentiment.retailBias} hint={`${overview.sentiment.avgLongPct.toFixed(1)}% long / ${overview.sentiment.avgShortPct.toFixed(1)}% short`} />
            <MetricCard label="News Mood" value={overview.news.mood} hint={`Score ${overview.news.score.toFixed(2)}`} />
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
            <SkeletonCard/><SkeletonCard/><SkeletonCard/><SkeletonCard/>
          </section>
        )}

        {error && <section className="card mb-6 border-rose-500/20 px-5 py-4 text-sm text-rose-300">{error}</section>}

        {/* Main Content */}
        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr] mb-6">
          <div className="card p-5 sm:p-6">
            {mounted && overview ? (
              <>
                {/* Time range selector */}
                <div className="flex items-center gap-2 mb-4">
                  {['1H','4H','1D','1W'].map((r) => (
                    <button key={r} onClick={() => setTimeRange(r)} className={`text-[11px] font-semibold px-3 py-1 rounded-lg transition ${timeRange === r ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`} style={{ background: timeRange === r ? 'rgba(255,255,255,0.08)' : 'transparent' }}>
                      {r}
                    </button>
                  ))}
                </div>
                <PriceChart pair={selectedPair} data={chartData} events={overview.news.events} />
              </>
            ) : (
              <SkeletonChart/>
            )}
          </div>

          <div className="space-y-5">
            {mounted && overview ? (
              <>
                <div className="card p-5 sm:p-6">
                  <SectionHeading title="Sentiment Comparison" subtitle="Long/short split across providers" />
                  <div className="mt-5 space-y-5">
                    {overview.sentiment.providers.map((provider) => (
                      <div key={provider.source} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-[var(--text-primary)]">{provider.source}</span>
                          <span className="text-[var(--text-muted)] text-xs">{provider.longPct.toFixed(1)}% / {provider.shortPct.toFixed(1)}%</span>
                        </div>
                        <div className="track h-2 flex">
                          <div className="h-full transition-all duration-700" style={{ width: `${provider.longPct}%`, background: 'var(--accent-emerald)', borderRadius: '9999px 0 0 9999px' }} />
                          <div className="h-full transition-all duration-700" style={{ width: `${provider.shortPct}%`, background: 'var(--accent-rose)', borderRadius: '0 9999px 9999px 0' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-5 sm:p-6">
                  <SectionHeading title="News Mood" subtitle="Aggregate sentiment score" />
                  <NewsMoodGauge score={overview.news.score} mood={overview.news.mood} />
                </div>

                <div className="card p-5 sm:p-6">
                  <SectionHeading title="Anomaly Alert" subtitle="Cross-source divergence" />
                  <AnomalyAlert anomaly={overview.anomaly} />
                </div>
              </>
            ) : (
              <><SkeletonCard/><SkeletonCard/><SkeletonCard/></>
            )}
          </div>
        </section>

        {/* Bottom Row */}
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {mounted && overview ? (
            <>
              <div className="card p-5 sm:p-6">
                <SectionHeading title="Economic Calendar" subtitle="High-impact events" />
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {overview.calendar.map((event) => (
                    <div key={`${event.time}-${event.title}`} className="flex items-start gap-3 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-amber-soft)', color: 'var(--accent-amber)' }}>{event.impact}</span>
                          <span className="text-[11px] text-[var(--text-muted)]">{event.currency}</span>
                        </div>
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{event.title}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{event.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5 sm:p-6">
                <SectionHeading title="Source Health" subtitle="Data freshness" />
                <div className="mt-5 space-y-2">
                  {freshnessEntries.map(([name, source]) => {
                    const state = freshnessState(source);
                    return (
                      <div key={name} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-3">
                          <span className={`h-2 w-2 rounded-full ${state === 'fresh' ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ boxShadow: state === 'fresh' ? '0 0 8px rgba(52,211,153,0.4)' : '0 0 8px rgba(251,113,133,0.4)' }} />
                          <div>
                            <p className="text-sm font-medium capitalize text-[var(--text-primary)]">{name}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">{Math.floor(source.maxAgeSec / 60) || '<1'} min SLA</p>
                          </div>
                        </div>
                        <span className="text-xs text-[var(--text-secondary)]">{relativeTime(source.updatedAt)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <><SkeletonCard/><SkeletonCard/></>
          )}
        </section>

        {isLoading && <p className="mt-4 text-xs text-[var(--text-muted)]">Refreshing...</p>}
      </div>
    </main>
  );
}

function MetricCard({ label, value, hint, isPositive }) {
  const valueColor = isPositive === true ? 'text-emerald-400' : isPositive === false ? 'text-rose-400' : 'text-[var(--text-primary)]';
  return (
    <div className="card p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${valueColor}`}>{value}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>
    </div>
  );
}

function SectionHeading({ title, subtitle }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function FreshnessBadge({ stale, updatedAt }) {
  return (
    <span className={`badge text-[11px] ${stale ? 'text-rose-300' : 'text-emerald-300'}`} style={{ background: stale ? 'var(--accent-rose-soft)' : 'var(--accent-emerald-soft)' }}>
      <span className={`h-1.5 w-1.5 rounded-full ${stale ? 'bg-rose-400' : 'bg-emerald-400'}`} />
      {relativeTime(updatedAt)}
    </span>
  );
}

function NewsMoodGauge({ score, mood }) {
  const clamped = Math.max(-1, Math.min(1, score));
  const pos = `${((clamped + 1) / 2) * 100}%`;
  return (
    <div className="mt-5 space-y-4">
      <div className="track h-2 relative">
        <div className="absolute inset-0 rounded-full opacity-20" style={{ background: 'linear-gradient(90deg, var(--accent-rose), var(--accent-emerald))' }} />
        <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2" style={{ left: pos, background: 'var(--surface)', borderColor: 'var(--accent-cyan)', boxShadow: '0 0 12px rgba(34,211,238,0.3)' }} />
      </div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        <span>Negative</span><span>Neutral</span><span>Positive</span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-semibold text-[var(--text-primary)]">{score.toFixed(2)}</span>
        <span className="text-sm text-[var(--accent-cyan)]">{mood}</span>
      </div>
    </div>
  );
}

function AnomalyAlert({ anomaly }) {
  if (!anomaly.active) {
    return <div className="mt-4 rounded-xl px-4 py-3 text-sm text-[var(--text-muted)]" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>{anomaly.message}</div>;
  }
  const isHigh = anomaly.level === 'high';
  return (
    <div className="mt-4 rounded-xl px-4 py-3" style={{ background: isHigh ? 'var(--accent-orange-soft)' : 'var(--accent-cyan-soft)', border: `1px solid ${isHigh ? 'rgba(251,146,60,0.2)' : 'rgba(34,211,238,0.2)'}` }}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={`text-sm font-semibold ${isHigh ? 'text-orange-300' : 'text-cyan-300'}`}>{anomaly.title}</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', color: isHigh ? 'var(--accent-orange)' : 'var(--accent-cyan)' }}>{anomaly.level}</span>
      </div>
      <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">{anomaly.message}</p>
    </div>
  );
}
