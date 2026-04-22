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
    <main className="flex min-h-screen items-center justify-center px-4 py-12" style={{ background: 'var(--neo-bg-start)' }}>
      <div className="w-full max-w-5xl overflow-hidden rounded-[32px] neo-raised">
        <div className="grid min-h-[680px] lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Panel - Sculpted promotional area */}
          <section className="flex flex-col justify-between border-b border-white/5 p-8 lg:border-b-0 lg:border-r lg:p-10"
            style={{
              background: 'linear-gradient(145deg, rgba(50,54,74,0.5) 0%, rgba(34,37,58,0.8) 50%, rgba(34,37,58,0.3) 100%)',
            }}
          >
            <div className="space-y-5">
              <span className="neo-badge inline-flex w-fit text-cyan-200">
                <span className="neo-orb-cyan mr-2 inline-block h-2 w-2 rounded-full" />
                Single-Page Analysis
              </span>
              <div className="space-y-4">
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight neo-text-embossed md:text-5xl">
                  Forex Sentiment Comparison Dashboard
                </h1>
                <p className="max-w-xl text-base leading-7 text-[var(--neo-text-secondary)]">
                  Terminal satu layar untuk membandingkan retail positioning, mood berita, dan pergerakan harga live tanpa distraksi menu tambahan.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <InfoTile title="Retail vs News" value="Divergence" description="Anomaly alert otomatis saat crowd positioning berlawanan dengan berita dan harga." />
              <InfoTile title="Live Context" value="Real-Time" description="Socket stream menyalurkan update harga dan status sinkronisasi langsung ke dashboard." />
              <InfoTile title="Clean UX" value="Dark First" description="Albert Sans, visual padat, dan detail teknis dipindahkan ke micro-tooltips." />
            </div>
          </section>

          {/* Right Panel - Login form */}
          <section className="flex items-center p-6 sm:p-10">
            <form onSubmit={handleSubmit} className="w-full space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--neo-text-muted)]">Secure Login</p>
                <h2 className="text-3xl font-semibold neo-text-embossed">Masuk ke dashboard</h2>
                <p className="text-sm text-[var(--neo-text-muted)]">Demo default: <span className="neo-text-glow-cyan">demo@forex.local</span> / <span className="neo-text-glow-cyan">demo123</span>.</p>
              </div>

              <label className="block space-y-2">
                <span className="text-sm text-[var(--neo-text-secondary)]">Email atau username</span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className="neo-input"
                  placeholder="demo@forex.local"
                  autoComplete="username"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-[var(--neo-text-secondary)]">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="neo-input"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </label>

              <label className="neo-pressed flex items-center justify-between gap-4 rounded-2xl px-4 py-3 text-sm text-[var(--neo-text-secondary)]">
                <span>Remember me</span>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-[var(--neo-surface-dark)] text-cyan-400 focus:ring-cyan-400"
                />
              </label>

              {error ? (
                <div className="neo-pressed rounded-2xl border border-rose-500/20 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="neo-btn-glow inline-flex w-full items-center justify-center"
              >
                {isSubmitting ? 'Signing in...' : 'Open Dashboard'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

function InfoTile({ title, value, description }) {
  return (
    <article className="neo-pressed rounded-3xl p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--neo-text-muted)]">{title}</p>
      <p className="mt-2 text-2xl font-semibold neo-text-glow-cyan">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--neo-text-muted)]">{description}</p>
    </article>
  );
}
