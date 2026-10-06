export const UI_LANGUAGES = [
  { code: 'auto', label: 'System default' },
  { code: 'ro', label: 'Română' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'zh-CN', label: '中文' },
] as const;

export type UILanguageCode = (typeof UI_LANGUAGES)[number]['code'];

const STORAGE_KEY = 'mimik_ui_language';

let currentOverride: string = (() => {
  if (typeof window !== 'undefined') {
    try {
      return window.localStorage?.getItem(STORAGE_KEY) || 'auto';
    } catch {}
  }
  return 'auto';
})();

import { useEffect, useState } from 'react';

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('mimik_ui_lang_sync') : null;

export function getUiLanguageOverride(): string {
  return currentOverride;
}

export function useLanguage(): string {
  const [lang, setLang] = useState<string>(getUiLanguageOverride());
  useEffect(() => {
    const handler = (e: Event) => {
      setLang((e as CustomEvent).detail || getUiLanguageOverride());
    };
    const onBc = (e: MessageEvent) => {
      if (e.data?.lang) {
        currentOverride = e.data.lang;
        setLang(e.data.lang);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const newLang = e.newValue || 'auto';
        currentOverride = newLang;
        setLang(newLang);
      }
    };
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('mimik:languageChanged', handler);
      window.addEventListener('storage', onStorage);
      channel?.addEventListener('message', onBc);
      return () => {
        window.removeEventListener('mimik:languageChanged', handler);
        window.removeEventListener('storage', onStorage);
        channel?.removeEventListener('message', onBc);
      };
    }
  }, []);
  return lang;
}

export function setUiLanguageOverride(lang: string): void {
  currentOverride = lang;
  if (typeof window !== 'undefined') {
    try {
      if (lang === 'auto') {
        window.localStorage?.removeItem(STORAGE_KEY);
      } else {
        window.localStorage?.setItem(STORAGE_KEY, lang);
      }
    } catch {}
  }

  try {
    const storageApi = (globalThis as any).browser?.storage?.local || (globalThis as any).chrome?.storage?.local;
    if (storageApi?.set) {
      storageApi.set({ uiLanguage: lang });
    }
  } catch {}

  channel?.postMessage({ lang });

  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('mimik:languageChanged', { detail: lang }));
  }
}

try {
  const storageArea = (globalThis as any).browser?.storage?.local || (globalThis as any).chrome?.storage?.local;
  if (storageArea?.get) {
    storageArea
      .get(['uiLanguage'])
      .then((res: any) => {
        if (res?.uiLanguage && res.uiLanguage !== currentOverride) {
          currentOverride = res.uiLanguage;
        }
      })
      .catch(() => {});
  }
} catch {}
