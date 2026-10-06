import { Camera, Check, EyeOff, Loader2, Mic, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { browser, i18n } from '#imports';
import { LiveSpeechSession } from '@/core/capture/voice/live-speech';
import { deleteStep, getScreenshotsForSteps, getStepsForGuide, updateStepNarration } from '@/core/guides/service';
import type { Screenshot, Step } from '@/core/guides/types';
import { getActiveTab, localStorage } from '@/lib/browser-api';
import { sendMessage } from '@/lib/messaging';
import type { PanelVoiceUpdate } from '@/lib/port';
import { extractDomain } from '@/lib/utils';
import { Button } from '@/ui/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/components/ui/tooltip';
import ScreenshotView from '@/ui/shared/ScreenshotView';
import MicToggle from './MicToggle';
import VoiceStatus from './VoiceStatus';

interface RecordingViewProps {
  guideId: string;
  onStop: () => void;
  voice: PanelVoiceUpdate;
}

function timeAgo(createdAt: number): string {
  const diff = Math.floor((Date.now() - createdAt) / 1000);
  if (diff < 3) return i18n.t('recording.justNow');
  if (diff < 60) return i18n.t('recording.secondsAgo', [String(diff)]);
  return i18n.t('recording.minutesAgo', [String(Math.floor(diff / 60))]);
}

interface LiveStep {
  step: Step;
  screenshot?: Screenshot;
}

export default function RecordingView({ guideId, onStop, voice }: RecordingViewProps) {
  const [steps, setSteps] = useState<LiveStep[]>([]);
  const [siteUrl, setSiteUrl] = useState('');
  const [isBlurring, setIsBlurring] = useState(false);
  const [capturingPage, setCapturingPage] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [, setTick] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadSteps = useCallback(async () => {
    const allSteps = await getStepsForGuide(guideId);
    const screenshotIds = allSteps.map((s) => s.screenshotId).filter(Boolean) as string[];
    const screenshotMap = await getScreenshotsForSteps(screenshotIds);

    setSteps(
      allSteps.map((step) => ({
        step,
        screenshot: screenshotMap.get(step.id),
      })),
    );

    if (allSteps.length > 0 && !siteUrl) {
      setSiteUrl(allSteps[0].url || '');
    }
  }, [guideId, siteUrl]);

  useEffect(() => {
    loadSteps();
    const interval = setInterval(loadSteps, 800);
    return () => clearInterval(interval);
  }, [loadSteps]);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (steps.length === 0) return;
    const scroll = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    scroll();
    const t = setTimeout(scroll, 300);
    return () => clearTimeout(t);
  }, [steps.length]);

  useEffect(() => {
    getActiveTab().then((tab) => {
      if (tab?.url) setSiteUrl(tab.url);
    });
  }, []);

  useEffect(() => {
    if (import.meta.env.BROWSER === 'firefox') return;
    localStorage.get(['voiceEnabled']).then((stored) => setVoiceEnabled(stored.voiceEnabled === true));
  }, []);

  useEffect(() => {
    if (voice.phase !== 'error' || voice.reason !== 'permission-denied') return;
    setVoiceEnabled(false);
    void localStorage.set({ voiceEnabled: false });
  }, [voice.phase, voice.reason]);

  const [liveTranscript, setLiveTranscript] = useState('');
  const speechSessionRef = useRef<LiveSpeechSession | null>(null);
  const stepsRef = useRef<LiveStep[]>([]);
  stepsRef.current = steps;

  useEffect(() => {
    if (!voiceEnabled) {
      if (speechSessionRef.current) {
        speechSessionRef.current.stop();
        speechSessionRef.current = null;
        setLiveTranscript('');
      }
      return;
    }

    localStorage.get(['voiceLanguage', 'uiLanguage']).then((res) => {
      const lang = (res.voiceLanguage as string) || (res.uiLanguage === 'ro' ? 'ro-RO' : 'ro-RO');
      const session = new LiveSpeechSession(lang, (interim, finals) => {
        const text = interim || (finals.length > 0 ? finals[finals.length - 1] : '');
        setLiveTranscript(text);

        if (finals.length > 0) {
          const currentSteps = stepsRef.current;
          if (currentSteps.length > 0) {
            const latestStep = currentSteps[currentSteps.length - 1].step;
            const fullSpoken = finals.join('. ');
            void updateStepNarration(latestStep.id, fullSpoken);
          }
        }
      });
      session.start();
      speechSessionRef.current = session;
    });

    return () => {
      if (speechSessionRef.current) {
        speechSessionRef.current.stop();
        speechSessionRef.current = null;
      }
    };
  }, [voiceEnabled]);

  const handleFinish = useCallback(async () => {
    if (speechSessionRef.current) {
      const segments = speechSessionRef.current.stop();
      if (segments.length > 0 && stepsRef.current.length > 0) {
        const latestStep = stepsRef.current[stepsRef.current.length - 1].step;
        const fullSpoken = segments.map((s) => s.text).join('. ');
        await updateStepNarration(latestStep.id, fullSpoken);
      }
      speechSessionRef.current = null;
    }
    onStop();
  }, [onStop]);

  const handleBlur = useCallback(async () => {
    await sendMessage('enterBlurMode', undefined);
    setIsBlurring(true);
  }, []);

  const handleCaptureCurrentPage = useCallback(async () => {
    if (capturingPage) return;
    setCapturingPage(true);
    try {
      const tab = await getActiveTab();
      await sendMessage('capturePage', { guideId, title: tab?.title });
      await loadSteps();
    } catch (err) {
      console.error('Failed to capture page', err);
    } finally {
      setCapturingPage(false);
    }
  }, [guideId, capturingPage, loadSteps]);

  useEffect(() => {
    const handler = (changes: Record<string, { newValue?: unknown }>) => {
      if ('mimikBlurMode' in changes && changes.mimikBlurMode.newValue === false) {
        setIsBlurring(false);
      }
    };
    browser.storage.onChanged.addListener(handler);
    return () => browser.storage.onChanged.removeListener(handler);
  }, []);

  const handleDeleteStep = useCallback(
    async (stepId: string) => {
      await deleteStep(guideId, stepId);
      await loadSteps();
    },
    [guideId, loadSteps],
  );

  const _domain = extractDomain(siteUrl);
  return (
    <div className="flex flex-col h-screen bg-card relative">
      {/* Floating recording pill */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-border shadow-sm">
        <span className={`w-2 h-2 rounded-full ${isBlurring ? 'bg-accent' : 'bg-destructive animate-pulse'}`} />
        <span className="text-xs font-semibold text-foreground">
          {isBlurring
            ? i18n.t('recording.capturePaused')
            : steps.length === 1
              ? i18n.t('recording.recording', [String(steps.length)])
              : i18n.t('recording.recordingPlural', [String(steps.length)])}
        </span>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto pt-12">
        {steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <svg width="64" height="64" viewBox="0 0 200 200" fill="none">
              <rect x="30" y="105" width="140" height="68" rx="5" fill="#00357e" />
              <path d="M30 105 L30 90 Q30 70, 100 70 Q170 70, 170 90 L170 105 Z" fill="#002b65" />
              <rect x="30" y="103" width="140" height="3" fill="#b3cef0" />
              <path d="M68 132 Q76 122 84 132" stroke="#b3cef0" strokeWidth="5" fill="none" strokeLinecap="round" />
              <path d="M116 132 Q124 122 132 132" stroke="#b3cef0" strokeWidth="5" fill="none" strokeLinecap="round" />
              <path d="M84 148 Q100 158 116 148" stroke="#b3cef0" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <rect x="60" y="38" width="80" height="50" rx="8" fill="#002b65" stroke="#002b65" strokeWidth="2" />
              <circle cx="100" cy="62" r="16" fill="#00357e" stroke="#002b65" strokeWidth="2" />
              <circle cx="100" cy="62" r="9" fill="#080818" />
              <circle cx="100" cy="62" r="4" fill="#b3cef0" opacity="0.4" />
              <rect x="112" y="42" width="18" height="8" rx="3" fill="#b3cef0" opacity="0.7" />
              <circle cx="121" cy="38" r="20" fill="#b3cef0" className="animate-[cam-flash_3s_ease_infinite]" />
              <circle cx="80" cy="42" r="5" fill="#0057c8" />
              <ellipse cx="54" cy="64" rx="10" ry="8" fill="#00357e" />
              <ellipse cx="146" cy="64" rx="10" ry="8" fill="#00357e" />
            </svg>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">{i18n.t('recording.readyTitle')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{i18n.t('recording.readySub')}</p>
            </div>
            <Button
              onClick={handleCaptureCurrentPage}
              disabled={capturingPage}
              variant="outline"
              className="mt-1 h-8 px-3.5 rounded-full text-xs font-semibold gap-1.5 border-accent/60 text-accent hover:bg-accent hover:text-white transition-all shadow-xs"
            >
              {capturingPage ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              {i18n.t('recording.captureStartingPage')}
            </Button>
          </div>
        ) : (
          <div>
            {steps.map((liveStep, idx) => (
              <div key={liveStep.step.id}>
                <div className="px-4 pb-4 group">
                  {liveStep.screenshot && (
                    <div className="mb-2">
                      <ScreenshotView
                        screenshot={liveStep.screenshot}
                        alt={liveStep.step.description}
                        className="shadow-sm"
                        crop
                        animate
                        readOnly
                      />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {liveStep.step.aiPending ? (
                        <p className="flex items-center gap-1.5 text-[13px] font-medium leading-snug text-muted-foreground">
                          <Loader2 size={13} className="animate-spin" />
                          {i18n.t(
                            voice.phase === 'recording' || voice.phase === 'transcribing'
                              ? 'editor.transcribingStepDescription'
                              : 'editor.writingStepDescription',
                          )}
                        </p>
                      ) : (
                        <p className="text-[13px] font-medium leading-snug text-foreground">
                          {liveStep.step.description}
                        </p>
                      )}
                      <span className="text-[10px] text-purple">
                        {timeAgo(liveStep.step.timestamp)} · {extractDomain(liveStep.step.url || siteUrl)}
                      </span>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleDeleteStep(liveStep.step.id)}
                          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity motion-reduce:transition-none p-1 rounded text-border hover:text-destructive"
                        >
                          <X size={13} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent align="end">{i18n.t('recording.deleteStep')}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                {idx < steps.length - 1 && <div className="mx-4 mb-4 h-px bg-border" />}
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Live speech feedback pill */}
      {voiceEnabled && liveTranscript && (
        <div className="px-4 py-2 bg-secondary/90 border-t border-border flex items-center gap-2 text-[12px] text-foreground">
          <Mic size={14} className="text-accent animate-pulse shrink-0" />
          <span className="truncate italic font-medium">"{liveTranscript}"</span>
        </div>
      )}

      {/* Bottom bar */}
      <div className="shrink-0 border-t border-border">
        {import.meta.env.BROWSER !== 'firefox' && <VoiceStatus update={voice} enabled={voiceEnabled} />}
        <div className="px-4 py-2.5 flex items-center gap-2">
          <Button onClick={handleFinish} className="flex-1 h-10 rounded-full font-semibold text-[13px]">
            <Check size={16} strokeWidth={3} />
            {i18n.t('recording.finishRecording')}
          </Button>
          {import.meta.env.BROWSER !== 'firefox' && (
            <MicToggle enabled={voiceEnabled} live={voice.phase === 'recording'} onChange={setVoiceEnabled} />
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleCaptureCurrentPage}
                disabled={capturingPage}
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center transition-colors text-muted-foreground hover:border-accent hover:text-accent hover:bg-secondary disabled:opacity-50"
              >
                {capturingPage ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              </button>
            </TooltipTrigger>
            <TooltipContent>{i18n.t('recording.captureCurrentPage')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="shrink-0">
                <button
                  onClick={handleBlur}
                  disabled={isBlurring}
                  className="w-10 h-10 rounded-full border border-border flex items-center justify-center transition-colors text-muted-foreground hover:border-accent hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <EyeOff size={16} />
                </button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{i18n.t('recording.smartBlur')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onStop}
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center transition-colors text-purple hover:border-destructive/30 hover:text-destructive"
              >
                <X size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent align="end">{i18n.t('recording.discard')}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
