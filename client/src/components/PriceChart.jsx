import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode, AreaSeries, createSeriesMarkers } from 'lightweight-charts';

export default function PriceChart({ pair, data, events }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const markerApiRef = useRef(null);

  const isJpy = pair.includes('JPY');
  const decimals = isJpy ? 3 : 5;

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: 'transparent' },
        textColor: '#6b7280',
        fontFamily: "'Albert Sans', sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: {
          color: 'rgba(255, 255, 255, 0.04)',
          style: 2,
        },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.15, bottom: 0.15 },
        entireTextOnly: true,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time) => {
          const d = new Date(time * 1000);
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: {
          color: 'rgba(34, 211, 238, 0.2)',
          width: 1,
          style: 3,
          labelBackgroundColor: 'rgba(34, 211, 238, 0.15)',
          labelTextColor: '#a5f3fc',
        },
        horzLine: {
          color: 'rgba(34, 211, 238, 0.2)',
          width: 1,
          style: 3,
          labelBackgroundColor: 'rgba(34, 211, 238, 0.15)',
          labelTextColor: '#a5f3fc',
        },
      },
      handleScroll: { vertTouchDrag: false },
      watermark: {
        visible: true,
        text: 'FXSENTIMENT',
        fontSize: 14,
        fontFamily: "'Albert Sans', sans-serif",
        color: 'rgba(255, 255, 255, 0.04)',
        vertAlign: 'top',
        horzAlign: 'left',
      },
    });

    const series = chart.addSeries(AreaSeries, {
      topColor: 'rgba(34, 211, 238, 0.25)',
      bottomColor: 'rgba(34, 211, 238, 0.02)',
      lineColor: '#22d3ee',
      lineWidth: 2,
      lineType: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      lastValueColor: '#a5f3fc',
    });

    series.priceFormatter().format = (price) => price.toFixed(decimals);

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
      size: 0.8,
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
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Live Price
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{pair}</h3>
            {data?.length > 0 && (
              <span className="text-xs text-[var(--text-muted)] tabular-nums">
                {data[data.length - 1].value.toFixed(decimals)}
              </span>
            )}
          </div>
        </div>
        <span
          className="badge text-[10px]"
          style={{ background: 'var(--accent-cyan-soft)', color: 'var(--accent-cyan)' }}
        >
          Real-time
        </span>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className="w-full rounded-2xl"
        style={{
          height: '380px',
          background: 'linear-gradient(180deg, rgba(34,211,238,0.03) 0%, transparent 60%)',
        }}
      />

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
                  boxShadow: `0 0 6px ${event.sentiment === 'positive' ? 'rgba(52,211,153,0.4)' : 'rgba(251,146,60,0.4)'}`,
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
