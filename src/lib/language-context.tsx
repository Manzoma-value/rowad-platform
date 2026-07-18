"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type Lang = "ar" | "sq" | "en";
type LanguageContextType = { lang: Lang; setLang: (l: Lang) => void };

const LanguageContext = createContext<LanguageContextType>({
  lang: "sq",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("sq");

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang;
    const hasChosenLanguage = localStorage.getItem("language_preference_v2") === "1";
    // Old Arabic preferences came from the former default. Migrate them to
    // Albanian once; any choice made from now on remains respected.
    if (hasChosenLanguage && (saved === "ar" || saved === "sq" || saved === "en")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLangState(saved);
    } else {
      localStorage.setItem("lang", "sq");
      localStorage.setItem("language_preference_v2", "1");
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "sq";
    }
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("lang", l);
    localStorage.setItem("language_preference_v2", "1");
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = l;
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
