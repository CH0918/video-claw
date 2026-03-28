'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Space_Grotesk } from 'next/font/google';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowUp,
  Captions,
  Check,
  ChevronDown,
  Clipboard,
  Clock3,
  Coins,
  Copy,
  Download,
  Eraser,
  GitBranch,
  Globe,
  Languages,
  Lightbulb,
  List,
  MessageSquare,
  NotebookPen,
  Play,
  Plus,
  Search,
  Share2,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import { ThemeToggler } from '@/shared/blocks/common';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { exportTranscript } from '@/shared/lib/video-analysis/transcript';
import { formatTimestamp } from '@/shared/lib/video-analysis/timestamp';
import { buildYouTubeEmbedUrl } from '@/shared/lib/video-analysis/youtube';
import { cn } from '@/shared/lib/utils';
import {
  TopicRange,
  TranscriptExportFormat,
  TranscriptSegment,
  VideoAnalysisPayload,
} from '@/shared/types/video-analysis';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
});

const copy = {
  en: {
    searchPlaceholder: 'Paste a YouTube link to start analyzing...',
    credits: '128',
    chat: 'Chat',
    summary: 'Summary',
    captions: 'Captions',
    mindMap: 'Mind Map',
    notes: 'Notes',
    copySubtitles: 'Copy subtitles',
    downloadSubtitles: 'Download subtitles',
    highlightInputPlaceholder: 'Topic?',
    prompts: ['Key Points', 'Outline', 'Key Questions'],
    askPlaceholder: 'Ask anything about this video...',
    summaryHeading: 'Auto Summary',
    summaryEmpty: 'Analysis is not ready yet.',
    summaryLoading: 'Generating a transcript-grounded summary...',
    mindMapHeading: 'Conversation Graph',
    mindMapBody: 'Mind Map is reserved and will be added later.',
    notesHeading: 'Saved Notes',
    notesBody: 'Notes stays as a placeholder in this version.',
    jump: 'Jump',
    analyzing: 'Analyzing',
    processing: 'Processing transcript',
    thinking: 'Building topics and summary',
    analyze: 'Analyze',
    exportPrompt: 'Click OK to export SRT. Click Cancel to export TXT.',
    authLanguage: 'Original',
    emptyHighlights: 'No highlights yet. Enter a topic to generate time ranges.',
    emptyCaptions: 'Captions will appear after transcript generation completes.',
    emptyChat:
      'Once the transcript is ready, you can ask grounded questions about this video.',
    sendFailed: 'Chat failed. Please try again.',
    topicFailed: 'Topic generation failed. Please try again.',
    analysisFailed: 'Video analysis failed.',
  },
  zh: {
    searchPlaceholder: '粘贴 YouTube 链接，开始分析...',
    credits: '128',
    chat: '对话',
    summary: '摘要',
    captions: '字幕',
    mindMap: '脑图',
    notes: '笔记',
    copySubtitles: '复制字幕',
    downloadSubtitles: '下载字幕',
    highlightInputPlaceholder: '主题?',
    prompts: ['关键点', '大纲', '关键问题'],
    askPlaceholder: '继续围绕这个视频提问...',
    summaryHeading: '自动摘要',
    summaryEmpty: '分析结果尚未生成。',
    summaryLoading: '正在生成基于字幕的摘要...',
    mindMapHeading: '内容关系图',
    mindMapBody: 'Mind Map 功能保留，后续补上。',
    notesHeading: '保存笔记',
    notesBody: 'Notes 功能在这一版继续保留占位。',
    jump: '跳转',
    analyzing: '分析中',
    processing: '正在生成字幕',
    thinking: '正在整理主题与摘要',
    analyze: '分析',
    exportPrompt: '点击“确定”导出 SRT，点击“取消”导出 TXT。',
    authLanguage: '原始字幕',
    emptyHighlights: '暂无高亮结果，可输入主题生成对应时间范围。',
    emptyCaptions: '字幕生成完成后会展示在这里。',
    emptyChat: '字幕就绪后，你可以基于视频内容继续提问。',
    sendFailed: '对话失败，请稍后重试。',
    topicFailed: '主题定位失败，请稍后重试。',
    analysisFailed: '视频分析失败。',
  },
};

type VideoChatCopy = typeof copy.en;

type VideoChatPageProps = {
  locale: string;
  initialUrl?: string;
};

type Message = {
  role: 'assistant' | 'user';
  text: string;
};

type SubtitleItem = {
  timestamp: string;
  text: string;
  active?: boolean;
};

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

function slugify(value: string) {
  return String(value || 'video')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function buildAssistantIntro(
  analysis: VideoAnalysisPayload,
  locale: string
): Message {
  const overview = analysis.summary.overview?.trim();
  const points = analysis.summary.points
    .slice(0, 4)
    .map((point, index) => {
      const prefix = point.timestamp ? `[${point.timestamp}] ` : '';
      return `${index + 1}. ${prefix}${point.title || point.text}`;
    })
    .join('\n');

  return {
    role: 'assistant',
    text:
      locale === 'zh'
        ? `我已经读完这段视频字幕。${overview ? `\n\n${overview}` : ''}${points ? `\n\n${points}` : ''}`
        : `I have analyzed the transcript.${overview ? `\n\n${overview}` : ''}${points ? `\n\n${points}` : ''}`,
  };
}

function getSubtitleItems(
  transcript: TranscriptSegment[],
  activeStart?: number
): SubtitleItem[] {
  return transcript.map((segment) => ({
    timestamp: formatTimestamp(segment.start),
    text: segment.text,
    active:
      typeof activeStart === 'number'
        ? Math.abs(segment.start - activeStart) < 0.5
        : false,
  }));
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

export function VideoChatPage({ locale, initialUrl }: VideoChatPageProps) {
  const content = locale === 'zh' ? copy.zh : copy.en;
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hasBootstrappedRef = useRef(false);

  const [inputUrl, setInputUrl] = useState(initialUrl || '');
  const [analysisState, setAnalysisState] = useState<
    'idle' | 'submitting' | 'polling' | 'ready' | 'error'
  >(initialUrl ? 'submitting' : 'idle');
  const [analysisId, setAnalysisId] = useState('');
  const [analysis, setAnalysis] = useState<VideoAnalysisPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedHighlightTopic, setSelectedHighlightTopic] = useState('');
  const [activeHighlightStart, setActiveHighlightStart] = useState<number>(0);
  const [chatInput, setChatInput] = useState('');
  const [chatInputMode, setChatInputMode] = useState('auto');
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [customHighlightDraft, setCustomHighlightDraft] = useState('');
  const [customTopics, setCustomTopics] = useState<TopicRange[]>([]);
  const [isCustomHighlightEditing, setIsCustomHighlightEditing] =
    useState(false);

  const allTopics = useMemo(
    () => [...customTopics, ...(analysis?.topics || [])],
    [analysis?.topics, customTopics]
  );
  const activeHighlight =
    allTopics.find((topic) => topic.id === selectedHighlightTopic) ||
    allTopics[0] ||
    null;
  const displayedSubtitleItems = useMemo(
    () => getSubtitleItems(analysis?.transcript || [], activeHighlightStart),
    [analysis?.transcript, activeHighlightStart]
  );

  useEffect(() => {
    if (!initialUrl || hasBootstrappedRef.current) return;
    hasBootstrappedRef.current = true;
    void handleAnalyze(initialUrl);
  }, [initialUrl]);

  useEffect(() => {
    if (!analysis) {
      setCustomTopics([]);
      setSelectedHighlightTopic('');
      setActiveHighlightStart(0);
      setChatMessages([]);
      return;
    }

    const firstTopic = analysis.topics[0];
    const firstSegment = firstTopic?.segments[0];
    setSelectedHighlightTopic(firstTopic?.id || '');
    setActiveHighlightStart(firstSegment?.start || 0);
    setChatMessages([buildAssistantIntro(analysis, locale)]);
  }, [analysis, locale]);

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
    setCustomTopics([]);
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

  function seekTo(startSeconds: number) {
    setActiveHighlightStart(startSeconds);

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
  }

  async function handleCopySubtitles() {
    if (!analysis?.transcript?.length || !navigator.clipboard) return;
    await navigator.clipboard.writeText(exportTranscript(analysis.transcript, 'txt'));
  }

  function handleDownloadSubtitles() {
    if (!analysis?.transcript?.length || typeof window === 'undefined') return;
    const format: TranscriptExportFormat = window.confirm(content.exportPrompt)
      ? 'srt'
      : 'txt';

    downloadFile(
      `${slugify(analysis.videoInfo.title || analysis.videoInfo.videoId)}.${format}`,
      exportTranscript(analysis.transcript, format),
      format === 'srt' ? 'application/x-subrip;charset=utf-8' : 'text/plain;charset=utf-8'
    );
  }

  async function handleSendChat(prompt?: string) {
    if (!analysisId || isChatLoading) return;

    const nextInput = String(prompt || chatInput).trim();
    if (!nextInput) return;

    const userMessage: Message = { role: 'user', text: nextInput };
    const nextMessages = [...chatMessages, userMessage];
    setChatMessages(nextMessages);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const result = await postJson<{ answer: string }>('/api/video/chat', {
        analysisId,
        messages: nextMessages.map((message) => ({
          role: message.role,
          content: message.text,
        })),
      });

      setChatMessages((current) => [
        ...current,
        { role: 'assistant', text: result.answer },
      ]);
    } catch {
      setChatMessages((current) => [
        ...current,
        { role: 'assistant', text: content.sendFailed },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  }

  async function handleConfirmCustomHighlight() {
    const theme = customHighlightDraft.trim();
    if (!theme || !analysisId) {
      setIsCustomHighlightEditing(false);
      setCustomHighlightDraft('');
      return;
    }

    try {
      const result = await postJson<{ topics: TopicRange[] }>('/api/video/topic', {
        analysisId,
        theme,
      });

      const nextTopics = result.topics.map((topic, index) => ({
        ...topic,
        id: `custom-${Date.now()}-${index}-${topic.id}`,
      }));

      setCustomTopics((current) => [...nextTopics, ...current]);
      if (nextTopics[0]?.segments[0]) {
        setSelectedHighlightTopic(nextTopics[0].id);
        seekTo(nextTopics[0].segments[0].start);
      }
    } catch {
      setErrorMessage(content.topicFailed);
    } finally {
      setCustomHighlightDraft('');
      setIsCustomHighlightEditing(false);
    }
  }

  const videoEmbedUrl = analysis?.videoInfo.videoId
    ? buildYouTubeEmbedUrl(analysis.videoInfo.videoId)
    : null;

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
                className="border-primary bg-card h-10 rounded-xl pr-12 pl-10 shadow-xs focus-visible:border-primary focus-visible:ring-0"
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
                className="text-muted-foreground absolute top-1/2 right-3.5 -translate-y-1/2"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ThemeToggler
                className="border-border bg-card text-foreground inline-flex size-9 items-center justify-center rounded-lg border shadow-xs transition-colors hover:bg-muted [&_svg]:size-4"
              />
              <TopBadge icon={Globe}>
                {locale === 'zh' ? '中文' : 'EN'}
              </TopBadge>
              <TopMetric icon={Coins}>{content.credits}</TopMetric>
              <div className="border-border flex size-9 items-center justify-center rounded-full border-2 bg-[var(--color-accent)] text-sm font-semibold text-white">
                J
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-65px)] w-full max-w-[1360px] xl:h-[calc(100vh-65px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:overflow-hidden 2xl:max-w-[1440px]">
        <section className="min-w-0 px-4 pb-4 xl:h-full xl:min-h-0 xl:overflow-hidden xl:pt-0 lg:px-6 lg:pb-6">
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

            <HighlightPanel
              content={content}
              locale={locale}
              customHighlightDraft={customHighlightDraft}
              customTopics={customTopics}
              baseTopics={analysis?.topics || []}
              activeHighlight={activeHighlight}
              activeHighlightStart={activeHighlightStart}
              isCustomHighlightEditing={isCustomHighlightEditing}
              selectedHighlightTopic={selectedHighlightTopic}
              onCustomHighlightTopicChange={setCustomHighlightDraft}
              onOpenCustomHighlightEditor={() => setIsCustomHighlightEditing(true)}
              onCancelCustomHighlight={() => {
                setCustomHighlightDraft('');
                setIsCustomHighlightEditing(false);
              }}
              onConfirmCustomHighlight={() => void handleConfirmCustomHighlight()}
              onTopicChange={(topic) => {
                setSelectedHighlightTopic(topic.id);
                if (topic.segments[0]) {
                  seekTo(topic.segments[0].start);
                }
              }}
              onJumpToSegment={(segment) => seekTo(segment.start)}
            />
          </div>
        </section>

        <aside className="border-border bg-card min-h-0 border-t xl:h-full xl:overflow-hidden xl:border-t-0 xl:border-l">
          <Tabs
            defaultValue="chat"
            className="flex h-full min-h-[720px] flex-col xl:min-h-0"
          >
            <TabsList className="border-border bg-muted h-auto w-full shrink-0 justify-start gap-2 overflow-x-auto rounded-none border-b px-4 py-3 xl:grid xl:grid-cols-5 xl:gap-2.5 xl:overflow-visible">
              <WorkspaceTabTrigger
                value="chat"
                icon={MessageSquare}
                label={content.chat}
                className="min-w-[96px] xl:w-full xl:min-w-0"
              />
              <WorkspaceTabTrigger
                value="summary"
                icon={List}
                label={content.summary}
                className="min-w-[96px] xl:w-full xl:min-w-0"
              />
              <WorkspaceTabTrigger
                value="captions"
                icon={Captions}
                label={content.captions}
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
              <ScrollArea className="min-h-0 flex-1 px-5 py-5">
                <div className="space-y-4 pb-4">
                  {chatMessages.length > 0 ? (
                    chatMessages.map((message, index) => (
                      <ChatBubble
                        key={`${message.role}-${index}`}
                        message={message}
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
                <div className="flex flex-wrap gap-2">
                  {content.prompts.map((prompt, index) => (
                    <Button
                      key={prompt}
                      variant="outline"
                      className="border-border bg-background h-8 rounded-full px-3 text-xs font-medium"
                      onClick={() => {
                        setChatInput(prompt);
                        if (analysisState === 'ready') {
                          void handleSendChat(prompt);
                        }
                      }}
                    >
                      {index === 0 && (
                        <Lightbulb className="text-primary size-3.5" />
                      )}
                      {index === 1 && (
                        <List className="text-primary size-3.5" />
                      )}
                      {index === 2 && <Zap className="text-primary size-3.5" />}
                      {prompt}
                    </Button>
                  ))}
                </div>

                <div className="space-y-3 px-1 pt-1">
                  <div className="border-border bg-card relative rounded-[24px] border px-4 py-4 shadow-xs">
                    <Textarea
                      aria-label="Ask anything about this video"
                      rows={2}
                      maxLength={5000}
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      className="text-foreground min-h-28 resize-none border-0 !bg-transparent px-0 py-0 pr-20 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder={content.askPlaceholder}
                    />
                    <Button
                      size="icon"
                      type="button"
                      aria-label="Send message"
                      disabled={analysisState !== 'ready' || isChatLoading}
                      onClick={() => void handleSendChat()}
                      className={cn(
                        'absolute right-4 bottom-4 size-10 rounded-xl',
                        chatInput.trim()
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-primary/20 text-primary hover:bg-primary/25'
                      )}
                    >
                      <ArrowUp className="size-4.5" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-3 px-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative">
                        <Languages className="text-foreground pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2" />
                        <select
                          aria-label="Chat input mode"
                          value={chatInputMode}
                          onChange={(event) =>
                            setChatInputMode(event.target.value)
                          }
                          className="border-border bg-background text-foreground h-11 min-w-[132px] appearance-none rounded-2xl border py-0 pr-10 pl-12 text-sm font-semibold shadow-none outline-none focus-visible:border-primary focus-visible:ring-0"
                        >
                          <option value="auto">
                            {locale === 'zh' ? '自动' : 'Auto'}
                          </option>
                          <option value="translate">
                            {locale === 'zh' ? '翻译' : 'Translate'}
                          </option>
                        </select>
                        <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2" />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Copy"
                        onClick={() =>
                          navigator.clipboard?.writeText(
                            chatMessages.map((message) => message.text).join('\n\n')
                          )
                        }
                        className="text-muted-foreground hover:text-foreground size-10 rounded-xl"
                      >
                        <Clipboard className="size-5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Clear"
                        onClick={() => setChatInput('')}
                        className="text-muted-foreground hover:text-foreground size-10 rounded-xl"
                      >
                        <Eraser className="size-5" />
                      </Button>
                    </div>

                    <div className="text-muted-foreground text-sm font-medium">
                      {chatInput.length}/5000
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <SidebarContent value="summary">
              <SummaryPanel
                content={content}
                analysis={analysis}
                isLoading={analysisState === 'submitting' || analysisState === 'polling'}
              />
            </SidebarContent>
            <SidebarContent value="captions">
              <CaptionsPanel
                content={content}
                displayedSubtitleItems={displayedSubtitleItems}
                subtitleLanguage="original"
                subtitleLanguages={[
                  {
                    value: 'original',
                    label: content.authLanguage,
                  },
                ]}
                onSubtitleLanguageChange={() => undefined}
                onCopySubtitles={handleCopySubtitles}
                onDownloadSubtitles={handleDownloadSubtitles}
              />
            </SidebarContent>
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

function TopBadge({
  children,
  icon: Icon,
  muted = false,
}: {
  children: React.ReactNode;
  icon: LucideIcon;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        'border-border inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shadow-xs',
        muted ? 'bg-muted text-foreground' : 'bg-card text-foreground'
      )}
    >
      <Icon
        className={cn(
          'size-3.5',
          muted ? 'text-primary' : 'text-muted-foreground'
        )}
      />
      <span>{children}</span>
      {!muted && <ChevronDown className="text-muted-foreground size-3.5" />}
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

function SummaryPanel({
  content,
  analysis,
  isLoading,
}: {
  content: VideoChatCopy;
  analysis: VideoAnalysisPayload | null;
  isLoading: boolean;
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
              {(analysis?.summary.points || []).map((point, index) => (
                <div
                  key={`${point.timestamp || 'point'}-${index}`}
                  className="flex gap-3"
                >
                  <div className="text-primary min-w-5 text-sm font-semibold">
                    {index + 1}.
                  </div>
                  <p className="text-muted-foreground text-sm leading-6">
                    {point.timestamp ? `[${point.timestamp}] ` : ''}
                    {point.title ? `${point.title}: ` : ''}
                    {point.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function HighlightPanel({
  content,
  locale,
  customHighlightDraft,
  customTopics,
  baseTopics,
  activeHighlight,
  activeHighlightStart,
  isCustomHighlightEditing,
  selectedHighlightTopic,
  onCustomHighlightTopicChange,
  onOpenCustomHighlightEditor,
  onCancelCustomHighlight,
  onConfirmCustomHighlight,
  onTopicChange,
  onJumpToSegment,
}: {
  content: VideoChatCopy;
  locale: string;
  customHighlightDraft: string;
  customTopics: TopicRange[];
  baseTopics: TopicRange[];
  activeHighlight: TopicRange | null;
  activeHighlightStart: number;
  isCustomHighlightEditing: boolean;
  selectedHighlightTopic: string;
  onCustomHighlightTopicChange: (value: string) => void;
  onOpenCustomHighlightEditor: () => void;
  onCancelCustomHighlight: () => void;
  onConfirmCustomHighlight: () => void;
  onTopicChange: (topic: TopicRange) => void;
  onJumpToSegment: (segment: TopicRange['segments'][number]) => void;
}) {
  return (
    <div className="border-border bg-card/80 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border shadow-xs">
      <div className="border-border bg-background/95 space-y-3 border-b p-4">
        <div className="flex flex-wrap gap-2">
          {isCustomHighlightEditing ? (
            <div className="border-border bg-background flex h-10 min-w-[100px] items-center gap-2 rounded-full border px-2.5 shadow-xs">
              <input
                autoFocus
                value={customHighlightDraft}
                onChange={(event) =>
                  onCustomHighlightTopicChange(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onConfirmCustomHighlight();
                  }

                  if (event.key === 'Escape') {
                    event.preventDefault();
                    onCancelCustomHighlight();
                  }
                }}
                placeholder={content.highlightInputPlaceholder}
                className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
              />
              <button
                type="button"
                onClick={onConfirmCustomHighlight}
                className="text-primary hover:bg-primary/10 inline-flex size-6 items-center justify-center rounded-full transition-colors"
                aria-label={locale === 'zh' ? '确认主题' : 'Confirm topic'}
              >
                <Check className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={onCancelCustomHighlight}
                className="text-muted-foreground hover:bg-muted inline-flex size-6 items-center justify-center rounded-full transition-colors"
                aria-label={locale === 'zh' ? '取消编辑' : 'Cancel editing'}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenCustomHighlightEditor}
              className="border-border bg-background text-muted-foreground hover:bg-muted inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors"
            >
              <span>{content.highlightInputPlaceholder}</span>
              <Plus className="size-3.5" />
            </button>
          )}

          {[...customTopics, ...baseTopics].map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => onTopicChange(topic)}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                topic.id === selectedHighlightTopic
                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                  : 'border-border bg-card text-foreground hover:bg-muted'
              )}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-4">
          {activeHighlight?.segments?.length ? (
            activeHighlight.segments.map((segment) => (
              <button
                key={`${activeHighlight.id}-${segment.start}-${segment.end}`}
                type="button"
                onClick={() => onJumpToSegment(segment)}
                className={cn(
                  'border-border bg-background hover:bg-muted/60 block w-full rounded-2xl border p-4 text-left transition-colors',
                  Math.abs(activeHighlightStart - segment.start) < 0.5 &&
                    'bg-accent/55 dark:bg-accent/30'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="bg-primary/12 text-primary dark:bg-primary/18 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold">
                    <Clock3 className="size-3.5" />
                    {formatTimestamp(segment.start)} - {formatTimestamp(segment.end)}
                  </span>
                  <span className="text-primary inline-flex items-center gap-2 text-sm font-semibold">
                    <Play className="size-4 fill-current" />
                    {content.jump}
                  </span>
                </div>
                <p className="text-foreground mt-3 text-sm leading-7 font-medium">
                  {segment.text}
                </p>
              </button>
            ))
          ) : (
            <div className="text-muted-foreground text-sm leading-7">
              {content.emptyHighlights}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function CaptionsPanel({
  content,
  displayedSubtitleItems,
  subtitleLanguage,
  subtitleLanguages,
  onSubtitleLanguageChange,
  onCopySubtitles,
  onDownloadSubtitles,
}: {
  content: VideoChatCopy;
  displayedSubtitleItems: SubtitleItem[];
  subtitleLanguage: string;
  subtitleLanguages: Array<{ value: string; label: string }>;
  onSubtitleLanguageChange: (value: string) => void;
  onCopySubtitles: () => void | Promise<void>;
  onDownloadSubtitles: () => void;
}) {
  return (
    <div className="border-border bg-card/80 flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border shadow-xs">
      <div className="border-border bg-background/95 flex flex-wrap items-center gap-2 border-b p-3">
        <div className="flex flex-wrap items-center gap-3">
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
              value={subtitleLanguage}
              onChange={(event) =>
                onSubtitleLanguageChange(event.target.value)
              }
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
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-4">
          {displayedSubtitleItems.length > 0 ? (
            displayedSubtitleItems.map((item, index) => (
              <SubtitleListItem
                key={`${item.timestamp}-${index}`}
                item={item}
                merged
              />
            ))
          ) : (
            <div className="text-muted-foreground text-sm leading-7">
              {content.emptyCaptions}
            </div>
          )}
        </div>
      </ScrollArea>
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
  merged,
}: {
  item: SubtitleItem;
  merged: boolean;
}) {
  if (!merged) {
    return (
      <div className="border-border grid gap-3 border-b px-4 py-4 last:border-b-0 md:grid-cols-[104px_minmax(0,1fr)] md:gap-4">
        <div className="pt-0.5">
          <span className="bg-primary/12 text-primary dark:bg-primary/18 inline-flex rounded-full px-3 py-1.5 text-sm font-semibold">
            {item.timestamp}
          </span>
        </div>
        <p className="text-muted-foreground text-sm leading-7">{item.text}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl px-4 py-4',
        item.active ? 'bg-accent/70 dark:bg-accent/35' : 'bg-transparent'
      )}
    >
      <div className="flex items-start gap-4">
        <span className="bg-primary/12 text-primary dark:bg-primary/18 inline-flex shrink-0 rounded-xl px-2.5 py-1.5 text-sm font-semibold">
          {item.timestamp}
        </span>
        <p className="text-foreground text-sm leading-7 font-medium">
          {item.text}
        </p>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground max-w-[280px] rounded-xl px-4 py-3 text-sm leading-6">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start">
      <div className="bg-card/90 border-border text-foreground max-w-full rounded-xl border px-4 py-3 text-sm leading-7 shadow-xs backdrop-blur-sm">
        <p className="whitespace-pre-line">{message.text}</p>
      </div>
    </div>
  );
}

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
