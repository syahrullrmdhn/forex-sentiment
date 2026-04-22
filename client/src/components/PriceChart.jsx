import { useEffect, useRef } from 'react';
import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
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
    out.push({ time: point.time, open, high, low, close });
  }
  return out;
}

export default function PriceChart({ pair, data, events }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const maRef = useRef(null);
  const markerApiRef = useRef(null);

  const isJpy = pair?.includes('JPY');
  const decimals = isJpy ? 3 : 5;

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: '#0a0b0f' },
        textColor: '#4a4d5c',
        fontSize: 11,
        fontFamily: "'Albert Sans', sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      rightPriceScale: {
        borderVisible: true,
        borderColor: 'rgba(255,255,255,0.06)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        entireTextOnly: true,
      },
      timeScale: {
        borderVisible: true,
        borderColor: 'rgba(255,255,255,0.06)',
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time) => {
          const d = new Date(time * 1000);
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(255,255,255,0.1)', width: 1, style: 3, labelBackgroundColor: '#111219', labelTextColor: '#7a7d8c' },
        horzLine: { color: 'rgba(255,255,255,0.1)', width: 1, style: 3, labelBackgroundColor: '#111219', labelTextColor: '#7a7d8c' },
      },
      handleScroll: { vertTouchDrag: false },
      watermark: {
        visible: true,
        text: pair || 'FX',
        fontSize: 44,
        fontFamily: "'Albert Sans', sans-serif",
        color: 'rgba(255,255,255,0.025)',
        vertAlign: 'center',
        horzAlign: 'center',
      },
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: '#22d3ee',
      downColor: '#ef4444',
      borderUpColor: '#22d3ee',
      borderDownColor: '#ef4444',
      wickUpColor: '#22d3ee',
      wickDownColor: '#ef4444',
      priceLineVisible: false,
      lastValueVisible: true,
    });

    const ma = chart.addSeries(LineSeries, {
      color: 'rgba(255,255,255,0.3)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    candles.priceFormatter().format = (price) => price.toFixed(decimals);

    chartRef.current = chart;
    candleRef.current = candles;
    maRef.current = ma;

    const ro = new ResizeObserver(() => chart.timeScale().fitContent());
    ro.observe(containerRef.current);

    return () => { ro.disconnect(); chartRef.current?.remove(); };
  }, []);

  useEffect(() => {
    if (!candleRef.current || !data?.length) return;
    const ohlc = generateOHLC(data);
    candleRef.current.setData(ohlc);

    const maData = [];
    for (let i = 19; i < ohlc.length; i++) {
      let sum = 0;
      for (let j = i - 19; j <= i; j++) sum += ohlc[j].close;
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
      color: event.sentiment === 'positive' ? '#22d3ee' : '#ef4444',
      shape: 'circle',
      size: 0.8,
    }));
    if (typeof markerApiRef.current?.setMarkers === 'function') {
      markerApiRef.current.setMarkers(markers);
      return;
    }
    try { markerApiRef.current = createSeriesMarkers(candleRef.current, markers); } catch {}
  }, [events, pair]);

  const lastPrice = data?.length ? data[data.length - 1].value : 0;
  const prevPrice = data?.length > 1 ? data[data.length - 2].value : lastPrice;
  const change = lastPrice - prevPrice;
  const changePct = prevPrice ? (change / prevPrice) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Albert Sans', sans-serif" }}>{pair}</h3>
            <span className="text-lg font-semibold tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: "'Albert Sans', sans-serif" }}>{lastPrice.toFixed(decimals)}</span>
            <span className="text-sm font-medium tabular-nums" style={{ color: change >= 0 ? 'var(--accent)' : 'var(--negative)' }}>
              {change >= 0 ? '+' : ''}{change.toFixed(decimals)} ({change >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
            </span>
          </div>
        </div>
        <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />Live
        </span>
      </div>

      <div ref={containerRef} className="w-full rounded-2xl overflow-hidden" style={{ height: '400px', border: '1px solid var(--border)' }} />

      <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: 'var(--accent)' }} /><span>Up</span></div>
        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: 'var(--negative)' }} /><span>Down</span></div>
        <div className="flex items-center gap-1.5"><span className="h-0.5 w-3" style={{ background: 'rgba(255,255,255,0.3)' }} /><span>MA(20)</span></div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {(events || []).slice(0, 3).map((event) => (
          <div key={event.id} className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: event.sentiment === 'positive' ? 'var(--accent)' : 'var(--negative)' }} />
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>News</p>
            </div>
            <p className="mt-1 text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{event.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
