import { useEffect, useMemo, useRef, useState } from 'react';

function formatPrice(symbol, price) {
  if (symbol === 'XAU/USD') return price.toFixed(1);
  if (symbol.includes('JPY')) return price.toFixed(3);
  return price.toFixed(5);
}

function computePips(current, avg, symbol) {
  if (symbol === 'XAU/USD') return current - avg;
  if (symbol.includes('JPY')) return (current - avg) * 100;
  return (current - avg) * 10000;
}

function simulateTick(price, symbol) {
  const volatility = symbol === 'XAU/USD' ? 0.45 : symbol.includes('JPY') ? 0.025 : 0.00012;
  const change = (Math.random() - 0.5) * 2 * volatility;
  const decimals = symbol === 'XAU/USD' ? 1 : symbol.includes('JPY') ? 3 : 5;
  return Number((price + change).toFixed(decimals));
}

const INITIAL_DATA = [
  { symbol: 'EUR/USD', longPct: 38.2, shortPct: 61.8, popularity: 94, avgShortPrice: 1.08682, avgLongPrice: 1.08178, currentPrice: 1.08423, hasAlert: true },
  { symbol: 'GBP/USD', longPct: 44.5, shortPct: 55.5, popularity: 89, avgShortPrice: 1.27052, avgLongPrice: 1.26485, currentPrice: 1.26754, hasAlert: false },
  { symbol: 'USD/JPY', longPct: 67.3, shortPct: 32.7, popularity: 87, avgShortPrice: 153.855, avgLongPrice: 154.652, currentPrice: 154.283, hasAlert: true },
  { symbol: 'AUD/USD', longPct: 34.8, shortPct: 65.2, popularity: 78, avgShortPrice: 0.66182, avgLongPrice: 0.65725, currentPrice: 0.65941, hasAlert: false },
  { symbol: 'USD/CHF', longPct: 55.1, shortPct: 44.9, popularity: 72, avgShortPrice: 0.87852, avgLongPrice: 0.88448, currentPrice: 0.88153, hasAlert: false },
  { symbol: 'NZD/USD', longPct: 31.2, shortPct: 68.8, popularity: 65, avgShortPrice: 0.59681, avgLongPrice: 0.59124, currentPrice: 0.59382, hasAlert: false },
  { symbol: 'USD/CAD', longPct: 58.4, shortPct: 41.6, popularity: 81, avgShortPrice: 1.38821, avgLongPrice: 1.39555, currentPrice: 1.39182, hasAlert: false },
  { symbol: 'EUR/GBP', longPct: 52.1, shortPct: 47.9, popularity: 76, avgShortPrice: 0.85148, avgLongPrice: 0.84682, currentPrice: 0.84921, hasAlert: false },
  { symbol: 'EUR/JPY', longPct: 48.7, shortPct: 51.3, popularity: 83, avgShortPrice: 167.352, avgLongPrice: 167.851, currentPrice: 167.624, hasAlert: false },
  { symbol: 'GBP/JPY', longPct: 54.3, shortPct: 45.7, popularity: 70, avgShortPrice: 195.452, avgLongPrice: 196.152, currentPrice: 195.784, hasAlert: false },
  { symbol: 'XAU/USD', longPct: 72.5, shortPct: 27.5, popularity: 96, avgShortPrice: 2418.5, avgLongPrice: 2385.2, currentPrice: 2402.8, hasAlert: true },
  { symbol: 'USD/SGD', longPct: 42.1, shortPct: 57.9, popularity: 55, avgShortPrice: 1.34251, avgLongPrice: 1.33682, currentPrice: 1.33952, hasAlert: false },
].map((row) => ({ ...row, previousPrice: row.currentPrice }));

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function ArrowUpIcon() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>;
}

function ArrowDownIcon() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>;
}

function ChevronLeftIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}

export default function CommunitySentimentTable({ onNavigateDashboard, onLogout, user }) {
  const [data, setData] = useState(INITIAL_DATA);
  const [sortField, setSortField] = useState('popularity');
  const [sortDir, setSortDir] = useState('desc');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setData((prev) => prev.map((row) => {
        const newPrice = simulateTick(row.currentPrice, row.symbol);
        return { ...row, previousPrice: row.currentPrice, currentPrice: newPrice };
      }));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    function handleClick(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [filterOpen]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
    setFilterOpen(false);
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'symbol': aVal = a.symbol; bVal = b.symbol; break;
        case 'long': aVal = a.longPct; bVal = b.longPct; break;
        case 'short': aVal = a.shortPct; bVal = b.shortPct; break;
        case 'popularity': aVal = a.popularity; bVal = b.popularity; break;
        default: return 0;
      }
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [data, sortField, sortDir]);

  return (
    <main className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <header style={{ background: 'var(--surface-elevated)', borderBottom: '1px solid var(--border)' }}>
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3 sm:px-8">
          <button type="button" onClick={onNavigateDashboard} className="btn-secondary flex items-center gap-1.5">
            <ChevronLeftIcon />
            Dashboard
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--text-muted)]">{user?.username}</span>
            <button type="button" onClick={onLogout} className="btn-secondary text-xs">Logout</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">
        <div className="card overflow-hidden">
          {/* Table Header */}
          <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Community Sentiment</h2>
                <span className="badge text-[11px] text-emerald-300" style={{ background: 'var(--accent-emerald-soft)' }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">{data.length} pairs</p>
            </div>
            <div className="relative" ref={filterRef}>
              <button type="button" onClick={() => setFilterOpen(!filterOpen)} className="btn-secondary h-8 w-8 p-0 flex items-center justify-center" title="Sort">
                <FilterIcon />
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-xl py-1" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                  <p className="px-4 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Sort by</p>
                  {[
                    { label: 'Symbol', field: 'symbol' },
                    { label: 'Long %', field: 'long' },
                    { label: 'Short %', field: 'short' },
                    { label: 'Popularity', field: 'popularity' },
                  ].map((opt) => (
                    <button key={opt.field} onClick={() => handleSort(opt.field)}
                      className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition hover:bg-white/5 ${sortField === opt.field ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {opt.label}
                      {sortField === opt.field && <span className="text-xs text-[var(--text-muted)]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Symbol', 'Community Trend', 'Popularity', 'Avg. Short', 'Avg. Long', 'Current Price'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row) => (
                  <tr key={row.symbol} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-semibold text-[var(--text-primary)]">{row.symbol.split('/')[0]}</span>
                        <span className="text-[var(--text-muted)]">/</span>
                        <span className="text-[13px] text-[var(--text-secondary)]">{row.symbol.split('/')[1]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-40 space-y-1.5">
                        <div className="track h-1.5 flex">
                          <div className="h-full transition-all duration-500" style={{ width: `${row.longPct}%`, background: 'var(--accent-emerald)', borderRadius: '9999px 0 0 9999px' }} />
                          <div className="h-full transition-all duration-500" style={{ width: `${row.shortPct}%`, background: 'var(--accent-rose)', borderRadius: '0 9999px 9999px 0' }} />
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-emerald-400">{row.longPct.toFixed(1)}% L</span>
                          <span className="text-rose-400">{row.shortPct.toFixed(1)}% S</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-24 space-y-1">
                        <div className="track h-1.5">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${row.popularity}%`, background: 'var(--accent-orange)' }} />
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)]">{row.popularity}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <PriceCell avg={row.avgShortPrice} current={row.currentPrice} symbol={row.symbol} />
                    </td>
                    <td className="px-6 py-4">
                      <PriceCell avg={row.avgLongPrice} current={row.currentPrice} symbol={row.symbol} />
                    </td>
                    <td className="px-6 py-4">
                      <CurrentCell price={row.currentPrice} prev={row.previousPrice} symbol={row.symbol} hasAlert={row.hasAlert} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-[11px] text-[var(--text-muted)]">{data.length} active pairs</p>
            <p className="text-[11px] text-[var(--text-muted)]">Updates every 3s</p>
          </div>
        </div>
      </div>
    </main>
  );
}

function PriceCell({ avg, current, symbol }) {
  const pips = computePips(current, avg, symbol);
  const positive = pips >= 0;
  return (
    <div className="space-y-0.5">
      <p className="text-[13px] font-medium text-[var(--text-primary)] tabular-nums">{formatPrice(symbol, avg)}</p>
      <p className={`text-[11px] tabular-nums ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
        {positive ? '+' : ''}{pips.toFixed(1)} pips
      </p>
    </div>
  );
}

function CurrentCell({ price, prev, symbol, hasAlert }) {
  const up = price >= prev;
  const change = computePips(price, prev, symbol);
  return (
    <div className="flex items-center gap-2.5">
      <div className="space-y-0.5">
        <p className={`text-[13px] font-semibold tabular-nums ${up ? 'text-[var(--text-primary)]' : 'text-rose-400'}`}>
          {formatPrice(symbol, price)}
        </p>
        <div className={`flex items-center gap-0.5 text-[11px] ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
          {up ? <ArrowUpIcon /> : <ArrowDownIcon />}
          <span className="tabular-nums">{up ? '+' : ''}{change.toFixed(1)}</span>
        </div>
      </div>
      {hasAlert && (
        <span className="text-[var(--text-muted)] hover:text-amber-400 transition cursor-pointer" title="Alert active">
          <BellIcon />
        </span>
      )}
    </div>
  );
}
