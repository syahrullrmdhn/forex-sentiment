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
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8" style={{ background: 'var(--neo-bg-start)' }}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header - Sculpted embossed panel */}
        <header className="neo-card">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="neo-badge text-cyan-200">
                  <span className="neo-orb-cyan mr-2 inline-block h-2 w-2 rounded-full" />
                  Dark Mode Default
                </span>
                <FreshnessBadge stale={hasStaleSource} updatedAt={overview.updatedAt} />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight neo-text-embossed">
                  Forex Sentiment Comparison Dashboard
                </h1>
                <p className="mt-1 text-sm neo-text-engraved">
                  Bandingkan retail crowding, mood berita, dan momentum harga {selectedPair} dalam satu layar.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onNavigateCommunity}
                className="neo-btn flex items-center gap-2 text-sm"
                title="Community Sentiment Analytics"
              >
                <TableNavIcon />
                <span>Community</span>
              </button>

              <label className="neo-pressed flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-[var(--neo-text-secondary)]">
                <span className="text-[var(--neo-text-muted)]">Global Pair</span>
                <select
                  value={selectedPair}
                  onChange={(event) => onPairChange(event.target.value)}
                  className="bg-transparent text-sm font-medium text-[var(--neo-text-primary)] outline-none"
                >
                  {pairs.map((pair) => (
                    <option key={pair.value} value={pair.value} style={{ background: 'var(--neo-surface-dark)' }}>
                      {pair.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="neo-raised flex items-center gap-3 rounded-2xl px-4 py-3">
                <div className="neo-avatar flex h-9 w-9 items-center justify-center text-xs font-bold text-cyan-300">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--neo-text-primary)]">{user.username}</p>
                  <p className="text-xs text-[var(--neo-text-muted)]">Authenticated</p>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-full px-3 py-1 text-xs font-medium text-[var(--neo-text-muted)] transition hover:text-rose-300"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Metric Cards - 3x3 grid of embossed tiles */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Spot Price"
            value={formatPrice(selectedPair, overview.price.current)}
            hint={overview.price.trend}
            isPositive={overview.price.changePct >= 0}
          />
          <MetricCard
            label="12-Point Move"
            value={formatPercent(overview.price.changePct)}
            hint="Price impulse"
            isPositive={overview.price.changePct >= 0}
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
          <section className="neo-card-pressed border border-rose-500/20 px-5 py-4 text-sm text-rose-200">
            {error}
          </section>
        ) : null}

        {/* Main Content - Chart + Side Panel */}
        <section className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
          <article className="neo-chart-tray">
            <PriceChart pair={selectedPair} data={overview.price.history} events={overview.news.events} />
          </article>

          <div className="space-y-6">
            {/* Sentiment Comparison - Sculpted bars */}
            <Card>
              <SectionHeading
                title="Sentiment Comparison"
                subtitle="Retail long/short split across providers"
                tooltip="Comparison bars expose whether crowd positioning is aligned across Myfxbook and FXSSI."
              />
              <div className="mt-5 space-y-5">
                {overview.sentiment.providers.map((provider) => (
                  <div key={provider.source} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-[var(--neo-text-primary)]">{provider.source}</span>
                      <span className="text-[var(--neo-text-muted)]">
                        {provider.longPct.toFixed(1)}% long / {provider.shortPct.toFixed(1)}% short
                      </span>
                    </div>
                    <div className="neo-track h-3">
                      <div className="flex h-full">
                        <div className="neo-bar-glow-cyan transition-all duration-700" style={{ width: `${provider.longPct}%` }} />
                        <div className="neo-bar-glow-orange transition-all duration-700" style={{ width: `${provider.shortPct}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* News Mood Gauge - Engraved gauge with glowing indicator */}
            <Card>
              <SectionHeading
                title="News Mood Gauge"
                subtitle="Aggregate sentiment score from -1 to 1"
                tooltip="This gauge compresses current news flow into a directional score for quick bias checks."
              />
              <NewsMoodGauge score={overview.news.score} mood={overview.news.mood} />
            </Card>

            {/* Anomaly Alert - Glowing alert card */}
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

        {/* Bottom Row - Calendar + Freshness */}
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <SectionHeading
              title="Mini Economic Calendar"
              subtitle="High-impact events only"
              tooltip="Calendar stays intentionally compact so the main analytical widgets remain visible without extra navigation."
            />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {overview.calendar.map((event) => (
                <article key={`${event.time}-${event.title}`} className="neo-pressed rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="neo-badge text-amber-200" style={{ boxShadow: '0 0 10px var(--neo-glow-amber-dim, rgba(251,191,36,0.2))' }}>
                      {event.impact}
                    </span>
                    <span className="text-xs font-medium text-[var(--neo-text-muted)]">{event.currency}</span>
                  </div>
                  <p className="mt-3 text-base font-medium text-[var(--neo-text-primary)]">{event.title}</p>
                  <p className="mt-1 text-sm text-[var(--neo-text-muted)]">{event.time}</p>
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
                  <div key={sourceName} className="neo-pressed flex items-center justify-between rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-3 w-3 rounded-full ${state === 'fresh' ? 'neo-orb-emerald' : 'neo-orb-rose'}`}
                        title={`Expected refresh within ${source.maxAgeSec} seconds.`}
                      />
                      <div>
                        <p className="text-sm font-medium capitalize text-[var(--neo-text-primary)]">{sourceName}</p>
                        <p className="text-xs text-[var(--neo-text-muted)]">SLA {Math.floor(source.maxAgeSec / 60) || '<1'} min</p>
                      </div>
                    </div>
                    <span className="text-sm text-[var(--neo-text-secondary)]">{relativeTime(source.updatedAt)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {isLoading ? (
          <p className="px-1 text-sm text-[var(--neo-text-muted)]">Refreshing market snapshot...</p>
        ) : null}
      </div>
    </main>
  );
}

function Card({ children }) {
  return <article className="neo-card">{children}</article>;
}

function MetricCard({ label, value, hint, isPositive }) {
  const valueClass = isPositive === true
    ? 'neo-text-glow-emerald'
    : isPositive === false
      ? 'neo-text-glow-rose'
      : 'neo-text-embossed';

  return (
    <article className="neo-card group transition-all duration-300 hover:translate-y-[-2px]">
      <p className="text-sm uppercase tracking-[0.22em] text-[var(--neo-text-muted)]">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${valueClass}`}>{value}</p>
      <p className="mt-2 text-sm text-[var(--neo-text-muted)]">{hint}</p>
    </article>
  );
}

function SectionHeading({ title, subtitle, tooltip }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold neo-text-embossed">{title}</h2>
        <p className="mt-1 text-sm text-[var(--neo-text-muted)]">{subtitle}</p>
      </div>
      <span
        className="neo-pressed inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-[var(--neo-text-muted)] cursor-help"
        title={tooltip}
      >
        ?
      </span>
    </div>
  );
}

function FreshnessBadge({ stale, updatedAt }) {
  return (
    <span className={`neo-badge inline-flex items-center gap-2 text-xs font-medium ${stale ? 'text-rose-200' : 'text-emerald-200'}`}>
      <span className={`h-2 w-2 rounded-full ${stale ? 'neo-orb-rose' : 'neo-orb-emerald'}`} />
      Last sync {relativeTime(updatedAt)}
    </span>
  );
}

function NewsMoodGauge({ score, mood }) {
  const clampedScore = Math.max(-1, Math.min(1, score));
  const leftPosition = `${((clampedScore + 1) / 2) * 100}%`;

  return (
    <div className="mt-5 space-y-5">
      {/* Engraved track with gradient glow beneath */}
      <div className="neo-track relative h-5">
        <div
          className="absolute inset-0 rounded-full opacity-30"
          style={{
            background: 'linear-gradient(90deg, rgba(244,63,94,0.6), rgba(100,116,139,0.3), rgba(16,185,129,0.6))',
          }}
        />
        {/* Glowing thumb */}
        <span
          className="absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: leftPosition,
            background: 'radial-gradient(circle at 35% 35%, #67e8f9, #0891b2)',
            boxShadow: `
              0 0 12px var(--neo-glow-cyan),
              0 0 24px var(--neo-glow-cyan-dim),
              inset -2px -2px 4px rgba(0,0,0,0.3),
              inset 2px 2px 4px rgba(255,255,255,0.4)
            `,
          }}
        />
      </div>
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[var(--neo-text-muted)]">
        <span className="neo-text-glow-rose">Negative</span>
        <span className="neo-text-engraved">Neutral</span>
        <span className="neo-text-glow-emerald">Positive</span>
      </div>
      <div className="neo-pressed rounded-2xl p-4">
        <p className="text-3xl font-semibold neo-text-embossed">{score.toFixed(2)}</p>
        <p className="mt-2 text-sm text-[var(--neo-text-muted)]">Current read: <span className="neo-text-glow-cyan">{mood}</span></p>
      </div>
    </div>
  );
}

function AnomalyAlert({ anomaly }) {
  const isActive = anomaly.active;
  const isHigh = anomaly.level === 'high';

  return (
    <div
      className={`mt-5 rounded-3xl p-5 transition-all duration-300 ${
        isActive
          ? isHigh
            ? 'neo-raised-glow-orange'
            : 'neo-raised-glow-cyan'
          : 'neo-pressed'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold neo-text-embossed">{anomaly.title}</h3>
        <span className={`neo-badge text-xs font-semibold uppercase tracking-[0.18em] ${isHigh ? 'neo-text-glow-orange' : 'neo-text-glow-cyan'}`}>
          {anomaly.level}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--neo-text-secondary)]">{anomaly.message}</p>
    </div>
  );
}
