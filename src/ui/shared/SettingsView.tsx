import {
  ArrowLeft,
  Bug,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Globe,
  ImageIcon,
  Loader2,
  Mic,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Target,
  Trash2,
  TriangleAlert,
  Volume2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '#imports';
import { PRESET_LABELS, type PresetKey } from '@/core/blur/regexes';
import {
  AI_PROVIDERS,
  type AIModelOption,
  type AIProviderKey,
  CUSTOM_MODEL_VALUE,
  DEFAULT_OMNIROUTE_BASE_URL,
  isCustomModel,
} from '@/core/capture/ai/models';
import { AI_LANGUAGES, type AILanguageCode } from '@/core/capture/ai/prompts';
import { resolveVoiceApiKey } from '@/core/capture/voice/api-key';
import {
  GOOGLE_TRANSCRIPTION_MODELS,
  GROQ_TRANSCRIPTION_MODELS,
  OMNIROUTE_TRANSCRIPTION_MODELS,
  OPENAI_TRANSCRIPTION_MODELS,
  type VoiceProvider,
} from '@/core/capture/voice/transcribe';
import {
  ELEVENLABS_TTS_VOICES,
  type ElevenLabsTTSVoice,
  fetchElevenLabsVoices,
  GOOGLE_TTS_VOICES,
  GROQ_TTS_VOICES,
  getDefaultVoiceForModel,
  isVoiceAvailableForModel,
  OPENAI_TTS_VOICES,
  sanitizeElevenLabsApiKey,
  TTS_MODELS,
  type TTSModelId,
} from '@/core/capture/voice/tts-voices';
import { type BrandLogo, defaultFooterLine, makeBrandLogo } from '@/core/export/branding';
import { DEFAULT_TARGET_COLOR, TARGET_COLORS } from '@/core/screenshot/types';
import { createTab, getExtensionURL, localStorage } from '@/lib/browser-api';
import {
  getUiLanguageOverride,
  setUiLanguageOverride,
  UI_LANGUAGES,
  type UILanguageCode,
  useLanguage,
} from '@/lib/i18n-override';
import { logger } from '@/lib/logger';
import { sendMessage } from '@/lib/messaging';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/components/ui/select';
import ColorPicker from '@/ui/shared/ColorPicker';
import MicrophonePicker from '@/ui/shared/MicrophonePicker';
import { changedSettings, type SettingsSnapshot } from '@/ui/shared/settings-autosave';
import {
  resolveVoiceDisplayName,
  SUPPORTED_TTS_LANGUAGES,
  type TTSPlaybackStatus,
  testSpeakVoice,
} from './useTextToVoice';

interface SettingsViewProps {
  onBack?: () => void;
}

const SAVE_DEBOUNCE_MS = 400;
const SAVED_BADGE_MS = 1600;

type KeyStatus = 'checking' | 'valid' | 'rejected' | 'unreachable' | null;

function useKeyCheck() {
  const [status, setStatus] = useState<KeyStatus>(null);
  const validated = useRef('');

  const check = useCallback(async (provider: string, apiKey: string, baseUrl?: string) => {
    const fingerprint = `${provider}:${apiKey}:${baseUrl || ''}`;
    if (validated.current === fingerprint) {
      setStatus('valid');
      return;
    }
    setStatus('checking');
    const result = await sendMessage('validateApiKey', { provider, apiKey, baseUrl }).catch(() => null);
    if (result?.valid) validated.current = fingerprint;
    setStatus(result?.valid ? 'valid' : result?.reason === 'rejected' ? 'rejected' : 'unreachable');
  }, []);

  return { status, setStatus, check };
}

function KeyStatusNote({ status }: { status: KeyStatus }) {
  if (status === 'checking') {
    return <p className="mt-1 text-[11px] text-muted-foreground">{i18n.t('settings.validatingKey')}</p>;
  }
  if (status === 'valid') {
    return (
      <p className="mt-1 text-[11px] flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
        <Check size={11} />
        {i18n.t('settings.keyValid')}
      </p>
    );
  }
  if (status === 'rejected') {
    return (
      <p className="mt-1 text-[11px] text-destructive" role="alert">
        {i18n.t('settings.keyInvalid')}
      </p>
    );
  }
  if (status === 'unreachable') {
    return <p className="mt-1 text-[11px] text-muted-foreground">{i18n.t('settings.keyUnreachable')}</p>;
  }
  return null;
}

const FOOTER_PRESETS = () => [
  defaultFooterLine(),
  i18n.t('settings.footerPresetConfidential'),
  i18n.t('settings.footerPresetNoDistribute'),
];

export default function SettingsView({ onBack }: SettingsViewProps) {
  const [provider, setProvider] = useState<AIProviderKey>('openai');
  const [model, setModel] = useState(AI_PROVIDERS.openai.defaultModel);
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const aiKeyCheck = useKeyCheck();
  const voiceKeyCheck = useKeyCheck();
  const [customModel, setCustomModel] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const savedSnapshot = useRef<SettingsSnapshot | null>(null);
  const pending = useRef<SettingsSnapshot>({});
  const saveTimer = useRef<number | undefined>(undefined);
  const [aiLanguage, setAiLanguage] = useState<AILanguageCode>('en');
  const [omnirouteBaseUrl, setOmnirouteBaseUrl] = useState(DEFAULT_OMNIROUTE_BASE_URL);
  const [discoveredOmniRouteModels, setDiscoveredOmniRouteModels] = useState<AIModelOption[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelFetchMessage, setModelFetchMessage] = useState<string | null>(null);
  useLanguage();
  const [uiLanguage, setUiLanguage] = useState<UILanguageCode>((getUiLanguageOverride() as UILanguageCode) || 'auto');
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>('openai');
  const [voiceModel, setVoiceModel] = useState<string>('gemini-2.5-flash');
  const [voiceApiKey, setVoiceApiKey] = useState('');
  const [voiceMicrophoneId, setVoiceMicrophoneId] = useState('');
  const [isFetchingVoiceModels, setIsFetchingVoiceModels] = useState(false);
  const [voiceModelFetchMessage, setVoiceModelFetchMessage] = useState<string | null>(null);
  const [ttsLanguage, setTtsLanguage] = useState<string>('ro-RO');
  const [ttsVoiceURI, setTtsVoiceURI] = useState<string>('');
  const [ttsSpeed, setTtsSpeed] = useState<number>(1);
  const [ttsModel, setTtsModel] = useState<TTSModelId>('browser');
  const [omnirouteTtsModel, setOmnirouteTtsModel] = useState<string>('gemini-2.5-flash');
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState('');
  const [elevenLabsCustomVoices, setElevenLabsCustomVoices] = useState<ElevenLabsTTSVoice[]>([]);
  const [customVoiceInput, setCustomVoiceInput] = useState('');
  const [isCheckingElevenLabsKey, setIsCheckingElevenLabsKey] = useState(false);
  const [elevenLabsKeyStatus, setElevenLabsKeyStatus] = useState<KeyStatus>(null);
  const [showElevenLabsKey, setShowElevenLabsKey] = useState(false);
  const [elevenLabsErrorMessage, setElevenLabsErrorMessage] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsTestStatus, setTtsTestStatus] = useState<TTSPlaybackStatus | null>(null);
  const [isTestingTts, setIsTestingTts] = useState(false);
  const [targetColor, setTargetColor] = useState<string>(DEFAULT_TARGET_COLOR);
  const [brandLogo, setBrandLogo] = useState<BrandLogo | null>(null);
  const [brandFooter, setBrandFooter] = useState('');
  const [brandAttribution, setBrandAttribution] = useState(true);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [blurPresets, setBlurPresets] = useState<Record<PresetKey, boolean>>({
    email: true,
    phone: true,
    ssn: false,
    creditCard: false,
    ipAddress: false,
    macAddress: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setAvailableVoices(v);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    const timer = setInterval(load, 300);
    const stopTimer = setTimeout(() => clearInterval(timer), 3000);
    return () => {
      clearInterval(timer);
      clearTimeout(stopTimer);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(() => {
    localStorage
      .get([
        'aiApiKey',
        'aiProvider',
        'omnirouteBaseUrl',
        'discoveredOmniRouteModels',
        'aiModel',
        'aiLanguage',
        'uiLanguage',
        'blurPresets',
        'voiceProvider',
        'voiceModel',
        'voiceApiKey',
        'voiceMicrophoneId',
        'ttsLanguage',
        'ttsVoiceURI',
        'ttsSpeed',
        'ttsModel',
        'omnirouteTtsModel',
        'elevenLabsApiKey',
        'targetColor',
        'brandLogo',
        'brandFooter',
        'brandAttribution',
      ])
      .then((result) => {
        const p = (result.aiProvider as AIProviderKey) || 'openai';
        setProvider(p);
        if (result.omnirouteBaseUrl) setOmnirouteBaseUrl(result.omnirouteBaseUrl as string);
        if (Array.isArray(result.discoveredOmniRouteModels)) {
          setDiscoveredOmniRouteModels(result.discoveredOmniRouteModels as AIModelOption[]);
        }
        let m = (result.aiModel as string) || AI_PROVIDERS[p].defaultModel;
        if (p === 'deepseek' && m.startsWith('deepseek-v4')) {
          m = 'deepseek-chat';
        }
        setModel(m);
        if (result.aiApiKey) setApiKey(result.aiApiKey as string);
        if (result.aiLanguage) setAiLanguage(result.aiLanguage as AILanguageCode);
        if (result.uiLanguage) {
          setUiLanguage(result.uiLanguage as UILanguageCode);
          setUiLanguageOverride(result.uiLanguage as string);
        }
        if (result.blurPresets) setBlurPresets(result.blurPresets as Record<PresetKey, boolean>);
        setVoiceProvider((result.voiceProvider as VoiceProvider) || 'openai');
        if (result.voiceModel) setVoiceModel(result.voiceModel as string);
        if (result.voiceApiKey) setVoiceApiKey(result.voiceApiKey as string);
        if (result.voiceMicrophoneId) setVoiceMicrophoneId(result.voiceMicrophoneId as string);
        if (result.ttsLanguage) setTtsLanguage(result.ttsLanguage as string);
        if (result.ttsVoiceURI) setTtsVoiceURI(result.ttsVoiceURI as string);
        if (typeof result.ttsSpeed === 'number') setTtsSpeed(result.ttsSpeed as number);
        if (result.ttsModel) setTtsModel(result.ttsModel as TTSModelId);
        if (result.omnirouteTtsModel) setOmnirouteTtsModel(result.omnirouteTtsModel as string);
        if (result.elevenLabsApiKey) {
          const key = result.elevenLabsApiKey as string;
          setElevenLabsApiKey(key);
          void fetchElevenLabsVoices(key.trim()).then((voices) => {
            if (voices.length > 0) setElevenLabsCustomVoices(voices);
          });
        }
        if (result.targetColor) setTargetColor(result.targetColor as string);
        if (result.brandLogo) setBrandLogo(result.brandLogo as BrandLogo);
        setBrandFooter(typeof result.brandFooter === 'string' ? result.brandFooter : defaultFooterLine());
        if (result.brandAttribution === false) setBrandAttribution(false);
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (!ttsVoiceURI || !isVoiceAvailableForModel(ttsVoiceURI, ttsModel, omnirouteTtsModel)) {
      const validVoice = getDefaultVoiceForModel(ttsModel, ttsLanguage, availableVoices, omnirouteTtsModel);
      setTtsVoiceURI(validVoice);
    }
  }, [loaded, ttsModel, omnirouteTtsModel, ttsLanguage, availableVoices, ttsVoiceURI]);

  const stored = {
    aiApiKey: apiKey,
    aiProvider: provider,
    omnirouteBaseUrl,
    discoveredOmniRouteModels,
    aiModel: model,
    aiLanguage,
    uiLanguage,
    blurPresets,
    voiceProvider,
    voiceModel,
    voiceApiKey,
    voiceMicrophoneId,
    ttsLanguage,
    ttsVoiceURI,
    ttsSpeed,
    ttsModel,
    omnirouteTtsModel,
    elevenLabsApiKey,
    targetColor,
    brandLogo,
    brandFooter,
    brandAttribution,
  };

  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    try {
      await localStorage.set(patch);
      setSaved(true);
    } catch (err) {
      logger.error('Settings autosave failed', err);
      setSaved(false);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const snapshot = savedSnapshot.current;
    if (!snapshot) {
      savedSnapshot.current = stored;
      return;
    }

    const patch = changedSettings(stored, snapshot);
    if (!patch) return;

    savedSnapshot.current = stored;
    Object.assign(pending.current, patch);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
  });

  useEffect(
    () => () => {
      window.clearTimeout(saveTimer.current);
      void flush();
    },
    [flush],
  );

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), SAVED_BADGE_MS);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const handleLogoPick = async (file: File | undefined) => {
    if (!file) return;
    setBrandLogo(await makeBrandLogo(file));
  };

  const handleProviderChange = (newProvider: AIProviderKey) => {
    setProvider(newProvider);
    aiKeyCheck.setStatus(null);
    setCustomModel(false);
    setModel(AI_PROVIDERS[newProvider].defaultModel);
  };

  const handleModelChange = (value: string) => {
    if (value === CUSTOM_MODEL_VALUE) {
      setCustomModel(true);
      setModel('');
      return;
    }
    setCustomModel(false);
    setModel(value);
  };

  const handleRefreshOmniRouteModels = async () => {
    setIsFetchingModels(true);
    setModelFetchMessage(null);
    try {
      const res = await sendMessage('fetchOmniRouteModels', {
        baseUrl: omnirouteBaseUrl,
        apiKey: apiKey.trim() || undefined,
      });
      if (res.success && res.models) {
        setDiscoveredOmniRouteModels(res.models);
        setModelFetchMessage(
          uiLanguage === 'ro'
            ? `Detectat: ${res.models.length} modele (${res.geminiModelsCount} Gemini/Antigravity)`
            : `Detected: ${res.models.length} models (${res.geminiModelsCount} Gemini/Antigravity)`,
        );
      } else {
        setModelFetchMessage(res.error || (uiLanguage === 'ro' ? 'Eroare la conectare' : 'Connection failed'));
      }
    } catch (err) {
      setModelFetchMessage(err instanceof Error ? err.message : 'Error fetching models');
    } finally {
      setIsFetchingModels(false);
    }
  };

  const providerConfig = AI_PROVIDERS[provider];
  const isKnownModel =
    providerConfig.models.some((m) => m.id === model) ||
    (provider === 'omniroute' && discoveredOmniRouteModels.some((m) => m.id === model));
  const usingCustomModel = customModel || (!isKnownModel && Boolean(model.trim()));

  const omnirouteGeminiModels = useMemo(() => {
    if (provider !== 'omniroute') return [];
    const builtIn = providerConfig.models.filter(
      (m) => m.id.toLowerCase().includes('gemini') || m.id.toLowerCase().includes('antigravity'),
    );
    const builtInIds = new Set(builtIn.map((m) => m.id));
    const extra = discoveredOmniRouteModels.filter(
      (m) =>
        (m.id.toLowerCase().includes('gemini') || m.id.toLowerCase().includes('antigravity')) && !builtInIds.has(m.id),
    );
    return [...builtIn, ...extra];
  }, [provider, providerConfig, discoveredOmniRouteModels]);

  const omnirouteOtherModels = useMemo(() => {
    if (provider !== 'omniroute') return [];
    const builtIn = providerConfig.models.filter(
      (m) => !m.id.toLowerCase().includes('gemini') && !m.id.toLowerCase().includes('antigravity'),
    );
    const builtInIds = new Set(builtIn.map((m) => m.id));
    const extra = discoveredOmniRouteModels.filter(
      (m) =>
        !m.id.toLowerCase().includes('gemini') && !m.id.toLowerCase().includes('antigravity') && !builtInIds.has(m.id),
    );
    return [...builtIn, ...extra];
  }, [provider, providerConfig, discoveredOmniRouteModels]);

  const omnirouteTranscriptionDiscovered = useMemo(() => {
    return discoveredOmniRouteModels.filter(
      (m) =>
        m.isAudio ||
        m.id.toLowerCase().includes('whisper') ||
        m.id.toLowerCase().includes('speech') ||
        m.id.toLowerCase().includes('audio') ||
        m.id.toLowerCase().includes('chirp') ||
        m.id.toLowerCase().includes('gemini') ||
        m.id.toLowerCase().includes('antigravity'),
    );
  }, [discoveredOmniRouteModels]);

  const omnirouteTtsDiscovered = useMemo(() => {
    return discoveredOmniRouteModels.filter(
      (m) =>
        m.isTts ||
        m.id.toLowerCase().includes('tts') ||
        m.id.toLowerCase().includes('speech') ||
        m.id.toLowerCase().includes('voice') ||
        m.id.toLowerCase().includes('eleven') ||
        m.id.toLowerCase().includes('gemini'),
    );
  }, [discoveredOmniRouteModels]);

  const handleRefreshOmniRouteVoiceModels = async () => {
    setIsFetchingVoiceModels(true);
    setVoiceModelFetchMessage(null);
    try {
      const res = await sendMessage('fetchOmniRouteModels', {
        baseUrl: omnirouteBaseUrl,
        apiKey: voiceApiKey.trim() || apiKey.trim() || undefined,
      });
      if (res.success && res.models) {
        setDiscoveredOmniRouteModels(res.models);
        const audioCount = res.models.filter(
          (m) =>
            m.isAudio ||
            m.id.toLowerCase().includes('whisper') ||
            m.id.toLowerCase().includes('speech') ||
            m.id.toLowerCase().includes('audio') ||
            m.id.toLowerCase().includes('chirp') ||
            m.id.toLowerCase().includes('gemini') ||
            m.id.toLowerCase().includes('antigravity'),
        ).length;
        setVoiceModelFetchMessage(
          uiLanguage === 'ro'
            ? `Detectat: ${audioCount} modele vocale (${res.geminiModelsCount || 0} Gemini/Antigravity)`
            : `Detected: ${audioCount} voice models (${res.geminiModelsCount || 0} Gemini/Antigravity)`,
        );
      } else {
        setVoiceModelFetchMessage(res.error || (uiLanguage === 'ro' ? 'Eroare la conectare' : 'Connection failed'));
      }
    } catch (err) {
      setVoiceModelFetchMessage(err instanceof Error ? err.message : 'Error fetching voice models');
    } finally {
      setIsFetchingVoiceModels(false);
    }
  };

  const voiceKey = resolveVoiceApiKey({ voiceProvider, voiceApiKey, aiProvider: provider, aiApiKey: apiKey });

  const BLUR_PRESET_I18N: Record<PresetKey, string> = {
    email: 'blurPresets.email',
    phone: 'blurPresets.phoneNumbers',
    ssn: 'blurPresets.ssn',
    creditCard: 'blurPresets.creditCard',
    ipAddress: 'blurPresets.ipAddress',
    macAddress: 'blurPresets.macAddress',
  };

  return (
    <div className="bg-card flex flex-col min-h-full">
      <div className="sticky top-0 bg-card/95 backdrop-blur-sm z-20 flex items-center gap-3 px-4 py-3 border-b border-border shadow-xs">
        {onBack && (
          <button
            onClick={onBack}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <h1 className="text-[15px] font-bold text-foreground">{i18n.t('settings.title')}</h1>
        <span
          aria-live="polite"
          className={`ml-auto flex items-center gap-1 text-[11px] font-semibold transition-opacity duration-300 ${
            saved ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ color: 'var(--color-success)' }}
        >
          <Check size={12} />
          {i18n.t('settings.saved')}
        </span>
      </div>

      <div className="flex-1 px-3 py-4 space-y-3">
        <div className="border border-border rounded-[10px] p-3.5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
              <Sparkles size={14} className="text-accent" />
            </div>
            <span className="text-xs font-bold text-foreground">{i18n.t('settings.aiDescriptions')}</span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-foreground mb-1">
              {i18n.t('settings.provider')}
            </label>
            <Select value={provider} onValueChange={(v) => handleProviderChange(v as AIProviderKey)}>
              <SelectTrigger className="w-full rounded-lg px-3 py-2 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AI_PROVIDERS).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-foreground mb-1">{i18n.t('settings.model')}</label>
            <Select value={usingCustomModel ? CUSTOM_MODEL_VALUE : model} onValueChange={handleModelChange}>
              <SelectTrigger className="w-full rounded-lg px-3 py-2 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {provider === 'omniroute' ? (
                  <>
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                      🌌 {i18n.t('settings.omnirouteGeminiGroup')}
                    </div>
                    {omnirouteGeminiModels.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-[12px]">
                        {m.label}
                      </SelectItem>
                    ))}
                    {omnirouteOtherModels.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1 border-t border-border/50">
                          🌐 {i18n.t('settings.omnirouteOtherGroup')}
                        </div>
                        {omnirouteOtherModels.map((m) => (
                          <SelectItem key={m.id} value={m.id} className="text-[12px]">
                            {m.label}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {providerConfig.models.filter((m) => m.tier === 'simple').length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          ⚡ {uiLanguage === 'ro' ? 'Modele Simple & Rapide' : 'Simple & Fast Models'}
                        </div>
                        {providerConfig.models
                          .filter((m) => m.tier === 'simple')
                          .map((m) => (
                            <SelectItem key={m.id} value={m.id} className="text-[12px]">
                              {m.label}
                            </SelectItem>
                          ))}
                      </>
                    )}
                    {providerConfig.models.filter((m) => m.tier === 'advanced').length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1 border-t border-border/50">
                          🧠 {uiLanguage === 'ro' ? 'Modele Avansate & Reasoning' : 'Advanced & Reasoning Models'}
                        </div>
                        {providerConfig.models
                          .filter((m) => m.tier === 'advanced')
                          .map((m) => (
                            <SelectItem key={m.id} value={m.id} className="text-[12px]">
                              {m.label}
                            </SelectItem>
                          ))}
                      </>
                    )}
                    {providerConfig.models.filter((m) => !m.tier).length > 0 &&
                      providerConfig.models
                        .filter((m) => !m.tier)
                        .map((m) => (
                          <SelectItem key={m.id} value={m.id} className="text-[12px]">
                            {m.label}
                          </SelectItem>
                        ))}
                  </>
                )}
                <div className="mt-1 border-t border-border/50">
                  <SelectItem value={CUSTOM_MODEL_VALUE}>{i18n.t('settings.modelCustom')}</SelectItem>
                </div>
              </SelectContent>
            </Select>
            {usingCustomModel && (
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={providerConfig.defaultModel}
                aria-label={i18n.t('settings.modelCustom')}
                className="mt-1.5 h-9 text-[12px] rounded-lg border-border"
              />
            )}
          </div>

          {provider === 'omniroute' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-foreground">
                  {i18n.t('settings.omnirouteBaseUrl')}
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isFetchingModels}
                  onClick={handleRefreshOmniRouteModels}
                  className="h-6 px-2 text-[11px] text-accent hover:text-accent/80 hover:bg-secondary flex items-center gap-1 font-medium"
                >
                  <RefreshCw size={11} className={isFetchingModels ? 'animate-spin' : ''} />
                  <span>{i18n.t('settings.omnirouteDetectModels')}</span>
                </Button>
              </div>
              <Input
                value={omnirouteBaseUrl}
                onChange={(e) => {
                  setOmnirouteBaseUrl(e.target.value);
                  aiKeyCheck.setStatus(null);
                }}
                placeholder={DEFAULT_OMNIROUTE_BASE_URL}
                className="h-9 text-[12px] font-mono rounded-lg border-border"
              />
              {modelFetchMessage && (
                <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
                  <span>{modelFetchMessage}</span>
                </p>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">
                {i18n.t('settings.omnirouteBaseUrlHint')}
              </p>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-foreground mb-1">
              {i18n.t('settings.apiKey')}{' '}
              {provider === 'omniroute' && (
                <span className="text-muted-foreground font-normal">
                  ({uiLanguage === 'ro' ? 'opțional' : 'optional'})
                </span>
              )}
            </label>
            <div className="flex items-center gap-1.5">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  aiKeyCheck.setStatus(null);
                }}
                placeholder={
                  provider === 'omniroute'
                    ? i18n.t('settings.apiKeyOptional')
                    : provider === 'groq'
                      ? 'gsk_...'
                      : provider === 'anthropic'
                        ? 'sk-ant-...'
                        : 'sk-...'
                }
                className="h-9 text-[12px] rounded-lg border-border"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={(!apiKey && provider !== 'omniroute') || aiKeyCheck.status === 'checking'}
                onClick={() => void aiKeyCheck.check(provider, apiKey, omnirouteBaseUrl)}
                className="h-9 shrink-0 rounded-lg bg-card text-[11px] font-semibold flex items-center gap-1.5"
              >
                {aiKeyCheck.status === 'checking' && <Loader2 size={12} className="animate-spin text-accent" />}
                <span>{i18n.t('settings.checkKey')}</span>
              </Button>
            </div>
            <KeyStatusNote status={aiKeyCheck.status} />
            {!apiKey.trim() && provider !== 'omniroute' && (
              <p className="mt-1.5 flex items-start gap-1.5 text-[10px] text-destructive leading-relaxed" role="alert">
                <TriangleAlert size={11} className="shrink-0 mt-0.5" />
                <span>{i18n.t('settings.aiNoKey')}</span>
              </p>
            )}
            {!apiKey.trim() && provider === 'omniroute' && (
              <p className="mt-1.5 flex items-start gap-1.5 text-[10px] text-muted-foreground leading-relaxed">
                <Sparkles size={11} className="shrink-0 mt-0.5 text-accent" />
                <span>{i18n.t('settings.omnirouteKeyOptional')}</span>
              </p>
            )}
            {provider === 'groq' && (
              <p className="mt-1.5 flex items-start gap-1.5 text-[10px] text-muted-foreground leading-relaxed">
                <Sparkles size={11} className="shrink-0 mt-0.5 text-accent" />
                <span>
                  {uiLanguage === 'ro' ? (
                    <>
                      Obține o cheie gratuită și ultra-rapidă de pe{' '}
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent underline font-medium"
                      >
                        console.groq.com
                      </a>{' '}
                      (LPU ~1000 tok/sec).
                    </>
                  ) : (
                    <>
                      Get a free, ultra-fast API key at{' '}
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent underline font-medium"
                      >
                        console.groq.com
                      </a>{' '}
                      (LPU ~1000 tok/sec).
                    </>
                  )}
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-foreground mb-1">
              <Globe size={11} className="inline mr-1 -mt-px" />
              {i18n.t('settings.aiLanguage')}
            </label>
            <Select value={aiLanguage} onValueChange={(v) => setAiLanguage(v as AILanguageCode)}>
              <SelectTrigger className="w-full rounded-lg px-3 py-2 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border border-border rounded-[10px] p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Globe size={14} className="text-accent" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-foreground">{i18n.t('settings.uiLanguage')}</div>
            </div>
          </div>
          <Select
            value={uiLanguage}
            onValueChange={(v) => {
              const code = v as UILanguageCode;
              setUiLanguage(code);
              setUiLanguageOverride(code);
            }}
          >
            <SelectTrigger className="w-[180px] rounded-lg px-3 py-1.5 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UI_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code} className="text-[12px]">
                  {lang.code === 'auto' ? i18n.t('settings.uiLanguageAuto') : lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border border-border rounded-[10px] p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-accent" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-foreground">
                {uiLanguage === 'ro' ? 'Ghid introductiv' : 'Welcome Tour'}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {uiLanguage === 'ro'
                  ? 'Deschide turul de configurare și prezentare'
                  : 'Re-open the welcome setup and onboarding guide'}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void createTab({ url: getExtensionURL('/onboarding.html') });
            }}
            className="text-[12px] h-9 px-3 rounded-lg"
          >
            {uiLanguage === 'ro' ? 'Deschide' : 'Open'}
          </Button>
        </div>

        <div className="border border-border rounded-[10px] p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Target size={14} className="text-accent" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-foreground">{i18n.t('settings.targetColor')}</div>
              <div className="text-[11px] text-muted-foreground">{i18n.t('settings.targetColorHint')}</div>
            </div>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 shrink-0 border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground hover:border-accent"
              >
                <span
                  className="w-[22px] h-[22px] rounded-full border border-foreground/15"
                  style={{ backgroundColor: targetColor }}
                />
                <code className="tabular-nums">{targetColor.toUpperCase()}</code>
                <ChevronDown size={12} className="opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2.5">
              <ColorPicker value={targetColor} presets={TARGET_COLORS} onChange={setTargetColor} />
            </PopoverContent>
          </Popover>
        </div>

        <div className="border border-border rounded-[10px] p-3.5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
              <ImageIcon size={14} className="text-accent" />
            </div>
            <span className="text-xs font-bold text-foreground">{i18n.t('settings.branding')}</span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-foreground mb-1">
              {i18n.t('settings.brandLogo')}
            </label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => handleLogoPick(e.target.files?.[0])}
            />
            <div className="flex items-center gap-2.5">
              {brandLogo && (
                <img
                  src={brandLogo.dataUrl}
                  alt=""
                  className="h-9 max-w-[92px] object-contain rounded border border-border bg-secondary p-1"
                />
              )}
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="border border-border rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:border-accent transition-colors"
              >
                {brandLogo ? i18n.t('settings.replaceLogo') : i18n.t('settings.uploadLogo')}
              </button>
              {brandLogo && (
                <button
                  onClick={() => setBrandLogo(null)}
                  aria-label={i18n.t('settings.removeLogo')}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-foreground mb-1">
              {i18n.t('settings.footerLine')}
            </label>
            <Input
              value={brandFooter}
              onChange={(e) => setBrandFooter(e.target.value)}
              placeholder={i18n.t('settings.footerLinePlaceholder')}
              className="h-9 text-[12px] rounded-lg border-border"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {FOOTER_PRESETS().map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBrandFooter(preset)}
                  className={`px-2 py-1 rounded-md border text-[10px] transition-colors ${
                    brandFooter === preset
                      ? 'border-accent text-accent'
                      : 'border-border text-muted-foreground hover:border-accent hover:text-foreground'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-[11px] font-semibold text-foreground">{i18n.t('settings.attribution')}</div>
            <button
              onClick={() => setBrandAttribution((prev) => !prev)}
              className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                brandAttribution ? 'bg-accent' : 'bg-border'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  brandAttribution ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="border border-border rounded-[10px] p-3.5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
              <Mic size={14} className="text-accent" />
            </div>
            <span className="text-xs font-bold text-foreground">{i18n.t('settings.voiceNarration')}</span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-foreground mb-1">
              {i18n.t('settings.provider')}
            </label>
            <select
              value={voiceProvider}
              onChange={(e) => {
                const nextProvider = e.target.value as VoiceProvider;
                setVoiceProvider(nextProvider);
                voiceKeyCheck.setStatus(null);
                if (nextProvider === 'openai') {
                  if (!OPENAI_TRANSCRIPTION_MODELS.some((m) => m.id === voiceModel)) {
                    setVoiceModel('whisper-1');
                  }
                } else if (nextProvider === 'groq') {
                  if (!GROQ_TRANSCRIPTION_MODELS.some((m) => m.id === voiceModel)) {
                    setVoiceModel('whisper-large-v3');
                  }
                } else if (nextProvider === 'google') {
                  if (!GOOGLE_TRANSCRIPTION_MODELS.some((m) => m.id === voiceModel)) {
                    setVoiceModel('gemini-2.5-flash');
                  }
                } else if (nextProvider === 'omniroute') {
                  if (!OMNIROUTE_TRANSCRIPTION_MODELS.some((m) => m.id === voiceModel)) {
                    setVoiceModel('gemini-2.5-flash');
                  }
                }
              }}
              className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-foreground bg-card font-medium outline-none focus:border-ring focus:ring-2 focus:ring-ring/10"
            >
              <option value="web-speech">
                {uiLanguage === 'ro'
                  ? '⚡ Browser Web Speech (Simplu / Gratuit / Zero latență)'
                  : '⚡ Browser Web Speech (Simple / Free / Instant)'}
              </option>
              <option value="google">
                {uiLanguage === 'ro'
                  ? '✨ Google Gemini & Cloud Speech (Transcriere Nativă)'
                  : '✨ Google Gemini & Cloud Speech (Native Transcription)'}
              </option>
              <option value="omniroute">
                {uiLanguage === 'ro'
                  ? '🌐 OmniRoute (Google Gemini, Speech & Whisper Gateway)'
                  : '🌐 OmniRoute (Google Gemini, Speech & Whisper Gateway)'}
              </option>
              <option value="groq">
                {uiLanguage === 'ro'
                  ? '🧠 Groq Whisper Large v3 (Avansat & Gratuit)'
                  : '🧠 Groq Whisper Large v3 (Advanced & Free)'}
              </option>
              <option value="openai">
                {uiLanguage === 'ro'
                  ? '🧠 OpenAI Whisper-1 (Avansat / Studio)'
                  : '🧠 OpenAI Whisper-1 (Advanced / Studio)'}
              </option>
              <option value="deepseek">
                {uiLanguage === 'ro'
                  ? '🧠 DeepSeek (Avansat Polishing AI + Web Speech)'
                  : '🧠 DeepSeek (Advanced AI Polish + Web Speech)'}
              </option>
            </select>
          </div>

          {voiceProvider === 'omniroute' && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-foreground">
                    {i18n.t('settings.omnirouteBaseUrl')}
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    disabled={isFetchingVoiceModels}
                    onClick={() => void handleRefreshOmniRouteVoiceModels()}
                    className="h-6 px-2 text-[11px] text-accent hover:text-accent/80 hover:bg-secondary flex items-center gap-1 font-medium"
                  >
                    <RefreshCw size={11} className={isFetchingVoiceModels ? 'animate-spin' : ''} />
                    <span>{i18n.t('settings.omnirouteDetectVoiceModels')}</span>
                  </Button>
                </div>
                <Input
                  value={omnirouteBaseUrl}
                  onChange={(e) => {
                    setOmnirouteBaseUrl(e.target.value);
                    voiceKeyCheck.setStatus(null);
                  }}
                  placeholder={DEFAULT_OMNIROUTE_BASE_URL}
                  className="h-9 text-[12px] font-mono rounded-lg border-border"
                />
                {voiceModelFetchMessage && (
                  <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
                    <span>{voiceModelFetchMessage}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">
                  {i18n.t('settings.omnirouteTranscriptionModel')}
                </label>
                <select
                  value={voiceModel || 'gemini-2.5-flash'}
                  onChange={(e) => setVoiceModel(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-foreground bg-card font-medium outline-none focus:border-ring focus:ring-2 focus:ring-ring/10"
                >
                  <optgroup
                    label={
                      uiLanguage === 'ro'
                        ? '🌌 Google Gemini & Speech (via OmniRoute)'
                        : '🌌 Google Gemini & Speech (via OmniRoute)'
                    }
                  >
                    {OMNIROUTE_TRANSCRIPTION_MODELS.filter(
                      (m) => m.id.includes('gemini') || m.id.includes('chirp') || m.id.includes('google'),
                    ).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup
                    label={uiLanguage === 'ro' ? '🎙️ OpenAI Whisper & Alte Modele' : '🎙️ OpenAI Whisper & Other Models'}
                  >
                    {OMNIROUTE_TRANSCRIPTION_MODELS.filter(
                      (m) => !m.id.includes('gemini') && !m.id.includes('chirp') && !m.id.includes('google'),
                    ).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </optgroup>
                  {omnirouteTranscriptionDiscovered.length > 0 && (
                    <optgroup
                      label={
                        uiLanguage === 'ro' ? '🔍 Modele Detectate din OmniRoute' : '🔍 Discovered OmniRoute Models'
                      }
                    >
                      {omnirouteTranscriptionDiscovered
                        .filter((m) => !OMNIROUTE_TRANSCRIPTION_MODELS.some((builtIn) => builtIn.id === m.id))
                        .map((m) => (
                          <option key={`disc-audio-${m.id}`} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  {!OMNIROUTE_TRANSCRIPTION_MODELS.some((m) => m.id === voiceModel) &&
                    !omnirouteTranscriptionDiscovered.some((m) => m.id === voiceModel) &&
                    voiceModel && (
                      <option value={voiceModel}>
                        {voiceModel} ({uiLanguage === 'ro' ? 'Personalizat' : 'Custom'})
                      </option>
                    )}
                </select>
              </div>
            </div>
          )}

          {voiceProvider === 'google' && (
            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1">
                {uiLanguage === 'ro' ? 'Model Transcriere Google' : 'Google Transcription Model'}
              </label>
              <select
                value={voiceModel || 'gemini-2.5-flash'}
                onChange={(e) => setVoiceModel(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-foreground bg-card font-medium outline-none focus:border-ring focus:ring-2 focus:ring-ring/10"
              >
                {GOOGLE_TRANSCRIPTION_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {voiceProvider === 'groq' && (
            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1">
                {uiLanguage === 'ro' ? 'Model Transcriere Groq' : 'Groq Transcription Model'}
              </label>
              <select
                value={voiceModel || 'whisper-large-v3'}
                onChange={(e) => setVoiceModel(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-foreground bg-card font-medium outline-none focus:border-ring focus:ring-2 focus:ring-ring/10"
              >
                {GROQ_TRANSCRIPTION_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} — {m.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {voiceProvider === 'openai' && (
            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1">
                {uiLanguage === 'ro' ? 'Model Transcriere OpenAI' : 'OpenAI Transcription Model'}
              </label>
              <select
                value={voiceModel || 'whisper-1'}
                onChange={(e) => setVoiceModel(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-foreground bg-card font-medium outline-none focus:border-ring focus:ring-2 focus:ring-ring/10"
              >
                {OPENAI_TRANSCRIPTION_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} — {m.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {voiceProvider !== 'web-speech' && voiceProvider !== 'deepseek' ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-foreground">
                  {uiLanguage === 'ro' ? 'Cheie API Narațiune Vocală' : 'Voice Narration API Key'}
                  {(voiceProvider === 'omniroute' || voiceProvider === 'google') && (
                    <span className="text-muted-foreground font-normal">
                      {' '}
                      ({uiLanguage === 'ro' ? 'opțional' : 'optional'})
                    </span>
                  )}
                </label>
                {voiceApiKey && (
                  <span className="text-[10px] text-accent font-medium">
                    {uiLanguage === 'ro' ? 'Cheie dedicată activă' : 'Dedicated key active'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="password"
                  value={voiceApiKey}
                  onChange={(e) => {
                    setVoiceApiKey(e.target.value);
                    voiceKeyCheck.setStatus(null);
                  }}
                  placeholder={
                    voiceProvider === 'omniroute'
                      ? i18n.t('settings.apiKeyOptional')
                      : voiceProvider === 'google'
                        ? uiLanguage === 'ro'
                          ? 'Cheie API Google Gemini / Cloud (opțională)'
                          : 'Google Gemini / Cloud API key (optional)'
                        : voiceProvider === 'groq'
                          ? apiKey
                            ? uiLanguage === 'ro'
                              ? 'gsk_... (opțional, folosește cheia AI)'
                              : 'gsk_... (optional, uses AI key)'
                            : 'gsk_...'
                          : apiKey
                            ? uiLanguage === 'ro'
                              ? 'sk-... (opțional, folosește cheia AI)'
                              : 'sk-... (optional, uses AI key)'
                            : 'sk-...'
                  }
                  className="h-9 text-[12px] rounded-lg border-border"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    (!voiceApiKey && voiceProvider !== 'omniroute' && voiceProvider !== 'google') ||
                    voiceKeyCheck.status === 'checking'
                  }
                  onClick={() => void voiceKeyCheck.check(voiceProvider, voiceApiKey, omnirouteBaseUrl)}
                  className="h-9 shrink-0 rounded-lg bg-card text-[11px] font-semibold flex items-center gap-1.5"
                >
                  {voiceKeyCheck.status === 'checking' && <Loader2 size={12} className="animate-spin text-accent" />}
                  <span>{i18n.t('settings.checkKey')}</span>
                </Button>
              </div>
              <KeyStatusNote status={voiceKeyCheck.status} />
              {voiceKey.source === 'voice' && voiceApiKey.trim() && (
                <p className="mt-1.5 flex items-start gap-1.5 text-[10px] text-accent leading-relaxed">
                  <Check size={11} className="shrink-0 mt-0.5 text-accent" />
                  <span>
                    {uiLanguage === 'ro'
                      ? 'Se utilizează cheia dedicată separată pentru narațiune vocală.'
                      : 'Using the dedicated separate API key for voice narration.'}
                  </span>
                </p>
              )}
              {voiceKey.source === 'ai' && !voiceApiKey.trim() && (
                <p className="mt-1.5 flex items-start gap-1.5 text-[10px] text-muted-foreground leading-relaxed">
                  <Sparkles size={11} className="shrink-0 mt-0.5 text-accent" />
                  <span>
                    {voiceProvider === 'groq'
                      ? uiLanguage === 'ro'
                        ? 'Se folosește cheia Groq configurată la Descrieri AI. Puteți introduce mai sus o cheie separată dacă doriți.'
                        : 'Using the Groq key from AI Descriptions above. You can enter a dedicated key above if desired.'
                      : uiLanguage === 'ro'
                        ? `${i18n.t('settings.voiceUsingAiKey')} Puteți introduce mai sus o cheie separată pentru narațiune.`
                        : `${i18n.t('settings.voiceUsingAiKey')} You can enter a separate key above for narration.`}
                  </span>
                </p>
              )}
              {voiceKey.source === 'none' && voiceProvider !== 'omniroute' && voiceProvider !== 'google' && (
                <p
                  className="mt-1.5 flex items-start gap-1.5 text-[10px] text-destructive leading-relaxed"
                  role="alert"
                >
                  <TriangleAlert size={11} className="shrink-0 mt-0.5" />
                  <span>{i18n.t('settings.voiceNoKey')}</span>
                </p>
              )}
              {voiceProvider === 'omniroute' && !voiceApiKey.trim() && (
                <p className="mt-1.5 flex items-start gap-1.5 text-[10px] text-muted-foreground leading-relaxed">
                  <Sparkles size={11} className="shrink-0 mt-0.5 text-accent" />
                  <span>{i18n.t('settings.omnirouteKeyOptional')}</span>
                </p>
              )}
              {voiceProvider === 'google' && !voiceApiKey.trim() && (
                <p className="mt-1.5 flex items-start gap-1.5 text-[10px] text-muted-foreground leading-relaxed">
                  <Sparkles size={11} className="shrink-0 mt-0.5 text-accent" />
                  <span>
                    {uiLanguage === 'ro'
                      ? 'Opțional: dacă nu introduceți o cheie, Ghideon va folosi gratuit motorul Google Speech nativ din browser.'
                      : 'Optional: if no API key is set, Ghideon will use the free native Google Speech engine in the browser.'}
                  </span>
                </p>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-secondary text-[11px] text-muted-foreground flex items-start gap-2">
              <Sparkles size={13} className="shrink-0 mt-0.5 text-accent" />
              <span>
                {uiLanguage === 'ro'
                  ? 'Transcrierea se realizează gratuit direct în browser prin Web Speech API, fără nicio cheie necesară. Dacă este configurat DeepSeek sau alt AI, pașii vor fi finisați și structurați automat.'
                  : 'Audio transcription is performed for free directly in the browser via Web Speech API. If DeepSeek or another AI is configured, steps will be polished and structured automatically.'}
              </span>
            </div>
          )}

          {import.meta.env.BROWSER !== 'firefox' && (
            <MicrophonePicker value={voiceMicrophoneId} onChange={setVoiceMicrophoneId} />
          )}
        </div>

        {/* Text-to-Voice Settings Card */}
        <div className="border border-border rounded-[10px] p-3.5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
              <Volume2 size={14} className="text-accent" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">
                {uiLanguage === 'ro' ? 'Redare vocală (Text-to-Voice)' : 'Text-to-Voice (Read Aloud)'}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {uiLanguage === 'ro'
                  ? 'Alege modelul audio, vocea și viteza preferată pentru citirea ghidurilor'
                  : 'Choose audio model, voice, and reading speed for guides'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-foreground mb-1">
              {uiLanguage === 'ro' ? 'Model Audio & Calitate' : 'Audio Model & Quality'}
            </label>
            <select
              value={ttsModel}
              onChange={(e) => {
                const nextModel = e.target.value as TTSModelId;
                setTtsModel(nextModel);
                let nextOmni = omnirouteTtsModel;
                if (nextModel === 'omniroute-gemini' && (!nextOmni || !nextOmni.toLowerCase().includes('gemini'))) {
                  nextOmni = 'gemini-2.5-flash';
                  setOmnirouteTtsModel(nextOmni);
                } else if (nextModel === 'omniroute' && (!nextOmni || nextOmni.toLowerCase().includes('gemini'))) {
                  nextOmni = 'tts-1';
                  setOmnirouteTtsModel(nextOmni);
                }
                if (!isVoiceAvailableForModel(ttsVoiceURI, nextModel, nextOmni)) {
                  setTtsVoiceURI(getDefaultVoiceForModel(nextModel, ttsLanguage, availableVoices, nextOmni));
                }
              }}
              className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-foreground bg-card font-medium outline-none focus:border-ring focus:ring-2 focus:ring-ring/10"
            >
              {TTS_MODELS.map((modelCfg) => (
                <option key={modelCfg.id} value={modelCfg.id}>
                  {modelCfg.label} — {modelCfg.description}
                </option>
              ))}
            </select>
          </div>

          {ttsModel === 'omniroute-gemini' && (
            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1">
                {uiLanguage === 'ro' ? 'Model Gemini (via OmniRoute)' : 'Gemini Model (via OmniRoute)'}
              </label>
              <select
                value={omnirouteTtsModel || 'gemini-2.5-flash'}
                onChange={(e) => {
                  const nextOmni = e.target.value;
                  setOmnirouteTtsModel(nextOmni);
                  if (!isVoiceAvailableForModel(ttsVoiceURI, ttsModel, nextOmni)) {
                    setTtsVoiceURI(getDefaultVoiceForModel(ttsModel, ttsLanguage, availableVoices, nextOmni));
                  }
                }}
                className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-foreground bg-card font-medium outline-none focus:border-ring focus:ring-2 focus:ring-ring/10"
              >
                <optgroup
                  label={uiLanguage === 'ro' ? '🌌 Google Gemini (Audio Speech)' : '🌌 Google Gemini (Audio Speech)'}
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash Audio (⚡ Recomandat)</option>
                  <option value="gemini-live">Gemini Multimodal Live Speech</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash Audio</option>
                </optgroup>
                {omnirouteTtsDiscovered.filter(
                  (m) => m.id.toLowerCase().includes('gemini') || m.id.toLowerCase().includes('antigravity'),
                ).length > 0 && (
                  <optgroup label={uiLanguage === 'ro' ? '🔍 Modele Gemini Detectate' : '🔍 Discovered Gemini Models'}>
                    {omnirouteTtsDiscovered
                      .filter(
                        (m) =>
                          (m.id.toLowerCase().includes('gemini') || m.id.toLowerCase().includes('antigravity')) &&
                          !['gemini-2.5-flash', 'gemini-live', 'gemini-2.0-flash'].includes(m.id),
                      )
                      .map((m) => (
                        <option key={`tts-disc-${m.id}`} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                  </optgroup>
                )}
                {!['gemini-2.5-flash', 'gemini-live', 'gemini-2.0-flash'].includes(omnirouteTtsModel) &&
                  !omnirouteTtsDiscovered.some((m) => m.id === omnirouteTtsModel) &&
                  omnirouteTtsModel?.toLowerCase().includes('gemini') && (
                    <option value={omnirouteTtsModel}>
                      {omnirouteTtsModel} ({uiLanguage === 'ro' ? 'Personalizat' : 'Custom'})
                    </option>
                  )}
              </select>
            </div>
          )}

          {ttsModel === 'omniroute' && (
            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1">
                {uiLanguage === 'ro' ? 'Model OpenAI TTS (via OmniRoute)' : 'OpenAI TTS Model (via OmniRoute)'}
              </label>
              <select
                value={omnirouteTtsModel || 'tts-1'}
                onChange={(e) => {
                  const nextOmni = e.target.value;
                  setOmnirouteTtsModel(nextOmni);
                  if (!isVoiceAvailableForModel(ttsVoiceURI, ttsModel, nextOmni)) {
                    setTtsVoiceURI(getDefaultVoiceForModel(ttsModel, ttsLanguage, availableVoices, nextOmni));
                  }
                }}
                className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-foreground bg-card font-medium outline-none focus:border-ring focus:ring-2 focus:ring-ring/10"
              >
                <optgroup label={uiLanguage === 'ro' ? '🤖 OpenAI Studio TTS' : '🤖 OpenAI Studio TTS'}>
                  <option value="tts-1">OpenAI TTS-1 (⚡ Rapid / Standard)</option>
                  <option value="tts-1-hd">OpenAI TTS-1-HD (🧠 Avansat / Calitate Studio)</option>
                </optgroup>
                {omnirouteTtsDiscovered.filter(
                  (m) => !m.id.toLowerCase().includes('gemini') && !m.id.toLowerCase().includes('antigravity'),
                ).length > 0 && (
                  <optgroup
                    label={uiLanguage === 'ro' ? '🔍 Modele Detectate din OmniRoute' : '🔍 Discovered OmniRoute Models'}
                  >
                    {omnirouteTtsDiscovered
                      .filter(
                        (m) =>
                          !['tts-1', 'tts-1-hd'].includes(m.id) &&
                          !m.id.toLowerCase().includes('gemini') &&
                          !m.id.toLowerCase().includes('antigravity'),
                      )
                      .map((m) => (
                        <option key={`tts-disc-${m.id}`} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                  </optgroup>
                )}
                {!['tts-1', 'tts-1-hd'].includes(omnirouteTtsModel) &&
                  !omnirouteTtsDiscovered.some((m) => m.id === omnirouteTtsModel) &&
                  omnirouteTtsModel &&
                  !omnirouteTtsModel.toLowerCase().includes('gemini') && (
                    <option value={omnirouteTtsModel}>
                      {omnirouteTtsModel} ({uiLanguage === 'ro' ? 'Personalizat' : 'Custom'})
                    </option>
                  )}
              </select>
            </div>
          )}

          {(ttsModel.startsWith('eleven') || ttsVoiceURI.startsWith('elevenlabs:') || Boolean(elevenLabsApiKey)) && (
            <div className="p-3 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold text-foreground">
                  {uiLanguage === 'ro' ? 'Cheie API ElevenLabs' : 'ElevenLabs API Key'}
                </label>
                <a
                  href="https://elevenlabs.io/app/settings/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-accent underline flex items-center gap-1 font-medium"
                >
                  elevenlabs.io ↗
                </a>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Input
                    type={showElevenLabsKey ? 'text' : 'password'}
                    value={elevenLabsApiKey}
                    onChange={(e) => {
                      setElevenLabsApiKey(e.target.value);
                      setElevenLabsKeyStatus(null);
                      setElevenLabsErrorMessage(null);
                    }}
                    onBlur={() => {
                      const sanitized = sanitizeElevenLabsApiKey(elevenLabsApiKey);
                      if (sanitized !== elevenLabsApiKey) setElevenLabsApiKey(sanitized);
                    }}
                    placeholder="Cheie API ElevenLabs (ex: 32 caractere)"
                    className="h-9 text-[12px] rounded-lg border-border pr-8 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowElevenLabsKey((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    title={showElevenLabsKey ? 'Ascunde cheia' : 'Arată cheia'}
                  >
                    {showElevenLabsKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!elevenLabsApiKey || isCheckingElevenLabsKey}
                  onClick={async () => {
                    setIsCheckingElevenLabsKey(true);
                    setElevenLabsKeyStatus('checking');
                    setElevenLabsErrorMessage(null);
                    try {
                      const clean = sanitizeElevenLabsApiKey(elevenLabsApiKey);
                      const res = await fetch('https://api.elevenlabs.io/v1/user', {
                        headers: { 'xi-api-key': clean },
                      });
                      if (res.ok) {
                        setElevenLabsKeyStatus('valid');
                        setElevenLabsApiKey(clean);
                        await localStorage.set({ elevenLabsApiKey: clean });
                        if (savedSnapshot.current) {
                          savedSnapshot.current.elevenLabsApiKey = clean;
                        }
                        delete pending.current.elevenLabsApiKey;
                        const custom = await fetchElevenLabsVoices(clean);
                        if (custom.length > 0) setElevenLabsCustomVoices(custom);
                      } else {
                        setElevenLabsKeyStatus('rejected');
                        const data = await res.json().catch(() => null);
                        const msg =
                          data?.detail?.message || data?.detail?.status || data?.message || `Eroare HTTP ${res.status}`;
                        setElevenLabsErrorMessage(msg);
                      }
                    } catch (err) {
                      setElevenLabsKeyStatus('unreachable');
                      setElevenLabsErrorMessage(err instanceof Error ? err.message : String(err));
                    } finally {
                      setIsCheckingElevenLabsKey(false);
                    }
                  }}
                  className="h-9 shrink-0 rounded-lg bg-card text-[11px] font-semibold flex items-center gap-1.5"
                >
                  {isCheckingElevenLabsKey && <Loader2 size={12} className="animate-spin text-accent" />}
                  <span>{i18n.t('settings.checkKey')}</span>
                </Button>
              </div>
              <KeyStatusNote status={elevenLabsKeyStatus} />
              {elevenLabsErrorMessage && (
                <div className="text-[11px] text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-2 py-1 leading-snug">
                  {elevenLabsErrorMessage}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {uiLanguage === 'ro'
                  ? 'Cheia este un șir alfanumeric (de regulă 32 de caractere) din contul ElevenLabs (Developers -> API Keys). Nu adăugați prefixe precum "xi_" sau "Bearer".'
                  : 'Key is an alphanumeric string (typically 32 chars) from ElevenLabs (Developers -> API Keys). Do not include prefixes like "xi_" or "Bearer".'}
              </p>

              {/* Serban Popescu Romanian Voice Quick-Pick */}
              <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                  <span className="shrink-0">
                    🇷🇴 {uiLanguage === 'ro' ? 'Voce Română nativă:' : 'Native Romanian Voice:'}
                  </span>
                  <span className="font-semibold text-foreground truncate">Șerban Popescu</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTtsVoiceURI('elevenlabs:serban');
                    if (!ttsModel.startsWith('eleven')) setTtsModel('eleven-multilingual-v2');
                  }}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-accent/10 hover:bg-accent/20 text-accent transition-colors shrink-0"
                >
                  {uiLanguage === 'ro' ? 'Alege vocea Șerban' : 'Select Serban Voice'}
                </button>
              </div>

              {/* Custom Voice ID or URL input */}
              <div className="pt-2 border-t border-border/40 space-y-1.5">
                <label className="block text-[11px] font-medium text-muted-foreground">
                  {uiLanguage === 'ro'
                    ? 'Adaugă alt Voice ID sau link ElevenLabs:'
                    : 'Add other ElevenLabs Voice ID or link:'}
                </label>
                <div className="flex items-center gap-1.5 w-full min-w-0">
                  <Input
                    placeholder="ex: 8nBBDfYxYXmDNaqTCxPH sau link elevenlabs..."
                    value={customVoiceInput}
                    onChange={(e) => setCustomVoiceInput(e.target.value)}
                    className="h-8 text-[11px] rounded-lg border-border flex-1 min-w-0"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] shrink-0"
                    disabled={!customVoiceInput.trim()}
                    onClick={() => {
                      let raw = customVoiceInput.trim();
                      const match = raw.match(/elevenlabs\.io\/voices\/([a-zA-Z0-9_-]+)/i);
                      if (match) raw = match[1];
                      raw = raw.replace(/^elevenlabs:/, '').trim();
                      if (raw) {
                        const newVoiceId = `elevenlabs:${raw}`;
                        if (!elevenLabsCustomVoices.some((v) => v.voiceId === raw || v.id === newVoiceId)) {
                          setElevenLabsCustomVoices((prev) => [
                            ...prev,
                            {
                              id: newVoiceId,
                              voiceKey: raw,
                              voiceId: raw,
                              name:
                                raw === '8nBBDfYxYXmDNaqTCxPH'
                                  ? 'Șerban Popescu (Română)'
                                  : `Personalizată (${raw.slice(0, 8)})`,
                              gender: 'male',
                              description: 'Voce personalizată ElevenLabs',
                              provider: 'elevenlabs',
                            },
                          ]);
                        }
                        setTtsVoiceURI(newVoiceId);
                        if (!ttsModel.startsWith('eleven')) setTtsModel('eleven-multilingual-v2');
                        setCustomVoiceInput('');
                      }
                    }}
                  >
                    {uiLanguage === 'ro' ? 'Aplică' : 'Apply'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-foreground mb-1">
              {uiLanguage === 'ro' ? 'Limba vocii' : 'Voice Language'}
            </label>
            <select
              value={ttsLanguage}
              onChange={(e) => {
                const newLang = e.target.value;
                setTtsLanguage(newLang);
                if (!isVoiceAvailableForModel(ttsVoiceURI, ttsModel, omnirouteTtsModel)) {
                  setTtsVoiceURI(getDefaultVoiceForModel(ttsModel, newLang, availableVoices, omnirouteTtsModel));
                }
              }}
              className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-foreground bg-card font-medium outline-none focus:border-ring focus:ring-2 focus:ring-ring/10"
            >
              {SUPPORTED_TTS_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {ttsModel === 'groq' && !ttsLanguage.toLowerCase().startsWith('en') && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
              <span className="text-sm shrink-0">⚠️</span>
              <div className="space-y-0.5">
                <div className="font-semibold">
                  {uiLanguage === 'ro'
                    ? 'Modelul Groq Orpheus este optimizat exclusiv pentru limba Engleză'
                    : 'Groq Orpheus TTS is optimized exclusively for English'}
                </div>
                <div className="text-[11px] opacity-90 leading-relaxed">
                  {uiLanguage === 'ro'
                    ? 'Limba selectată nu este engleza. Groq poate avea dificultăți de pronunție fonetică. Pentru pronunție nativă fluentă în limba selectată, vă recomandăm să alegeți Google Speech Nativ sau Browser Web Speech.'
                    : 'The selected language is not English. Groq may produce unnatural phonetic pronunciation. For native pronunciation, we recommend Google Speech Nativ or Browser Web Speech.'}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-foreground mb-1">
              {uiLanguage === 'ro' ? 'Alege vocea dorită' : 'Choose Voice'}
            </label>
            <div className="flex items-center gap-2 w-full min-w-0">
              <div className="flex-1 min-w-0">
                <select
                  value={ttsVoiceURI}
                  onChange={(e) => {
                    const nextUri = e.target.value;
                    setTtsVoiceURI(nextUri);
                    if (nextUri.startsWith('elevenlabs:')) {
                      if (!ttsModel.startsWith('eleven')) setTtsModel('eleven-multilingual-v2');
                    } else if (nextUri.startsWith('groq:')) {
                      if (ttsModel !== 'groq') setTtsModel('groq');
                    } else if (nextUri.startsWith('openai:')) {
                      if (ttsModel !== 'tts-1' && ttsModel !== 'tts-1-hd') setTtsModel('tts-1');
                    } else if (nextUri.startsWith('google:journey')) {
                      if (ttsModel !== 'google-journey') setTtsModel('google-journey');
                    } else if (nextUri.startsWith('google:studio')) {
                      if (ttsModel !== 'google-neural2') setTtsModel('google-neural2');
                    } else if (
                      nextUri === 'google:aoede' ||
                      nextUri === 'google:charon' ||
                      nextUri === 'google:fenrir' ||
                      nextUri === 'google:kore' ||
                      nextUri === 'google:puck'
                    ) {
                      if (ttsModel !== 'gemini-live' && ttsModel !== 'omniroute-gemini') setTtsModel('gemini-live');
                    }
                  }}
                  className="w-full min-w-0 max-w-full h-9 border border-border rounded-lg px-2.5 text-[12px] text-foreground bg-card font-medium outline-none focus:border-ring focus:ring-2 focus:ring-ring/10 truncate"
                >
                  {/* Google Native / Language Matching Voices */}
                  {(isVoiceAvailableForModel(`google:${ttsLanguage}`, ttsModel, omnirouteTtsModel) ||
                    availableVoices.some(
                      (v) =>
                        isVoiceAvailableForModel(v.voiceURI, ttsModel, omnirouteTtsModel) &&
                        v.lang.toLowerCase().startsWith(ttsLanguage.slice(0, 2).toLowerCase()),
                    )) && (
                    <optgroup
                      label={
                        uiLanguage === 'ro'
                          ? ttsModel === 'browser'
                            ? '🌟 Voci locale în limba selectată'
                            : '🌟 Voci în limba selectată'
                          : '🌟 Language Matching Voices'
                      }
                    >
                      {isVoiceAvailableForModel(`google:${ttsLanguage}`, ttsModel, omnirouteTtsModel) && (
                        <option value={`google:${ttsLanguage}`}>
                          {ttsLanguage.startsWith('ro')
                            ? 'Google Română (Nativă, fără accent)'
                            : `Google ${ttsLanguage} (Native)`}
                        </option>
                      )}
                      {availableVoices
                        .filter(
                          (v) =>
                            isVoiceAvailableForModel(v.voiceURI, ttsModel, omnirouteTtsModel) &&
                            v.lang.toLowerCase().startsWith(ttsLanguage.slice(0, 2).toLowerCase()),
                        )
                        .map((v) => (
                          <option key={v.voiceURI} value={v.voiceURI}>
                            {v.name} ({v.lang})
                          </option>
                        ))}
                    </optgroup>
                  )}

                  {/* Google & Gemini Voices */}
                  {GOOGLE_TTS_VOICES.filter(
                    (v) => isVoiceAvailableForModel(v.id, ttsModel, omnirouteTtsModel) && v.id !== 'google:native',
                  ).length > 0 && (
                    <optgroup label={uiLanguage === 'ro' ? '🌌 Voci Google & Gemini' : '🌌 Google & Gemini Voices'}>
                      {GOOGLE_TTS_VOICES.filter(
                        (v) => isVoiceAvailableForModel(v.id, ttsModel, omnirouteTtsModel) && v.id !== 'google:native',
                      ).map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.gender === 'female' ? 'Feminin' : v.gender === 'male' ? 'Masculin' : 'Neutru'})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* ElevenLabs Ultra-Realistic Voices */}
                  {(() => {
                    const allElevenVoices = [
                      ...ELEVENLABS_TTS_VOICES,
                      ...elevenLabsCustomVoices.filter(
                        (c) => !ELEVENLABS_TTS_VOICES.some((p) => p.voiceId === c.voiceId),
                      ),
                    ].filter((v) => isVoiceAvailableForModel(v.id, ttsModel, omnirouteTtsModel));

                    if (allElevenVoices.length === 0) return null;

                    return (
                      <optgroup
                        label={
                          uiLanguage === 'ro'
                            ? '✨ Voci ElevenLabs Ultra-Realiste'
                            : '✨ ElevenLabs Ultra-Realistic Voices'
                        }
                      >
                        {allElevenVoices.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.gender === 'female' ? 'Feminin' : v.gender === 'male' ? 'Masculin' : 'Neutru'})
                            — ElevenLabs
                          </option>
                        ))}
                      </optgroup>
                    );
                  })()}

                  {/* Groq LPU Voices */}
                  {GROQ_TTS_VOICES.filter((v) => isVoiceAvailableForModel(v.id, ttsModel, omnirouteTtsModel)).length >
                    0 && (
                    <optgroup label={uiLanguage === 'ro' ? '⚡ Voci Groq LPU' : '⚡ Groq LPU Voices'}>
                      {GROQ_TTS_VOICES.filter((v) => isVoiceAvailableForModel(v.id, ttsModel, omnirouteTtsModel)).map(
                        (v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.gender === 'female' ? 'Feminin' : 'Masculin'}) — Groq
                          </option>
                        ),
                      )}
                    </optgroup>
                  )}

                  {/* AI Studio Voices */}
                  {OPENAI_TTS_VOICES.filter((v) => isVoiceAvailableForModel(v.id, ttsModel, omnirouteTtsModel)).length >
                    0 && (
                    <optgroup label={uiLanguage === 'ro' ? '🤖 Voci OpenAI Studio' : '🤖 OpenAI Studio Voices'}>
                      {OPENAI_TTS_VOICES.filter((v) => isVoiceAvailableForModel(v.id, ttsModel, omnirouteTtsModel)).map(
                        (v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.gender === 'female' ? 'Feminin' : v.gender === 'male' ? 'Masculin' : 'Neutru'})
                          </option>
                        ),
                      )}
                    </optgroup>
                  )}

                  {/* All Other System Voices */}
                  {availableVoices.filter(
                    (v) =>
                      isVoiceAvailableForModel(v.voiceURI, ttsModel, omnirouteTtsModel) &&
                      !v.lang.toLowerCase().startsWith(ttsLanguage.slice(0, 2).toLowerCase()),
                  ).length > 0 && (
                    <optgroup label={uiLanguage === 'ro' ? '💻 Alte voci de sistem' : '💻 All System Voices'}>
                      {availableVoices
                        .filter(
                          (v) =>
                            isVoiceAvailableForModel(v.voiceURI, ttsModel, omnirouteTtsModel) &&
                            !v.lang.toLowerCase().startsWith(ttsLanguage.slice(0, 2).toLowerCase()),
                        )
                        .map((v) => (
                          <option key={`sys-${v.voiceURI}`} value={v.voiceURI}>
                            {v.name} ({v.lang})
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={isTestingTts}
                onClick={async () => {
                  setIsTestingTts(true);
                  await flush();
                  const targetVoice = availableVoices.find((v) => v.voiceURI === ttsVoiceURI);
                  try {
                    const status = await testSpeakVoice(targetVoice, ttsVoiceURI, ttsLanguage, ttsSpeed, {
                      ttsModel,
                      omnirouteTtsModel,
                      omnirouteBaseUrl,
                      apiKey,
                      voiceApiKey,
                      elevenLabsApiKey: elevenLabsApiKey.trim(),
                      onStatus: (st) => setTtsTestStatus(st),
                    });
                    if (status) {
                      setTtsTestStatus(status);
                    }
                  } finally {
                    setIsTestingTts(false);
                  }
                }}
                title={uiLanguage === 'ro' ? 'Ascultă mostră audio' : 'Test voice sample'}
                className="h-9 px-3 shrink-0 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 bg-secondary hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
              >
                {isTestingTts ? (
                  <Loader2 size={14} className="shrink-0 animate-spin text-accent" />
                ) : (
                  <Volume2 size={14} className="shrink-0 text-accent" />
                )}
                <span className="shrink-0">
                  {isTestingTts
                    ? uiLanguage === 'ro'
                      ? 'Se testează...'
                      : 'Testing...'
                    : uiLanguage === 'ro'
                      ? 'Test audio'
                      : 'Test voice'}
                </span>
              </Button>
            </div>

            {/* Live Test Status & Verification Feedback */}
            {ttsTestStatus && (
              <div>
                {ttsTestStatus.isFallback ? (
                  <div className="mt-2 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-[11px] flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <TriangleAlert size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>
                        {uiLanguage === 'ro'
                          ? 'Atenție: s-a utilizat voce de rezervă (Fallback)'
                          : 'Warning: Fallback voice was used'}
                      </span>
                    </div>
                    {ttsTestStatus.error && (
                      <div className="text-[10px] font-mono text-amber-800/90 dark:text-amber-300/90 break-words pl-4">
                        {ttsTestStatus.error}
                      </div>
                    )}
                    <div className="text-[11px] text-muted-foreground pl-4">
                      {uiLanguage === 'ro' ? 'Redat prin:' : 'Played via:'}{' '}
                      <strong className="text-foreground font-medium">{ttsTestStatus.engineLabel}</strong> (
                      {ttsTestStatus.voiceName})
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 text-[11px] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Check size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="truncate">
                        <strong>{ttsTestStatus.engineLabel}</strong>
                        {ttsTestStatus.model ? ` (${ttsTestStatus.model})` : ''} · {ttsTestStatus.voiceName} ·{' '}
                        {ttsSpeed}x
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                      {uiLanguage === 'ro' ? 'Verificat' : 'Verified'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-foreground mb-1">
              {uiLanguage === 'ro' ? 'Viteză de citire' : 'Reading Speed'}
            </label>
            <div className="flex items-center gap-1.5">
              {['0.75', '1', '1.25', '1.5', '2'].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setTtsSpeed(parseFloat(rate))}
                  className={`flex-1 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                    ttsSpeed === parseFloat(rate)
                      ? 'border-accent bg-accent/10 text-accent font-semibold'
                      : 'border-border text-muted-foreground hover:border-accent hover:text-foreground'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Active Parameters Inspector */}
          <div className="p-2.5 rounded-lg border border-border/80 bg-secondary/50 text-[11px] space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Sparkles size={11} className="text-accent shrink-0" />
              <span>{uiLanguage === 'ro' ? 'Parametri Activi (Live)' : 'Active Parameters (Live)'}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
              <div>
                <span className="text-muted-foreground">{uiLanguage === 'ro' ? 'Motor:' : 'Engine:'} </span>
                <span className="font-semibold text-foreground">
                  {TTS_MODELS.find((m) => m.id === ttsModel)
                    ?.label.split('(')[0]
                    .trim() || ttsModel}
                </span>
              </div>
              {(ttsModel === 'omniroute' || ttsModel === 'omniroute-gemini') && (
                <div>
                  <span className="text-muted-foreground">{uiLanguage === 'ro' ? 'Model:' : 'Model:'} </span>
                  <span className="font-mono text-[10px] font-semibold text-accent">
                    {omnirouteTtsModel || (ttsModel === 'omniroute-gemini' ? 'gemini-2.5-flash' : 'tts-1')}
                  </span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">{uiLanguage === 'ro' ? 'Limbă:' : 'Language:'} </span>
                <span className="font-semibold text-foreground">
                  {SUPPORTED_TTS_LANGUAGES.find((l) => l.code === ttsLanguage)?.label || ttsLanguage}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">{uiLanguage === 'ro' ? 'Voce:' : 'Voice:'} </span>
                <span className="font-semibold text-foreground truncate block">
                  {resolveVoiceDisplayName(ttsVoiceURI, ttsLanguage, availableVoices)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">{uiLanguage === 'ro' ? 'Viteză:' : 'Speed:'} </span>
                <span className="font-semibold text-foreground">{ttsSpeed}x</span>
              </div>
              {(ttsModel === 'omniroute' || ttsModel === 'omniroute-gemini') && (
                <div className="col-span-2 truncate">
                  <span className="text-muted-foreground">Gateway: </span>
                  <span className="font-mono text-[10px] text-muted-foreground truncate">
                    {omnirouteBaseUrl || DEFAULT_OMNIROUTE_BASE_URL}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border border-border rounded-[10px] p-3.5 space-y-1">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
              <EyeOff size={14} className="text-accent" />
            </div>
            <span className="text-xs font-bold text-foreground">{i18n.t('settings.smartBlur')}</span>
          </div>

          {(Object.keys(PRESET_LABELS) as PresetKey[]).map((key, i, arr) => (
            <div
              key={key}
              className={`flex items-center justify-between py-2 ${i < arr.length - 1 ? 'border-b border-secondary' : ''}`}
            >
              <span className="text-xs font-medium text-foreground">{i18n.t(BLUR_PRESET_I18N[key])}</span>
              <button
                onClick={() =>
                  setBlurPresets((prev) => {
                    const next = { ...prev, [key]: !prev[key] };
                    localStorage.set({ blurPresets: next });
                    return next;
                  })
                }
                className={`w-9 h-5 rounded-full transition-colors relative ${
                  blurPresets[key] ? 'bg-accent' : 'bg-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    blurPresets[key] ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-secondary text-[10px] text-muted-foreground leading-relaxed">
          <Shield size={12} className="shrink-0 mt-0.5 text-accent" />
          <span>{i18n.t('settings.privacyNotice')}</span>
        </div>

        <a
          href="https://github.com/westpoint-io/mimik/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-accent transition-colors"
        >
          <Bug size={13} className="shrink-0" />
          <span>{i18n.t('settings.bugReport')}</span>
        </a>

        <div className="flex items-center gap-3.5 border border-border rounded-[10px] p-3.5">
          <svg width="44" height="44" viewBox="20 55 160 108" className="shrink-0">
            <rect x="30" y="95" width="140" height="68" rx="8" fill="#00357e" />
            <path d="M30 95 L30 80 Q30 58, 100 58 Q170 58, 170 80 L170 95 Z" fill="#002b65" />
            <rect x="30" y="93" width="140" height="3" fill="#b3cef0" />
            <path d="M68 122 Q76 112 84 122" stroke="#b3cef0" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M116 122 Q124 112 132 122" stroke="#b3cef0" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M84 138 Q100 148 116 138" stroke="#b3cef0" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground mb-0.5">{i18n.t('settings.starCtaTitle')}</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
              {i18n.t('settings.starCtaMessage')}
            </p>
            <a
              href="https://github.com/westpoint-io/mimik"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-[10px] font-semibold text-accent hover:bg-accent hover:text-white transition-colors"
            >
              <Star size={11} fill="#FBBF24" className="text-[#FBBF24]" />
              {i18n.t('settings.starOnGithub')}
              <ChevronRight size={11} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
