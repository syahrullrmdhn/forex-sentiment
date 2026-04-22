import { useEffect, useState } from 'react';

export default function ToastNotification({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = toast.duration || 5000;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p <= 0) { clearInterval(interval); onDismiss(toast.id); return 0; }
        return p - (100 / (duration / 100));
      });
    }, 100);
    return () => clearInterval(interval);
  }, [toast.id, toast.duration, onDismiss]);

  const isAlert = toast.level === 'high';

  return (
    <div className="relative overflow-hidden rounded-xl p-4 shadow-lg animate-[slideIn_0.3s_ease-out]" style={{ background: 'var(--surface-elevated)', border: `1px solid ${isAlert ? 'rgba(239,68,68,0.25)' : 'rgba(34,211,238,0.2)'}` }}>
      <div className="flex items-start gap-3">
        <span className="text-lg">{isAlert ? '⚠️' : 'ℹ️'}</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold" style={{ color: isAlert ? 'var(--negative)' : 'var(--accent)' }}>{toast.title}</h4>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{toast.message}</p>
        </div>
        <button type="button" onClick={() => onDismiss(toast.id)} className="text-lg leading-none" style={{ color: 'var(--text-muted)' }}>×</button>
      </div>
      <div className="absolute bottom-0 left-0 h-0.5 transition-all duration-100" style={{ width: `${progress}%`, background: isAlert ? 'var(--negative)' : 'var(--accent)', opacity: 0.4 }} />
    </div>
  );
}
