import { Check, Copy, Mic, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { i18n } from '#imports';
import type { Step } from '@/core/guides/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/components/ui/tooltip';
import { useAskAi } from '@/ui/shared/AskAi';

interface StepAudioPanelProps {
  step: Step;
  hasApiKey?: boolean;
  /** Called immediately when mute is toggled (fires to persist the change) */
  onAudioMutedChange?: (stepId: string, audioMuted: boolean) => void;
  /** Called on blur to persist audio text */
  onAudioTextChange?: (stepId: string, audioText: string) => void;
  /** If provided, a speak button is shown */
  onSpeak?: (step: Step) => void;
  /** When true the step is currently being narrated */
  isActive?: boolean;
}

export default function StepAudioPanel({
  step,
  hasApiKey,
  onAudioMutedChange,
  onAudioTextChange,
  onSpeak,
  isActive,
}: StepAudioPanelProps) {
  const [audioText, setAudioText] = useState(step.audioText ?? step.narration ?? '');
  const [audioMuted, setAudioMuted] = useState(Boolean(step.audioMuted));
  const [copiedNarration, setCopiedNarration] = useState(false);

  // Keep in sync when parent refreshes the step
  useEffect(() => {
    setAudioText(step.audioText ?? step.narration ?? '');
  }, [step.audioText, step.narration]);

  useEffect(() => {
    setAudioMuted(Boolean(step.audioMuted));
  }, [step.audioMuted]);

  const handleAudioTextBlur = () => {
    const prev = step.audioText ?? step.narration ?? '';
    if (audioText !== prev) onAudioTextChange?.(step.id, audioText);
  };

  const handleToggleMute = () => {
    const next = !audioMuted;
    setAudioMuted(next);
    onAudioMutedChange?.(step.id, next);
  };

  const audioAskAi = useAskAi(
    audioText,
    (next) => {
      setAudioText(next);
      onAudioTextChange?.(step.id, next);
    },
    Boolean(hasApiKey),
  );

  const handleCopyAudioText = async () => {
    if (!audioText) return;
    try {
      await navigator.clipboard.writeText(audioText);
      setCopiedNarration(true);
      setTimeout(() => setCopiedNarration(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const effectiveStep: Step = { ...step, audioText, audioMuted };

  return (
    <div
      className={`p-2.5 rounded-xl border transition-all ${
        audioMuted ? 'bg-muted/20 border-dashed border-border/80' : 'bg-secondary/50 border-border/80'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
          <Mic size={12} className={audioMuted ? 'text-muted-foreground' : 'text-accent'} />
          <span className={audioMuted ? 'text-muted-foreground line-through' : 'text-foreground'}>
            {i18n.t('editor.audioText') || 'Text audio'}
          </span>
          {audioMuted && (
            <span className="text-[10px] font-medium px-1.5 rounded bg-destructive/10 text-destructive">
              {i18n.t('editor.audioMutedBadge') || 'Muted'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Mute / Unmute */}
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
                ? i18n.t('editor.audioMutedNotice') || 'Audio este oprit.'
                : i18n.t('editor.audioMuteNotice') || 'Oprește textul audio pentru acest pas.'}
            </TooltipContent>
          </Tooltip>

          {/* AI assist */}
          {audioAskAi.trigger}

          {/* Copy */}
          {audioText && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleCopyAudioText}
                  className={`p-1 rounded transition-colors ${
                    copiedNarration ? 'text-success' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {copiedNarration ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </TooltipTrigger>
              <TooltipContent>{i18n.t('editor.copyNarration') || 'Copiază textul audio'}</TooltipContent>
            </Tooltip>
          )}

          {/* Speak (preview) */}
          {onSpeak && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSpeak(effectiveStep)}
                  className={`p-1.5 rounded-md transition-colors ${
                    isActive ? 'bg-accent text-white' : 'text-muted-foreground hover:text-accent hover:bg-secondary'
                  }`}
                >
                  <Volume2 size={13} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{i18n.t('editor.speakStep') || 'Redă vocea pentru acest pas'}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        className={`w-full text-[12px] resize-none outline-none border rounded-lg px-2.5 py-1.5 leading-relaxed transition-all placeholder:text-muted-foreground/45 ${
          audioMuted
            ? 'bg-muted/30 border-border/50 text-muted-foreground opacity-60'
            : 'bg-card border-border/70 text-foreground focus:border-accent'
        }`}
        value={audioText}
        rows={2}
        placeholder={i18n.t('editor.audioTextPlaceholder') || 'Text audio înregistrat...'}
        onChange={(e) => setAudioText(e.target.value)}
        onSelect={audioAskAi.onSelect}
        onBlur={handleAudioTextBlur}
        disabled={audioMuted}
      />

      {audioMuted && (
        <p className="mt-1 text-[10.5px] italic text-muted-foreground leading-tight flex items-center gap-1">
          <span>📢</span>
          <span>
            {i18n.t('editor.audioMutedFallbackNotice') || 'Textul audio este silențios. La redare se va citi titlul.'}
          </span>
        </p>
      )}
    </div>
  );
}
