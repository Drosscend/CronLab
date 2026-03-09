import { createContext, useContext } from "react";
import fr from "./fr.json";
import en from "./en.json";

const translations: Record<string, Record<string, string>> = { fr, en };

export type Language = "fr" | "en";

export interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextType>({
  language: "fr",
  setLanguage: () => {},
  t: (key) => key,
});

export function useI18n() {
  return useContext(I18nContext);
}

export function translate(
  language: Language,
  key: string,
  params?: Record<string, string | number>
): string {
  const dict = translations[language] || translations.fr;
  let value = dict[key] || key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{${k}}`, String(v));
    }
  }

  return value;
}
