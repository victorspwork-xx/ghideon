import { ArrowDownLeft, Check, Copy, Loader2, Mic, Trash2, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { browser, i18n } from '#imports';
import { replaceScreenshot } from '@/core/guides/service';
import type { Screenshot, Step } from '@/core/guides/types';
import { imageDimensions, renderScreenshot } from '@/core/screenshot/render';
import { DEFAULT_TARGET_COLOR } from '@/core/screenshot/types';
import { localStorage } from '@/lib/browser-api';
import { logger } from '@/lib/logger';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/components/ui/tooltip';
import { useAskAi } from '@/ui/shared/AskAi';
import ConfirmDialog from '@/ui/shared/ConfirmDialog';
import { DragGrip, type DragHandleProps, useCardDrag } from '@/ui/shared/card-drag';
import ImagePlaceholder from '@/ui/shared/ImagePlaceholder';
import ScreenshotView from '@/ui/shared/ScreenshotView';

interface StepCardProps {
  step: Step;
  number: number;
  screenshot: Screenshot | undefined;
  onTitleChange?: (stepId: string, title: string) => void;
  onDescriptionChange?: (stepId: string, description: string) => void;
  onAudioTextChange?: (stepId: string, audioText: string) => void;
  onAudioMutedChange?: (stepId: string, audioMuted: boolean) => void;
  onDelete?: (stepId: string) => void;
  dragHandleProps?: DragHandleProps;
  onOpenEditor?: (stepId: string, tool: 'annotate' | 'redact' | 'crop' | 'target') => void;
  onCopy?: (stepId: string) => void;
  placeholderRatio?: number;
  frameRatio?: number;
  readOnly?: boolean;
  onChanged?: () => void;
  hasApiKey?: boolean;
  isActive?: boolean;
  onSpeak?: (step: Step) => void;
}

export default function StepCard({
  step,
  number,
  screenshot,
  onTitleChange,
  onDescriptionChange,
  onAudioTextChange,
  onAudioMutedChange,
  onDelete,
  dragHandleProps,
  onOpenEditor,
  placeholderRatio,
  frameRatio,
  readOnly,
  onChanged,
  hasApiKey,
  isActive,
  onSpeak,
}: StepCardProps) {
  const [title, setTitle] = useState(step.title ?? '');
  const [description, setDescription] = useState(step.description);
  const [audioText, setAudioText] = useState(step.audioText ?? step.narration ?? '');
  const [audioMuted, setAudioMuted] = useState(Boolean(step.audioMuted));
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedNarration, setCopiedNarration] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [brandColor, setBrandColor] = useState<string>(DEFAULT_TARGET_COLOR);
  const cardDrag = useCardDrag(dragHandleProps);

  useEffect(() => {
    localStorage.get(['targetColor']).then((res) => {
      if (res.targetColor && typeof res.targetColor === 'string') {
        setBrandColor(res.targetColor);
      }
    });
    const handleStorageChange = (changes: Record<string, { newValue?: unknown }>) => {
      if ('targetColor' in changes && typeof changes.targetColor.newValue === 'string') {
        setBrandColor(changes.targetColor.newValue);
      }
    };
    browser.storage.onChanged.addListener(handleStorageChange);
    return () => browser.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  useEffect(() => {
    setTitle(step.title ?? '');
  }, [step.title]);

  useEffect(() => {
    setDescription(step.description);
  }, [step.description]);

  useEffect(() => {
    setAudioText(step.audioText ?? step.narration ?? '');
  }, [step.audioText, step.narration]);

  useEffect(() => {
    setAudioMuted(Boolean(step.audioMuted));
  }, [step.audioMuted]);

  const handleTitleBlur = () => {
    if (title !== (step.title ?? '')) onTitleChange?.(step.id, title);
  };

  const handleDescriptionBlur = () => {
    if (description !== step.description) onDescriptionChange?.(step.id, description);
  };

  const handleAudioTextBlur = () => {
    const prev = step.audioText ?? step.narration ?? '';
    if (audioText !== prev) onAudioTextChange?.(step.id, audioText);
  };

  const handleToggleMute = () => {
    const next = !audioMuted;
    setAudioMuted(next);
    onAudioMutedChange?.(step.id, next);
  };

  // AI improvement for each field
  const titleAskAi = useAskAi(
    title,
    (next) => {
      setTitle(next);
      onTitleChange?.(step.id, next);
    },
    !readOnly && Boolean(hasApiKey),
  );

  const descAskAi = useAskAi(
    description,
    (next) => {
      setDescription(next);
      onDescriptionChange?.(step.id, next);
    },
    !readOnly && !step.aiPending && Boolean(hasApiKey),
  );

  const audioAskAi = useAskAi(
    audioText,
    (next) => {
      setAudioText(next);
      onAudioTextChange?.(step.id, next);
    },
    !readOnly && Boolean(hasApiKey),
  );

  const handleDelete = () => {
    setConfirmDelete(false);
    onDelete?.(step.id);
  };

  const handleCopy = async () => {
    if (!screenshot) return;
    try {
      const rendered = await renderScreenshot(screenshot, { format: 'image/png' });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': rendered })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      logger.error('Copy to clipboard failed', err);
    }
  };

  const handleCopyAudioText = async () => {
    if (!audioText) return;
    try {
      await navigator.clipboard.writeText(audioText);
      setCopiedNarration(true);
      setTimeout(() => setCopiedNarration(false), 1500);
    } catch (err) {
      logger.error('Copy audio text failed', err);
    }
  };

  const handleUseAudioAsDescription = () => {
    if (!audioText) return;
    setDescription(audioText);
    onDescriptionChange?.(step.id, audioText);
  };

  const handleUpload = async (file: File) => {
    await replaceScreenshot(step.id, file, await imageDimensions(file));
    onChanged?.();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
    dragHandleProps?.onDragOver(e);
  };

  const effectiveStepForVoice: Step = {
    ...step,
    title,
    description,
    audioText,
    audioMuted,
  };

  return (
    <div
      {...cardDrag}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDragEnd={() => {
        setDragOver(false);
        dragHandleProps?.onDragEnd();
      }}
      className={`rounded-xl mb-3 overflow-hidden transition-all border border-border bg-card ${dragOver ? 'ring-2 ring-accent' : isActive ? 'ring-2 ring-accent shadow-md' : ''}`}
    >
      {screenshot ? (
        <ScreenshotView
          screenshot={screenshot}
          alt={`Step ${number} screenshot`}
          className="!rounded-none !border-0"
          crop
          frameRatio={frameRatio}
          readOnly={readOnly}
          onOpenEditor={!readOnly && onOpenEditor ? (tool) => onOpenEditor(step.id, tool) : undefined}
          onChanged={onChanged}
        />
      ) : (
        <ImagePlaceholder
          label={i18n.t('editor.noScreenshot')}
          ratio={placeholderRatio}
          className="w-full !rounded-none border-x-0 border-t-0"
          onUpload={readOnly ? undefined : handleUpload}
        />
      )}

      <div className="px-3.5 pt-3 pb-2.5 space-y-2.5">
        {/* FIELD 1: TITLE */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              {dragHandleProps && <DragGrip />}
              <span
                className="flex items-center justify-center w-[22px] h-[22px] rounded-full text-[11px] font-bold shrink-0 text-white shadow-xs"
                style={{ backgroundColor: brandColor }}
              >
                {number}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {i18n.t('editor.stepTitle') || 'Titlu'}
              </span>
            </div>
            {!readOnly && <div className="flex items-center gap-1">{titleAskAi.trigger}</div>}
          </div>

          {readOnly ? (
            step.title ? (
              <h3 className="text-[13px] font-bold text-foreground leading-snug ml-7">{step.title}</h3>
            ) : null
          ) : (
            <input
              type="text"
              className="w-full text-[13px] font-bold outline-none border border-border/60 focus:border-accent rounded-lg bg-card px-2.5 py-1.5 leading-snug text-foreground placeholder:text-muted-foreground/50 transition-colors"
              placeholder={i18n.t('editor.stepTitlePlaceholder') || 'Titlu pas (utilizat pe video)...'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
            />
          )}
        </div>

        {/* FIELD 2: DESCRIPTION */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {i18n.t('editor.stepDescription') || 'Descriere'}
            </span>
            {!readOnly && <div className="flex items-center gap-1">{descAskAi.trigger}</div>}
          </div>

          {step.aiPending ? (
            <span className="flex items-center gap-1.5 text-[12px] font-medium leading-snug py-1 text-muted-foreground">
              <Loader2 size={13} className="animate-spin" />
              {i18n.t('editor.writingStepDescription')}
            </span>
          ) : readOnly ? (
            <p className="text-[12px] font-normal leading-relaxed text-foreground whitespace-pre-wrap">
              {step.description}
            </p>
          ) : (
            <textarea
              className="w-full text-[12px] font-medium resize-none outline-none border border-border/60 focus:border-accent rounded-lg bg-card px-2.5 py-1.5 leading-relaxed text-foreground placeholder:text-muted-foreground/50 transition-colors"
              value={description}
              rows={2}
              placeholder={i18n.t('editor.stepDescriptionPlaceholder') || 'Descriere detaliată (vizibilă în ghid)...'}
              onChange={(e) => setDescription(e.target.value)}
              onSelect={descAskAi.onSelect}
              onBlur={handleDescriptionBlur}
            />
          )}
        </div>

        {/* FIELD 3: AUDIO TEXT (visible only to guide editors, hidden in readOnly view) */}
        {!readOnly && (
          <div
            className={`p-2.5 rounded-xl border transition-all ${
              audioMuted ? 'bg-muted/20 border-dashed border-border/80' : 'bg-secondary/50 border-border/80'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-accent">
                <Mic size={12} className={audioMuted ? 'text-muted-foreground' : 'text-accent'} />
                <span className={audioMuted ? 'text-muted-foreground line-through' : 'text-foreground'}>
                  {i18n.t('editor.audioText') || 'Text audio'}
                </span>
                {audioMuted && (
                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-destructive/10 text-destructive">
                    {i18n.t('editor.audioMutedBadge') || 'Muted'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Mute / Unmute Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleToggleMute}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                        audioMuted
                          ? 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20'
                          : 'bg-card text-muted-foreground border-border hover:text-accent hover:border-accent'
                      }`}
                    >
                      {audioMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
                      <span>
                        {audioMuted
                          ? i18n.t('editor.audioUnmute') || 'Activează audio'
                          : i18n.t('editor.audioMute') || 'Mute audio'}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {audioMuted
                      ? i18n.t('editor.audioMutedNotice') || 'Audio este oprit. Se va citi automat textul din Titlu.'
                      : i18n.t('editor.audioMuteNotice') ||
                        'Oprește textul audio pentru acest pas (se va citi titlul).'}
                  </TooltipContent>
                </Tooltip>

                {/* AI improvement trigger for audio */}
                {audioAskAi.trigger}

                {/* Copy to description */}
                {audioText && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleUseAudioAsDescription}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-card hover:bg-card/80 border border-border text-[10px] font-medium text-purple hover:text-accent transition-colors"
                      >
                        <ArrowDownLeft size={10} />
                        <span className="hidden sm:inline">{i18n.t('editor.useAsDescription') || 'În descriere'}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{i18n.t('editor.useAsDescriptionHint')}</TooltipContent>
                  </Tooltip>
                )}

                {/* Copy audio text */}
                {audioText && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleCopyAudioText}
                        className={`p-1 rounded transition-colors ${copiedNarration ? 'text-success' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {copiedNarration ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{i18n.t('editor.copyNarration') || 'Copiază textul audio'}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            <textarea
              className={`w-full text-[12px] resize-none outline-none border rounded-lg px-2.5 py-1.5 leading-relaxed transition-all placeholder:text-muted-foreground/45 ${
                audioMuted
                  ? 'bg-muted/30 border-border/50 text-muted-foreground opacity-60'
                  : 'bg-card border-border/70 text-foreground focus:border-accent'
              }`}
              value={audioText}
              rows={2}
              placeholder={
                i18n.t('editor.audioTextPlaceholder') || 'Text audio înregistrat (sau introdus pentru citire vocală)...'
              }
              onChange={(e) => setAudioText(e.target.value)}
              onSelect={audioAskAi.onSelect}
              onBlur={handleAudioTextBlur}
            />

            {audioMuted && (
              <p className="mt-1 text-[10.5px] italic text-muted-foreground leading-tight flex items-center gap-1">
                <span>📢</span>
                <span>
                  {i18n.t('editor.audioMutedFallbackNotice') ||
                    'Textul audio este silențios. La redare se va citi titlul:'}{' '}
                  <strong className="text-foreground not-italic">"{title || description || '—'}"</strong>
                </span>
              </p>
            )}
          </div>
        )}

        {/* BOTTOM ACTION BAR */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          <div className="text-[10px] text-muted-foreground">
            {step.action && <span className="font-mono">{step.action}</span>}
          </div>

          <div className="flex items-center gap-1">
            {onSpeak && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSpeak(effectiveStepForVoice)}
                    className={`p-1.5 rounded-md transition-colors ${
                      isActive ? 'bg-accent text-white' : 'text-muted-foreground hover:text-accent hover:bg-secondary'
                    }`}
                  >
                    <Volume2 size={13} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{i18n.t('editor.listenStep') || 'Ascultă pasul'}</TooltipContent>
              </Tooltip>
            )}
            {screenshot && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleCopy}
                    className={`p-1.5 rounded-md transition-colors ${copied ? 'text-success' : 'text-muted-foreground hover:text-success hover:bg-secondary'}`}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{i18n.t('editor.copyScreenshot')}</TooltipContent>
              </Tooltip>
            )}
            {!readOnly && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="p-1.5 rounded-md transition-colors text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={13} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{i18n.t('recording.deleteStep')}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        heading={i18n.t('editor.deleteThisStep')}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
