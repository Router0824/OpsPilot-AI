"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Languages } from "lucide-react";

type Locale = "en" | "zh";
type NoticeTone = "success" | "error";
type AppContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  text: (english: string, chinese: string) => string;
  notify: (message: string, tone?: NoticeTone) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh");
  const [notice, setNotice] = useState<{ message: string; tone: NoticeTone } | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("opspilot-locale");
    if (saved === "en" || saved === "zh") window.requestAnimationFrame(() => setLocaleState(saved));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-Hant" : "en";
    window.localStorage.setItem("opspilot-locale", locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);
  const text = useCallback((english: string, chinese: string) => locale === "zh" ? chinese : english, [locale]);
  const notify = useCallback((message: string, tone: NoticeTone = "success") => {
    if (timer.current) window.clearTimeout(timer.current);
    setNotice({ message, tone });
    timer.current = window.setTimeout(() => setNotice(null), 2800);
  }, []);
  const value = useMemo(() => ({ locale, setLocale, text, notify }), [locale, notify, setLocale, text]);

  return <AppContext.Provider value={value}>
    {children}
    {notice && <div className={`global-toast ${notice.tone}`} role="status" aria-live="polite">
      {notice.tone === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {notice.message}
    </div>}
  </AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}

export function LocaleToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useApp();
  return <div className={`locale-toggle ${compact ? "compact" : ""}`} aria-label={locale === "zh" ? "切換語言" : "Change language"}>
    <Languages size={13} />
    <button className={locale === "zh" ? "active" : ""} onClick={() => setLocale("zh")} aria-pressed={locale === "zh"}>中</button>
    <span>/</span>
    <button className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")} aria-pressed={locale === "en"}>EN</button>
  </div>;
}
