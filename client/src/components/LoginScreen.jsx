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
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/80 shadow-soft backdrop-blur">
        <div className="grid min-h-[680px] lg:grid-cols-[1.1fr_0.9fr]">
          <section className="flex flex-col justify-between border-b border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/50 p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div className="space-y-5">
              <span className="inline-flex w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Single-Page Analysis
              </span>
              <div className="space-y-4">
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
                  Forex Sentiment Comparison Dashboard
                </h1>
                <p className="max-w-xl text-base leading-7 text-slate-300">
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

          <section className="flex items-center p-6 sm:p-10">
            <form onSubmit={handleSubmit} className="w-full space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">Secure Login</p>
                <h2 className="text-3xl font-semibold text-white">Masuk ke dashboard</h2>
                <p className="text-sm text-slate-400">Demo default: `demo@forex.local` / `demo123`.</p>
              </div>

              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Email atau username</span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="demo@forex.local"
                  autoComplete="username"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <span>Remember me</span>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
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
    <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </article>
  );
}
