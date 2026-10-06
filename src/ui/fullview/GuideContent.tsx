import { ChevronsUp, History, Loader2, Play, Sparkles, Volume2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TypeAnimation } from 'react-type-animation';
import { i18n } from '#imports';
import { startInsertRecording } from '@/core/capture/start-insert-recording';
import { actionSteps } from '@/core/guides/blocks';
import {
  deleteStep,
  getGuide,
  getScreenshotsForSteps,
  onGuidesChanged,
  shiftDescriptionsBack,
  updateGuideDescription,
  updateGuideTitle,
  updateStepAudioMuted,
  updateStepAudioText,
  updateStepDescription,
  updateStepTitle,
} from '@/core/guides/service';
import type { SnapshotLike } from '@/core/guides/snapshot-diff';
import type { Guide, Screenshot, Snapshot, Step } from '@/core/guides/types';
import type { ScreenshotEdits } from '@/core/screenshot/types';
import { localStorage, openSidebar } from '@/lib/browser-api';
import { logger } from '@/lib/logger';
import { sendMessage } from '@/lib/messaging';
import { formatDate, getMostCommonDomain } from '@/lib/utils';
import { useFullview } from '@/stores/fullview';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/components/ui/tooltip';
import AnnotationEditor from '@/ui/shared/AnnotationEditor';
import { useAskAi } from '@/ui/shared/AskAi';
import FaviconImg from '@/ui/shared/FaviconImg';

import { guideDescriptionErrorMessage } from '@/ui/shared/guide-description-error';
import TextToVoiceBar from '@/ui/shared/TextToVoiceBar';
import Toast from '@/ui/shared/Toast';
import { useTextToVoice } from '@/ui/shared/useTextToVoice';

import GuideStepList from './components/GuideStepList';
import VersionHistoryPanel from './components/VersionHistoryPanel';

interface GuideContentProps {
  guideId: string;
  initialStepId?: string;
  initialTool?: 'annotate' | 'redact' | 'crop' | 'target';
}

interface GuideData {
  guide: Guide;
  steps: Step[];
  screenshots: Map<string, Screenshot>;
}

interface PreviewData {
  snapshotId: string;
  steps: Step[];
  screenshots: Map<string, Screenshot>;
}

async function buildPreview(snapshot: Snapshot): Promise<PreviewData> {
  const rows = new Map(snapshot.screenshots.map((row) => [row.id, row]));
  const steps = [...snapshot.steps].sort((a, b) => a.index - b.index);
  const wanted = steps.map((s) => s.screenshotId).filter((id): id is string => !!id && rows.has(id));
  const live = await getScreenshotsForSteps(wanted);
  const blobs = new Map([...live.values()].map((row) => [row.id, row.blob]));
  const screenshots = new Map<string, Screenshot>();
  for (const step of steps) {
    const row = step.screenshotId ? rows.get(step.screenshotId) : undefined;
    const blob = row ? blobs.get(row.id) : undefined;
    if (row && blob) screenshots.set(step.id, { ...row, blob });
  }
  return { snapshotId: snapshot.id, steps, screenshots };
}

export default function GuideContent({ guideId, initialStepId, initialTool }: GuideContentProps) {
  const {
    setGuideTitle,
    setGuideStepCount,
    setGuideExportData,
    scrollToStep,
    editing,
    setEditing,
    historyOpen,
    setHistoryOpen,
    historyRefreshKey,
  } = useFullview((s) => ({
    setGuideTitle: s.setGuideTitle,
    setGuideStepCount: s.setGuideStepCount,
    setGuideExportData: s.setGuideExportData,
    scrollToStep: s.scrollToStep,
    editing: s.editing,
    setEditing: s.setEditing,
    historyOpen: s.historyOpen,
    setHistoryOpen: s.setHistoryOpen,
    historyRefreshKey: s.historyRefreshKey,
  }));

  const [data, setData] = useState<GuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [typingTitle, setTypingTitle] = useState<string | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingTool, setEditingTool] = useState<'annotate' | 'redact' | 'crop' | 'target'>('annotate');
  const [preview, setPreview] = useState<Snapshot | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [showVoiceBar, setShowVoiceBar] = useState(false);
  const titleRef = useRef('');
  const appliedInitialRef = useRef(false);
  const editingDescriptionRef = useRef(false);

  const stepsForVoice = useMemo(() => {
    if (preview && previewData?.snapshotId === preview.id) return previewData.steps;
    return data?.steps ?? [];
  }, [preview, previewData, data?.steps]);

  const voice = useTextToVoice({
    steps: stepsForVoice,
    onStepChange: (stepId) => scrollToStep(stepId),
  });

  const loadGuide = useCallback(async () => {
    const result = await getGuide(guideId);
    if (result) {
      setData(result);
      if (!editingDescriptionRef.current) setDescription(result.guide.description ?? '');
      const newTitle = result.guide.title;
      const prev = titleRef.current;
      if (
        prev === i18n.t('fullview_untitledGuide') &&
        newTitle !== i18n.t('fullview_untitledGuide') &&
        result.steps.length > 0
      ) {
        setTypingTitle(newTitle);
      } else {
        titleRef.current = newTitle;
        setTitle(newTitle);
      }
      document.title = `${newTitle} — ${i18n.t('app_name')}`;
      setGuideTitle(newTitle);
      setGuideStepCount(actionSteps(result.steps).length);
    }
    setLoading(false);
  }, [guideId, setGuideTitle, setGuideStepCount]);

  useEffect(() => {
    loadGuide();
    return onGuidesChanged(() => loadGuide());
  }, [loadGuide]);

  useEffect(() => {
    if (data) setGuideExportData({ guideId, ...data });
  }, [data, guideId, setGuideExportData]);

  useEffect(() => {
    localStorage.get(['aiApiKey']).then((s) => setHasApiKey(Boolean(s.aiApiKey)));
  }, []);

  const handleTitleBlur = useCallback(async () => {
    if (!data || title === data.guide.title) return;
    await updateGuideTitle(guideId, title);
    setData((prev) => (prev ? { ...prev, guide: { ...prev.guide, title } } : prev));
    document.title = `${title} — ${i18n.t('app_name')}`;
  }, [data, guideId, title]);

  const handleGuideDescriptionBlur = useCallback(async () => {
    if (data && description !== (data.guide.description ?? '')) {
      await updateGuideDescription(guideId, description);
      setData((prev) => (prev ? { ...prev, guide: { ...prev.guide, description } } : prev));
    }
    editingDescriptionRef.current = false;
  }, [data, guideId, description]);

  const commitGuideDescription = useCallback(
    (next: string) => {
      setDescription(next);
      void updateGuideDescription(guideId, next);
      setData((prev) => (prev ? { ...prev, guide: { ...prev.guide, description: next } } : prev));
    },
    [guideId],
  );

  const askAi = useAskAi(description, commitGuideDescription, hasApiKey);

  const handleGenerateDescription = useCallback(async () => {
    setGenerating(true);
    setDescriptionError(null);
    try {
      const result = await sendMessage('generateGuideDescription', { guideId });
      if (result.error) {
        setDescriptionError(guideDescriptionErrorMessage(result.error));
        return;
      }
      const generated = result.description;
      if (!generated) return;
      setDescription(generated);
      setData((prev) => (prev ? { ...prev, guide: { ...prev.guide, description: generated } } : prev));
    } catch {
      setDescriptionError(guideDescriptionErrorMessage('generation-failed'));
    } finally {
      setGenerating(false);
    }
  }, [guideId]);

  const handleTitleChange = useCallback(async (stepId: string, title: string) => {
    await updateStepTitle(stepId, title);
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, steps: prev.steps.map((s) => (s.id === stepId ? { ...s, title } : s)) };
    });
  }, []);

  const handleDescriptionChange = useCallback(async (stepId: string, description: string) => {
    await updateStepDescription(stepId, description);
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, steps: prev.steps.map((s) => (s.id === stepId ? { ...s, description } : s)) };
    });
  }, []);

  const handleAudioTextChange = useCallback(async (stepId: string, audioText: string) => {
    await updateStepAudioText(stepId, audioText);
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, steps: prev.steps.map((s) => (s.id === stepId ? { ...s, audioText } : s)) };
    });
  }, []);

  const handleAudioMutedChange = useCallback(async (stepId: string, audioMuted: boolean) => {
    await updateStepAudioMuted(stepId, audioMuted);
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, steps: prev.steps.map((s) => (s.id === stepId ? { ...s, audioMuted } : s)) };
    });
  }, []);

  const handleDeleteStep = useCallback(
    async (stepId: string) => {
      await deleteStep(guideId, stepId);
      await loadGuide();
    },
    [guideId, loadGuide],
  );

  const handleShiftDescriptions = useCallback(async () => {
    await shiftDescriptionsBack(guideId);
    await loadGuide();
  }, [guideId, loadGuide]);

  const handleOpenEditor = useCallback(
    async (stepId: string, tool: 'annotate' | 'redact' | 'crop' | 'target') => {
      await loadGuide();
      setEditingStepId(stepId);
      setEditingTool(tool);
    },
    [loadGuide],
  );

  const handleEditorDone = useCallback(
    (edits: ScreenshotEdits) => {
      if (!editingStepId || !data) return;
      const screenshot = data.screenshots.get(editingStepId);
      if (!screenshot) return;
      setData((prev) => {
        if (!prev) return prev;
        const newScreenshots = new Map(prev.screenshots);
        newScreenshots.set(editingStepId, { ...screenshot, edits });
        return { ...prev, screenshots: newScreenshots };
      });
      setEditingStepId(null);
    },
    [editingStepId, data],
  );

  useEffect(() => {
    if (!preview) {
      setPreviewData(null);
      return;
    }
    let cancelled = false;
    buildPreview(preview)
      .then((built) => {
        if (!cancelled) setPreviewData(built);
      })
      .catch((err) => logger.error(' Version preview failed', err));
    return () => {
      cancelled = true;
    };
  }, [preview]);

  useEffect(() => {
    if (editing || !historyOpen) setPreview(null);
  }, [editing, historyOpen]);

  useEffect(() => {
    if (appliedInitialRef.current || !data || !initialStepId) return;
    if (!data.screenshots.has(initialStepId)) return;
    appliedInitialRef.current = true;
    scrollToStep(initialStepId);
    if (initialTool) {
      setEditingStepId(initialStepId);
      setEditingTool(initialTool);
    }
  }, [data, initialStepId, initialTool, scrollToStep]);

  const live = useMemo<SnapshotLike>(
    () => ({
      title: data?.guide.title ?? '',
      stepIds: data?.guide.stepIds ?? [],
      steps: data?.steps ?? [],
      screenshots: data ? [...data.screenshots.values()] : [],
    }),
    [data],
  );

  if (loading)
    return (
      <div>
        <div className="h-10 w-2/3 rounded-lg bg-border/50 animate-pulse" />
        <div className="h-4 w-48 rounded bg-border/30 animate-pulse mt-3 mb-8" />
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border/50 p-4">
              <div
                className="aspect-video rounded-lg bg-[#f2f4fa] animate-pulse mb-3"
                style={{ animationDelay: `${i * 150}ms` }}
              />
              <div
                className="h-4 w-3/4 rounded bg-border/40 animate-pulse"
                style={{ animationDelay: `${i * 150 + 50}ms` }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  if (!data) return <p className="text-sm py-12 text-center text-purple">{i18n.t('fullview_guideNotFound')}</p>;

  const previewView = preview && previewData?.snapshotId === preview.id ? previewData : null;
  const viewSteps = previewView ? previewView.steps : data.steps;
  const viewScreenshots = previewView ? previewView.screenshots : data.screenshots;
  const actionCount = actionSteps(viewSteps).length;
  const domain = getMostCommonDomain(viewSteps);
  const editingScreenshot = editingStepId ? data.screenshots.get(editingStepId) : undefined;
  const animatingTitle = preview ? null : typingTitle;
  const untitledPending =
    !preview && !typingTitle && title === i18n.t('fullview_untitledGuide') && viewSteps.length > 0;
  const metaGenerating = (untitledPending || animatingTitle !== null) && !description;

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">
      {editingStepId && editingScreenshot && (
        <AnnotationEditor
          screenshot={editingScreenshot}
          tool={editingTool}
          onDone={handleEditorDone}
          onCancel={() => setEditingStepId(null)}
        />
      )}

      <div className={historyOpen ? 'flex items-start gap-6' : ''}>
        <div className={historyOpen ? 'flex-1 min-w-0' : ''}>
          {preview && (
            <div className="flex items-center gap-2 rounded-lg bg-secondary border border-border px-4 py-3 mb-4">
              <History size={15} className="text-accent shrink-0" />
              <span className="text-[12px] text-foreground">{i18n.t('history.readOnlyBanner')}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 mt-2 mb-4 flex-wrap">
            <span className="inline-flex items-center text-[11px] font-medium text-muted-foreground bg-card border border-border px-2.5 py-0.5 rounded-full">
              {formatDate(data.guide.createdAt)}
            </span>
            <span className="inline-flex items-center text-[11px] font-medium text-muted-foreground bg-card border border-border px-2.5 py-0.5 rounded-full">
              {actionCount !== 1
                ? i18n.t('fullview_stepCountPlural', [String(actionCount)])
                : i18n.t('fullview_stepCount', [String(actionCount)])}
            </span>
            {domain && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-card border border-border pl-1.5 pr-2.5 py-0.5 rounded-full">
                <FaviconImg domain={domain} size={14} className="rounded-full" />
                {domain}
              </span>
            )}
            {viewSteps.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowVoiceBar((prev) => {
                    if (prev) voice.stop();
                    return !prev;
                  });
                }}
                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-0.5 rounded-full transition-colors border ${
                  showVoiceBar || voice.isPlaying
                    ? 'bg-accent text-white border-accent'
                    : 'text-purple border-border bg-card hover:border-accent hover:text-accent'
                } ${!editing && !preview ? 'ml-auto' : ''}`}
              >
                <Volume2 size={12} />
                {i18n.t('editor.textToVoice')}
              </button>
            )}
            {editing && !preview && viewSteps.length > 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleShiftDescriptions}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-0.5 rounded-full transition-colors border text-muted-foreground border-border bg-card hover:border-accent hover:text-accent"
                  >
                    <ChevronsUp size={12} />
                    {i18n.t('editor.shiftDescriptions') || 'Shift descriptions ↑'}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[240px] text-center">
                  {i18n.t('editor.shiftDescriptionsHint') ||
                    'Move all titles, descriptions and audio texts one step earlier. Useful when AI descriptions refer to the next step.'}
                </TooltipContent>
              </Tooltip>
            )}
            {!editing && !preview && viewSteps.length > 0 && (
              <button
                onClick={() => {
                  openSidebar();
                  void sendMessage('startGuideMe', { guideId });
                }}
                disabled={!viewSteps.some((s) => s.elementMeta)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary-foreground bg-primary hover:bg-primary/90 px-3 py-0.5 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Play size={11} />
                {i18n.t('fullview_guideMe')}
              </button>
            )}
          </div>

          {showVoiceBar && (
            <div className="mb-4 sticky top-4 z-30">
              <TextToVoiceBar
                voice={voice}
                totalSteps={viewSteps.length}
                onClose={() => {
                  setShowVoiceBar(false);
                  voice.stop();
                }}
              />
            </div>
          )}

          <GuideStepList
            guide={data.guide}
            guideId={guideId}
            steps={viewSteps}
            screenshots={viewScreenshots}
            onTitleChange={handleTitleChange}
            onDescriptionChange={handleDescriptionChange}
            onAudioTextChange={handleAudioTextChange}
            onAudioMutedChange={handleAudioMutedChange}
            onDelete={handleDeleteStep}
            onOpenEditor={handleOpenEditor}
            onReorder={(newSteps) => setData((prev) => (prev ? { ...prev, steps: newSteps } : prev))}
            readOnly={!editing || preview !== null}
            hasApiKey={hasApiKey}
            onChanged={loadGuide}
            onInsertRecording={(targetGuideId, insertAtIndex, tabId) => {
              openSidebar();
              void startInsertRecording(targetGuideId, insertAtIndex, tabId);
            }}
            activeVoiceStepId={voice.isPlaying || voice.isPaused ? voice.activeStepId : null}
            onSpeakStep={voice.speakSingleStep}
          />
        </div>

        {historyOpen && (
          <VersionHistoryPanel
            guideId={guideId}
            selectedId={preview?.id ?? null}
            refreshKey={historyRefreshKey}
            live={live}
            onSelect={(snapshot) => {
              setPreview(snapshot);
              if (snapshot) setEditing(false);
            }}
            onRestored={loadGuide}
            onClose={() => setHistoryOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
