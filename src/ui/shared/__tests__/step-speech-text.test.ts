import { describe, expect, it } from 'vitest';
import type { Step } from '@/core/guides/types';
import { getStepSpeechText } from '@/ui/shared/useTextToVoice';

function makeStep(overrides: Partial<Step> = {}): Step {
  return {
    id: 'step-1',
    guideId: 'guide-1',
    index: 0,
    action: 'click',
    url: 'https://example.com',
    timestamp: Date.now(),
    description: 'Default description',
    ...overrides,
  };
}

describe('getStepSpeechText', () => {
  it('returns audioText when audio is not muted', () => {
    const step = makeStep({
      title: 'Step Title',
      description: 'Step Description',
      audioText: 'Custom recorded audio text',
      audioMuted: false,
    });
    expect(getStepSpeechText(step)).toBe('Custom recorded audio text');
  });

  it('returns title when audio is muted', () => {
    const step = makeStep({
      title: 'Step Title',
      description: 'Step Description',
      audioText: 'Custom recorded audio text',
      audioMuted: true,
    });
    expect(getStepSpeechText(step)).toBe('Step Title');
  });

  it('falls back to description when audio is muted and title is empty', () => {
    const step = makeStep({
      title: '',
      description: 'Fallback Description',
      audioText: 'Custom recorded audio text',
      audioMuted: true,
    });
    expect(getStepSpeechText(step)).toBe('Fallback Description');
  });

  it('falls back to narration when audioText is not set', () => {
    const step = makeStep({
      title: 'Step Title',
      description: 'Step Description',
      narration: 'Transcribed voice note',
      audioMuted: false,
    });
    expect(getStepSpeechText(step)).toBe('Transcribed voice note');
  });

  it('falls back to title and description when audioText and narration are empty', () => {
    const step = makeStep({
      title: 'Action Title',
      description: 'Step Description',
      audioMuted: false,
    });
    expect(getStepSpeechText(step)).toBe('Action Title');
  });
});
