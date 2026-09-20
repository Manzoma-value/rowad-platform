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
    const defaultLanguage: Lang = whiteLabel ? "en" : "sq";
    const allowedSavedLanguage = whiteLabel
      ? saved === "ar" || saved === "en"
      : saved === "ar" || saved === "sq" || saved === "en";
    // Old Arabic preferences came from the former default. Migrate them to
    // Albanian once; any choice made from now on remains respected.
    if (hasChosenLanguage && allowedSavedLanguage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLangState(saved);
      document.documentElement.dir = saved === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = saved;
    } else {
      localStorage.setItem("lang", defaultLanguage);
      localStorage.setItem("language_preference_v2", "1");
      document.documentElement.dir = "ltr";
      document.documentElement.lang = defaultLanguage;
      setLangState(defaultLanguage);
    }
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
