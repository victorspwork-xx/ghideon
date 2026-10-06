import { getUiLanguageOverride } from '@/lib/i18n-override';
import { LOCALES_DATA } from '@/locales/dictionaries';

export { getUiLanguageOverride };

export function getEffectiveLanguage(): string {
  const override = getUiLanguageOverride();
  if (override && override !== 'auto' && LOCALES_DATA[override]) {
    return override;
  }

  // Auto mode: detect from browser / system
  try {
    const nav = typeof navigator !== 'undefined' ? navigator.language : '';
    if (nav) {
      const lower = nav.toLowerCase();
      if (lower.startsWith('ro')) return 'ro';
      if (lower.startsWith('es')) return 'es';
      if (lower.startsWith('fr')) return 'fr';
      if (lower.startsWith('de')) return 'de';
      if (lower.startsWith('pt')) return 'pt-BR';
      if (lower.startsWith('zh')) return 'zh-CN';
      if (lower.startsWith('en')) return 'en';
    }
  } catch {}

  return 'en';
}

function formatMessage(template: string, substitutions?: string | string[]): string {
  if (!substitutions) return template;
  const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
  let result = template;
  subs.forEach((sub, idx) => {
    result = result.replace(new RegExp(`\\$${idx + 1}`, 'g'), String(sub));
  });
  return result;
}

export function createI18n<_T = any>() {
  const t = (key: string, ...args: any[]): string => {
    let sub: string[] | undefined;
    let count: number | undefined;

    args.forEach((arg, i) => {
      if (arg == null) {
        // ignore
      } else if (typeof arg === 'number') {
        count = arg;
      } else if (Array.isArray(arg)) {
        sub = arg;
      } else {
        throw Error(
          `Unknown argument at index ${i}. Must be a number for pluralization, substitution array, or options object.`,
        );
      }
    });

    if (count != null && sub == null) {
      sub = [String(count)];
    }

    const lang = getEffectiveLanguage();
    const dict = LOCALES_DATA[lang] || LOCALES_DATA.en || {};

    let message = dict[key] ?? dict[key.replaceAll('.', '_')];
    if (message === undefined) {
      // Fallback to English
      const enDict = LOCALES_DATA.en || {};
      message = enDict[key] ?? enDict[key.replaceAll('.', '_')];
    }

    if (message === undefined) {
      try {
        const chromeMsg =
          (globalThis as any).chrome?.i18n?.getMessage?.(key.replaceAll('.', '_'), sub) ||
          (globalThis as any).browser?.i18n?.getMessage?.(key.replaceAll('.', '_'), sub);
        if (chromeMsg) return chromeMsg;
      } catch {}

      console.warn(`[i18n] Message not found: "${key}"`);
      return key;
    }

    if (sub?.length) {
      message = formatMessage(message, sub);
    }

    if (count == null) return message;

    const plural = message.split(' | ');
    switch (plural.length) {
      case 1:
        return plural[0];
      case 2:
        return plural[count === 1 ? 0 : 1];
      case 3:
        return plural[count === 0 || count === 1 ? count : 2];
      default:
        throw Error('Unknown plural formatting');
    }
  };

  return { t };
}
