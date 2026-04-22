import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import DetailModal from './DetailModal.jsx';
import { SkeletonPulse } from './SkeletonLoading.jsx';

const FAVORITES_KEY = 'forex-sentiment.favorites';
function getFavorites() { try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch { return []; } }
function saveFavorites(list) { localStorage.setItem(FAVORITES_KEY, JSON.stringify(list)); }

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

function SourceBadge({ source }) {
  const colors = { Myfxbook: { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa' }, FXSSI: { bg: 'rgba(168,85,247,0.12)', text: '#c084fc' } };
  const c = colors[source] || colors.Myfxbook;
  return <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: c.bg, color: c.text }}>{source}</span>;
}

function SentimentBar({ longPct, shortPct }) {
  return (
    <div className="w-full">
      <div className="flex h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="h-full transition-all duration-500" style={{ width: `${longPct}%`, background: 'var(--accent-emerald)', borderRadius: '9999px 0 0 9999px' }} />
        <div className="h-full transition-all duration-500" style={{ width: `${shortPct}%`, background: 'var(--accent-rose)', borderRadius: '0 9999px 9999px 0' }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-emerald-400">{longPct.toFixed(1)}% L</span>
        <span className="text-[10px] text-rose-400">{shortPct.toFixed(1)}% S</span>
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

function SkeletonRow() {
  return (
    <td colSpan={7} className="px-5 py-3">
      <div className="flex items-center gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1"><SkeletonPulse className="h-3 w-full" /></div>
        ))}
      </div>
    </td>
  );
}

export default function CommunitySentimentTable({ onNavigateDashboard, onLogout, user, authHeaders }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('symbol');
  const [sortDir, setSortDir] = useState('asc');
  const [filterOpen, setFilterOpen] = useState(false);
  const [favorites, setFavorites] = useState(getFavorites);
  const [detailPair, setDetailPair] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const filterRef = useRef(null);
  const timerRef = useRef(null);

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/sentiment', { headers: authHeaders });
      setData(res.data.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    timerRef.current = setInterval(fetchData, 5000);
    return () => clearInterval(timerRef.current);
  }, [authHeaders]);

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

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) => row.symbol.toLowerCase().includes(q));
  }, [data, search]);

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

  const openDetail = async (symbol) => {
    setDetailPair(symbol);
    try {
      const res = await axios.get(`/api/dashboard/${encodeURIComponent(symbol)}/overview`, { headers: authHeaders });
      setDetailData(res.data);
    } catch { setDetailData(null); }
  };

  const sortOptions = [
    { label: 'Symbol A-Z', field: 'symbol' },
    { label: 'Myfxbook Long %', field: 'myfxbookLong' },
    { label: 'FXSSI Long %', field: 'fxssiLong' },
    { label: 'Avg Long %', field: 'avgLong' },
  ];

  const favCount = favorites.length;

  return (
    <main className="min-h-screen" style={{ background: 'var(--surface)' }}>
      {detailPair && <DetailModal pair={detailPair} data={detailData} onClose={() => { setDetailPair(null); setDetailData(null); }} />}

      <header style={{ background: 'var(--surface-elevated)', borderBottom: '1px solid var(--border)' }}>
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3 sm:px-8">
          <button type="button" onClick={onNavigateDashboard} className="btn-secondary flex items-center gap-1.5"><ChevronLeftIcon />Dashboard</button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--text-muted)]">{user?.username}</span>
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
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Community Sentiment</h2>
                <span className="badge text-[11px] text-emerald-300" style={{ background: 'var(--accent-emerald-soft)' }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"/>Live
                </span>
              </div>
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                <span className="text-blue-400">Myfxbook</span> vs <span className="text-purple-400">FXSSI</span> · {data.length} pairs{favCount > 0 && <span className="ml-2 text-amber-400">★ {favCount} favorited</span>}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"><SearchIcon/></span>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pair..." className="input-field py-2 pl-9 pr-4 text-xs" style={{ width: '180px' }}/>
              </div>
              <button type="button" onClick={() => exportCSV(sortedData)} className="btn-secondary flex items-center gap-1.5" title="Export CSV"><DownloadIcon /><span className="hidden sm:inline">Export</span></button>
              <div className="relative" ref={filterRef}>
                <button type="button" onClick={() => setFilterOpen(!filterOpen)} className="btn-secondary h-8 w-8 p-0 flex items-center justify-center" title="Sort"><FilterIcon/></button>
                {filterOpen && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-xl py-1" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                    <p className="px-4 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Sort by</p>
                    {sortOptions.map((opt) => (
                      <button key={opt.field} onClick={() => handleSort(opt.field)} className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition hover:bg-white/5 ${sortField === opt.field ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                        {opt.label}
                        {sortField === opt.field && <span className="text-xs text-[var(--text-muted)]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-6 mt-4 rounded-xl px-4 py-3 text-sm text-rose-300" style={{ background: 'var(--accent-rose-soft)', border: '1px solid rgba(251,113,133,0.2)' }}>{error}</div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['','Symbol','Myfxbook','FXSSI','Combined','Price','News'].map((h) => (
                    <th key={h} className={`px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] ${h===''?'w-10':''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && data.length === 0 && Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}><SkeletonRow/></tr>
                ))}

                {!loading && sortedData.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-[var(--text-muted)]">{search ? `No pairs match "${search}"` : 'No data available'}</td></tr>
                )}

                {sortedData.map((row) => (
                  <tr key={row.symbol} className="transition-colors hover:bg-white/[0.02] cursor-pointer group" style={{ borderBottom: '1px solid var(--border)' }} onClick={() => openDetail(row.symbol)}>
                    {/* Star */}
                    <td className="px-5 py-4" onClick={(e) => toggleFavorite(row.symbol, e)}>
                      <span className={`transition ${favorites.includes(row.symbol) ? 'text-amber-400' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}`}>
                        <StarIcon filled={favorites.includes(row.symbol)} />
                      </span>
                    </td>
                    {/* Symbol */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <span className="text-[14px] font-bold text-[var(--text-primary)]">{row.symbol.split('/')[0]}</span>
                        <span className="text-[var(--text-muted)] text-xs">/</span>
                        <span className="text-[13px] text-[var(--text-secondary)]">{row.symbol.split('/')[1]}</span>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{row.retailBias}</p>
                    </td>
                    {/* Myfxbook */}
                    <td className="px-5 py-4">
                      <div className="space-y-1.5">
                        <SourceBadge source="Myfxbook" />
                        <SentimentBar longPct={row.myfxbook?.longPct || 0} shortPct={row.myfxbook?.shortPct || 0} />
                      </div>
                    </td>
                    {/* FXSSI */}
                    <td className="px-5 py-4">
                      <div className="space-y-1.5">
                        <SourceBadge source="FXSSI" />
                        <SentimentBar longPct={row.fxssi?.longPct || 0} shortPct={row.fxssi?.shortPct || 0} />
                      </div>
                    </td>
                    {/* Combined */}
                    <td className="px-5 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-[var(--text-primary)]">{row.avgLongPct.toFixed(1)}%</span>
                          <span className="text-[11px] text-[var(--text-muted)]">long</span>
                        </div>
                        <div className="flex h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <div className="h-full" style={{ width: `${row.avgLongPct}%`, background: 'var(--accent-emerald)', borderRadius: '9999px 0 0 9999px' }} />
                          <div className="h-full" style={{ width: `${row.avgShortPct}%`, background: 'var(--accent-rose)', borderRadius: '0 9999px 9999px 0' }} />
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)]">Avg: <span className={row.avgLongPct >= 50 ? 'text-emerald-400' : 'text-rose-400'}>{row.retailBias}</span></p>
                      </div>
                    </td>
                    {/* Price */}
                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        <p className="text-[14px] font-semibold tabular-nums text-[var(--text-primary)]">{formatPrice(row.symbol, row.currentPrice)}</p>
                        <div className={`flex items-center gap-1 text-[11px] ${row.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {row.changePct >= 0 ? <ArrowUpIcon/> : <ArrowDownIcon/>}
                          <span className="tabular-nums">{row.changePct >= 0 ? '+' : ''}{row.changePct.toFixed(2)}%</span>
                        </div>
                      </div>
                    </td>
                    {/* News */}
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: row.newsScore >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)', boxShadow: `0 0 6px ${row.newsScore >= 0 ? 'rgba(52,211,153,0.4)' : 'rgba(251,113,133,0.4)'}` }} />
                          <span className="text-[12px] font-medium text-[var(--text-primary)]">{row.newsMood}</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] tabular-nums">{row.newsScore.toFixed(2)}</p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-[11px] text-[var(--text-muted)]">{sortedData.length} pairs · Auto-refresh every 5s</p>
            <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-400"/>Myfxbook</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-purple-400"/>FXSSI</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
