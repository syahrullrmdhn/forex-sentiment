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

function SortOption({ label, field, active, dir, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition ${
        active ? 'font-semibold text-[var(--neo-text-primary)]' : 'font-medium text-[var(--neo-text-secondary)]'
      } hover:bg-[var(--neo-surface-dark)]`}
    >
      {label}
      {active && dir && (
        <span className="ml-3 text-xs text-[var(--neo-text-muted)]">{dir === 'asc' ? '\u2191' : '\u2193'}</span>
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
      <span className="text-[13px] font-bold text-[var(--neo-text-primary)] tracking-tight">{base}</span>
      <span className="text-[11px] text-[var(--neo-text-muted)] font-light">/</span>
      <span className="text-[13px] font-medium text-[var(--neo-text-secondary)]">{quote}</span>
    </div>
  );
}

function TrendBar({ longPct, shortPct }) {
  return (
    <div className="min-w-[160px] space-y-1.5">
      <div className="neo-track h-[7px]">
        <div className="flex h-full">
          <div className="neo-bar-glow-cyan transition-all duration-700" style={{ width: `${longPct}%` }} />
          <div className="neo-bar-glow-orange transition-all duration-700" style={{ width: `${shortPct}%` }} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: '#67e8f9', boxShadow: '0 0 4px var(--neo-glow-cyan)' }} />
          <span className="text-[11px] font-semibold text-cyan-200">{longPct.toFixed(1)}% Long</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: '#fdba74', boxShadow: '0 0 4px var(--neo-glow-orange)' }} />
          <span className="text-[11px] font-semibold text-orange-200">{shortPct.toFixed(1)}% Short</span>
        </div>
      </div>
    </div>
  );
}

function PopularityBar({ value }) {
  return (
    <div className="min-w-[100px] space-y-1.5">
      <div className="neo-track h-[7px]">
        <div
          className="neo-bar-glow-orange rounded-full transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="text-[11px] font-semibold text-[var(--neo-text-muted)]">{value}%</p>
    </div>
  );
}

function AvgPriceCell({ avg, current, symbol }) {
  const pips = computePips(current, avg, symbol);
  const isPositive = pips >= 0;
  return (
    <div className="space-y-0.5">
      <p className="text-[13px] font-semibold text-[var(--neo-text-primary)] tabular-nums">{formatPrice(symbol, avg)}</p>
      <p className={`text-[11px] font-semibold tabular-nums ${isPositive ? 'neo-text-glow-emerald' : 'neo-text-glow-rose'}`}>
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
        <p className={`text-[13px] font-bold tabular-nums transition-colors duration-300 ${isUp ? 'neo-text-embossed' : 'neo-text-glow-rose'}`}>
          {formatPrice(symbol, price)}
        </p>
        <div className={`flex items-center gap-0.5 ${isUp ? 'text-emerald-300' : 'text-rose-300'}`}>
          {isUp ? <ArrowUpIcon /> : <ArrowDownIcon />}
          <span className="text-[11px] font-semibold tabular-nums">{isUp ? '+' : ''}{change.toFixed(1)}</span>
        </div>
      </div>
      {hasAlert && (
        <button
          type="button"
          className="mt-1 rounded-md p-1 text-[var(--neo-text-muted)] transition-colors hover:text-amber-300"
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
  const filterRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setData((prev) =>
        prev.map((row) => {
          const newPrice = simulateTick(row.currentPrice, row.symbol);
          return { ...row, previousPrice: row.currentPrice, currentPrice: newPrice };
        }),
      );
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
    <main className="min-h-screen" style={{ background: 'var(--neo-bg-start)' }}>
      <header className="neo-raised border-b border-white/5">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-3 sm:px-8">
          <button
            type="button"
            onClick={onNavigateDashboard}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--neo-text-muted)] transition-colors hover:text-[var(--neo-text-primary)]"
          >
            <ChevronLeftIcon />
            <span>Dashboard</span>
          </button>

          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--neo-text-muted)]">{user?.username}</span>
            <button
              type="button"
              onClick={onLogout}
              className="neo-btn text-xs px-3 py-1.5"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8">
        <div className="neo-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-[15px] font-bold tracking-tight neo-text-embossed">Community Sentiment</h2>
                <span className="flex items-center gap-1.5 neo-badge text-[11px] font-semibold text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full neo-orb-emerald animate-pulse" />
                  Live
                </span>
              </div>
              <p className="mt-1 text-[13px] text-[var(--neo-text-muted)]">
                Retail positioning across {data.length} pairs
              </p>
            </div>
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterOpen(!filterOpen)}
                className="neo-pressed flex h-8 w-8 items-center justify-center rounded-lg text-[var(--neo-text-muted)] transition hover:text-[var(--neo-text-primary)]"
                title="Sort & Filter"
              >
                <FilterIcon />
              </button>
              {filterOpen && (
                <div className="neo-raised absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-xl py-1">
                  <p className="px-4 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--neo-text-muted)]">
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
                <tr className="border-b border-white/5">
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--neo-text-muted)]">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--neo-text-muted)]">
                    Community Trend
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--neo-text-muted)]">
                    Symbol Popularity
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--neo-text-muted)]">
                    Avg. Short Price
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--neo-text-muted)]">
                    Avg. Long Price
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--neo-text-muted)]">
                    Current Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row) => (
                  <tr
                    key={row.symbol}
                    className="border-b border-white/5 transition-colors duration-150 hover:bg-[rgba(50,54,74,0.3)]"
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

          <div className="flex items-center justify-between border-t border-white/5 px-6 py-3.5">
            <p className="text-[11px] font-medium text-[var(--neo-text-muted)]">
              {data.length} pairs
            </p>
            <p className="text-[11px] text-[var(--neo-text-muted)]">
              Prices simulate live ticks every 3s
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
