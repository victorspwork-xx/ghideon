import { i18n } from '#imports';
import type { DOMContext } from '@/core/capture/dom/context';
import { CaptureState } from '@/core/capture/machine';
import { buildFallbackDescription } from '@/core/capture/step-description';
import { db } from '@/core/guides/db';
import {
  addStepToGuide,
  clearStepAiPending,
  createStep,
  getStepsForGuide,
  insertStep,
  saveScreenshot,
  updateStepDescription,
} from '@/core/guides/service';
import type { ElementMeta, Screenshot, Step } from '@/core/guides/types';
import { DEFAULT_TARGET_COLOR } from '@/core/screenshot/types';
import { captureVisibleTab, getActiveTab, localStorage } from '@/lib/browser-api';
import { logger } from '@/lib/logger';
import type { CapturePageData, CapturePageResponse, CaptureStepData, CaptureStepResponse } from '@/lib/messaging';
import { extractDomain } from '@/lib/utils';
import { getActor } from './actor';
import { generateAiDescription } from './ai-description';
import { deferDescription, shouldQueueAiDescription } from './deferred-descriptions';
import { queueDescription } from './description-queue';
import { flushNarrationForStep, getVoiceUpdate } from './voice';

async function takeScreenshot(stepId: string, meta?: ElementMeta): Promise<string | undefined> {
  try {
    const { targetColor } = await localStorage.get(['targetColor']);
    const dataUrl = await captureVisibleTab('jpeg', 90);
    const blob = await fetch(dataUrl).then((r) => r.blob());
    const img = await createImageBitmap(blob);
    const screenshot: Screenshot = {
      id: crypto.randomUUID(),
      stepId,
      blob,
      mimeType: 'image/jpeg',
      width: img.width,
      height: img.height,
      bounds: meta ? { x: meta.rect.x, y: meta.rect.y, width: meta.rect.width, height: meta.rect.height } : undefined,
      pixelRatio: meta?.devicePixelRatio ?? 1,
      clickPoint: meta?.clickPoint,
      edits: meta
        ? {
            target: {
              x: meta.rect.x * meta.devicePixelRatio,
              y: meta.rect.y * meta.devicePixelRatio,
              width: meta.rect.width * meta.devicePixelRatio,
              height: meta.rect.height * meta.devicePixelRatio,
              border: 'dashed',
              color: (targetColor as string) || DEFAULT_TARGET_COLOR,
            },
          }
        : undefined,
    };
    img.close();
    await saveScreenshot(screenshot);
    return screenshot.id;
  } catch (err) {
    logger.warn('Screenshot capture failed', err);
    return undefined;
  }
}

async function tryAIDescription(stepId: string, domContext: DOMContext) {
  const { aiApiKey, aiProvider } = await localStorage.get(['aiApiKey', 'aiProvider']);
  if (!aiApiKey && aiProvider !== 'omniroute') return;
  try {
    await clearStepAiPending(stepId, await generateAiDescription(domContext));
  } catch (err) {
    await clearStepAiPending(stepId);
    throw err;
  }
}

export async function handleCaptureStep(data: CaptureStepData): Promise<CaptureStepResponse> {
  const snap = getActor().getSnapshot();
  if (snap.value !== CaptureState.RECORDING) return { ignored: true };

  const stepIndex = snap.context.stepCount;
  getActor().send({ type: 'USER_ACTION' });

  const guideId = snap.context.currentGuideId!;
  const stepId = crypto.randomUUID();

  const screenshotId = await takeScreenshot(stepId, data.elementMeta);

  const narrationCapturing = getVoiceUpdate().phase === 'recording';
  const { aiApiKey, aiProvider } = await localStorage.get(['aiApiKey', 'aiProvider']);
  const hasAiKey = !!aiApiKey || aiProvider === 'omniroute';
  const willUseAI = shouldQueueAiDescription({
    action: data.action,
    hasDomContext: !!data.domContext,
    hasAiKey,
    narrationCapturing,
  });

  const timestamp = Date.now();
  const initialText = buildFallbackDescription(data.action, data.elementMeta);
  await createStep({
    id: stepId,
    guideId,
    index: stepIndex,
    title: initialText,
    description: initialText,
    action: data.action,
    url: snap.context.currentUrl,
    timestamp,
    screenshotId,
    elementMeta: data.elementMeta,
    aiPending: willUseAI || narrationCapturing,
  });
  await addStepToGuide(guideId, stepId);

  const domContext = data.domContext;
  if (data.action !== 'input' && domContext) {
    if (willUseAI) queueDescription(guideId, () => tryAIDescription(stepId, domContext));
    else if (narrationCapturing && hasAiKey) deferDescription(guideId, stepId, domContext);
  }

  if (narrationCapturing) void flushNarrationForStep(guideId, stepId, timestamp);

  return { stepId };
}

export async function handleUpdateInputStep(stepId: string, description: string, inputValue?: string) {
  await updateStepDescription(stepId, description);
  if (inputValue !== undefined) {
    await db.steps.update(stepId, { inputValue });
  }
}

export async function handleFinalizeInputStep(
  stepId: string,
  elementMeta: ElementMeta,
  domContext: DOMContext | undefined,
) {
  const screenshotId = await takeScreenshot(stepId, elementMeta);
  const updates: Partial<Step> = { elementMeta };
  if (screenshotId) updates.screenshotId = screenshotId;
  await db.steps.update(stepId, updates);

  const guideId = (await db.steps.get(stepId))?.guideId;
  if (domContext && guideId) {
    queueDescription(guideId, () => tryAIDescription(stepId, domContext));
  }
}

export async function handleCapturePage(data?: CapturePageData): Promise<CapturePageResponse> {
  const actor = getActor();
  const snap = actor.getSnapshot();
  const isRecording = snap.value === CaptureState.RECORDING;

  const guideId = data?.guideId || (isRecording ? snap.context.currentGuideId : undefined);
  if (!guideId) {
    return { error: 'No active guide' };
  }

  const tab = await getActiveTab();
  if (!tab || !tab.url) {
    return { error: 'No active tab' };
  }

  const stepId = crypto.randomUUID();
  const screenshotId = await takeScreenshot(stepId);

  const timestamp = Date.now();
  const pageTitle = data?.title || tab.title || extractDomain(tab.url) || 'Start';
  const initialTitle = i18n.t('steps.openPage', [pageTitle]) || pageTitle;
  const initialDescription = i18n.t('steps.navigateTo', [tab.url]) || `${i18n.t('steps.navigate')} ${tab.url}`;

  if (typeof data?.atIndex === 'number') {
    await insertStep(guideId, data.atIndex, {
      id: stepId,
      title: initialTitle,
      description: initialDescription,
      audioText: initialTitle,
      action: 'navigate',
      url: tab.url,
      timestamp,
      screenshotId,
    });
  } else {
    let stepIndex = 0;
    if (isRecording && guideId === snap.context.currentGuideId) {
      stepIndex = snap.context.stepCount;
      actor.send({ type: 'USER_ACTION' });
    } else {
      const existingSteps = await getStepsForGuide(guideId);
      stepIndex = existingSteps.length;
    }

    await createStep({
      id: stepId,
      guideId,
      index: stepIndex,
      title: initialTitle,
      description: initialDescription,
      audioText: initialTitle,
      action: 'navigate',
      url: tab.url,
      timestamp,
      screenshotId,
    });
    await addStepToGuide(guideId, stepId);
  }

  const narrationCapturing = getVoiceUpdate().phase === 'recording';
  if (narrationCapturing) void flushNarrationForStep(guideId, stepId, timestamp);

  return { stepId, guideId };
}
