"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { isWhiteLabelHost } from "@/lib/tenant-host";

export type Lang = "ar" | "sq" | "en";
type LanguageContextType = { lang: Lang; setLang: (l: Lang) => void };

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang;
    const hasChosenLanguage = localStorage.getItem("language_preference_v2") === "1";
    const whiteLabel = isWhiteLabelHost(window.location.host);
    const needsWhiteLabelArabicDefault =
      whiteLabel && localStorage.getItem("white_label_ar_default_v1") !== "1";
    const defaultLanguage: Lang = whiteLabel ? "ar" : "sq";
    const allowedSavedLanguage = whiteLabel
      ? saved === "ar" || saved === "en"
      : saved === "ar" || saved === "sq" || saved === "en";
    let nextLanguage: Lang;

    if (needsWhiteLabelArabicDefault) {
      localStorage.setItem("white_label_ar_default_v1", "1");
      localStorage.setItem("lang", "ar");
      localStorage.setItem("language_preference_v2", "1");
      nextLanguage = "ar";
    } else if (hasChosenLanguage && allowedSavedLanguage) {
      nextLanguage = saved;
    } else {
      localStorage.setItem("lang", defaultLanguage);
      localStorage.setItem("language_preference_v2", "1");
      nextLanguage = defaultLanguage;
    }

    document.documentElement.dir = nextLanguage === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = nextLanguage;
    const timer = window.setTimeout(() => setLangState(nextLanguage), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function setLang(l: Lang) {
    const nextLanguage = isWhiteLabelHost(window.location.host) && l === "sq" ? "en" : l;
    setLangState(nextLanguage);
    localStorage.setItem("lang", nextLanguage);
    localStorage.setItem("language_preference_v2", "1");
    document.documentElement.dir = nextLanguage === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = nextLanguage;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
