import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

const icons = { success: CheckCircle2, error: AlertCircle, warning: AlertTriangle, info: Info };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  function remove(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container" role="region" aria-label="Notifications">
        {toasts.map(t => {
          const Icon = icons[t.type];
          return (
            <div key={t.id} className={`toast toast-${t.type}`} role="alert">
              <Icon size={16} />
              <span className="toast-message">{t.message}</span>
              <button className="toast-close" onClick={() => remove(t.id)} aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
