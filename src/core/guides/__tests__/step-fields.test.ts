import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import {
  createGuide,
  createStep,
  updateStepAudioMuted,
  updateStepAudioText,
  updateStepFields,
  updateStepTitle,
} from '../service';
import type { Step } from '../types';

function makeStep(overrides: Partial<Step> = {}): Step {
  return {
    id: 'step-1',
    guideId: 'guide-1',
    index: 0,
    action: 'click',
    url: 'https://example.com',
    timestamp: Date.now(),
    description: 'Original description',
    ...overrides,
  };
}

describe('step 3-field persistence and updates', () => {
  beforeEach(async () => {
    await db.guides.clear();
    await db.steps.clear();
    await db.guides.add({
      id: 'guide-1',
      title: 'Test Guide',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stepIds: ['step-1'],
      starred: false,
      deletedAt: null,
    });
  });

  it('stores and updates step title', async () => {
    await createStep(makeStep({ title: 'Initial Title' }));
    let step = await db.steps.get('step-1');
    expect(step?.title).toBe('Initial Title');

    await updateStepTitle('step-1', 'Updated Title');
    step = await db.steps.get('step-1');
    expect(step?.title).toBe('Updated Title');
  });

  it('stores and updates audioText separately from description', async () => {
    await createStep(makeStep({ description: 'Visible description', audioText: 'Voice script' }));
    let step = await db.steps.get('step-1');
    expect(step?.description).toBe('Visible description');
    expect(step?.audioText).toBe('Voice script');

    await updateStepAudioText('step-1', 'Updated voice script');
    step = await db.steps.get('step-1');
    expect(step?.description).toBe('Visible description');
    expect(step?.audioText).toBe('Updated voice script');
  });

  it('updates step audioMuted flag', async () => {
    await createStep(makeStep({ audioMuted: false }));
    let step = await db.steps.get('step-1');
    expect(step?.audioMuted).toBe(false);

    await updateStepAudioMuted('step-1', true);
    step = await db.steps.get('step-1');
    expect(step?.audioMuted).toBe(true);
  });

  it('updates multiple step fields simultaneously via updateStepFields', async () => {
    await createStep(makeStep());
    await updateStepFields('step-1', {
      title: 'New Title',
      description: 'New Description',
      audioText: 'New Audio Text',
      audioMuted: true,
    });
    const step = await db.steps.get('step-1');
    expect(step?.title).toBe('New Title');
    expect(step?.description).toBe('New Description');
    expect(step?.audioText).toBe('New Audio Text');
    expect(step?.audioMuted).toBe(true);
  });
});
