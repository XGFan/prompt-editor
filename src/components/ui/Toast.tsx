import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from './Button';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 2000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-md shadow-lg border animate-in slide-in-from-top-2 fade-in duration-300 min-w-[200px] max-w-sm",
              {
                'bg-white border-green-200 text-green-800': toast.type === 'success',
                'bg-white border-red-200 text-red-800': toast.type === 'error',
                'bg-white border-blue-200 text-blue-800': toast.type === 'info',
              }
            )}
            role="alert"
          >
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
            <span className="text-sm font-medium">{toast.message}</span>
            <button 
              onClick={() => removeToast(toast.id)}
              className="ml-auto p-0.5 hover:bg-black/5 rounded"
            >
              <X className="w-3 h-3 opacity-50" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
