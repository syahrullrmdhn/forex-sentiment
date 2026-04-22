import { useEffect, useMemo, useRef, useState } from 'react';

function formatPrice(symbol, price) {
  if (!price) return '—';
  if (symbol?.includes('JPY')) return price.toFixed(3);
  return price.toFixed(5);
}

function FilterIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>; }
function StarIcon({ filled }) { return <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>; }
function SearchIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function DownloadIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
function ArrowUpIcon() { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>; }
function ArrowDownIcon() { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>; }
function ChevronLeftIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>; }
function ChevronDownIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>; }
function ChevronUpIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>; }

const FAVORITES_KEY = 'forex-sentiment.favorites';
function getFavorites() { try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch { return []; } }
function saveFavorites(list) { localStorage.setItem(FAVORITES_KEY, JSON.stringify(list)); }

function Sparkline({ data, width = 120, height = 32 }) {
  if (!data?.length) return <div style={{ width, height }} />;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  const last = values[values.length - 1];
  const first = values[0];
  const color = last >= first ? 'var(--accent)' : 'var(--negative)';
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={height - ((last - min) / range) * height} r="2.5" fill={color} />
    </svg>
  );
}

function SentimentBar({ longPct }) {
  const shortPct = 100 - longPct;
  return (
    <div className="w-full">
      <div className="flex h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="h-full transition-all duration-500" style={{ width: `${longPct}%`, background: 'var(--accent)' }} />
        <div className="h-full transition-all duration-500" style={{ width: `${shortPct}%`, background: 'rgba(255,255,255,0.1)' }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px]" style={{ color: 'var(--accent)' }}>{longPct.toFixed(1)}% L</span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{shortPct.toFixed(1)}% S</span>
      </div>
    </div>
  );
}

function exportCSV(data) {
  const headers = ['Symbol','Myfxbook Long %','Myfxbook Short %','FXSSI Long %','FXSSI Short %','Avg Long %','Retail Bias','Current Price','Change %','News Mood','News Score'];
  const rows = data.map((r) => [r.symbol,r.myfxbook?.longPct ?? '',r.myfxbook?.shortPct ?? '',r.fxssi?.longPct ?? '',r.fxssi?.shortPct ?? '',r.avgLongPct ?? '',r.retailBias ?? '',r.currentPrice ?? '',r.changePct ?? '',r.newsMood ?? '',r.newsScore ?? '']);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `forex-sentiment-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CommunitySentimentTable({ onNavigateDashboard, onLogout, user, data: propData, loading, error }) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('symbol');
  const [sortDir, setSortDir] = useState('asc');
  const [filterOpen, setFilterOpen] = useState(false);
  const [favorites, setFavorites] = useState(getFavorites);
  const [expanded, setExpanded] = useState(null);
  const filterRef = useRef(null);

  useEffect(() => {
    if (!filterOpen) return;
    function handleClick(e) { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [filterOpen]);

  useEffect(() => { saveFavorites(favorites); }, [favorites]);

  const toggleFavorite = (symbol, e) => {
    e.stopPropagation();
    setFavorites((prev) => prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]);
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
    setFilterOpen(false);
  };

  const toggleExpand = (symbol) => {
    setExpanded((prev) => prev === symbol ? null : symbol);
  };

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return propData || [];
    return (propData || []).filter((row) => row.symbol.toLowerCase().includes(q));
  }, [propData, search]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'symbol': aVal = a.symbol; bVal = b.symbol; break;
        case 'myfxbookLong': aVal = a.myfxbook?.longPct || 0; bVal = b.myfxbook?.longPct || 0; break;
        case 'fxssiLong': aVal = a.fxssi?.longPct || 0; bVal = b.fxssi?.longPct || 0; break;
        case 'avgLong': aVal = a.avgLongPct || 0; bVal = b.avgLongPct || 0; break;
        default: return 0;
      }
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [filteredData, sortField, sortDir]);

  const sortOptions = [
    { label: 'Symbol A-Z', field: 'symbol' },
    { label: 'Myfxbook Long %', field: 'myfxbookLong' },
    { label: 'FXSSI Long %', field: 'fxssiLong' },
    { label: 'Avg Long %', field: 'avgLong' },
  ];

  const data = propData || [];
  const favCount = favorites.length;

  // Skeleton pulse helper
  const SkeletonPulse = ({ className = '' }) => (
    <div className={`relative overflow-hidden rounded-md bg-white/[0.04] ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );

  return (
    <main className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <header style={{ background: 'var(--surface-elevated)', borderBottom: '1px solid var(--border)' }}>
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3 sm:px-8">
          <button type="button" onClick={onNavigateDashboard} className="btn-secondary flex items-center gap-1.5"><ChevronLeftIcon />Dashboard</button>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{user?.username}</span>
            <button type="button" onClick={onLogout} className="btn-secondary text-xs">Logout</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">
        <div className="card overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Community Sentiment</h2>
                <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse"/>Live
                </span>
              </div>
              <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                {data.length} pairs{favCount > 0 && <span className="ml-2" style={{ color: 'var(--accent)' }}>★ {favCount} favorited</span>}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}><SearchIcon/></span>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pair..." className="input-field py-2 pl-9 pr-4 text-xs" style={{ width: '180px' }}/>
              </div>
              <button type="button" onClick={() => exportCSV(sortedData)} className="btn-secondary flex items-center gap-1.5" title="Export CSV"><DownloadIcon /><span className="hidden sm:inline">Export</span></button>
              <div className="relative" ref={filterRef}>
                <button type="button" onClick={() => setFilterOpen(!filterOpen)} className="btn-secondary h-8 w-8 p-0 flex items-center justify-center" title="Sort"><FilterIcon/></button>
                {filterOpen && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-xl py-1" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                    <p className="px-4 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sort by</p>
                    {sortOptions.map((opt) => (
                      <button key={opt.field} onClick={() => handleSort(opt.field)} className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition hover:bg-white/5 ${sortField === opt.field ? 'font-semibold' : ''}`} style={{ color: sortField === opt.field ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {opt.label}
                        {sortField === opt.field && <span style={{ color: 'var(--text-muted)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-6 mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--negative-soft)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--negative)' }}>{error}</div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['','Symbol','Myfxbook','FXSSI','Combined','Price','News'].map((h) => (
                    <th key={h} className={`px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${h===''?'w-10':''}`} style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && data.length === 0 && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td colSpan={7} className="px-5 py-3">
                      <div className="flex items-center gap-4">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <div key={j} className="flex-1"><SkeletonPulse className="h-3 w-full" /></div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && sortedData.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>{search ? `No pairs match "${search}"` : 'No data available'}</td></tr>
                )}

                {sortedData.map((row) => {
                  const isExpanded = expanded === row.symbol;
                  return (
                    <>
                      <tr key={row.symbol} className="transition-colors hover:bg-white/[0.02] cursor-pointer group" style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border)' }} onClick={() => toggleExpand(row.symbol)}>
                        {/* Star */}
                        <td className="px-5 py-4" onClick={(e) => toggleFavorite(row.symbol, e)}>
                          <span className="transition" style={{ color: favorites.includes(row.symbol) ? 'var(--accent)' : 'var(--text-muted)' }}>
                            <StarIcon filled={favorites.includes(row.symbol)} />
                          </span>
                        </td>
                        {/* Symbol */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <span className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>{row.symbol.split('/')[0]}</span>
                            <span style={{ color: 'var(--text-muted)' }}>/</span>
                            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{row.symbol.split('/')[1]}</span>
                          </div>
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{row.retailBias}</p>
                        </td>
                        {/* Myfxbook */}
                        <td className="px-5 py-4">
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Myfxbook</span>
                            <SentimentBar longPct={row.myfxbook?.longPct || 0} />
                          </div>
                        </td>
                        {/* FXSSI */}
                        <td className="px-5 py-4">
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px dashed var(--border)' }}>FXSSI</span>
                            <SentimentBar longPct={row.fxssi?.longPct || 0} />
                          </div>
                        </td>
                        {/* Combined */}
                        <td className="px-5 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{row.avgLongPct.toFixed(1)}%</span>
                              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>long</span>
                            </div>
                            <div className="flex h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                              <div className="h-full" style={{ width: `${row.avgLongPct}%`, background: 'var(--accent)' }} />
                              <div className="h-full" style={{ width: `${row.avgShortPct}%`, background: 'rgba(255,255,255,0.1)' }} />
                            </div>
                          </div>
                        </td>
                        {/* Price */}
                        <td className="px-5 py-4">
                          <div className="space-y-0.5">
                            <p className="text-[14px] font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatPrice(row.symbol, row.currentPrice)}</p>
                            <div className="flex items-center gap-1 text-[11px]" style={{ color: row.changePct >= 0 ? 'var(--accent)' : 'var(--negative)' }}>
                              {row.changePct >= 0 ? <ArrowUpIcon/> : <ArrowDownIcon/>}
                              <span className="tabular-nums">{row.changePct >= 0 ? '+' : ''}{row.changePct.toFixed(2)}%</span>
                            </div>
                          </div>
                        </td>
                        {/* News + Expand */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full" style={{ background: row.newsScore >= 0 ? 'var(--accent)' : 'var(--negative)' }} />
                                <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{row.newsMood}</span>
                              </div>
                              <p className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{row.newsScore.toFixed(2)}</p>
                            </div>
                            <span className="transition" style={{ color: 'var(--text-muted)' }}>{isExpanded ? <ChevronUpIcon/> : <ChevronDownIcon/>}</span>
                          </div>
                        </td>
                      </tr>

                      {/* Inline Detail */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-5 pb-5">
                            <div className="rounded-xl p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                              {/* Top row: sparkline + metrics */}
                              <div className="flex flex-col lg:flex-row gap-4">
                                <div className="flex-1">
                                  <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Price trend (90m)</p>
                                  <Sparkline data={row.priceHistory || []} />
                                </div>
                                <div className="grid grid-cols-3 gap-3 lg:w-72">
                                  <MetricBox label="Trend" value={row.trend || '—'} positive={row.changePct >= 0} />
                                  <MetricBox label="Bias" value={row.retailBias || '—'} positive={row.avgLongPct >= 50} />
                                  <MetricBox label="Mood" value={row.newsMood || '—'} />
                                </div>
                              </div>

                              {/* Provider detail */}
                              <div className="grid md:grid-cols-2 gap-3">
                                <ProviderDetail provider={row.myfxbook} name="Myfxbook" />
                                <ProviderDetail provider={row.fxssi} name="FXSSI" />
                              </div>

                              {/* News */}
                              {row.newsEvents && row.newsEvents.length > 0 && (
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Latest news</p>
                                  <div className="grid gap-2">
                                    {row.newsEvents.slice(0, 2).map((e, i) => (
                                      <div key={i} className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                                        <span className="mt-0.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: e.sentiment === 'positive' ? 'var(--accent)' : 'var(--negative)' }} />
                                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{e.title}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{sortedData.length} pairs · Auto-refresh every 5s</p>
          </div>
        </div>
      </div>
    </main>
  );
}

function MetricBox({ label, value, positive }) {
  const color = positive === undefined ? 'var(--text-secondary)' : positive ? 'var(--accent)' : 'var(--negative)';
  return (
    <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
      <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-xs font-semibold mt-1" style={{ color }}>{value}</p>
    </div>
  );
}

function ProviderDetail({ provider, name }) {
  if (!provider) return null;
  const isDashed = name === 'FXSSI';
  return (
    <div className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.02)', border: `1px ${isDashed ? 'dashed' : 'solid'} var(--border)` }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{name}</span>
        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{provider.longPct.toFixed(1)}% / {provider.shortPct.toFixed(1)}%</span>
      </div>
      <div className="flex h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="h-full" style={{ width: `${provider.longPct}%`, background: 'var(--accent)' }} />
        <div className="h-full" style={{ width: `${provider.shortPct}%`, background: 'rgba(255,255,255,0.1)' }} />
      </div>
    </div>
  );
}
