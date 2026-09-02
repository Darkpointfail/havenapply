"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { translate, type Locale } from "@/lib/i18n/messages";
import { en as homeEn } from "@/lib/i18n/messages/en";
import { fr as homeFr, type MessageKey } from "@/lib/i18n/messages/fr";

export type { Locale };

const STORAGE_KEY = "haven-locale";
const homeCatalogs = { fr: homeFr, en: homeEn } as const;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function applyLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, String(value));
  }
  return out;
}

function resolveMessage(locale: Locale, key: string) {
  if (Object.prototype.hasOwnProperty.call(homeFr, key)) {
    const catalog = homeCatalogs[locale] ?? homeCatalogs.fr;
    return catalog[key as MessageKey] ?? homeFr[key as MessageKey] ?? key;
  }
  return translate(locale, key);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const next: Locale = stored === "fr" || stored === "en" ? stored : "fr";
      setLocaleState(next);
      applyLocale(next);
    } catch {
      applyLocale("fr");
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
    applyLocale(next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => {
      const next: Locale = prev === "en" ? "fr" : "en";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      applyLocale(next);
      return next;
    });
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      interpolate(resolveMessage(locale, key), vars),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale, t }),
    [locale, setLocale, toggleLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n requires LocaleProvider");
  return ctx;
}

export function useT() {
  return useI18n().t;
}

export function useLocale() {
  const { locale, setLocale } = useI18n();
  return { locale, setLocale };
}
