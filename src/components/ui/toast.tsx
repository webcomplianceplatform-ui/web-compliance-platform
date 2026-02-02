"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "success" | "error";

export type ToastItem = {
  id: string;
  title?: string;
  message: string;
  variant?: ToastVariant;
  ttlMs?: number;
};

type ToastContextValue = {
  push: (t: Omit<ToastItem, "id">) => void;
  remove: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

function uid() {
  return crypto.randomUUID();
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const remove = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback(
    (t: Omit<ToastItem, "id">) => {
      const id = uid();
      const ttl = t.ttlMs ?? 3500;
      const item: ToastItem = { id, ...t };
      setItems((prev) => [item, ...prev].slice(0, 3));
      window.setTimeout(() => remove(id), ttl);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ push, remove }}>
      {children}
      <Toaster items={items} onDismiss={remove} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function Toaster({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {items.map((t) => {
        const variant = t.variant ?? "default";
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto rounded-xl border bg-white p-3 shadow-sm",
              variant === "success" && "border-emerald-200",
              variant === "error" && "border-red-200"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {t.title ? <div className="text-sm font-medium">{t.title}</div> : null}
                <div className="text-sm text-muted-foreground">{t.message}</div>
              </div>
              <button
                type="button"
                className="-mr-1 -mt-1 rounded px-2 py-1 text-xs hover:bg-muted"
                onClick={() => onDismiss(t.id)}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
