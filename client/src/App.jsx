import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import DashboardShell from './components/DashboardShell.jsx';
import LoginScreen from './components/LoginScreen.jsx';

const TOKEN_KEY = 'forex-sentiment.token';
const SESSION_TOKEN_KEY = 'forex-sentiment.session-token';

function getStoredAuth() {
  const persistentToken = localStorage.getItem(TOKEN_KEY);
  if (persistentToken) {
    return { token: persistentToken, persistent: true };
  }

  const sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (sessionToken) {
    return { token: sessionToken, persistent: false };
  }

  return null;
}

function storeToken(token, rememberMe) {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);

  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }

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

  const authHeaders = useMemo(
    () => (auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    [auth?.token],
  );

  useEffect(() => {
    let isCancelled = false;

    async function bootstrap() {
      if (!auth?.token) {
        setUser(null);
        setOverview(null);
        setPairs([]);
        setIsBooting(false);
        return;
      }

      try {
        const [meResponse, pairsResponse] = await Promise.all([
          axios.get('/api/auth/me', { headers: authHeaders }),
          axios.get('/api/pairs', { headers: authHeaders }),
        ]);

        if (isCancelled) {
          return;
        }

        const nextPairs = pairsResponse.data.pairs || [];
        setUser(meResponse.data.user);
        setPairs(nextPairs);
        setSelectedPair((currentPair) => {
          if (nextPairs.some((pair) => pair.value === currentPair)) {
            return currentPair;
          }

          return nextPairs[0]?.value || currentPair;
        });
        setDashboardError('');
      } catch (error) {
        if (!isCancelled) {
          clearStoredToken();
          setAuth(null);
          setLoginError('Session expired. Please sign in again.');
        }
      } finally {
        if (!isCancelled) {
          setIsBooting(false);
        }
      }
    }

    bootstrap();

    return () => {
      isCancelled = true;
    };
  }, [auth?.token, authHeaders]);

  useEffect(() => {
    let isCancelled = false;

    async function loadOverview() {
      if (!auth?.token || !selectedPair) {
        return;
      }

      setIsLoading(true);

      try {
        const response = await axios.get(`/api/dashboard/${encodeURIComponent(selectedPair)}/overview`, {
          headers: authHeaders,
        });

        if (!isCancelled) {
          setOverview(response.data);
          setDashboardError('');
        }
      } catch (error) {
        if (!isCancelled) {
          setDashboardError(error.response?.data?.message || 'Unable to load dashboard data.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadOverview();

    return () => {
      isCancelled = true;
    };
  }, [auth?.token, authHeaders, selectedPair]);

  useEffect(() => {
    if (!auth?.token || !selectedPair) {
      return undefined;
    }

    const socket = io('/', {
      auth: {
        token: auth.token,
        pair: selectedPair,
      },
      transports: ['websocket'],
    });

    socket.on('market:bootstrap', (payload) => {
      setOverview(payload);
      setDashboardError('');
    });

    socket.on('market:update', (payload) => {
      setOverview(payload);
    });

    socket.on('connect_error', (error) => {
      setDashboardError(error.message || 'Live stream connection failed.');
    });

    return () => {
      socket.disconnect();
    };
  }, [auth?.token, selectedPair]);

  async function handleLogin({ identifier, password, rememberMe }) {
    setLoginError('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/auth/login', { identifier, password });
      storeToken(response.data.token, rememberMe);
      setAuth({ token: response.data.token, persistent: rememberMe });
      setUser(response.data.user);
    } catch (error) {
      setLoginError(error.response?.data?.message || 'Unable to sign in.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    clearStoredToken();
    setAuth(null);
    setUser(null);
    setPairs([]);
    setOverview(null);
    setDashboardError('');
  }

  if (!auth?.token) {
    return <LoginScreen onSubmit={handleLogin} isSubmitting={isLoading} error={loginError} />;
  }

  if (isBooting || !user || !overview) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-sm text-slate-400">
        {dashboardError || 'Preparing Forex Sentiment dashboard...'}
      </main>
    );
  }

  return (
    <DashboardShell
      user={user}
      pairs={pairs}
      selectedPair={selectedPair}
      onPairChange={setSelectedPair}
      overview={overview}
      onLogout={handleLogout}
      isLoading={isLoading}
      error={dashboardError}
    />
  );
}
