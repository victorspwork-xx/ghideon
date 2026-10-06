import { describe, expect, it } from 'vitest';
import { setUiLanguageOverride } from '@/lib/i18n-override';
import { createI18n, getEffectiveLanguage } from '@/lib/wxt-i18n';

describe('i18n-runtime with Romanian override', () => {
  it('returns English by default', () => {
    setUiLanguageOverride('auto');
    const i18n = createI18n();
    expect(i18n.t('settings.title')).toBe('Settings');
  });

  it('returns Romanian when override is set to ro', () => {
    setUiLanguageOverride('ro');
    expect(getEffectiveLanguage()).toBe('ro');
    const i18n = createI18n();
    expect(i18n.t('settings.title')).toBe('Setări');
    expect(i18n.t('sidepanel.startCapture')).toBe('Începe capturarea');
    expect(i18n.t('onboarding.welcomeTitle')).toBe('Ai instalat Ghideon cu succes!');
  });

  it('replaces parameters in Romanian strings', () => {
    setUiLanguageOverride('ro');
    const i18n = createI18n();
    expect(i18n.t('common.updated', ['1.2.3'])).toBe('Actualizat la v1.2.3');
  });

  it('handles plurals and parameters', () => {
    setUiLanguageOverride('ro');
    const i18n = createI18n();
    expect(i18n.t('fullview.stepCount', ['1'])).toBe('1 pas');
    expect(i18n.t('fullview.stepCountPlural', ['5'])).toBe('5 pași');
  });
});
