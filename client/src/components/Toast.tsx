import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastType = "error" | "success" | "info";
interface Toast { id: number; type: ToastType; msg: string; }

const Ctx = createContext<{ show: (msg: string, type?: ToastType) => void }>(null!);
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((msg: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
