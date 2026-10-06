import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Gauge,
  Globe,
  Pause,
  Play,
  Square,
  User,
  Volume2,
  X,
} from 'lucide-react';
import React from 'react';
import { i18n } from '#imports';
import { getDefaultVoiceForModel, isVoiceAvailableForModel, type TTSModelId } from '@/core/capture/voice/tts-voices';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/components/ui/tooltip';
import { SUPPORTED_TTS_LANGUAGES, testSpeakVoice, type useTextToVoice } from './useTextToVoice';

export type TextToVoiceReturn = ReturnType<typeof useTextToVoice>;

interface TextToVoiceBarProps {
  voice: TextToVoiceReturn;
  totalSteps: number;
  onClose?: () => void;
  compact?: boolean;
}

const SPEED_OPTIONS = [
  { value: '0.75', label: '0.75x' },
  { value: '1', label: '1.0x' },
  { value: '1.25', label: '1.25x' },
  { value: '1.5', label: '1.5x' },
  { value: '2', label: '2.0x' },
];

export default function TextToVoiceBar({ voice, totalSteps, onClose, compact = false }: TextToVoiceBarProps) {
  const {
    isPlaying,
    isPaused,
    activeStepIndex,
    speed,
    setSpeed,
    selectedLang,
    setSelectedLang,
    selectedVoiceURI,
    setSelectedVoiceURI,
    ttsModel,
    setTtsModel,
    omnirouteTtsModel,
    playbackStatus,
    allVoices,
    filteredVoices,
    googleVoice,
    googleVoices,
    aiVoices,
    groqVoices,
    elevenLabsVoices,
    hasElevenLabsKey,
    play,
    pause,
    resume,
    stop,
    next,
    prev,
  } = voice;

  const currentStepDisplay = activeStepIndex !== null ? activeStepIndex + 1 : isPlaying ? 1 : null;

  const selectedLangPrefix = selectedLang.split('-')[0].toLowerCase();

  const handleModelChange = (newModel: TTSModelId) => {
    setTtsModel(newModel);
    if (!isVoiceAvailableForModel(selectedVoiceURI, newModel, omnirouteTtsModel)) {
      const fallback = getDefaultVoiceForModel(newModel, selectedLang, allVoices, omnirouteTtsModel);
      if (fallback) setSelectedVoiceURI(fallback);
    }
  };

  const handleVoiceChange = (newUri: string) => {
    setSelectedVoiceURI(newUri);
    if (newUri.startsWith('elevenlabs:')) {
      if (
        ttsModel !== 'eleven-multilingual-v2' &&
        ttsModel !== 'eleven-flash-v2-5' &&
        ttsModel !== 'eleven-turbo-v2-5'
      ) {
        setTtsModel('eleven-multilingual-v2');
      }
    } else if (newUri.startsWith('groq:')) {
      if (ttsModel !== 'groq') setTtsModel('groq');
    } else if (newUri.startsWith('openai:')) {
      if (ttsModel !== 'tts-1' && ttsModel !== 'tts-1-hd') setTtsModel('tts-1');
    } else if (newUri.startsWith('google:')) {
      if (newUri.startsWith('google:journey')) {
        if (ttsModel !== 'google-journey') setTtsModel('google-journey');
      } else if (['google:aoede', 'google:charon', 'google:fenrir', 'google:kore', 'google:puck'].includes(newUri)) {
        if (ttsModel !== 'gemini-live' && ttsModel !== 'omniroute-gemini') setTtsModel('gemini-live');
      } else if (newUri.startsWith('google:studio')) {
        if (ttsModel !== 'google-neural2') setTtsModel('google-neural2');
      } else {
        if (ttsModel !== 'google') setTtsModel('google');
      }
    } else {
      if (ttsModel !== 'browser') setTtsModel('browser');
    }
  };

  const isGroqLanguageIncompatible =
    (ttsModel === 'groq' || selectedVoiceURI.startsWith('groq:')) && !selectedLang.toLowerCase().startsWith('en');

  const visibleGoogleVoice =
    googleVoice && isVoiceAvailableForModel(googleVoice.id, ttsModel, omnirouteTtsModel) ? googleVoice : null;

  const availableFilteredVoices = filteredVoices.filter((v) =>
    isVoiceAvailableForModel(v.voiceURI, ttsModel, omnirouteTtsModel),
  );

  const availableGoogleVoices = (googleVoices || []).filter(
    (v) => isVoiceAvailableForModel(v.id, ttsModel, omnirouteTtsModel) && v.id !== googleVoice?.id,
  );

  const availableAiVoices = aiVoices.filter((v) => isVoiceAvailableForModel(v.id, ttsModel, omnirouteTtsModel));

  const availableOtherSystemVoices = allVoices.filter(
    (v) => !filteredVoices.includes(v) && isVoiceAvailableForModel(v.voiceURI, ttsModel, omnirouteTtsModel),
  );

  React.useEffect(() => {
    if (selectedVoiceURI && !isVoiceAvailableForModel(selectedVoiceURI, ttsModel, omnirouteTtsModel)) {
      const fallback = getDefaultVoiceForModel(ttsModel, selectedLang, allVoices, omnirouteTtsModel);
      if (fallback) {
        setSelectedVoiceURI(fallback);
      }
    }
  }, [selectedVoiceURI, ttsModel, omnirouteTtsModel, selectedLang, allVoices, setSelectedVoiceURI]);

  const isGoogleVoice = selectedVoiceURI.startsWith('google:');
  const isAiVoice = selectedVoiceURI.startsWith('openai:');
  const isGroqVoice = selectedVoiceURI.startsWith('groq:');
  const isElevenLabsVoice = selectedVoiceURI.startsWith('elevenlabs:');
  const activeAiVoice = aiVoices.find((v) => v.id === selectedVoiceURI);
  const activeGoogleVoice = googleVoices?.find((v) => v.id === selectedVoiceURI);
  const activeGroqVoice = (groqVoices || []).find((v) => v.id === selectedVoiceURI);
  const activeElevenLabsVoice = (elevenLabsVoices || []).find((v) => v.id === selectedVoiceURI);
  const activeSystemVoice =
    allVoices.find((v) => v.voiceURI === selectedVoiceURI && v.lang.toLowerCase().startsWith(selectedLangPrefix)) ||
    allVoices.find((v) => v.voiceURI === selectedVoiceURI) ||
    availableFilteredVoices[0] ||
    filteredVoices[0];

  const activeVoiceName = isElevenLabsVoice
    ? `ElevenLabs: ${activeElevenLabsVoice?.name || selectedVoiceURI.replace('elevenlabs:', '')}`
    : isGroqVoice
      ? `Groq: ${activeGroqVoice?.name || selectedVoiceURI.replace('groq:', '')}`
      : isGoogleVoice
        ? activeGoogleVoice?.name || googleVoice?.name || 'Google Nativ'
        : isAiVoice
          ? `AI: ${activeAiVoice?.name || 'Alloy'}`
          : activeSystemVoice?.name || googleVoice?.name || 'Voce';

  const playbackControls = (
    <div className="flex items-center gap-1 shrink-0">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={prev}
            disabled={activeStepIndex === null || activeStepIndex <= 0}
            className="p-1 rounded-md hover:bg-card text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label={i18n.t('common.previous')}
          >
            <ChevronLeft size={15} />
          </button>
        </TooltipTrigger>
        <TooltipContent>{i18n.t('common.previous')}</TooltipContent>
      </Tooltip>

      {!isPlaying || isPaused ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => (isPaused ? resume() : play())}
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent text-white hover:bg-accent/90 shadow-xs transition-transform active:scale-95"
              aria-label={i18n.t('editor.playGuide')}
            >
              <Play size={13} className="ml-0.5 fill-current" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{isPaused ? i18n.t('editor.resumeVoice') : i18n.t('editor.playGuide')}</TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={pause}
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent text-white hover:bg-accent/90 shadow-xs transition-transform active:scale-95"
              aria-label={i18n.t('editor.pauseVoice')}
            >
              <Pause size={13} className="fill-current" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{i18n.t('editor.pauseVoice')}</TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={next}
            disabled={activeStepIndex === null || activeStepIndex >= totalSteps - 1}
            className="p-1 rounded-md hover:bg-card text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label={i18n.t('common.next')}
          >
            <ChevronRight size={15} />
          </button>
        </TooltipTrigger>
        <TooltipContent>{i18n.t('common.next')}</TooltipContent>
      </Tooltip>

      {(isPlaying || isPaused) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={stop}
              className="p-1 rounded-md hover:bg-card text-muted-foreground hover:text-destructive transition-colors"
              aria-label={i18n.t('editor.stopVoice')}
            >
              <Square size={13} className="fill-current" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{i18n.t('editor.stopVoice')}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );

  const progressElement = (
    <div className="flex-1 min-w-0 text-center px-1">
      {currentStepDisplay !== null ? (
        <div className="flex flex-col items-center justify-center leading-tight">
          <span className="text-[12px] font-semibold text-foreground truncate block">
            {i18n.t('editor.voiceStepProgress', [String(currentStepDisplay), String(totalSteps)])}
          </span>
          {playbackStatus && (
            <span
              className={`text-[10px] font-mono px-1 py-0.2 rounded truncate max-w-[130px] sm:max-w-[170px] ${
                playbackStatus.isFallback ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-accent'
              }`}
              title={
                playbackStatus.isFallback
                  ? `${playbackStatus.error || 'Fallback'} -> ${playbackStatus.engineLabel} (${playbackStatus.voiceName})`
                  : `${playbackStatus.engineLabel}${playbackStatus.model ? ` (${playbackStatus.model})` : ''} · ${playbackStatus.voiceName}`
              }
            >
              {playbackStatus.isFallback ? '⚠️ ' : '⚡ '}
              {playbackStatus.engineLabel.split(' ')[0]}
              {playbackStatus.model ? ` · ${playbackStatus.model}` : ''}
            </span>
          )}
        </div>
      ) : (
        <span className="text-[11px] text-muted-foreground truncate block">
          {totalSteps} {totalSteps === 1 ? i18n.t('editor.step') : i18n.t('editor.steps')}
        </span>
      )}
    </div>
  );

  const engineSelector = (
    <div className="w-full min-w-0">
      <Select value={ttsModel} onValueChange={(val) => handleModelChange(val as TTSModelId)}>
        <SelectTrigger
          className="h-7 text-[11px] px-2 gap-1.5 border-border bg-card w-full truncate font-medium"
          title={`Motor TTS: ${ttsModel}`}
        >
          <Cpu size={12} className="text-muted-foreground shrink-0" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectItem value="browser" className="text-[12px]">
            💻 Browser (Local)
          </SelectItem>
          <SelectItem value="eleven-multilingual-v2" className="text-[12px]">
            ✨ ElevenLabs Multilingual
          </SelectItem>
          <SelectItem value="eleven-flash-v2-5" className="text-[12px]">
            ⚡ ElevenLabs Flash
          </SelectItem>
          <SelectItem value="eleven-turbo-v2-5" className="text-[12px]">
            🚀 ElevenLabs Turbo
          </SelectItem>
          <SelectItem value="groq" className="text-[12px]">
            ⚡ Groq LPU (Orpheus)
          </SelectItem>
          <SelectItem value="google" className="text-[12px]">
            🌌 Google Nativ
          </SelectItem>
          <SelectItem value="gemini-live" className="text-[12px]">
            🧠 Gemini DeepMind
          </SelectItem>
          <SelectItem value="google-journey" className="text-[12px]">
            🎭 Google Journey
          </SelectItem>
          <SelectItem value="google-neural2" className="text-[12px]">
            🔊 Google Studio
          </SelectItem>
          <SelectItem value="tts-1" className="text-[12px]">
            🤖 OpenAI TTS
          </SelectItem>
          <SelectItem value="tts-1-hd" className="text-[12px]">
            💎 OpenAI HD
          </SelectItem>
          <SelectItem value="omniroute" className="text-[12px]">
            🔌 OmniRoute
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const voiceSelector = (
    <div className="flex items-center gap-1 min-w-0 w-full flex-1">
      <div className="flex-1 min-w-0">
        <Select
          value={selectedVoiceURI || (activeSystemVoice ? activeSystemVoice.voiceURI : googleVoice?.id || '')}
          onValueChange={handleVoiceChange}
        >
          <SelectTrigger
            className="h-7 text-[11px] px-2 gap-1.5 border-border bg-card w-full truncate"
            title={activeVoiceName}
          >
            <User size={12} className="text-muted-foreground shrink-0" />
            <SelectValue placeholder="Voce">{activeVoiceName}</SelectValue>
          </SelectTrigger>
          <SelectContent align="start" className="max-w-[320px] max-h-[320px]">
            {/* Matching Language Voices */}
            {filteredVoices.length > 0 && (
              <>
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  🌟 Voci locale (Browser) în limba selectată
                </div>
                {visibleGoogleVoice && (
                  <SelectItem
                    key={visibleGoogleVoice.id}
                    value={visibleGoogleVoice.id}
                    className="text-[11px] font-medium text-accent truncate"
                  >
                    ⚡ {visibleGoogleVoice.name}
                  </SelectItem>
                )}
                {filteredVoices.map((v) => (
                  <SelectItem key={v.voiceURI} value={v.voiceURI} className="text-[11px] truncate">
                    {v.name}
                  </SelectItem>
                ))}
              </>
            )}

            {/* ElevenLabs Ultra-Realistic Voices */}
            {(elevenLabsVoices || []).length > 0 && (
              <>
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1 border-t border-border/50">
                  ✨ Voci ElevenLabs Ultra-Realiste
                </div>
                {(elevenLabsVoices || []).map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-[11px] truncate">
                    {v.name} ({v.description.split('(')[0].trim()})
                  </SelectItem>
                ))}
              </>
            )}

            {/* Groq LPU Voices */}
            {(groqVoices || []).length > 0 && (
              <>
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1 border-t border-border/50">
                  ⚡ Voci Groq LPU
                </div>
                {(groqVoices || []).map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-[11px] truncate">
                    {v.name} ({v.description.split('(')[0].trim()})
                  </SelectItem>
                ))}
              </>
            )}

            {/* Google & Gemini Voices */}
            {(googleVoices || []).length > 0 && (
              <>
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1 border-t border-border/50">
                  🌌 Voci Google & Gemini
                </div>
                {(googleVoices || []).map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-[11px] truncate">
                    {v.name}
                  </SelectItem>
                ))}
              </>
            )}

            {/* AI Studio Voices (OpenAI TTS) */}
            {aiVoices.length > 0 && (
              <>
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1 border-t border-border/50">
                  🤖 Voci AI Studio (OpenAI)
                </div>
                {aiVoices.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-[11px] truncate">
                    {v.name} ({v.description.split(',')[0]})
                  </SelectItem>
                ))}
              </>
            )}

            {/* Other System Voices */}
            {allVoices.filter((v) => !filteredVoices.includes(v)).length > 0 && (
              <>
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1 border-t border-border/50">
                  💻 Alte voci de sistem
                </div>
                {allVoices
                  .filter((v) => !filteredVoices.includes(v))
                  .map((v) => (
                    <SelectItem key={v.voiceURI} value={v.voiceURI} className="text-[11px] truncate">
                      {v.name} ({v.lang})
                    </SelectItem>
                  ))}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Test Voice Sample Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() =>
              void testSpeakVoice(activeSystemVoice, selectedVoiceURI, selectedLang, speed, {
                ttsModel,
                omnirouteTtsModel,
              })
            }
            className="p-1 h-7 rounded-md text-muted-foreground hover:text-accent hover:bg-card border border-border/60 transition-colors shrink-0 flex items-center justify-center px-1.5"
            aria-label="Ascultă mostră"
          >
            <Volume2 size={13} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Ascultă mostră voce</TooltipContent>
      </Tooltip>
    </div>
  );

  const langSelector = (
    <div className="w-full min-w-0">
      <Select value={selectedLang} onValueChange={setSelectedLang}>
        <SelectTrigger className="h-7 text-[11px] px-1.5 gap-1 border-border bg-card w-full truncate font-medium">
          <Globe size={11} className="text-muted-foreground shrink-0" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {SUPPORTED_TTS_LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code} className="text-[12px]">
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const speedSelector = (
    <div className="shrink-0">
      <Select value={String(speed)} onValueChange={(val) => setSpeed(parseFloat(val))}>
        <SelectTrigger className="h-7 text-[11px] px-1.5 gap-1 border-border bg-card font-medium">
          <Gauge size={11} className="text-muted-foreground shrink-0" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {SPEED_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-[12px]">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const warningsDisplay =
    isGroqLanguageIncompatible || ((isElevenLabsVoice || ttsModel.startsWith('eleven')) && !hasElevenLabsKey) ? (
      <div className="flex flex-wrap items-center gap-1.5 w-full pt-1">
        {isGroqLanguageIncompatible && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium shrink-0 cursor-help border border-amber-500/30">
                <AlertTriangle size={11} className="shrink-0 text-amber-500" />
                <span>Groq: doar EN</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] text-[11px] leading-snug p-2.5 shadow-md">
              <p className="font-bold text-amber-500 mb-1 flex items-center gap-1">
                <AlertTriangle size={13} /> Model Groq exclusiv în Engleză
              </p>
              <p>
                Modelul Groq Orpheus a fost conceput exclusiv pentru limba engleză. Pentru pronunție nativă fluentă în
                limba selectată, selectați <strong>Google Nativ</strong> sau <strong>Browser</strong>.
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {(isElevenLabsVoice || ttsModel.startsWith('eleven')) && !hasElevenLabsKey && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-400 font-medium shrink-0 cursor-help border border-red-500/30">
                <AlertTriangle size={11} className="shrink-0 text-red-500" />
                <span>ElevenLabs: Cheie lipsă</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] text-[11px] leading-snug p-2.5 shadow-md">
              <p className="font-bold text-red-500 mb-1 flex items-center gap-1">
                <AlertTriangle size={13} /> Cheie API ElevenLabs Necesară
              </p>
              <p>
                Pentru a reda vocea ElevenLabs, adăugați cheia API în{' '}
                <strong>Setări (⚙️) &rarr; Model Audio &amp; Calitate</strong>.
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    ) : null;

  const closeButton = onClose ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => {
            stop();
            onClose();
          }}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors shrink-0"
          aria-label={i18n.t('common.close')}
        >
          <X size={15} />
        </button>
      </TooltipTrigger>
      <TooltipContent>{i18n.t('common.close')}</TooltipContent>
    </Tooltip>
  ) : null;

  if (compact) {
    return (
      <div className="flex flex-col gap-2 p-2.5 bg-secondary/90 backdrop-blur border border-border rounded-xl shadow-sm text-foreground transition-all w-full min-w-0">
        {/* Row 1: Playback Controls, Step Progress, Speed & Close */}
        <div className="flex items-center justify-between gap-1 w-full min-w-0">
          <div className="flex items-center gap-1 shrink-0">{playbackControls}</div>

          <div className="flex items-center justify-center flex-1 min-w-0 px-1 text-center">
            <span className="text-[11px] font-semibold text-foreground truncate">
              {currentStepDisplay !== null
                ? i18n.t('editor.voiceStepProgress', [String(currentStepDisplay), String(totalSteps)])
                : `${totalSteps} ${totalSteps === 1 ? i18n.t('editor.step') : i18n.t('editor.steps')}`}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {speedSelector}
            {closeButton}
          </div>
        </div>

        {/* Row 2: Motor TTS & Limba in 2-column grid */}
        <div className="grid grid-cols-[1fr_80px] gap-1.5 w-full min-w-0 pt-1.5 border-t border-border/50">
          {engineSelector}
          {langSelector}
        </div>

        {/* Row 3: Voce selector with sample test button */}
        <div className="flex items-center gap-1.5 w-full min-w-0">{voiceSelector}</div>

        {/* Row 4: Status / Fallback badge if active */}
        {playbackStatus && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono truncate px-0.5">
            <span
              className={`truncate ${
                playbackStatus.isFallback ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-accent'
              }`}
              title={
                playbackStatus.isFallback
                  ? `${playbackStatus.error || 'Fallback'} -> ${playbackStatus.engineLabel} (${playbackStatus.voiceName})`
                  : `${playbackStatus.engineLabel}${playbackStatus.model ? ` (${playbackStatus.model})` : ''} · ${playbackStatus.voiceName}`
              }
            >
              {playbackStatus.isFallback ? '⚠️ ' : '⚡ '}
              {playbackStatus.engineLabel.split(' ')[0]}
              {playbackStatus.model ? ` · ${playbackStatus.model}` : ''}
              {' · '}
              {playbackStatus.voiceName}
            </span>
          </div>
        )}

        {/* Warnings if any */}
        {warningsDisplay}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 p-3 bg-secondary/90 backdrop-blur border border-border rounded-xl shadow-sm text-foreground transition-all w-full min-w-0">
      {/* Row 1: Brand / Title, Playback, Progress & Actions */}
      <div className="flex items-center justify-between gap-3 w-full min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent/10 text-accent shrink-0">
            <Volume2 size={16} />
          </div>
          <span className="text-[13px] font-semibold text-foreground hidden sm:inline">
            {i18n.t('editor.textToVoice')}
          </span>
          <div className="hidden sm:block h-4 w-px bg-border/60 mx-0.5" />
          {playbackControls}
        </div>

        {progressElement}

        <div className="flex items-center gap-1.5 shrink-0">
          {speedSelector}
          {closeButton}
        </div>
      </div>

      {/* Row 2: Motor TTS, Voce selector, Limba */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full min-w-0 pt-2 border-t border-border/50">
        <div className="w-[160px] shrink-0">{engineSelector}</div>
        <div className="flex-1 min-w-[180px]">{voiceSelector}</div>
        <div className="w-[95px] shrink-0">{langSelector}</div>
      </div>

      {/* Row 3: Warnings if any */}
      {warningsDisplay}
    </div>
  );
}
