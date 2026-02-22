import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ToastMessage {
  id: number;
  type: 'success' | 'error';
  message: string;
}

type ToastListener = (toasts: ToastMessage[]) => void;

let toastIdCounter = 0;
let toasts: ToastMessage[] = [];
let listeners: ToastListener[] = [];

function notifyListeners() {
  listeners.forEach((listener) => listener([...toasts]));
}

function addToast(type: 'success' | 'error', message: string) {
  const id = ++toastIdCounter;
  toasts = [...toasts, { id, type, message }];
  notifyListeners();

  setTimeout(() => {
    removeToast(id);
  }, 5000);
}

function removeToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  notifyListeners();
}

export const toast = {
  success(message: string) {
    addToast('success', message);
  },
  error(message: string) {
    addToast('error', message);
  },
};

export function Toaster() {
  const [currentToasts, setCurrentToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener: ToastListener = (newToasts) => {
      setCurrentToasts(newToasts);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const handleDismiss = useCallback((id: number) => {
    removeToast(id);
  }, []);

  if (currentToasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {currentToasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-lcars-sm bg-lcars-panel px-4 py-3 shadow-lg text-sm flex items-start gap-3 animate-in slide-in-from-right-full duration-300 ${
            t.type === 'error'
              ? 'border-l-4 border-destructive text-destructive'
              : 'border-l-4 border-lcars-cyan text-lcars-cyan'
          }`}
          role="alert"
        >
          <span className="flex-shrink-0 mt-0.5">
            {t.type === 'error' ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </span>
          <span className="flex-1 break-words text-lcars-cream">{t.message}</span>
          <button
            onClick={() => handleDismiss(t.id)}
            className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity text-lcars-cream"
            aria-label="Dismiss notification"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}
