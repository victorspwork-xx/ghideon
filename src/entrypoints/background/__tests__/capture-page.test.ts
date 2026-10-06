import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/core/guides/db';
import { getStepsForGuide } from '@/core/guides/service';
import { handleCapturePage } from '../step-pipeline';

vi.mock('@/lib/browser-api', () => ({
  getActiveTab: vi.fn().mockResolvedValue({
    id: 101,
    url: 'https://example.com/start',
    title: 'Example Homepage',
  }),
  captureVisibleTab: vi.fn().mockResolvedValue('data:image/jpeg;base64,1234'),
  localStorage: {
    get: vi.fn().mockResolvedValue({ targetColor: '#4F46E5' }),
  },
}));

vi.mock('../actor', () => ({
  getActor: () => ({
    getSnapshot: () => ({
      value: 'RECORDING',
      context: { currentGuideId: 'guide-page-test', stepCount: 0 },
    }),
    send: vi.fn(),
  }),
}));

vi.mock('../voice', () => ({
  getVoiceUpdate: () => ({ phase: 'idle' }),
  flushNarrationForStep: vi.fn(),
}));

// Mock createImageBitmap and Blob for jsdom/node
globalThis.createImageBitmap = vi.fn().mockResolvedValue({
  width: 1280,
  height: 720,
  close: vi.fn(),
});

describe('handleCapturePage', () => {
  beforeEach(async () => {
    await db.guides.clear();
    await db.steps.clear();
    await db.screenshots.clear();
    await db.guides.add({
      id: 'guide-page-test',
      title: 'Test Guide',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stepIds: [],
      starred: false,
      deletedAt: null,
    });
  });

  it('captures active page as a step with navigate action and page title', async () => {
    const result = await handleCapturePage();
    expect(result.stepId).toBeDefined();

    const steps = await getStepsForGuide('guide-page-test');
    expect(steps).toHaveLength(1);
    expect(steps[0].action).toBe('navigate');
    expect(steps[0].url).toBe('https://example.com/start');
    expect(steps[0].title).toBe('steps.openPage[Example Homepage]');
    expect(steps[0].description).toBe('steps.navigateTo[https://example.com/start]');
  });

  it('captures active page at a specific index when atIndex is supplied', async () => {
    // Add existing step first
    await db.steps.add({
      id: 'existing-1',
      guideId: 'guide-page-test',
      index: 0,
      title: 'Existing',
      description: 'Existing step',
      action: 'click',
      url: 'https://example.com',
      timestamp: Date.now(),
    });
    await db.guides.update('guide-page-test', { stepIds: ['existing-1'] });

    const result = await handleCapturePage({ guideId: 'guide-page-test', atIndex: 0 });
    expect(result.stepId).toBeDefined();

    const steps = await getStepsForGuide('guide-page-test');
    expect(steps).toHaveLength(2);
    expect(steps[0].id).toBe(result.stepId);
    expect(steps[0].index).toBe(0);
    expect(steps[1].id).toBe('existing-1');
    expect(steps[1].index).toBe(1);
  });
});
