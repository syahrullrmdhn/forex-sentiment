import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode, CandlestickSeries, LineSeries } from 'lightweight-charts';

function generateOHLC(data) {
  if (!data?.length) return [];
  const out = [];
  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    const prev = data[i - 1];
    const base = prev ? prev.value : point.value;
    const volatility = base * 0.0003;
    const open = base;
    const close = point.value;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    out.push({ time: point.time, open, high, low, close });
  }
  return out;
}

function MiniPriceChart({ data, pair }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const isJpy = pair?.includes('JPY');
  const decimals = isJpy ? 3 : 5;

  useEffect(() => {
    if (!containerRef.current || !data?.length) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: '#6b7280', fontSize: 10 },
      grid: { vertLines: { visible: false }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Magnet, vertLine: { visible: false }, horzLine: { visible: false } },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    series.priceFormatter().format = (price) => price.toFixed(decimals);

    const ohlc = generateOHLC(data);
    series.setData(ohlc);
    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => chart.timeScale().fitContent());
    ro.observe(containerRef.current);

    return () => { ro.disconnect(); chartRef.current?.remove(); };
  }, [data, pair]);

  return <div ref={containerRef} className="w-full rounded-xl" style={{ height: '200px' }} />;
}

export default function DetailModal({ pair, data, onClose }) {
  const backdropRef = useRef(null);
  if (!data || !pair) return null;

  const isJpy = pair.includes('JPY');
  const decimals = isJpy ? 3 : 5;
  const currentPrice = data.price?.current || 0;
  const changePct = data.price?.changePct || 0;

  useEffect(() => {
    function handleEsc(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  function handleBackdropClick(e) {
    if (e.target === backdropRef.current) onClose();
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 animate-[fadeIn_0.2s_ease-out]"
        style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-baseline gap-3">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{pair}</h2>
              <span className={`text-sm font-semibold tabular-nums ${changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currentPrice.toFixed(decimals)}
              </span>
              <span className={`text-xs ${changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Detailed sentiment analysis</p>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary text-lg leading-none px-2 py-1">×</button>
        </div>

        {/* Mini Chart */}
        <div className="rounded-xl p-3 mb-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <MiniPriceChart data={data.price?.history} pair={pair} />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <MetricBox label="Trend" value={data.price?.trend || '—'} color={data.price?.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
          <MetricBox label="Retail Bias" value={data.sentiment?.retailBias || '—'} color={data.sentiment?.avgLongPct >= 50 ? 'text-emerald-400' : 'text-rose-400'} />
          <MetricBox label="News Mood" value={data.news?.mood || '—'} color="text-cyan-400" />
          <MetricBox label="Anomaly" value={data.anomaly?.active ? data.anomaly.level : 'None'} color={data.anomaly?.active ? 'text-orange-400' : 'text-[var(--text-muted)]'} />
        </div>

        {/* Provider Detail */}
        <div className="space-y-3 mb-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Provider Breakdown</h3>
          {data.sentiment?.providers?.map((p) => (
            <div key={p.source} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
              <span className="text-sm text-[var(--text-secondary)]">{p.source}</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-emerald-400">{p.longPct.toFixed(1)}% Long</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  <span className="text-xs text-rose-400">{p.shortPct.toFixed(1)}% Short</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* News */}
        {data.news?.events?.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Latest News</h3>
            <div className="grid gap-2">
              {data.news.events.slice(0, 3).map((e) => (
                <div key={e.id} className="flex items-start gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                  <span className={`mt-0.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${e.sentiment === 'positive' ? 'bg-emerald-400' : 'bg-orange-400'}`} />
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{e.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricBox({ label, value, color }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className={`text-sm font-semibold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
