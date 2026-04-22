import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import CommunitySentimentTable from './components/CommunitySentimentTable.jsx';
import DashboardShell from './components/DashboardShell.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import ToastNotification from './components/ToastNotification.jsx';

const TOKEN_KEY = 'forex-sentiment.token';
const SESSION_TOKEN_KEY = 'forex-sentiment.session-token';

function getStoredAuth() {
  const persistentToken = localStorage.getItem(TOKEN_KEY);
  if (persistentToken) return { token: persistentToken, persistent: true };
  const sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (sessionToken) return { token: sessionToken, persistent: false };
  return null;
}

function storeToken(token, rememberMe) {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  if (rememberMe) { localStorage.setItem(TOKEN_KEY, token); return; }
  sessionStorage.setItem(SESSION_TOKEN_KEY, token);
}

function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
}

export default function App() {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [user, setUser] = useState(null);
  const [pairs, setPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState('EUR/USD');
  const [overview, setOverview] = useState(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [dashboardError, setDashboardError] = useState('');
  const [activeView, setActiveView] = useState('dashboard');
  const [toasts, setToasts] = useState([]);
  const [sentimentData, setSentimentData] = useState([]);
  const [sentimentLoading, setSentimentLoading] = useState(true);
  const [sentimentError, setSentimentError] = useState('');

  const authHeaders = useMemo(() => (auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}), [auth?.token]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...toast, id }]);
  };
  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Bootstrap auth + pairs
  useEffect(() => {
    let isCancelled = false;
    async function bootstrap() {
      if (!auth?.token) { setUser(null); setOverview(null); setPairs([]); setIsBooting(false); return; }
      try {
        const [meResponse, pairsResponse] = await Promise.all([
          axios.get('/api/auth/me', { headers: authHeaders }),
          axios.get('/api/pairs', { headers: authHeaders }),
        ]);
        if (isCancelled) return;
        const nextPairs = pairsResponse.data.pairs || [];
        setUser(meResponse.data.user);
        setPairs(nextPairs);
        setSelectedPair((c) => nextPairs.some((p) => p.value === c) ? c : nextPairs[0]?.value || c);
        setDashboardError('');
      } catch {
        if (!isCancelled) { clearStoredToken(); setAuth(null); setLoginError('Session expired. Please sign in again.'); }
      } finally {
        if (!isCancelled) setIsBooting(false);
      }
    }
    bootstrap();
    return () => { isCancelled = true; };
  }, [auth?.token, authHeaders]);

  // Load overview for selected pair
  useEffect(() => {
    let isCancelled = false;
    async function loadOverview() {
      if (!auth?.token || !selectedPair) return;
      setIsLoading(true);
      try {
        const res = await axios.get(`/api/dashboard/${encodeURIComponent(selectedPair)}/overview`, { headers: authHeaders });
        if (!isCancelled) { setOverview(res.data); setDashboardError(''); }
      } catch (err) {
        if (!isCancelled) setDashboardError(err.response?.data?.message || 'Unable to load dashboard data.');
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }
    loadOverview();
    return () => { isCancelled = true; };
  }, [auth?.token, authHeaders, selectedPair]);

  // Load all sentiment data (shared between dashboard and community)
  useEffect(() => {
    let isCancelled = false;
    async function loadSentiment() {
      if (!auth?.token) return;
      setSentimentLoading(true);
      try {
        const res = await axios.get('/api/sentiment', { headers: authHeaders });
        if (!isCancelled) { setSentimentData(res.data.data || []); setSentimentError(''); }
      } catch (err) {
        if (!isCancelled) setSentimentError(err.response?.data?.message || 'Failed to load');
      } finally {
        if (!isCancelled) setSentimentLoading(false);
      }
    }
    loadSentiment();
    const timer = setInterval(loadSentiment, 5000);
    return () => { isCancelled = true; clearInterval(timer); };
  }, [auth?.token, authHeaders]);

  // Socket.IO + anomaly toast
  useEffect(() => {
    if (!auth?.token || !selectedPair) return;
    const socket = io('/', { auth: { token: auth.token, pair: selectedPair } });
    socket.on('market:bootstrap', (payload) => { setOverview(payload); setDashboardError(''); });
    socket.on('market:update', (payload) => {
      setOverview(payload);
      if (payload.anomaly?.active && payload.anomaly.level === 'high') {
        addToast({ title: `${payload.pair}: ${payload.anomaly.title}`, message: payload.anomaly.message, level: 'high', duration: 8000 });
      }
    });
    socket.on('connect_error', (err) => setDashboardError(err.message || 'Live stream connection failed.'));
    return () => { socket.disconnect(); };
  }, [auth?.token, selectedPair]);

  async function handleLogin({ identifier, password, rememberMe }) {
    setLoginError(''); setIsLoading(true);
    try {
      const res = await axios.post('/api/auth/login', { identifier, password });
      storeToken(res.data.token, rememberMe);
      setAuth({ token: res.data.token, persistent: rememberMe });
      setUser(res.data.user);
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Unable to sign in.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    clearStoredToken(); setAuth(null); setUser(null); setPairs([]); setOverview(null);
    setDashboardError(''); setActiveView('dashboard'); setToasts([]);
    setSentimentData([]); setSentimentLoading(true); setSentimentError('');
  }

  if (!auth?.token) return <LoginScreen onSubmit={handleLogin} isSubmitting={isLoading} error={loginError} />;
  if (isBooting || !user) return <main className="flex min-h-screen items-center justify-center px-4 text-sm" style={{ color: 'var(--text-muted)' }}>{dashboardError || 'Preparing dashboard...'}</main>;

  if (activeView === 'community') {
    return (
      <>
        <CommunitySentimentTable
          user={user}
          data={sentimentData}
          loading={sentimentLoading}
          error={sentimentError}
          onNavigateDashboard={() => setActiveView('dashboard')}
          onLogout={handleLogout}
        />
        <ToastNotification toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  if (!overview) return <main className="flex min-h-screen items-center justify-center px-4 text-sm" style={{ color: 'var(--text-muted)' }}>{dashboardError || 'Loading market data...'}</main>;

  return (
    <>
      <DashboardShell
        user={user}
        pairs={pairs}
        selectedPair={selectedPair}
        onPairChange={setSelectedPair}
        overview={overview}
        onLogout={handleLogout}
        isLoading={isLoading}
        error={dashboardError}
        onNavigateCommunity={() => setActiveView('community')}
      />
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
