"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AiContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  prompt: string;
  setPrompt: (v: string) => void;
  ask: (q: string) => void;
};

const AiContext = createContext<AiContextValue | null>(null);

export function AiProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");

  const ask = useCallback((q: string) => {
    setPrompt(q);
    setOpen(true);
  }, []);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  const value = useMemo(
    () => ({ open, setOpen, toggle, prompt, setPrompt, ask }),
    [open, prompt, ask, toggle],
  );

  return <AiContext.Provider value={value}>{children}</AiContext.Provider>;
}

export function useAi() {
  const ctx = useContext(AiContext);
  if (!ctx) throw new Error("useAi requires AiProvider");
  return ctx;
}
