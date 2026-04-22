import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode, AreaSeries, createSeriesMarkers } from 'lightweight-charts';

export default function PriceChart({ pair, data, events }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const markerApiRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: 'transparent' },
        textColor: 'var(--text-muted)',
        fontFamily: "'Albert Sans', sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(34, 211, 238, 0.15)', labelBackgroundColor: 'rgba(34, 211, 238, 0.2)' },
        horzLine: { color: 'rgba(34, 211, 238, 0.15)', labelBackgroundColor: 'rgba(34, 211, 238, 0.2)' },
      },
      handleScroll: { vertTouchDrag: false },
    });

    const series = chart.addSeries(AreaSeries, {
      topColor: 'rgba(34, 211, 238, 0.1)',
      bottomColor: 'rgba(34, 211, 238, 0.01)',
      lineColor: '#22d3ee',
      lineWidth: 1.5,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver(() => chart.timeScale().fitContent());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      markerApiRef.current = null;
      seriesRef.current = null;
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !data?.length) return;
    seriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [data, pair]);

  useEffect(() => {
    if (!seriesRef.current) return;

    const markers = (events || []).map((event) => ({
      time: event.time,
      position: event.sentiment === 'positive' ? 'belowBar' : 'aboveBar',
      color: event.sentiment === 'positive' ? '#34d399' : '#fb923c',
      shape: 'circle',
      size: 1,
    }));

    if (typeof markerApiRef.current?.setMarkers === 'function') {
      markerApiRef.current.setMarkers(markers);
      return;
    }
    try {
      markerApiRef.current = createSeriesMarkers(seriesRef.current, markers);
    } catch {}
  }, [events, pair]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Price Context</p>
          <h3 className="mt-0.5 text-lg font-semibold text-[var(--text-primary)]">{pair}</h3>
        </div>
        <span className="badge text-[10px] text-cyan-300" style={{ background: 'var(--accent-cyan-soft)' }}>
          Event overlays
        </span>
      </div>

      <div ref={containerRef} className="h-[340px] w-full" />

      <div className="grid gap-3 md:grid-cols-3">
        {(events || []).slice(0, 3).map((event) => (
          <div key={event.id} className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">News</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">{event.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
