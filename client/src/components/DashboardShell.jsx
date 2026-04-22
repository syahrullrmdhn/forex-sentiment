import PriceChart from './PriceChart.jsx';

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

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }

  if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)}m ago`;
  }

  return `${Math.floor(diffSeconds / 3600)}h ago`;
}

function freshnessState(source) {
  const ageSeconds = Math.floor((Date.now() - new Date(source.updatedAt).getTime()) / 1000);
  return ageSeconds <= source.maxAgeSec ? 'fresh' : 'stale';
}

function TableNavIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

export default function DashboardShell({
  user,
  pairs,
  selectedPair,
  onPairChange,
  overview,
  onLogout,
  isLoading,
  error,
  onNavigateCommunity,
}) {
  const freshnessEntries = Object.entries(overview.freshness);
  const hasStaleSource = freshnessEntries.some(([, source]) => freshnessState(source) === 'stale');

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[28px] border border-white/10 bg-slate-950/80 p-5 shadow-soft backdrop-blur sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  Dark Mode Default
                </span>
                <FreshnessBadge stale={hasStaleSource} updatedAt={overview.updatedAt} />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">Forex Sentiment Comparison Dashboard</h1>
                <p className="mt-1 text-sm text-slate-400">
                  Bandingkan retail crowding, mood berita, dan momentum harga {selectedPair} dalam satu layar.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onNavigateCommunity}
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
                title="Community Sentiment Analytics"
              >
                <TableNavIcon />
                <span>Community</span>
              </button>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <span className="text-slate-400">Global Pair</span>
                <select
                  value={selectedPair}
                  onChange={(event) => onPairChange(event.target.value)}
                  className="bg-transparent text-sm font-medium text-white outline-none"
                >
                  {pairs.map((pair) => (
                    <option key={pair.value} value={pair.value} className="bg-slate-950 text-white">
                      {pair.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{user.username}</p>
                  <p className="text-xs text-slate-400">Authenticated session</p>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-slate-300 transition hover:border-rose-400/40 hover:text-rose-200"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Spot Price"
            value={formatPrice(selectedPair, overview.price.current)}
            hint={overview.price.trend}
            valueTone={overview.price.changePct >= 0 ? 'text-emerald-300' : 'text-rose-300'}
          />
          <MetricCard
            label="12-Point Move"
            value={formatPercent(overview.price.changePct)}
            hint="Price impulse"
            valueTone={overview.price.changePct >= 0 ? 'text-emerald-300' : 'text-rose-300'}
          />
          <MetricCard
            label="Retail Bias"
            value={overview.sentiment.retailBias}
            hint={`${overview.sentiment.avgLongPct.toFixed(1)}% long / ${overview.sentiment.avgShortPct.toFixed(1)}% short`}
          />
          <MetricCard
            label="News Mood"
            value={overview.news.mood}
            hint={`Score ${overview.news.score.toFixed(2)}`}
          />
        </section>

        {error ? (
          <section className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
          <article className="rounded-[28px] border border-white/10 bg-slate-950/80 p-5 shadow-soft backdrop-blur sm:p-6">
            <PriceChart pair={selectedPair} data={overview.price.history} events={overview.news.events} />
          </article>

          <div className="space-y-6">
            <Card>
              <SectionHeading
                title="Sentiment Comparison"
                subtitle="Retail long/short split across providers"
                tooltip="Comparison bars expose whether crowd positioning is aligned across Myfxbook and FXSSI."
              />
              <div className="mt-5 space-y-4">
                {overview.sentiment.providers.map((provider) => (
                  <div key={provider.source} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white">{provider.source}</span>
                      <span className="text-slate-400">
                        {provider.longPct.toFixed(1)}% long / {provider.shortPct.toFixed(1)}% short
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-900">
                      <div className="flex h-full">
                        <div className="bg-emerald-400" style={{ width: `${provider.longPct}%` }} />
                        <div className="bg-rose-400" style={{ width: `${provider.shortPct}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionHeading
                title="News Mood Gauge"
                subtitle="Aggregate sentiment score from -1 to 1"
                tooltip="This gauge compresses current news flow into a directional score for quick bias checks."
              />
              <NewsMoodGauge score={overview.news.score} mood={overview.news.mood} />
            </Card>

            <Card>
              <SectionHeading
                title="Anomaly Alert"
                subtitle="Cross-source divergence monitor"
                tooltip="Alert severity rises when retail positioning disagrees with both price and news tone."
              />
              <AnomalyAlert anomaly={overview.anomaly} />
            </Card>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <SectionHeading
              title="Mini Economic Calendar"
              subtitle="High-impact events only"
              tooltip="Calendar stays intentionally compact so the main analytical widgets remain visible without extra navigation."
            />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {overview.calendar.map((event) => (
                <article key={`${event.time}-${event.title}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                      {event.impact}
                    </span>
                    <span className="text-xs font-medium text-slate-400">{event.currency}</span>
                  </div>
                  <p className="mt-3 text-base font-medium text-white">{event.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{event.time}</p>
                </article>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHeading
              title="Source Freshness"
              subtitle="Background sync health"
              tooltip="Small status dots show whether each upstream feed is still within its expected update window."
            />
            <div className="mt-5 grid gap-3">
              {freshnessEntries.map(([sourceName, source]) => {
                const state = freshnessState(source);

                return (
                  <div key={sourceName} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${state === 'fresh' ? 'bg-emerald-400' : 'bg-rose-400'}`}
                        title={`Expected refresh within ${source.maxAgeSec} seconds.`}
                      />
                      <div>
                        <p className="text-sm font-medium capitalize text-white">{sourceName}</p>
                        <p className="text-xs text-slate-400">SLA {Math.floor(source.maxAgeSec / 60) || '<1'} min</p>
                      </div>
                    </div>
                    <span className="text-sm text-slate-300">{relativeTime(source.updatedAt)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {isLoading ? <p className="px-1 text-sm text-slate-400">Refreshing market snapshot...</p> : null}
      </div>
    </main>
  );
}

function Card({ children }) {
  return <article className="rounded-[28px] border border-white/10 bg-slate-950/80 p-5 shadow-soft backdrop-blur sm:p-6">{children}</article>;
}

function MetricCard({ label, value, hint, valueTone = 'text-white' }) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-slate-950/80 p-5 shadow-soft backdrop-blur">
      <p className="text-sm uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${valueTone}`}>{value}</p>
      <p className="mt-2 text-sm text-slate-400">{hint}</p>
    </article>
  );
}

function SectionHeading({ title, subtitle, tooltip }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </div>
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-xs font-semibold text-slate-300"
        title={tooltip}
      >
        ?
      </span>
    </div>
  );
}

function FreshnessBadge({ stale, updatedAt }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${stale ? 'border-rose-400/20 bg-rose-400/10 text-rose-200' : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'}`}>
      <span className={`h-2 w-2 rounded-full ${stale ? 'bg-rose-400' : 'bg-emerald-400'}`} />
      Last sync {relativeTime(updatedAt)}
    </span>
  );
}

function NewsMoodGauge({ score, mood }) {
  const clampedScore = Math.max(-1, Math.min(1, score));
  const leftPosition = `${((clampedScore + 1) / 2) * 100}%`;

  return (
    <div className="mt-5 space-y-5">
      <div className="relative h-4 rounded-full bg-gradient-to-r from-rose-500 via-slate-700 to-emerald-400">
        <span
          className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-slate-950 bg-white shadow-lg"
          style={{ left: leftPosition }}
        />
      </div>
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-500">
        <span>Negative</span>
        <span>Neutral</span>
        <span>Positive</span>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-3xl font-semibold text-white">{score.toFixed(2)}</p>
        <p className="mt-2 text-sm text-slate-400">Current read: {mood}</p>
      </div>
    </div>
  );
}

function AnomalyAlert({ anomaly }) {
  const variant = anomaly.active
    ? anomaly.level === 'high'
      ? 'border-amber-400/30 bg-amber-400/10 text-amber-100'
      : 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100'
    : 'border-white/10 bg-white/[0.03] text-slate-200';

  return (
    <div className={`mt-5 rounded-3xl border p-5 ${variant}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{anomaly.title}</h3>
        <span className="rounded-full border border-current/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-current">
          {anomaly.level}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-current/90">{anomaly.message}</p>
    </div>
  );
}
