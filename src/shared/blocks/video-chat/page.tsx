'use client';

import {
  memo,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Space_Grotesk } from 'next/font/google';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Captions,
  ChevronDown,
  Clipboard,
  Coins,
  Copy,
  Download,
  Eraser,
  GitBranch,
  Languages,
  List,
  LoaderCircle,
  MessageSquare,
  NotebookPen,
  Play,
  Search,
  Share2,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { localeNames, locales } from '@/config/locale';
import { LocaleSelector, ThemeToggler } from '@/shared/blocks/common';
import { Button } from '@/shared/components/ui/button';
import { ClaudeCodeLoading } from '@/shared/components/ui/claude-code-loading';
import { Input } from '@/shared/components/ui/input';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Switch } from '@/shared/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { useAppContext } from '@/shared/contexts/app';
import {
  SUPPORTED_AI_MODELS,
  SupportedAIModelId,
  VIDEO_CHAT_DEFAULT_MODEL,
} from '@/shared/lib/ai-models';
import { cn } from '@/shared/lib/utils';
import {
  formatTimestamp,
  parseTimestamp,
} from '@/shared/lib/video-analysis/timestamp';
import { exportTranscript } from '@/shared/lib/video-analysis/transcript';
import { buildYouTubeEmbedUrl } from '@/shared/lib/video-analysis/youtube';
import {
  TranscriptExportFormat,
  TranscriptSegment,
  VideoAnalysisPayload,
  VideoChatAnswer,
  VideoChatCitation,
} from '@/shared/types/video-analysis';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
});

type VideoChatCopy = {
  analyze: string;
  askPlaceholder: string;
  authLanguage: string;
  bilingualCaptions: string;
  captions: string;
  chat: string;
  chatStreaming: string;
  copyReply: string;
  copyReplyFailed: string;
  copyReplySuccess: string;
  copySubtitles: string;
  credits: string;
  downloadSubtitles: string;
  emptyCaptions: string;
  emptyChat: string;
  exportPrompt: string;
  jumpToCurrentSubtitle: string;
  modelLabel: string;
  mindMap: string;
  mindMapBody: string;
  mindMapHeading: string;
  notes: string;
  notesBody: string;
  notesHeading: string;
  prompts: string[];
  searchPlaceholder: string;
  sendFailed: string;
  summary: string;
  summaryEmpty: string;
  summaryHeading: string;
  summaryLoading: string;
  analysisFailed: string;
  translatingCaptions: string;
  translationFailed: string;
};

type VideoChatPageProps = {
  locale: string;
  initialUrl?: string;
};

type Message = {
  role: 'assistant' | 'user';
  text: string;
  timestamps?: string[];
  citations?: VideoChatCitation[];
  isStreaming?: boolean;
};

type SubtitleItem = {
  timestamp: string;
  text: string;
  start: number;
  originalText: string;
  translatedText?: string;
};

type YouTubePlayer = {
  destroy: () => void;
  getCurrentTime: () => number;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
};

type YouTubeNamespace = {
  Player: new (
    element: HTMLIFrameElement,
    options?: {
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
      };
    }
  ) => YouTubePlayer;
  PlayerState: {
    PLAYING: number;
  };
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeIframeApiPromise: Promise<YouTubeNamespace> | null = null;

type ApiEnvelope<T> = {
  code: number;
  message: string;
  data?: T;
};

async function postJson<T>(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || 'request failed');
  }

  return payload.data as T;
}

async function readSseStream(
  response: Response,
  onEvent: (payload: any) => void
) {
  if (!response.body) {
    throw new Error('empty stream response');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), {
      stream: !done,
    });

    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      const lines = event
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      for (const line of lines) {
        if (!line.startsWith('data:')) {
          continue;
        }

        const data = line.slice(5).trim();
        if (!data) {
          continue;
        }

        onEvent(JSON.parse(data));
      }
    }

    if (done) {
      break;
    }
  }
}

function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube iframe API requires a browser'));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeIframeApiPromise) {
    return youtubeIframeApiPromise;
  }

  youtubeIframeApiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    const previousReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();

      if (window.YT?.Player) {
        resolve(window.YT);
        return;
      }

      reject(new Error('YouTube iframe API did not initialize correctly'));
    };

    if (existingScript) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () =>
      reject(new Error('Failed to load YouTube iframe API'));
    document.head.appendChild(script);
  });

  return youtubeIframeApiPromise;
}

function slugify(value: string) {
  return String(value || 'video')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function buildAssistantIntro(
  analysis: VideoAnalysisPayload,
  locale: string,
  userName?: string | null
): Message {
  const overview = analysis.summary.overview?.trim();
  const points = analysis.summary.points
    .slice(0, 4)
    .map((point, index) => {
      const prefix = point.timestamp ? `[${point.timestamp}] ` : '';
      return `${index + 1}. ${prefix}${point.title || point.text}`.trim();
    })
    .join('\n');
  const normalizedLocale = normalizeLocaleLanguage(locale) || 'en';
  const safeUserName = String(userName || '').trim();
  const displayName =
    safeUserName || (normalizedLocale === 'zh' ? '朋友' : 'there');

  const sections =
    normalizedLocale === 'zh'
      ? [
          `Hi，${displayName}，这个视频的内容总结如下：`,
          `${overview || '我先帮你提炼了这段视频最核心的内容。'}`,
          points ? `**你可以先看这几个重点：**\n${points}` : '',
          '如果你对视频里任何部分有疑问，欢迎继续和我讨论。',
        ]
      : [
          `Hi, ${displayName}, here's a polished summary of this video:`,
          ` ${overview || `I've pulled together the most important points for you.`}`,
          points ? `**Here are the key takeaways:**\n${points}` : '',
          `If anything in the video is unclear, feel free to ask and we can go through it together.`,
        ];

  return {
    role: 'assistant',
    text: sections.filter(Boolean).join('\n'),
  };
}

function getSubtitleItems(
  transcript: TranscriptSegment[],
  translatedTexts?: string[]
): SubtitleItem[] {
  return transcript.map((segment, index) => ({
    timestamp: formatTimestamp(segment.start),
    text: translatedTexts?.[index] || segment.text,
    start: segment.start,
    originalText: segment.text,
    translatedText: translatedTexts?.[index],
  }));
}

function findActiveSubtitleIndex(
  transcript: TranscriptSegment[],
  currentTime: number
) {
  if (!transcript.length) return -1;

  for (let index = 0; index < transcript.length; index += 1) {
    const segment = transcript[index];
    const nextStart = transcript[index + 1]?.start;
    const segmentEnd =
      typeof nextStart === 'number' && nextStart > segment.start
        ? nextStart
        : segment.start + Math.max(segment.duration, 0.25);

    if (currentTime >= segment.start && currentTime < segmentEnd) {
      return index;
    }
  }

  if (currentTime < transcript[0].start) {
    return 0;
  }

  return transcript.length - 1;
}

function normalizeLocaleLanguage(value?: string | null) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (!normalized) return null;
  if (normalized === 'zh' || normalized.startsWith('zh-')) return 'zh';
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';

  return null;
}

function getDefaultSubtitleLanguage(
  locale: string,
  analysis?: VideoAnalysisPayload | null
) {
  return (
    normalizeLocaleLanguage(analysis?.videoInfo.language) ||
    normalizeLocaleLanguage(locale) ||
    'en'
  );
}

function getSubtitleCacheKey(analysisId: string, language: string) {
  return `${analysisId}:${normalizeLocaleLanguage(language) || language}`;
}

function parseSummaryTimestamp(value?: string | null) {
  const rawValue = String(value || '').trim();
  if (!rawValue) return null;

  const direct = parseTimestamp(rawValue);
  if (direct !== null) {
    return {
      label: formatTimestamp(direct),
      seconds: direct,
    };
  }

  const firstMatch = rawValue.match(/\d{1,2}:\d{2}(?::\d{2})?/);
  if (!firstMatch) return null;

  const seconds = parseTimestamp(firstMatch[0]);
  if (seconds === null) return null;

  return {
    label: firstMatch[0],
    seconds,
  };
}

function parseChatTimestampReference(value: string) {
  const rawValue = String(value || '').trim();
  if (!rawValue) return null;

  const match = rawValue.match(
    /^\[?((?:\d{1,2}:)?\d{1,2}:\d{1,2})(?:\s*-\s*((?:\d{1,2}:)?\d{1,2}:\d{1,2}))?\]?$/
  );

  if (!match) return null;

  const startSeconds = parseTimestamp(match[1]);
  if (startSeconds === null) return null;

  const endSeconds = match[2] ? parseTimestamp(match[2]) : null;

  return {
    normalized: formatTimestamp(startSeconds),
    seconds: startSeconds,
    label:
      endSeconds === null
        ? formatTimestamp(startSeconds)
        : `${formatTimestamp(startSeconds)}-${formatTimestamp(endSeconds)}`,
  };
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

function buildVideoChatCopy(
  t: ReturnType<typeof useTranslations<'pages.video.chat'>>
): VideoChatCopy {
  return {
    analyze: t('analyze'),
    askPlaceholder: t('askPlaceholder'),
    authLanguage: t('authLanguage'),
    bilingualCaptions: t('bilingualCaptions'),
    captions: t('captions'),
    chat: t('chat'),
    chatStreaming: t('chatStreaming'),
    copyReply: t('copyReply'),
    copyReplyFailed: t('copyReplyFailed'),
    copyReplySuccess: t('copyReplySuccess'),
    copySubtitles: t('copySubtitles'),
    credits: t('credits'),
    downloadSubtitles: t('downloadSubtitles'),
    emptyCaptions: t('emptyCaptions'),
    emptyChat: t('emptyChat'),
    exportPrompt: t('exportPrompt'),
    jumpToCurrentSubtitle: t('jumpToCurrentSubtitle'),
    modelLabel: t('modelLabel'),
    mindMap: t('mindMap'),
    mindMapBody: t('mindMapBody'),
    mindMapHeading: t('mindMapHeading'),
    notes: t('notes'),
    notesBody: t('notesBody'),
    notesHeading: t('notesHeading'),
    prompts: t.raw('prompts') as string[],
    searchPlaceholder: t('searchPlaceholder'),
    sendFailed: t('sendFailed'),
    summary: t('summary'),
    summaryEmpty: t('summaryEmpty'),
    summaryHeading: t('summaryHeading'),
    summaryLoading: t('summaryLoading'),
    analysisFailed: t('analysisFailed'),
    translatingCaptions: t('translatingCaptions'),
    translationFailed: t('translationFailed'),
  };
}

export function VideoChatPage({ locale, initialUrl }: VideoChatPageProps) {
  const t = useTranslations('pages.video.chat');
  const content = useMemo(() => buildVideoChatCopy(t), [t]);
  const { user } = useAppContext();
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const chatScrollAreaRef = useRef<HTMLDivElement | null>(null);
  const hasBootstrappedRef = useRef(false);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const playbackPollingRef = useRef<number | null>(null);
  const chatAutoScrollLockRef = useRef(false);

  const [inputUrl, setInputUrl] = useState(initialUrl || '');
  const [analysisState, setAnalysisState] = useState<
    'idle' | 'submitting' | 'polling' | 'ready' | 'error'
  >(initialUrl ? 'submitting' : 'idle');
  const [analysisId, setAnalysisId] = useState('');
  const [analysis, setAnalysis] = useState<VideoAnalysisPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);
  const [chatInput, setChatInput] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [chatModel, setChatModel] = useState(VIDEO_CHAT_DEFAULT_MODEL);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatAutoFollowEnabled, setIsChatAutoFollowEnabled] = useState(true);
  const [subtitleLanguage, setSubtitleLanguage] = useState(() =>
    getDefaultSubtitleLanguage(locale)
  );
  const [isBilingualCaptions, setIsBilingualCaptions] = useState(false);
  const [translatedSubtitleCache, setTranslatedSubtitleCache] = useState<
    Record<string, string[]>
  >({});
  const [isSubtitleTranslating, setIsSubtitleTranslating] = useState(false);
  const sourceSubtitleLanguage = normalizeLocaleLanguage(
    analysis?.videoInfo.language
  );
  const translatedSubtitleTexts = analysisId
    ? translatedSubtitleCache[getSubtitleCacheKey(analysisId, subtitleLanguage)]
    : undefined;
  const deferredPlaybackTime = useDeferredValue(currentPlaybackTime);
  const subtitleItems = useMemo(
    () => getSubtitleItems(analysis?.transcript || [], translatedSubtitleTexts),
    [analysis?.transcript, translatedSubtitleTexts]
  );
  const activeSubtitleIndex = useMemo(
    () =>
      findActiveSubtitleIndex(analysis?.transcript || [], deferredPlaybackTime),
    [analysis?.transcript, deferredPlaybackTime]
  );
  const videoEmbedUrl = analysis?.videoInfo.videoId
    ? buildYouTubeEmbedUrl(analysis.videoInfo.videoId)
    : null;
  const subtitleLanguages = useMemo(
    () =>
      locales.map((value) => ({
        value,
        label: localeNames[value],
      })),
    []
  );
  const chatInputPlaceholder =
    locale === 'zh'
      ? `${content.askPlaceholder}（Enter 发送，Shift+Enter 换行）`
      : `${content.askPlaceholder} (Enter to send, Shift+Enter for a new line)`;
  const isAnalyzing =
    analysisState === 'submitting' || analysisState === 'polling';
  const chatExportText = useMemo(
    () => chatMessages.map((message) => message.text).join('\n\n'),
    [chatMessages]
  );

  useEffect(() => {
    if (!initialUrl || hasBootstrappedRef.current) return;
    hasBootstrappedRef.current = true;
    void handleAnalyze(initialUrl);
  }, [initialUrl]);

  useEffect(() => {
    if (!analysis) {
      setCurrentPlaybackTime(0);
      setChatMessages([]);
      setChatModel(VIDEO_CHAT_DEFAULT_MODEL);
      setIsChatAutoFollowEnabled(true);
      setTranslatedSubtitleCache({});
      return;
    }

    setCurrentPlaybackTime(analysis.transcript[0]?.start || 0);
    setChatMessages([buildAssistantIntro(analysis, locale, user?.name)]);
    setChatModel(VIDEO_CHAT_DEFAULT_MODEL);
    setIsChatAutoFollowEnabled(true);
  }, [analysis, locale, user?.name]);

  useEffect(() => {
    setSubtitleLanguage(getDefaultSubtitleLanguage(locale));
  }, [locale]);

  useEffect(() => {
    const viewport = chatScrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    );
    if (!viewport) return;

    const isNearBottom = () =>
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 32;

    const handleScroll = () => {
      if (chatAutoScrollLockRef.current) return;
      setIsChatAutoFollowEnabled(isNearBottom());
    };

    handleScroll();
    viewport.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      viewport.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const viewport = chatScrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    );
    if (!viewport || !isChatAutoFollowEnabled) return;

    chatAutoScrollLockRef.current = true;
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: 'auto',
    });

    const timeoutId = window.setTimeout(() => {
      chatAutoScrollLockRef.current = false;
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [chatMessages, isChatAutoFollowEnabled]);

  useEffect(() => {
    function stopPlaybackPolling() {
      if (playbackPollingRef.current !== null) {
        window.clearInterval(playbackPollingRef.current);
        playbackPollingRef.current = null;
      }
    }

    function syncPlaybackTime() {
      const nextTime = playerRef.current?.getCurrentTime?.();
      if (typeof nextTime === 'number' && Number.isFinite(nextTime)) {
        startTransition(() => {
          setCurrentPlaybackTime(nextTime);
        });
      }
    }

    if (!videoEmbedUrl || !iframeRef.current) {
      stopPlaybackPolling();
      playerRef.current?.destroy?.();
      playerRef.current = null;
      return;
    }

    let cancelled = false;

    stopPlaybackPolling();
    playerRef.current?.destroy?.();
    playerRef.current = null;

    void loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !iframeRef.current) return;

        const player = new YT.Player(iframeRef.current, {
          events: {
            onReady: () => {
              if (cancelled) return;
              playerRef.current = player;
              syncPlaybackTime();
            },
            onStateChange: (event) => {
              if (cancelled) return;

              if (event.data === YT.PlayerState.PLAYING) {
                stopPlaybackPolling();
                syncPlaybackTime();
                playbackPollingRef.current = window.setInterval(
                  syncPlaybackTime,
                  250
                );
                return;
              }

              stopPlaybackPolling();
              syncPlaybackTime();
            },
          },
        });

        playerRef.current = player;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      stopPlaybackPolling();
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [videoEmbedUrl]);

  useEffect(() => {
    if (!analysisId || analysisState !== 'polling') return;

    let cancelled = false;

    const poll = async () => {
      while (!cancelled) {
        try {
          const result = await postJson<{
            analysisId: string;
            status: 'pending' | 'processing' | 'success' | 'error';
            analysis?: VideoAnalysisPayload;
            error?: string;
          }>('/api/video/analysis/status', {
            analysisId,
          });

          if (cancelled) return;

          if (result.status === 'success' && result.analysis) {
            setSubtitleLanguage(
              getDefaultSubtitleLanguage(locale, result.analysis)
            );
            setAnalysis(result.analysis);
            setAnalysisState('ready');
            setErrorMessage('');
            return;
          }

          if (result.status === 'error') {
            setAnalysisState('error');
            setErrorMessage(result.error || content.analysisFailed);
            return;
          }

          await new Promise((resolve) => setTimeout(resolve, 2500));
        } catch (error: any) {
          if (cancelled) return;
          setAnalysisState('error');
          setErrorMessage(error.message || content.analysisFailed);
          return;
        }
      }
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, [analysisId, analysisState, content.analysisFailed]);

  async function handleAnalyze(urlOverride?: string) {
    const nextUrl = String(urlOverride || inputUrl || '').trim();
    if (!nextUrl) return;

    setErrorMessage('');
    setAnalysis(null);
    setAnalysisState('submitting');
    setInputUrl(nextUrl);
    router.replace(`/${locale}/video/chat?url=${encodeURIComponent(nextUrl)}`);

    try {
      const result = await postJson<{
        analysisId: string;
        status: 'pending' | 'processing' | 'success';
        analysis?: VideoAnalysisPayload;
      }>('/api/video/analysis', {
        url: nextUrl,
      });

      setAnalysisId(result.analysisId);

      if (result.status === 'success' && result.analysis) {
        setSubtitleLanguage(getDefaultSubtitleLanguage(locale, result.analysis));
        setAnalysis(result.analysis);
        setAnalysisState('ready');
        return;
      }

      setAnalysisState('polling');
    } catch (error: any) {
      setAnalysisState('error');
      setErrorMessage(error.message || content.analysisFailed);
    }
  }

  const seekTo = useCallback((startSeconds: number) => {
    setCurrentPlaybackTime(startSeconds);

    if (playerRef.current) {
      playerRef.current.seekTo(Math.floor(startSeconds), true);
      playerRef.current.playVideo();
      return;
    }

    const targetWindow = iframeRef.current?.contentWindow;
    if (!targetWindow) return;

    const command = (func: string, args: unknown[]) =>
      targetWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args,
        }),
        'https://www.youtube.com'
      );

    command('seekTo', [Math.floor(startSeconds), true]);
    command('playVideo', []);
  }, []);

  const handleCopySubtitles = useCallback(async () => {
    if (!analysis?.transcript?.length || !navigator.clipboard) return;
    await navigator.clipboard.writeText(
      exportTranscript(analysis.transcript, 'txt')
    );
  }, [analysis?.transcript]);

  const handleDownloadSubtitles = useCallback(() => {
    if (!analysis?.transcript?.length || typeof window === 'undefined') return;
    const format: TranscriptExportFormat = window.confirm(content.exportPrompt)
      ? 'srt'
      : 'txt';

    downloadFile(
      `${slugify(analysis.videoInfo.title || analysis.videoInfo.videoId)}.${format}`,
      exportTranscript(analysis.transcript, format),
      format === 'srt'
        ? 'application/x-subrip;charset=utf-8'
        : 'text/plain;charset=utf-8'
    );
  }, [analysis, content.exportPrompt]);

  async function handleSendChat(prompt?: string) {
    if (!analysisId || isChatLoading) return;

    const nextInput = String(prompt || chatInput).trim();
    if (!nextInput) return;

    const userMessage: Message = { role: 'user', text: nextInput };
    const nextMessages = [...chatMessages, userMessage];
    const assistantIndex = nextMessages.length;
    setChatMessages([
      ...nextMessages,
      { role: 'assistant', text: '', isStreaming: true },
    ]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/video/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisId,
          model: chatModel,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error((await response.text()) || content.sendFailed);
      }

      await readSseStream(response, (payload) => {
        if (payload.type === 'delta') {
          setChatMessages((current) =>
            current.map((message, index) =>
              index === assistantIndex
                ? {
                    ...message,
                    text: `${message.text}${String(payload.text || '')}`,
                    isStreaming: true,
                  }
                : message
            )
          );
          return;
        }

        if (payload.type === 'done') {
          setChatMessages((current) =>
            current.map((message, index) =>
              index === assistantIndex
                ? {
                    ...message,
                    text: String(payload.answer || message.text || ''),
                    timestamps: Array.isArray(payload.timestamps)
                      ? payload.timestamps
                      : [],
                    citations: Array.isArray(payload.citations)
                      ? payload.citations
                      : [],
                    isStreaming: false,
                  }
                : message
            )
          );
          return;
        }

        if (payload.type === 'error') {
          throw new Error(payload.message || content.sendFailed);
        }
      });
    } catch (error: any) {
      setChatMessages((current) =>
        current.map((message, index) =>
          index === assistantIndex
            ? {
                ...message,
                text: error?.message || content.sendFailed,
                isStreaming: false,
              }
            : message
        )
      );
    } finally {
      setIsChatLoading(false);
    }
  }

  async function handleSkillSelect(skillPrompt: string) {
    if (!skillPrompt) return;

    setSelectedSkill('');
    setChatInput(skillPrompt);

    if (analysisState === 'ready') {
      await handleSendChat(skillPrompt);
    }
  }

  async function ensureSubtitleTranslation(targetLanguage: string) {
    if (!analysis?.transcript?.length || !analysisId) return;

    const normalizedTargetLanguage =
      normalizeLocaleLanguage(targetLanguage) || targetLanguage;
    if (
      sourceSubtitleLanguage &&
      sourceSubtitleLanguage === normalizedTargetLanguage
    ) {
      return;
    }

    const cacheKey = getSubtitleCacheKey(analysisId, normalizedTargetLanguage);

    if (translatedSubtitleCache[cacheKey]?.length) {
      return;
    }

    setIsSubtitleTranslating(true);

    try {
      const result = await postJson<{
        language: string;
        translations: string[];
      }>('/api/video/translate', {
        analysisId,
        targetLanguage: normalizedTargetLanguage,
      });

      setTranslatedSubtitleCache((current) => ({
        ...current,
        [cacheKey]: result.translations,
      }));
    } catch {
      setErrorMessage(content.translationFailed);
    } finally {
      setIsSubtitleTranslating(false);
    }
  }

  useEffect(() => {
    if (!analysis?.transcript?.length) return;

    if (sourceSubtitleLanguage && sourceSubtitleLanguage === subtitleLanguage) {
      return;
    }

    void ensureSubtitleTranslation(subtitleLanguage);
  }, [
    analysis?.transcript,
    analysisId,
    sourceSubtitleLanguage,
    subtitleLanguage,
  ]);

  return (
    <div
      className={cn(
        spaceGrotesk.className,
        'bg-background text-foreground min-h-screen'
      )}
    >
      <header className="bg-background/95 sticky top-0 z-20 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-4 px-4 py-3 lg:px-6 2xl:max-w-[1440px]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md text-sm font-bold">
                V
              </div>
              <div className="text-lg font-semibold tracking-tight">Cyline</div>
            </div>

            <div className="relative w-full xl:max-w-[520px]">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
              <Input
                aria-label="video search"
                className="border-primary bg-card focus-visible:border-primary h-10 rounded-xl pr-12 pl-10 shadow-xs focus-visible:ring-0"
                value={inputUrl}
                onChange={(event) => setInputUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleAnalyze();
                  }
                }}
                placeholder={content.searchPlaceholder}
              />
              <button
                type="button"
                onClick={() => void handleAnalyze()}
                aria-label={content.analyze}
                disabled={isAnalyzing}
                className="text-muted-foreground absolute top-1/2 right-3.5 -translate-y-1/2 disabled:opacity-100"
              >
                {isAnalyzing ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4" />
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <LocaleSelector type="button" />
              <ThemeToggler className="border-border bg-card text-foreground hover:bg-muted inline-flex size-9 items-center justify-center rounded-lg border shadow-xs transition-colors [&_svg]:size-4" />
              <TopMetric icon={Coins}>{content.credits}</TopMetric>
              <div className="border-border flex size-9 items-center justify-center rounded-full border-2 bg-[var(--color-accent)] text-sm font-semibold text-white">
                J
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-65px)] w-full max-w-[1360px] xl:h-[calc(100vh-65px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:overflow-hidden 2xl:max-w-[1440px]">
        <section className="min-w-0 px-4 pb-4 lg:px-6 lg:pb-6 xl:h-full xl:min-h-0 xl:overflow-hidden xl:pt-0">
          <div className="flex h-full min-h-[720px] flex-col gap-5 xl:min-h-0">
            <div className="bg-foreground relative shrink-0 overflow-hidden rounded-2xl shadow-sm">
              {videoEmbedUrl ? (
                <iframe
                  ref={iframeRef}
                  src={videoEmbedUrl}
                  title={analysis?.videoInfo.title || 'YouTube Player'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="aspect-video w-full"
                />
              ) : (
                <div className="aspect-video w-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.18))]" />
              )}

              {!videoEmbedUrl ? (
                <button
                  className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/15"
                  type="button"
                  aria-label="Play video"
                  onClick={() => void handleAnalyze()}
                >
                  <Play className="size-7 fill-current" />
                </button>
              ) : null}
            </div>

            <Tabs
              defaultValue="captions"
              className="flex min-h-0 flex-1 flex-col"
            >
              <TabsList className="bg-muted text-muted-foreground inline-flex h-10 w-fit shrink-0 items-center justify-start rounded-xl p-1">
                <WorkspaceTabTrigger
                  value="captions"
                  icon={Captions}
                  label={content.captions}
                />
                <WorkspaceTabTrigger
                  value="summary"
                  icon={List}
                  label={content.summary}
                />
              </TabsList>

              <TabsContent
                value="captions"
                className="mt-4 min-h-0 flex-1 outline-none"
              >
                <CaptionsPanel
                  transcriptKey={analysis?.analysisId || analysisId}
                  content={content}
                  activeSubtitleIndex={activeSubtitleIndex}
                  displayedSubtitleItems={subtitleItems}
                  isBilingualCaptions={isBilingualCaptions}
                  isSubtitleTranslating={isSubtitleTranslating}
                  subtitleLanguage={subtitleLanguage}
                  subtitleLanguages={subtitleLanguages}
                  onToggleBilingual={() =>
                    setIsBilingualCaptions((current) => !current)
                  }
                  onSubtitleLanguageChange={(value) => {
                    setSubtitleLanguage(value);
                    void ensureSubtitleTranslation(value);
                  }}
                  onSeekToTimestamp={seekTo}
                  onCopySubtitles={handleCopySubtitles}
                  onDownloadSubtitles={handleDownloadSubtitles}
                />
              </TabsContent>

              <TabsContent
                value="summary"
                className="mt-4 min-h-0 flex-1 outline-none"
              >
                <SummaryPanel
                  content={content}
                  analysis={analysis}
                  isLoading={
                    analysisState === 'submitting' ||
                    analysisState === 'polling'
                  }
                  onTimestampClick={seekTo}
                />
              </TabsContent>
            </Tabs>
          </div>
        </section>

        <aside className="border-border bg-card min-h-0 border-t xl:h-full xl:overflow-hidden xl:border-t-0 xl:border-l">
          <Tabs
            defaultValue="chat"
            className="flex h-full min-h-[720px] flex-col xl:min-h-0"
          >
            <TabsList className="border-border bg-muted h-auto w-full shrink-0 justify-start gap-2 overflow-x-auto rounded-none border-b px-4 py-3 xl:grid xl:grid-cols-3 xl:gap-2.5 xl:overflow-visible">
              <WorkspaceTabTrigger
                value="chat"
                icon={MessageSquare}
                label={content.chat}
                className="min-w-[96px] xl:w-full xl:min-w-0"
              />
              <WorkspaceTabTrigger
                value="mindmap"
                icon={GitBranch}
                label={content.mindMap}
                className="min-w-[110px] xl:w-full xl:min-w-0"
              />
              <WorkspaceTabTrigger
                value="notes"
                icon={NotebookPen}
                label={content.notes}
                className="min-w-[96px] xl:w-full xl:min-w-0"
              />
            </TabsList>

            <TabsContent
              value="chat"
              className="mt-0 flex min-h-0 flex-1 flex-col outline-none"
            >
              <ScrollArea
                ref={chatScrollAreaRef}
                className="min-h-0 flex-1 px-5 py-5"
              >
                <div className="space-y-4 pb-4">
                  {chatMessages.length > 0 ? (
                    chatMessages.map((message, index) => (
                      <ChatBubble
                        key={`${message.role}-${index}`}
                        copyFailedLabel={content.copyReplyFailed}
                        copyLabel={content.copyReply}
                        copySuccessLabel={content.copyReplySuccess}
                        message={message}
                        onTimestampClick={seekTo}
                        streamingLabel={content.chatStreaming}
                      />
                    ))
                  ) : (
                    <div className="text-muted-foreground text-sm leading-7">
                      {content.emptyChat}
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="border-border space-y-3 border-t px-5 py-4">
                <div className="space-y-3 px-1 pt-1">
                  <div className="border-border bg-card rounded-[24px] border px-4 py-3 shadow-xs">
                    <Textarea
                      aria-label="Ask anything about this video"
                      rows={2}
                      maxLength={5000}
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' || event.shiftKey) {
                          return;
                        }

                        event.preventDefault();
                        if (analysisState === 'ready' && !isChatLoading) {
                          void handleSendChat();
                        }
                      }}
                      className="text-foreground min-h-20 resize-none border-0 !bg-transparent px-0 py-0 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder={chatInputPlaceholder}
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <select
                          aria-label="Skill"
                          value={selectedSkill}
                          onChange={(event) =>
                            void handleSkillSelect(event.target.value)
                          }
                          className="border-border bg-background text-foreground focus-visible:border-primary h-10 min-w-[132px] appearance-none rounded-full border py-0 pr-9 pl-4 text-sm font-semibold shadow-none outline-none focus-visible:ring-0"
                        >
                          <option value="">Skill</option>
                          {content.prompts.map((prompt) => (
                            <option key={prompt} value={prompt}>
                              {prompt}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2" />
                      </div>

                      <div className="relative">
                        <select
                          aria-label={content.modelLabel}
                          value={chatModel}
                          onChange={(event) =>
                            setChatModel(
                              event.target.value as SupportedAIModelId
                            )
                          }
                          className="border-border bg-background text-foreground focus-visible:border-primary h-10 min-w-[182px] appearance-none rounded-full border py-0 pr-9 pl-4 text-sm font-semibold shadow-none outline-none focus-visible:ring-0"
                        >
                          {SUPPORTED_AI_MODELS.map((modelOption) => (
                            <option key={modelOption.id} value={modelOption.id}>
                              {modelOption.title}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2" />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Copy"
                        onClick={() =>
                          navigator.clipboard?.writeText(chatExportText)
                        }
                        className="text-muted-foreground hover:text-foreground size-10 rounded-full"
                      >
                        <Clipboard className="size-5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Clear"
                        onClick={() => setChatInput('')}
                        className="text-muted-foreground hover:text-foreground size-10 rounded-full"
                      >
                        <Eraser className="size-5" />
                      </Button>

                      <Button
                        size="icon"
                        type="button"
                        aria-label="Send message"
                        disabled={analysisState !== 'ready' || isChatLoading}
                        onClick={() => void handleSendChat()}
                        className={cn(
                          'ml-auto size-10 rounded-full',
                          chatInput.trim()
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'bg-primary/20 text-primary hover:bg-primary/25'
                        )}
                      >
                        <ArrowUp className="size-4.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <SidebarContent
              value="mindmap"
              title={content.mindMapHeading}
              body={content.mindMapBody}
              icon={GitBranch}
            />
            <SidebarContent
              value="notes"
              title={content.notesHeading}
              body={content.notesBody}
              icon={NotebookPen}
            />
          </Tabs>
        </aside>
      </main>

      {errorMessage ? (
        <div className="pointer-events-none fixed right-4 bottom-4 z-50">
          <div className="border-border bg-card max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg">
            {errorMessage}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TopMetric({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon: LucideIcon;
}) {
  return (
    <div className="border-border bg-card text-foreground inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shadow-xs">
      <Icon className="text-primary size-3.5" />
      <span>{children}</span>
    </div>
  );
}

function WorkspaceTabTrigger({
  value,
  label,
  icon: Icon,
  className,
}: {
  value: string;
  label: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        'h-9 rounded-lg px-4 text-[13px] font-medium data-[state=active]:shadow-xs',
        className
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </TabsTrigger>
  );
}

const SummaryPanel = memo(function SummaryPanel({
  content,
  analysis,
  isLoading,
  onTimestampClick,
}: {
  content: VideoChatCopy;
  analysis: VideoAnalysisPayload | null;
  isLoading: boolean;
  onTimestampClick?: (seconds: number) => void;
}) {
  return (
    <div className="border-border bg-card/70 h-full overflow-hidden rounded-2xl border shadow-xs">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-5 p-5">
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            {analysis?.videoInfo.title || 'YouTube Video'}
          </h1>

          <div>
            <h2 className="text-base font-semibold tracking-tight">
              {content.summaryHeading}
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              {isLoading
                ? content.summaryLoading
                : analysis?.summary.overview || content.summaryEmpty}
            </p>

            <div className="mt-5 space-y-4">
              {(analysis?.summary.points || []).map((point, index) => {
                const timestamp = parseSummaryTimestamp(point.timestamp);

                return (
                  <div
                    key={`${point.timestamp || 'point'}-${index}`}
                    className="flex gap-3"
                  >
                    <div className="text-primary min-w-5 pt-0.5 text-sm font-semibold">
                      {index + 1}.
                    </div>
                    <p className="text-muted-foreground text-sm leading-6">
                      {timestamp ? (
                        <button
                          type="button"
                          onClick={() => onTimestampClick?.(timestamp.seconds)}
                          className="text-primary hover:bg-primary/10 mr-1 inline-flex rounded-md px-1 py-0.5 text-sm font-semibold transition-colors"
                        >
                          [{timestamp.label}]
                        </button>
                      ) : null}
                      {point.title ? `${point.title}: ` : ''}
                      {point.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
});

function CaptionsPanel({
  activeSubtitleIndex,
  content,
  displayedSubtitleItems,
  isBilingualCaptions,
  isSubtitleTranslating,
  subtitleLanguage,
  subtitleLanguages,
  transcriptKey,
  onToggleBilingual,
  onSubtitleLanguageChange,
  onSeekToTimestamp,
  onCopySubtitles,
  onDownloadSubtitles,
}: {
  activeSubtitleIndex: number;
  content: VideoChatCopy;
  displayedSubtitleItems: SubtitleItem[];
  isBilingualCaptions: boolean;
  isSubtitleTranslating: boolean;
  subtitleLanguage: string;
  subtitleLanguages: Array<{ value: string; label: string }>;
  transcriptKey: string;
  onToggleBilingual: () => void;
  onSubtitleLanguageChange: (value: string) => void;
  onSeekToTimestamp: (seconds: number) => void;
  onCopySubtitles: () => void | Promise<void>;
  onDownloadSubtitles: () => void;
}) {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const autoScrollLockRef = useRef(false);
  const autoScrollUnlockTimeoutRef = useRef<number | null>(null);
  const [isAutoFollowEnabled, setIsAutoFollowEnabled] = useState(true);
  const [isCurrentSubtitleInView, setIsCurrentSubtitleInView] = useState(true);

  const currentSubtitle = displayedSubtitleItems[activeSubtitleIndex] || null;

  function checkCurrentSubtitleVisibility() {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    );
    const activeItem = itemRefs.current[activeSubtitleIndex];

    if (!viewport || !activeItem || activeSubtitleIndex < 0) {
      setIsCurrentSubtitleInView(false);
      return;
    }

    const viewportRect = viewport.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const isVisible =
      itemRect.bottom > viewportRect.top && itemRect.top < viewportRect.bottom;

    setIsCurrentSubtitleInView(isVisible);
  }

  useEffect(() => {
    setIsAutoFollowEnabled(true);
    setIsCurrentSubtitleInView(true);
  }, [transcriptKey]);

  useEffect(() => {
    return () => {
      if (autoScrollUnlockTimeoutRef.current !== null) {
        window.clearTimeout(autoScrollUnlockTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    );
    if (!viewport) return;

    const handleScroll = () => {
      checkCurrentSubtitleVisibility();

      if (autoScrollLockRef.current || !isAutoFollowEnabled) return;
      setIsAutoFollowEnabled(false);
    };

    viewport.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      viewport.removeEventListener('scroll', handleScroll);
    };
  }, [isAutoFollowEnabled]);

  useEffect(() => {
    checkCurrentSubtitleVisibility();

    if (!isAutoFollowEnabled || activeSubtitleIndex < 0) return;

    const activeItem = itemRefs.current[activeSubtitleIndex];
    if (!activeItem) return;

    autoScrollLockRef.current = true;
    activeItem.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    if (autoScrollUnlockTimeoutRef.current !== null) {
      window.clearTimeout(autoScrollUnlockTimeoutRef.current);
    }

    autoScrollUnlockTimeoutRef.current = window.setTimeout(() => {
      autoScrollLockRef.current = false;
      checkCurrentSubtitleVisibility();
    }, 450);
  }, [activeSubtitleIndex, isAutoFollowEnabled]);

  function handleJumpToCurrentSubtitle() {
    setIsAutoFollowEnabled(true);
    const activeItem = itemRefs.current[activeSubtitleIndex];
    if (!activeItem) return;

    autoScrollLockRef.current = true;
    activeItem.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    if (autoScrollUnlockTimeoutRef.current !== null) {
      window.clearTimeout(autoScrollUnlockTimeoutRef.current);
    }

    autoScrollUnlockTimeoutRef.current = window.setTimeout(() => {
      autoScrollLockRef.current = false;
      checkCurrentSubtitleVisibility();
    }, 450);
  }

  return (
    <div className="border-border bg-card/80 relative flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border shadow-xs">
      <div className="border-border bg-background/95 flex flex-wrap items-center gap-2 border-b p-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <SubtitleActionButton
            icon={Copy}
            label={content.copySubtitles}
            inverted
            onClick={onCopySubtitles}
          />
          <SubtitleActionButton
            icon={Download}
            label={content.downloadSubtitles}
            onClick={onDownloadSubtitles}
          />

          <div className="relative">
            <Languages className="text-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
            <select
              aria-label="Subtitle language"
              disabled={isSubtitleTranslating}
              value={subtitleLanguage}
              onChange={(event) => onSubtitleLanguageChange(event.target.value)}
              className="border-border bg-card text-foreground focus-visible:border-primary h-9 min-w-[168px] appearance-none rounded-lg border py-0 pr-9 pl-8 text-sm font-medium shadow-none outline-none focus-visible:ring-0 sm:min-w-[220px]"
            >
              {subtitleLanguages.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>
            <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2" />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <label
              htmlFor="bilingual-captions-switch"
              className="text-foreground text-sm font-medium"
            >
              {content.bilingualCaptions}
            </label>
            <Switch
              id="bilingual-captions-switch"
              checked={isBilingualCaptions}
              onCheckedChange={onToggleBilingual}
            />
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <ScrollArea ref={scrollAreaRef} className="h-full min-h-0">
          <div className="space-y-3 p-4">
            {displayedSubtitleItems.length > 0 ? (
              displayedSubtitleItems.map((item, index) => (
                <div
                  key={`${item.timestamp}-${index}`}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                >
                  <MemoizedSubtitleListItem
                    item={item}
                    isActive={index === activeSubtitleIndex}
                    isBilingual={isBilingualCaptions}
                    merged
                    onJumpToTimestamp={onSeekToTimestamp}
                  />
                </div>
              ))
            ) : (
              <div className="text-muted-foreground text-sm leading-7">
                {content.emptyCaptions}
              </div>
            )}
          </div>
        </ScrollArea>

        {isSubtitleTranslating ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <ClaudeCodeLoading label={content.translatingCaptions} />
          </div>
        ) : null}
      </div>

      {!isAutoFollowEnabled && currentSubtitle && !isCurrentSubtitleInView ? (
        <div className="pointer-events-none absolute top-20 right-4 left-4 z-10 flex justify-center">
          <Button
            type="button"
            onClick={handleJumpToCurrentSubtitle}
            className="pointer-events-auto animate-bounce rounded-full px-4 shadow-lg [animation-duration:1.8s]"
          >
            <ArrowDown className="size-4" />
            {content.jumpToCurrentSubtitle}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function SubtitleActionButton({
  icon: Icon,
  label,
  inverted = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  inverted?: boolean;
  onClick?: () => void | Promise<void>;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'h-9 w-9 rounded-lg border shadow-none',
        inverted
          ? 'bg-primary text-primary-foreground hover:bg-primary/90 border-transparent'
          : 'border-border bg-card text-foreground hover:bg-muted'
      )}
    >
      <Icon className="size-4" />
    </Button>
  );
}

function SubtitleListItem({
  item,
  isBilingual,
  merged,
  isActive,
  onJumpToTimestamp,
}: {
  item: SubtitleItem;
  isBilingual?: boolean;
  merged: boolean;
  isActive?: boolean;
  onJumpToTimestamp?: (seconds: number) => void;
}) {
  const hasTranslatedLine =
    Boolean(item.translatedText) && item.translatedText !== item.originalText;
  const primaryText = isBilingual ? item.originalText : item.text;
  const secondaryText =
    isBilingual && hasTranslatedLine ? item.translatedText : null;

  if (!merged) {
    return (
      <div className="border-border grid gap-3 border-b px-4 py-4 last:border-b-0 md:grid-cols-[104px_minmax(0,1fr)] md:gap-4">
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => onJumpToTimestamp?.(item.start)}
            className="bg-primary/12 text-primary dark:bg-primary/18 inline-flex rounded-full px-3 py-1.5 text-sm font-semibold transition-opacity hover:opacity-85"
          >
            {item.timestamp}
          </button>
        </div>
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm leading-7">
            {primaryText}
          </p>
          {secondaryText ? (
            <p className="text-foreground/80 text-sm leading-7">
              {secondaryText}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl px-4 py-4',
        isActive ? 'bg-accent/70 dark:bg-accent/35' : 'bg-transparent'
      )}
    >
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => onJumpToTimestamp?.(item.start)}
          className="bg-primary/12 text-primary dark:bg-primary/18 inline-flex shrink-0 rounded-xl px-2.5 py-1.5 text-sm font-semibold transition-opacity hover:opacity-85"
        >
          {item.timestamp}
        </button>
        <div className="min-w-0 space-y-2">
          <p className="text-foreground text-sm leading-7 font-medium">
            {primaryText}
          </p>
          {secondaryText ? (
            <p className="text-muted-foreground text-sm leading-7">
              {secondaryText}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const MemoizedSubtitleListItem = memo(SubtitleListItem);

const ChatBubble = memo(function ChatBubble({
  copyFailedLabel,
  copyLabel,
  copySuccessLabel,
  message,
  onTimestampClick,
  streamingLabel,
}: {
  copyFailedLabel: string;
  copyLabel: string;
  copySuccessLabel: string;
  message: Message;
  onTimestampClick?: (seconds: number) => void;
  streamingLabel?: string;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground max-w-[280px] rounded-xl px-4 py-3 text-sm leading-6">
          {message.text}
        </div>
      </div>
    );
  }

  const citationsByTimestamp = new Map(
    (message.citations || []).map((citation) => [citation.timestamp, citation])
  );
  const lines = message.text.split('\n');
  const hasMessageText = Boolean(message.text.trim());
  const showBubbleChrome = hasMessageText || !message.isStreaming;

  function renderTextWithTimestamps(
    line: string,
    lineIndex: number,
    keyPrefix = 'line'
  ) {
    const parts: React.ReactNode[] = [];
    const matcher = /\[([^\]]+)\]/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = matcher.exec(line)) !== null) {
      const [rawMatch, content] = match;
      const timestamps = content
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => parseChatTimestampReference(item))
        .filter(
          (
            item
          ): item is {
            normalized: string;
            seconds: number;
            label: string;
          } => Boolean(item)
        );

      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }

      if (timestamps.length === 0) {
        parts.push(rawMatch);
      } else {
        timestamps.forEach((timestamp, timestampIndex) => {
          const citation = citationsByTimestamp.get(timestamp.normalized);
          const targetSeconds = citation?.start ?? timestamp.seconds;

          parts.push(
            <button
              key={`ts-${keyPrefix}-${lineIndex}-${match?.index}-${timestampIndex}`}
              type="button"
              onClick={() => onTimestampClick?.(targetSeconds)}
              className="text-primary hover:bg-primary/10 inline-flex rounded-md px-1 py-0.5 text-sm font-semibold transition-colors"
            >
              [{citation?.timestamp || timestamp.label}]
            </button>
          );

          if (timestampIndex < timestamps.length - 1) {
            parts.push(
              <span
                key={`ts-sep-${keyPrefix}-${lineIndex}-${match?.index}-${timestampIndex}`}
                className="text-muted-foreground px-0.5"
              >
                {' '}
              </span>
            );
          }
        });
      }

      lastIndex = match.index + rawMatch.length;
    }

    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [line];
  }

  function renderFormattedLine(line: string, lineIndex: number) {
    const segments = line.split(/(\*\*.*?\*\*)/g).filter(Boolean);

    return segments.map((segment, segmentIndex) => {
      const isBold = segment.startsWith('**') && segment.endsWith('**');
      const content = isBold ? segment.slice(2, -2) : segment;
      const rendered = renderTextWithTimestamps(
        content,
        lineIndex,
        `${segmentIndex}-${isBold ? 'bold' : 'text'}`
      );

      if (!isBold) {
        return <span key={`seg-${lineIndex}-${segmentIndex}`}>{rendered}</span>;
      }

      return (
        <strong
          key={`seg-${lineIndex}-${segmentIndex}`}
          className="text-foreground font-semibold"
        >
          {rendered}
        </strong>
      );
    });
  }

  async function handleCopyMessage() {
    if (!message.text.trim() || !navigator.clipboard) {
      toast.error(copyFailedLabel);
      return;
    }

    try {
      await navigator.clipboard.writeText(message.text);
      toast.success(copySuccessLabel);
    } catch {
      toast.error(copyFailedLabel);
    }
  }

  return (
    <div className="flex items-start">
      <div
        className={cn(
          'text-foreground max-w-full text-sm leading-7',
          showBubbleChrome
            ? 'bg-card/90 border-border relative rounded-xl border p-4 shadow-xs backdrop-blur-sm'
            : 'py-1'
        )}
      >
        {showBubbleChrome ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={copyLabel}
            title={copyLabel}
            disabled={!hasMessageText}
            onClick={() => void handleCopyMessage()}
            className="text-muted-foreground hover:text-foreground absolute top-4 right-4 size-8 rounded-lg"
          >
            <Copy className="size-4" />
          </Button>
        ) : null}
        {hasMessageText ? (
          <div className="space-y-2 pr-10">
            {lines.map((line, index) =>
              line ? (
                <p key={`line-${index}`}>{renderFormattedLine(line, index)}</p>
              ) : (
                <div key={`line-${index}`} className="h-3" />
              )
            )}
          </div>
        ) : null}
        {message.isStreaming ? (
          <div className={cn(hasMessageText ? 'mt-2' : 'px-1')}>
            <ClaudeCodeLoading label={streamingLabel || 'Streaming response'} />
          </div>
        ) : null}
      </div>
    </div>
  );
});

function SidebarContent({
  value,
  title,
  body,
  icon: Icon,
  children,
}: {
  value: string;
  title?: string;
  body?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <TabsContent
      value={value}
      className="mt-0 flex min-h-0 flex-1 outline-none"
    >
      {children ? (
        children
      ) : (
        <div className="flex flex-1 items-center justify-center p-5">
          <div className="border-border bg-background w-full max-w-xl rounded-2xl border p-6 shadow-xs">
            <div className="flex items-center gap-3">
              {Icon ? (
                <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                  <Icon className="size-5" />
                </div>
              ) : null}
              <div>
                <h3 className="text-base font-semibold tracking-tight">
                  {title}
                </h3>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {body}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" className="border-border rounded-full">
                <Copy className="size-4" />
                Copy
              </Button>
              <Button variant="outline" className="border-border rounded-full">
                <Share2 className="size-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      )}
    </TabsContent>
  );
}
