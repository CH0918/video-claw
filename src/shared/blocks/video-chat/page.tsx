'use client';

import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Captions,
  ChevronLeft,
  List,
  MessageSquare,
  Search,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { localeNames, locales } from '@/config/locale';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList } from '@/shared/components/ui/tabs';
import { useAppContext } from '@/shared/contexts/app';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { VIDEO_CHAT_DEFAULT_MODEL } from '@/shared/lib/ai-models';
import { cn } from '@/shared/lib/utils';
import { buildYouTubeEmbedUrl } from '@/shared/lib/video-analysis/youtube';
import { VideoAnalysisPayload } from '@/shared/types/video-analysis';

import { CaptionsPanel } from './captions-panel';
import { ChatPanel } from './chat-panel';
import { VideoChatHeaderMenu } from './header-menu';
import { HeaderSearchBar } from './header-search-bar';
import { MobileVideoDock } from './mobile-video-dock';
import { SummaryPanel } from './summary-panel';
import type { Message, VideoChatPageProps, YouTubePlayer } from './types';
import {
  buildAssistantIntro,
  buildVideoChatCopy,
  downloadFile,
  exportTranscript,
  findActiveSubtitleIndex,
  getDefaultSubtitleLanguage,
  getSubtitleCacheKey,
  getSubtitleItems,
  loadYouTubeIframeApi,
  normalizeLocaleLanguage,
  postJson,
  readSseStream,
  slugify,
  spaceGrotesk,
} from './utils';
import { VideoPlayerCard } from './video-player-card';
import { WorkspaceTabTrigger } from './workspace-tab-trigger';

export function VideoChatPage({ locale, initialUrl }: VideoChatPageProps) {
  const t = useTranslations('pages.video.chat');
  const content = useMemo(() => buildVideoChatCopy(t), [t]);
  const { user } = useAppContext();
  const isMobile = useIsMobile();
  const router = useRouter();
  const mobileIframeRef = useRef<HTMLIFrameElement | null>(null);
  const desktopIframeRef = useRef<HTMLIFrameElement | null>(null);
  const mobileChatScrollAreaRef = useRef<HTMLDivElement | null>(null);
  const desktopChatScrollAreaRef = useRef<HTMLDivElement | null>(null);
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
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);
  const [isMobileVideoCollapsed, setIsMobileVideoCollapsed] = useState(false);
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
  const chatInputPlaceholder = isMobile
    ? content.askPlaceholder
    : locale === 'zh'
      ? `${content.askPlaceholder}（Enter 发送，Shift+Enter 换行）`
      : `${content.askPlaceholder} (Enter to send, Shift+Enter for a new line)`;
  const isAnalyzing =
    analysisState === 'submitting' || analysisState === 'polling';
  const chatExportText = useMemo(
    () =>
      chatMessages
        .map((message) =>
          message.role === 'user'
            ? `**Q:** ${message.text}`
            : message.text
        )
        .join('\n\n'),
    [chatMessages]
  );

  const getVisibleChatViewports = useCallback(() => {
    const viewports = [mobileChatScrollAreaRef, desktopChatScrollAreaRef]
      .map((ref) =>
        ref.current?.querySelector<HTMLDivElement>(
          '[data-radix-scroll-area-viewport]'
        )
      )
      .filter((viewport): viewport is HTMLDivElement => Boolean(viewport));

    const visibleViewports = viewports.filter(
      (viewport) => viewport.getClientRects().length > 0
    );

    return visibleViewports.length > 0 ? visibleViewports : viewports;
  }, []);

  const getActiveVideoIframe = useCallback(() => {
    if (isMobile) {
      return mobileIframeRef.current || desktopIframeRef.current;
    }

    return desktopIframeRef.current || mobileIframeRef.current;
  }, [isMobile]);

  const handleChatAutoFollowChange = useCallback((value: boolean) => {
    if (chatAutoScrollLockRef.current) return;
    setIsChatAutoFollowEnabled(value);
  }, []);

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
    if (videoEmbedUrl) {
      setIsMobileVideoCollapsed(false);
    }
  }, [videoEmbedUrl]);

  useEffect(() => {
    const viewports = getVisibleChatViewports();
    if (viewports.length === 0 || !isChatAutoFollowEnabled) return;

    chatAutoScrollLockRef.current = true;
    const frameId = window.requestAnimationFrame(() => {
      viewports.forEach((viewport) => {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: 'auto',
        });
      });
    });

    const timeoutId = window.setTimeout(() => {
      chatAutoScrollLockRef.current = false;
    }, 120);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [chatMessages, getVisibleChatViewports, isChatAutoFollowEnabled]);

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

    const activeIframe = getActiveVideoIframe();
    if (!videoEmbedUrl || !activeIframe) {
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
        const targetIframe = getActiveVideoIframe();
        if (cancelled || !targetIframe) return;

        const player = new YT.Player(targetIframe, {
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
  }, [getActiveVideoIframe, videoEmbedUrl]);

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
        setSubtitleLanguage(
          getDefaultSubtitleLanguage(locale, result.analysis)
        );
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

  const seekTo = useCallback(
    (startSeconds: number) => {
      setCurrentPlaybackTime(startSeconds);

      if (
        playerRef.current &&
        typeof playerRef.current.seekTo === 'function' &&
        typeof playerRef.current.playVideo === 'function'
      ) {
        playerRef.current.seekTo(Math.floor(startSeconds), true);
        playerRef.current.playVideo();
        return;
      }

      const targetWindow = getActiveVideoIframe()?.contentWindow;
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
    },
    [getActiveVideoIframe]
  );

  const handleCopySubtitles = useCallback(async () => {
    if (!analysis?.transcript?.length || !navigator.clipboard) return;
    await navigator.clipboard.writeText(
      exportTranscript(analysis.transcript, 'txt')
    );
  }, [analysis?.transcript]);

  const handleDownloadSubtitles = useCallback(() => {
    if (!analysis?.transcript?.length || typeof window === 'undefined') return;
    const format = window.confirm(content.exportPrompt) ? 'srt' : 'txt';

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

    setIsChatAutoFollowEnabled(true);

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
        headers: { 'Content-Type': 'application/json' },
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
        'bg-background text-foreground h-dvh min-h-screen overflow-hidden md:h-auto md:overflow-visible'
      )}
    >
      <a
        href="#video-chat-main"
        className="bg-primary text-primary-foreground pointer-events-none fixed top-2 left-2 z-50 rounded-lg px-4 py-2 text-sm font-medium opacity-0 focus:pointer-events-auto focus:opacity-100"
      >
        {content.skipToContent}
      </a>
      <header className="bg-background/95 sticky top-0 z-20 backdrop-blur">
        <div className="mx-auto w-full max-w-[1360px] px-4 py-3 lg:px-6 2xl:max-w-[1440px]">
          <div className="min-h-10 md:hidden">
            {isMobileSearchExpanded ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Collapse search"
                  onClick={() => setIsMobileSearchExpanded(false)}
                  className="bg-card border-border text-foreground hover:bg-muted size-10 shrink-0 rounded-full shadow-xs"
                >
                  <ChevronLeft className="size-4" />
                </Button>

                <HeaderSearchBar
                  inputUrl={inputUrl}
                  isAnalyzing={isAnalyzing}
                  searchPlaceholder={content.searchPlaceholder}
                  analyzeLabel={content.analyze}
                  pasteLabel={content.pasteLink}
                  pasteSuccessLabel={content.pasteLinkSuccess}
                  pasteFailedLabel={content.pasteLinkFailed}
                  onAnalyze={() => void handleAnalyze()}
                  onChange={setInputUrl}
                  className="flex-1"
                  mobile
                  expanded
                />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md text-sm font-bold">
                    V
                  </div>
                  <div className="truncate text-base font-semibold tracking-tight">
                    Cyline
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={content.searchPlaceholder}
                  onClick={() => setIsMobileSearchExpanded(true)}
                  className="bg-card border-border text-foreground hover:bg-muted size-10 shrink-0 rounded-full shadow-xs"
                >
                  <Search className="size-4" />
                </Button>

                <VideoChatHeaderMenu />
              </div>
            )}
          </div>

          <div className="hidden flex-col gap-4 md:flex">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md text-sm font-bold">
                  V
                </div>
                <div className="text-lg font-semibold tracking-tight">
                  Cyline
                </div>
              </div>

              <VideoChatHeaderMenu />
            </div>

            <div className="w-full xl:max-w-[560px]">
              <HeaderSearchBar
                inputUrl={inputUrl}
                isAnalyzing={isAnalyzing}
                searchPlaceholder={content.searchPlaceholder}
                analyzeLabel={content.analyze}
                pasteLabel={content.pasteLink}
                pasteSuccessLabel={content.pasteLinkSuccess}
                pasteFailedLabel={content.pasteLinkFailed}
                onAnalyze={() => void handleAnalyze()}
                onChange={setInputUrl}
              />
            </div>
          </div>
        </div>
      </header>

      <main
        id="video-chat-main"
        className="mx-auto flex h-[calc(100dvh-65px)] w-full max-w-[1360px] flex-col overflow-hidden md:h-auto md:min-h-[calc(100vh-65px)] md:overflow-visible xl:grid xl:h-[calc(100vh-65px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:overflow-hidden 2xl:max-w-[1440px]"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 md:hidden">
          <div className="shrink-0 pb-4">
            <MobileVideoDock
              iframeRef={mobileIframeRef}
              title={analysis?.videoInfo.title || 'YouTube Player'}
              videoEmbedUrl={videoEmbedUrl}
              isCollapsed={isMobileVideoCollapsed}
              collapseLabel={content.collapseVideo}
              expandLabel={content.expandVideo}
              onAnalyze={() => void handleAnalyze()}
              onToggleCollapse={() =>
                setIsMobileVideoCollapsed((current) => !current)
              }
            />
          </div>

          <Tabs
            defaultValue="captions"
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <TabsList className="text-muted-foreground mx-auto h-auto w-fit shrink-0 gap-1 border-0 bg-transparent p-0">
              <WorkspaceTabTrigger
                value="captions"
                icon={Captions}
                label={content.captions}
                compact
                className="min-w-[84px]"
              />
              <WorkspaceTabTrigger
                value="summary"
                icon={List}
                label={content.summary}
                compact
                className="min-w-[84px]"
              />
              <WorkspaceTabTrigger
                value="chat"
                icon={MessageSquare}
                label={content.chat}
                compact
                className="min-w-[84px]"
              />
            </TabsList>

            <TabsContent
              value="captions"
              className="mt-3 min-h-0 flex-1 overflow-hidden outline-none"
            >
              <CaptionsPanel
                transcriptKey={analysis?.analysisId || analysisId}
                content={content}
                activeSubtitleIndex={activeSubtitleIndex}
                displayedSubtitleItems={subtitleItems}
                isBilingualCaptions={isBilingualCaptions}
                isSubtitleTranslating={isSubtitleTranslating}
                mobile
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
              className="mt-3 min-h-0 flex-1 overflow-hidden outline-none"
            >
              <SummaryPanel
                content={content}
                analysis={analysis}
                isLoading={
                  analysisState === 'submitting' || analysisState === 'polling'
                }
                mobile
                onTimestampClick={seekTo}
              />
            </TabsContent>

            <TabsContent
              value="chat"
              className="mt-3 min-h-0 flex-1 overflow-hidden outline-none data-[state=active]:flex data-[state=active]:h-full data-[state=active]:flex-col"
            >
              <ChatPanel
                chatInput={chatInput}
                chatInputPlaceholder={chatInputPlaceholder}
                chatMessages={chatMessages}
                chatModel={chatModel}
                chatScrollAreaRef={mobileChatScrollAreaRef}
                content={content}
                isChatAutoFollowEnabled={isChatAutoFollowEnabled}
                isChatLoading={isChatLoading}
                analysisState={analysisState}
                mobile
                selectedSkill={selectedSkill}
                onChatAutoFollowChange={handleChatAutoFollowChange}
                onChatInputChange={setChatInput}
                onChatModelChange={setChatModel}
                onClearChatInput={() => setChatInput('')}
                onClearChat={() => {
                  setChatMessages([]);
                  setChatInput('');
                }}
                onCopyChatExport={async () => {
                  try {
                    await navigator.clipboard?.writeText(chatExportText);
                    toast.success(content.copyReplySuccess);
                  } catch {
                    toast.error(content.copyReplyFailed);
                  }
                }}
                onSendChat={() => void handleSendChat()}
                onSkillSelect={(value) => void handleSkillSelect(value)}
                onTimestampClick={seekTo}
              />
            </TabsContent>
          </Tabs>
        </div>

        <section className="hidden min-w-0 px-4 pb-4 md:block lg:px-6 lg:pb-6 xl:h-full xl:min-h-0 xl:overflow-hidden xl:pt-0">
          <div className="flex h-full min-h-[720px] flex-col gap-5 xl:min-h-0">
            <VideoPlayerCard
              iframeRef={desktopIframeRef}
              title={analysis?.videoInfo.title || 'YouTube Player'}
              videoEmbedUrl={videoEmbedUrl}
              onAnalyze={() => void handleAnalyze()}
            />

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

        <aside className="border-border bg-card hidden min-h-0 border-t md:flex md:flex-col xl:h-full xl:overflow-hidden xl:border-t-0 xl:border-l">
          <Tabs
            defaultValue="chat"
            className="flex h-full min-h-[720px] flex-col xl:min-h-0"
          >
            <TabsList className="border-border bg-muted h-auto w-full shrink-0 justify-start gap-2 overflow-x-auto rounded-none border-b px-4 py-3 xl:grid xl:grid-cols-1 xl:gap-2.5 xl:overflow-visible">
              <WorkspaceTabTrigger
                value="chat"
                icon={MessageSquare}
                label={content.chat}
                className="min-w-[96px] xl:w-full xl:min-w-0"
              />
            </TabsList>

            <TabsContent
              value="chat"
              className="mt-0 flex min-h-0 flex-1 flex-col outline-none"
            >
              <ChatPanel
                chatInput={chatInput}
                chatInputPlaceholder={chatInputPlaceholder}
                chatMessages={chatMessages}
                chatModel={chatModel}
                chatScrollAreaRef={desktopChatScrollAreaRef}
                content={content}
                isChatAutoFollowEnabled={isChatAutoFollowEnabled}
                isChatLoading={isChatLoading}
                analysisState={analysisState}
                mobile={false}
                selectedSkill={selectedSkill}
                onChatAutoFollowChange={handleChatAutoFollowChange}
                onChatInputChange={setChatInput}
                onChatModelChange={setChatModel}
                onClearChatInput={() => setChatInput('')}
                onClearChat={() => {
                  setChatMessages([]);
                  setChatInput('');
                }}
                onCopyChatExport={async () => {
                  try {
                    await navigator.clipboard?.writeText(chatExportText);
                    toast.success(content.copyReplySuccess);
                  } catch {
                    toast.error(content.copyReplyFailed);
                  }
                }}
                onSendChat={() => void handleSendChat()}
                onSkillSelect={(value) => void handleSkillSelect(value)}
                onTimestampClick={seekTo}
              />
            </TabsContent>
          </Tabs>
        </aside>
      </main>

      {errorMessage ? (
        <div className="fixed right-4 bottom-4 z-50" role="alert">
          <div className="border-border bg-card flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg">
            <span className="flex-1">{errorMessage}</span>
            <button
              type="button"
              aria-label={content.dismissError}
              onClick={() => setErrorMessage('')}
              className="text-muted-foreground hover:text-foreground shrink-0 text-xs font-medium"
            >
              {content.dismissError}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
