import { useEffect, useRef } from 'react';
import * as LightweightCharts from 'lightweight-charts';

const { createChart, CrosshairMode } = LightweightCharts;

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
        textColor: '#cbd5e1',
      },
      grid: {
        vertLines: { color: 'rgba(100, 116, 139, 0.12)' },
        horzLines: { color: 'rgba(100, 116, 139, 0.12)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(100, 116, 139, 0.2)',
      },
      timeScale: {
        borderColor: 'rgba(100, 116, 139, 0.2)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    });

    const series = chart.addAreaSeries({
      topColor: 'rgba(34, 211, 238, 0.26)',
      bottomColor: 'rgba(34, 211, 238, 0.02)',
      lineColor: '#22d3ee',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
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
      color: event.sentiment === 'positive' ? '#22c55e' : '#f97316',
      shape: 'circle',
      text: 'News',
    }));

    if (typeof LightweightCharts.createSeriesMarkers === 'function') {
      if (typeof markerApiRef.current?.setMarkers === 'function') {
        markerApiRef.current.setMarkers(markers);
      } else {
        markerApiRef.current = LightweightCharts.createSeriesMarkers(seriesRef.current, markers);
      }
      return;
    }

    if (typeof seriesRef.current.setMarkers === 'function') {
      seriesRef.current.setMarkers(markers);
    }
  }, [events, pair]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Live Price Context</p>
          <h3 className="mt-1 text-xl font-semibold text-white">{pair} price map</h3>
        </div>
        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200" title="News markers are plotted on the same price series to expose timing overlap.">
          Event overlays active
        </span>
      </div>

      <div ref={containerRef} className="h-[360px] w-full" />

      <div className="grid gap-3 md:grid-cols-3">
        {(events || []).slice(0, 3).map((event) => (
          <div key={event.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">News event</p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-200">{event.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
