import React, { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);
const DURATION = 4500;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), DURATION);
  }, []);

  function dismiss(id) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-24 lg:bottom-6 right-4 z-[200] grid gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto card flex items-start gap-3 shadow-2xl ${
              t.type === "error" ? "border-red-400/40 text-red-200" :
              t.type === "success" ? "border-emerald-400/40 text-emerald-200" :
              "border-cyan-300/30"
            }`}
          >
            <p className="flex-1 text-sm">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="muted hover:text-white shrink-0 leading-none text-base">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
