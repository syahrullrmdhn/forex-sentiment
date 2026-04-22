import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode, AreaSeries, createSeriesMarkers } from 'lightweight-charts';

export default function PriceChart({ pair, data, events }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const markerApiRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: 'transparent' },
        textColor: '#9fa8da',
      },
      grid: {
        vertLines: { color: 'rgba(42, 45, 62, 0.5)' },
        horzLines: { color: 'rgba(42, 45, 62, 0.5)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(60, 65, 90, 0.3)',
      },
      timeScale: {
        borderColor: 'rgba(60, 65, 90, 0.3)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(34, 211, 238, 0.2)',
          labelBackgroundColor: 'rgba(34, 211, 238, 0.3)',
        },
        horzLine: {
          color: 'rgba(34, 211, 238, 0.2)',
          labelBackgroundColor: 'rgba(34, 211, 238, 0.3)',
        },
      },
      handleScroll: { vertTouchDrag: false },
    });

    // Glowing area series - laser-engraved path
    const series = chart.addSeries(AreaSeries, {
      topColor: 'rgba(34, 211, 238, 0.15)',
      bottomColor: 'rgba(34, 211, 238, 0.01)',
      lineColor: '#22d3ee',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      lastValueColor: '#a5f3fc',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver(() => {
      chart.timeScale().fitContent();
    });

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
    if (!seriesRef.current || !data?.length) {
      return;
    }

    seriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [data, pair]);

  useEffect(() => {
    if (!seriesRef.current) {
      return;
    }

    const markers = (events || []).map((event) => ({
      time: event.time,
      position: event.sentiment === 'positive' ? 'belowBar' : 'aboveBar',
      color: event.sentiment === 'positive'
        ? '#34d399'
        : '#fb923c',
      shape: 'circle',
      text: 'News',
    }));

    if (typeof markerApiRef.current?.setMarkers === 'function') {
      markerApiRef.current.setMarkers(markers);
      return;
    }

    try {
      markerApiRef.current = createSeriesMarkers(seriesRef.current, markers);
    } catch {
      // markers API may vary across minor releases
    }
  }, [events, pair]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--neo-text-muted)]">Live Price Context</p>
          <h3 className="mt-1 text-xl font-semibold neo-text-embossed">{pair} price map</h3>
        </div>
        <span
          className="neo-badge text-xs font-medium text-cyan-200"
          title="News markers are plotted on the same price series to expose timing overlap."
        >
          Event overlays active
        </span>
      </div>

      <div ref={containerRef} className="h-[360px] w-full" />

      <div className="grid gap-3 md:grid-cols-3">
        {(events || []).slice(0, 3).map((event) => (
          <div key={event.id} className="neo-pressed rounded-2xl p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--neo-text-muted)]">News event</p>
            <p className="mt-2 text-sm font-medium leading-6 text-[var(--neo-text-secondary)]">{event.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
