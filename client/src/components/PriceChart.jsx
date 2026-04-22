import { useEffect, useRef } from 'react';
import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
} from 'lightweight-charts';

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
    const volume = Math.floor(1000 + Math.random() * 4000);
    out.push({ time: point.time, open, high, low, close, value: volume });
  }
  return out;
}

export default function PriceChart({ pair, data, events }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const volumeRef = useRef(null);
  const maRef = useRef(null);
  const markerApiRef = useRef(null);

  const isJpy = pair.includes('JPY');
  const decimals = isJpy ? 3 : 5;

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: '#0f1117' },
        textColor: '#6b7280',
        fontFamily: "'Albert Sans', sans-serif",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: {
          color: 'rgba(255, 255, 255, 0.05)',
          style: 1,
        },
        horzLines: {
          color: 'rgba(255, 255, 255, 0.05)',
          style: 1,
        },
      },
      rightPriceScale: {
        borderVisible: true,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        scaleMargins: { top: 0.1, bottom: 0.25 },
        entireTextOnly: true,
        alignLabels: true,
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderVisible: true,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time) => {
          const d = new Date(time * 1000);
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.15)',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1a1d29',
          labelTextColor: '#9ca3af',
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.15)',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1a1d29',
          labelTextColor: '#9ca3af',
        },
      },
      handleScroll: { vertTouchDrag: false },
      watermark: {
        visible: true,
        text: pair,
        fontSize: 48,
        fontFamily: "'Albert Sans', sans-serif",
        color: 'rgba(255, 255, 255, 0.03)',
        vertAlign: 'center',
        horzAlign: 'center',
      },
    });

    // Candlestick series - TradingView style
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      priceLineVisible: false,
      lastValueVisible: true,
    });

    // Volume histogram at bottom
    const volume = chart.addSeries(HistogramSeries, {
      color: '#22c55e',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      lastValueVisible: false,
    });
    volume.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    // Simple moving average line
    const ma = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 1.5,
      priceLineVisible: false,
      lastValueVisible: false,
      title: 'MA(20)',
    });

    chartRef.current = chart;
    candleRef.current = candles;
    volumeRef.current = volume;
    maRef.current = ma;

    const resizeObserver = new ResizeObserver(() => chart.timeScale().fitContent());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      markerApiRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      maRef.current = null;
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleRef.current || !data?.length) return;

    const ohlc = generateOHLC(data);
    candleRef.current.setData(ohlc);

    // Volume
    const volData = ohlc.map((d) => ({
      time: d.time,
      value: d.value,
      color: d.close >= d.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
    }));
    volumeRef.current.setData(volData);

    // Simple MA(20)
    const maData = [];
    for (let i = 19; i < ohlc.length; i++) {
      let sum = 0;
      for (let j = i - 19; j <= i; j++) {
        sum += ohlc[j].close;
      }
      maData.push({ time: ohlc[i].time, value: sum / 20 });
    }
    maRef.current.setData(maData);

    chartRef.current?.timeScale().fitContent();
  }, [data, pair]);

  useEffect(() => {
    if (!candleRef.current) return;

    const markers = (events || []).map((event) => ({
      time: event.time,
      position: event.sentiment === 'positive' ? 'aboveBar' : 'belowBar',
      color: event.sentiment === 'positive' ? '#22c55e' : '#f97316',
      shape: 'circle',
      size: 1,
      text: '',
    }));

    if (typeof markerApiRef.current?.setMarkers === 'function') {
      markerApiRef.current.setMarkers(markers);
      return;
    }
    try {
      markerApiRef.current = createSeriesMarkers(candleRef.current, markers);
    } catch {}
  }, [events, pair]);

  const lastPrice = data?.length ? data[data.length - 1].value : 0;
  const prevPrice = data?.length > 1 ? data[data.length - 2].value : lastPrice;
  const change = lastPrice - prevPrice;
  const changePct = prevPrice ? (change / prevPrice) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">{pair}</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                {lastPrice.toFixed(decimals)}
              </span>
              <span className={`text-sm font-medium tabular-nums ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(decimals)} ({change >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
              </span>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">O H L C · Volume</p>
        </div>
        <span
          className="badge text-[10px]"
          style={{ background: 'var(--accent-cyan-soft)', color: 'var(--accent-cyan)' }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          Live
        </span>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className="w-full rounded-2xl overflow-hidden"
        style={{
          height: '420px',
          border: '1px solid var(--border)',
        }}
      />

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)]">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-emerald-500" />
          <span>Bullish</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-rose-500" />
          <span>Bearish</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-amber-500" />
          <span>MA(20)</span>
        </div>
      </div>

      {/* News Events */}
      <div className="grid gap-2 md:grid-cols-3">
        {(events || []).slice(0, 3).map((event) => (
          <div
            key={event.id}
            className="rounded-xl px-3 py-2.5"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: event.sentiment === 'positive' ? 'var(--accent-emerald)' : 'var(--accent-orange)',
                }}
              />
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">News</p>
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
              {event.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
