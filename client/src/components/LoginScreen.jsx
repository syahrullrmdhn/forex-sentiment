import { useState } from 'react';

export default function LoginScreen({ onSubmit, isSubmitting, error }) {
  const [identifier, setIdentifier] = useState('demo@forex.local');
  const [password, setPassword] = useState('demo123');
  const [rememberMe, setRememberMe] = useState(true);

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit({ identifier, password, rememberMe });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12" style={{ background: 'var(--surface)' }}>
      <div className="w-full max-w-5xl overflow-hidden rounded-[28px]" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
        <div className="grid min-h-[620px] lg:grid-cols-[1.1fr_0.9fr]">
          <section className="flex flex-col justify-between p-8 lg:p-10 lg:border-r" style={{ borderColor: 'var(--border)' }}>
            <div className="space-y-5">
              <span className="badge" style={{ background: 'var(--accent-cyan-soft)', color: 'var(--accent-cyan)' }}>
                Single-Page Analysis
              </span>
              <div className="space-y-3">
                <h1 className="max-w-lg text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-4xl">
                  Forex Sentiment Dashboard
                </h1>
                <p className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                  Compare retail positioning, news mood, and live price momentum in one clean screen.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <InfoTile title="Retail vs News" value="Divergence" />
              <InfoTile title="Live Context" value="Real-Time" />
              <InfoTile title="Clean UX" value="Dark First" />
            </div>
          </section>

          <section className="flex items-center p-6 sm:p-10">
            <form onSubmit={handleSubmit} className="w-full space-y-5">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Secure Login</p>
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Sign in</h2>
                <p className="text-xs text-[var(--text-muted)]">Demo: demo@forex.local / demo123</p>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs text-[var(--text-secondary)]">Email or username</span>
                <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                  className="input-field" placeholder="demo@forex.local" autoComplete="username" />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-[var(--text-secondary)]">Password</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="input-field" placeholder="Enter password" autoComplete="current-password" />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 cursor-pointer" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                <span className="text-xs text-[var(--text-secondary)]">Remember me</span>
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded accent-cyan-400" />
              </label>

              {error && (
                <div className="rounded-xl border border-rose-500/20 px-4 py-3 text-xs text-rose-300" style={{ background: 'var(--accent-rose-soft)' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                {isSubmitting ? 'Signing in...' : 'Open Dashboard'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

function InfoTile({ title, value }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{title}</p>
      <p className="mt-1.5 text-lg font-semibold text-gradient-cyan">{value}</p>
    </div>
  );
}
