import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { createStep, getStepsForGuide, insertStep } from '../service';
import type { Step } from '../types';

function makeStep(id: string, index: number): Step {
  return {
    id,
    guideId: 'guide-1',
    index,
    action: 'click',
    url: 'https://example.com',
    timestamp: Date.now(),
    description: `Step ${id}`,
  };
}

describe('insertStep', () => {
  beforeEach(async () => {
    await db.guides.clear();
    await db.steps.clear();
    await db.guides.add({
      id: 'guide-1',
      title: 'Test Guide',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stepIds: ['s1', 's2', 's3'],
      starred: false,
      deletedAt: null,
    });
    await createStep(makeStep('s1', 0));
    await createStep(makeStep('s2', 1));
    await createStep(makeStep('s3', 2));
  });

  it('inserts a step at the beginning (index 0) and re-indexes subsequent steps', async () => {
    const newId = await insertStep('guide-1', 0, {
      id: 's-start',
      title: 'Starting Page',
      description: 'Navigate to page',
      action: 'navigate',
      url: 'https://example.com',
      timestamp: Date.now(),
    });

    expect(newId).toBe('s-start');
    const steps = await getStepsForGuide('guide-1');
    expect(steps.map((s) => s.id)).toEqual(['s-start', 's1', 's2', 's3']);
    expect(steps.map((s) => s.index)).toEqual([0, 1, 2, 3]);

    const guide = await db.guides.get('guide-1');
    expect(guide?.stepIds).toEqual(['s-start', 's1', 's2', 's3']);
  });

  it('inserts a step in the middle of existing steps', async () => {
    await insertStep('guide-1', 1, {
      id: 's-mid',
      title: 'Middle Page',
      description: 'Navigate to middle page',
      action: 'navigate',
      url: 'https://example.com/mid',
      timestamp: Date.now(),
    });

    const steps = await getStepsForGuide('guide-1');
    expect(steps.map((s) => s.id)).toEqual(['s1', 's-mid', 's2', 's3']);
    expect(steps.map((s) => s.index)).toEqual([0, 1, 2, 3]);
  });
});
