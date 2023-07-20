import React, { useContext } from 'react';

type LanguageStrings<T> = {
  [K in keyof T]: T[K];
};

export type SupportedLanguage = 'en';

type Localizations<T> = {
  [K in SupportedLanguage]: LanguageStrings<T>;
};

type UseStrings<T> = () => LanguageStrings<T>;

const ctx = React.createContext<SupportedLanguage>('en');

export function format(str: string, dict: Record<string, any>): string {
  return Object.entries(dict).reduce((current, [key, value]) => {
    const varName = `{${key}}`;
    const formattedValue = value;
    let index = current.indexOf(varName);
    while (index !== -1) {
      current = `${current.substring(
        0,
        index
      )}${formattedValue}${current.substring(index + varName.length)}`;
      index = current.indexOf(varName);
    }
    return current;
  }, str);
}

export function useCurrentLanguage(): SupportedLanguage {
  return useContext(ctx);
}

export function createUseStrings<T>(strings: Localizations<T>): UseStrings<T> {
  return function useStrings() {
    const lang = useCurrentLanguage();
    return strings[lang] || strings.en;
  };
}

export const LocalizationProvider: React.FC<{
  lang: SupportedLanguage;
  children: React.ReactNode;
}> = ({ lang, children }) => {
  return <ctx.Provider value={lang}>{children}</ctx.Provider>;
};
