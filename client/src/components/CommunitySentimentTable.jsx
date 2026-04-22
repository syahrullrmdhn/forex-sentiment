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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

function SortOption({ label, field, active, dir, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-gray-50 ${
        active ? 'font-semibold text-gray-900' : 'font-medium text-gray-600'
      }`}
    >
      {label}
      {active && dir && (
        <span className="ml-3 text-xs text-gray-400">{dir === 'asc' ? '\u2191' : '\u2193'}</span>
      )}
    </button>
  );
}

function SymbolCell({ symbol }) {
  const slash = symbol.indexOf('/');
  const base = symbol.slice(0, slash);
  const quote = symbol.slice(slash + 1);
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[13px] font-bold text-gray-900 tracking-tight">{base}</span>
      <span className="text-[11px] text-gray-300 font-light">/</span>
      <span className="text-[13px] font-medium text-gray-500">{quote}</span>
    </div>
  );
}

function TrendBar({ longPct, shortPct }) {
  return (
    <div className="min-w-[160px] space-y-1.5">
      <div className="flex h-[7px] w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="rounded-l-full transition-all duration-700 ease-out"
          style={{ width: `${longPct}%`, backgroundColor: '#86efac' }}
        />
        <div
          className="rounded-r-full transition-all duration-700 ease-out"
          style={{ width: `${shortPct}%`, backgroundColor: '#fca5a5' }}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: '#86efac' }} />
          <span className="text-[11px] font-semibold text-emerald-700">{longPct.toFixed(1)}% Long</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: '#fca5a5' }} />
          <span className="text-[11px] font-semibold text-rose-600">{shortPct.toFixed(1)}% Short</span>
        </div>
      </div>
    </div>
  );
}

function PopularityBar({ value }) {
  return (
    <div className="min-w-[100px] space-y-1.5">
      <div className="h-[7px] w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="rounded-full transition-all duration-700 ease-out"
          style={{ width: `${value}%`, backgroundColor: '#fdba74' }}
        />
      </div>
      <p className="text-[11px] font-semibold text-gray-500">{value}%</p>
    </div>
  );
}

function AvgPriceCell({ avg, current, symbol }) {
  const pips = computePips(current, avg, symbol);
  const isPositive = pips >= 0;
  return (
    <div className="space-y-0.5">
      <p className="text-[13px] font-semibold text-gray-900 tabular-nums">{formatPrice(symbol, avg)}</p>
      <p className={`text-[11px] font-semibold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
        {isPositive ? '+' : ''}{pips.toFixed(1)} pips
      </p>
    </div>
  );
}

function CurrentPriceCell({ price, prev, symbol, hasAlert }) {
  const isUp = price >= prev;
  const change = computePips(price, prev, symbol);
  return (
    <div className="flex items-center gap-3">
      <div className="space-y-0.5">
        <p className={`text-[13px] font-bold tabular-nums transition-colors duration-300 ${isUp ? 'text-gray-900' : 'text-rose-600'}`}>
          {formatPrice(symbol, price)}
        </p>
        <div className={`flex items-center gap-0.5 ${isUp ? 'text-emerald-600' : 'text-rose-500'}`}>
          {isUp ? <ArrowUpIcon /> : <ArrowDownIcon />}
          <span className="text-[11px] font-semibold tabular-nums">{isUp ? '+' : ''}{change.toFixed(1)}</span>
        </div>
      </div>
      {hasAlert && (
        <button
          type="button"
          className="mt-1 rounded-md p-1 text-gray-300 transition-colors hover:bg-amber-50 hover:text-amber-500"
          title="Price alert active"
        >
          <BellIcon />
        </button>
      )}
    </div>
  );
}

export default function CommunitySentimentTable({ onNavigateDashboard, onLogout, user }) {
  const [data, setData] = useState(INITIAL_DATA);
  const [sortField, setSortField] = useState('popularity');
  const [sortDir, setSortDir] = useState('desc');
  const [filterOpen, setFilterOpen] = useState(false);
  const [lastTick, setLastTick] = useState(Date.now());
  const filterRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setData((prev) =>
        prev.map((row) => {
          const newPrice = simulateTick(row.currentPrice, row.symbol);
          return { ...row, previousPrice: row.currentPrice, currentPrice: newPrice };
        }),
      );
      setLastTick(Date.now());
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    function handleClick(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [filterOpen]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setFilterOpen(false);
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aVal;
      let bVal;
      switch (sortField) {
        case 'symbol': aVal = a.symbol; bVal = b.symbol; break;
        case 'long': aVal = a.longPct; bVal = b.longPct; break;
        case 'short': aVal = a.shortPct; bVal = b.shortPct; break;
        case 'popularity': aVal = a.popularity; bVal = b.popularity; break;
        default: return 0;
      }
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [data, sortField, sortDir]);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-3 sm:px-8">
          <button
            type="button"
            onClick={onNavigateDashboard}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            <ChevronLeftIcon />
            <span>Dashboard</span>
          </button>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.username}</span>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-[15px] font-bold tracking-tight text-gray-900">Community Sentiment</h2>
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="mt-1 text-[13px] text-gray-400">
                Retail positioning across {data.length} pairs
              </p>
            </div>
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600"
                title="Sort & Filter"
              >
                <FilterIcon />
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                  <p className="px-4 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                    Sort by
                  </p>
                  <SortOption label="Symbol" field="symbol" active={sortField === 'symbol'} dir={sortField === 'symbol' ? sortDir : null} onClick={handleSort} />
                  <SortOption label="Long %" field="long" active={sortField === 'long'} dir={sortField === 'long' ? sortDir : null} onClick={handleSort} />
                  <SortOption label="Short %" field="short" active={sortField === 'short'} dir={sortField === 'short' ? sortDir : null} onClick={handleSort} />
                  <SortOption label="Popularity" field="popularity" active={sortField === 'popularity'} dir={sortField === 'popularity' ? sortDir : null} onClick={handleSort} />
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
                    Community Trend
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
                    Symbol Popularity
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
                    Avg. Short Price
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
                    Avg. Long Price
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
                    Current Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row) => (
                  <tr
                    key={row.symbol}
                    className="border-b border-gray-50 transition-colors duration-150 hover:bg-gray-50/70"
                  >
                    <td className="px-6 py-4">
                      <SymbolCell symbol={row.symbol} />
                    </td>
                    <td className="px-6 py-4">
                      <TrendBar longPct={row.longPct} shortPct={row.shortPct} />
                    </td>
                    <td className="px-6 py-4">
                      <PopularityBar value={row.popularity} />
                    </td>
                    <td className="px-6 py-4">
                      <AvgPriceCell avg={row.avgShortPrice} current={row.currentPrice} symbol={row.symbol} />
                    </td>
                    <td className="px-6 py-4">
                      <AvgPriceCell avg={row.avgLongPrice} current={row.currentPrice} symbol={row.symbol} />
                    </td>
                    <td className="px-6 py-4">
                      <CurrentPriceCell price={row.currentPrice} prev={row.previousPrice} symbol={row.symbol} hasAlert={row.hasAlert} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3.5">
            <p className="text-[11px] font-medium text-gray-400">
              {data.length} pairs
            </p>
            <p className="text-[11px] text-gray-300">
              Prices simulate live ticks every 3s
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
