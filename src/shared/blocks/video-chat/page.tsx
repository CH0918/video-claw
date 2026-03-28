'use client';

import { useState } from 'react';
import { Space_Grotesk } from 'next/font/google';
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
  Fullscreen,
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
  Settings2,
  Share2,
  Volume2,
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
import { cn } from '@/shared/lib/utils';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
});

const copy = {
  en: {
    searchPlaceholder: 'Paste a video link to start analyzing...',
    credits: '128',
    duration: '8.27 min',
    overview: 'Overview',
    highlight: 'Highlight',
    subtitles: 'Subtitles',
    chat: 'Chat',
    summary: 'Summary',
    captions: 'Captions',
    mindMap: 'Mind Map',
    notes: 'Notes',
    title: 'How to Build a Startup in 2025 - Complete Guide',
    channel: 'TechVision · 245K subscribers',
    subscribe: 'Subscribe',
    like: '1.2K',
    share: 'Share',
    save: 'Save',
    download: 'Download',
    copySubtitles: 'Copy subtitles',
    downloadSubtitles: 'Download subtitles',
    views: '1.2M views',
    published: 'Published Mar 15, 2025',
    description:
      'A complete guide on how to build a startup in 2025. Covers the entire journey from initial idea validation, product development, fundraising strategies, to team building. Perfect for aspiring founders and anyone interested in entrepreneurship.',
    tags: ['#Startup', '#2025Guide', '#Entrepreneurship'],
    summaryPoints: [
      'Idea validation should happen before you write code or raise money.',
      'Your MVP only needs one tight value loop that real users will pay attention to.',
      'Fundraising works better when traction, narrative, and market timing are aligned.',
      'The best early hires close capability gaps instead of just increasing headcount.',
    ],
    subtitleItems: [
      {
        timestamp: '00:03',
        text: "Uh you've recently traveled to China. Uh so it's interesting to ask you uh China's been incredibly successful in building up its technology sector.",
        active: true,
      },
      {
        timestamp: '00:24',
        text: 'What do you understand about how China is able to over the past 10 years build so many incredible world-class companies and world-class engineering teams?',
      },
      {
        timestamp: '00:44',
        text: 'Well first of all let’s start with some facts. China now graduates more engineers every year than the United States and Europe combined.',
      },
      {
        timestamp: '01:12',
        text: 'Then layer on the supply chain density, the speed of iteration, and the size of the domestic market, and you have a very unusual innovation environment.',
      },
    ],
    subtitleLanguages: [
      { value: 'en-auto', label: 'English (Auto)' },
      { value: 'zh-cn', label: 'Chinese (Simplified)' },
    ],
    subtitlesIntro:
      '00:12 Building a startup in 2025 starts with a clear problem, not a clever feature.',
    subtitlesBody:
      '01:34 Founders who validate demand early dramatically reduce wasted product cycles.\n04:10 A credible pitch deck explains why this market matters now and why your team can win.\n07:42 Your first team should be small, fast, and deeply aligned on the mission.',
    highlightInputPlaceholder: 'Topic?',
    highlightTopics: [
      {
        id: 'validation',
        label: 'Idea Validation',
        segments: [
          {
            start: '00:12',
            end: '01:08',
            transcript:
              'Building a startup in 2025 starts with a clear problem, not a clever feature. You want proof that the pain is urgent before you invest real build time.',
          },
          {
            start: '01:34',
            end: '02:26',
            transcript:
              'Founders who validate demand early dramatically reduce wasted product cycles. Talk to users, test the message, and learn what they already do to solve it.',
          },
          {
            start: '03:18',
            end: '04:02',
            transcript:
              'The strongest validation signal is repetition. If multiple users describe the same pain with the same urgency, you are probably looking at a real market need.',
          },
        ],
      },
      {
        id: 'mvp',
        label: 'MVP Scope',
        segments: [
          {
            start: '05:02',
            end: '05:58',
            transcript:
              'Your MVP only needs one tight value loop that real users immediately understand. It should solve one painful step clearly instead of trying to look complete.',
          },
          {
            start: '06:24',
            end: '07:05',
            transcript:
              'Ignore edge features early. Settings, polish, and automation can wait until the core behavior is repeated often enough to deserve optimization.',
          },
        ],
      },
      {
        id: 'fundraising',
        label: 'Fundraising',
        segments: [
          {
            start: '08:40',
            end: '09:26',
            transcript:
              'Fundraising works better when you already have concrete usage signals. Even lightweight traction gives investors a clearer reason to believe the story.',
          },
          {
            start: '10:15',
            end: '11:12',
            transcript:
              'A credible pitch explains why this market matters now, why your team can win, and why the current momentum is enough to justify the next round.',
          },
          {
            start: '12:34',
            end: '13:18',
            transcript:
              'Seek investors who already understand the category. The best early capital comes from people who recognize the pattern and can move quickly with conviction.',
          },
        ],
      },
    ],
    chatMessages: [
      {
        role: 'assistant' as const,
        text: 'This video covers a complete guide to building a startup in 2025, with these core takeaways:\n\n1. Idea Validation: How to quickly validate your business idea\n2. MVP Development: Strategies for building a minimum viable product\n3. Fundraising: The path from angel round to Series A\n4. Team Building: How to find the right co-founder',
      },
      {
        role: 'user' as const,
        text: 'What specific advice was given about fundraising?',
      },
      {
        role: 'assistant' as const,
        text: 'Regarding fundraising, the video suggests:\n• Start by validating your idea with your own funds first\n• Seek out industry-relevant angel investors\n• Prepare a clear and compelling pitch deck',
      },
    ],
    prompts: ['Key Points', 'Outline', 'Key Questions'],
    askPlaceholder: 'Ask anything about this video...',
    transcriptHeading: 'Subtitles Snapshot',
    transcriptNote:
      'The subtitle stream is organized as short timecoded blocks so the user can jump back into the relevant part of the video.',
    summaryHeading: 'Auto Summary',
    summaryBody:
      'Founders who move fastest in 2025 are compressing the cycle between validating demand, shipping an MVP, and proving enough traction to raise from aligned angels.',
    mindMapHeading: 'Conversation Graph',
    mindMapBody:
      'Problem → validation interviews → MVP scope → traction metrics → investor story → first hires.',
    notesHeading: 'Saved Notes',
    notesBody:
      'Use this panel for extracted quotes, action items, and timestamped observations while watching.',
  },
  zh: {
    searchPlaceholder: '粘贴视频链接，开始分析...',
    credits: '128',
    duration: '8.27 分钟',
    overview: '概览',
    highlight: 'Highlight',
    subtitles: '字幕',
    chat: '对话',
    summary: '摘要',
    captions: '字幕',
    mindMap: '脑图',
    notes: '笔记',
    title: 'How to Build a Startup in 2025 - Complete Guide',
    channel: 'TechVision · 24.5 万订阅',
    subscribe: '订阅',
    like: '1.2K',
    share: '分享',
    save: '收藏',
    download: '下载',
    copySubtitles: '复制字幕',
    downloadSubtitles: '下载字幕',
    views: '120 万次观看',
    published: '发布于 2025-03-15',
    description:
      '这是一份关于如何在 2025 年打造创业公司的完整指南，覆盖从想法验证、产品开发、融资策略到团队搭建的完整路径，适合创业者与关注商业的人群。',
    tags: ['#创业', '#2025指南', '#Entrepreneurship'],
    summaryPoints: [
      '在写代码或融资之前，先验证问题是否真实存在。',
      'MVP 只需要聚焦一个足够清晰的核心价值闭环。',
      '融资效率来自 traction、叙事和市场时机的同步成立。',
      '早期招聘最重要的是补齐能力短板，而不是单纯扩编。',
    ],
    subtitleItems: [
      {
        timestamp: '00:03',
        text: '你最近去过中国，所以我很好奇想问你，中国在建设自己的科技产业方面为什么会这么成功。',
        active: true,
      },
      {
        timestamp: '00:24',
        text: '过去十年里，中国是怎么建立起这么多世界级公司，以及这么多世界级工程团队的？',
      },
      {
        timestamp: '00:44',
        text: '先从一些事实开始说起。中国每年毕业的工程师数量，现在已经超过美国和欧洲的总和。',
      },
      {
        timestamp: '01:12',
        text: '再叠加高密度供应链、极快的迭代速度，以及巨大的本土市场，就形成了一个非常特殊的创新环境。',
      },
    ],
    subtitleLanguages: [
      { value: 'en-auto', label: 'English（自动识别）' },
      { value: 'zh-cn', label: '中文（简体）' },
    ],
    subtitlesIntro:
      '00:12 在 2025 年做创业，起点应该是清晰的问题，而不是一个看起来聪明的功能。',
    subtitlesBody:
      '01:34 越早验证需求，越能减少无效的产品迭代。\n04:10 一份可信的 pitch deck 需要讲清楚市场窗口、竞争优势和团队能力。\n07:42 第一批成员要小而精，并且在方向上高度一致。',
    highlightInputPlaceholder: '主题?',
    highlightTopics: [
      {
        id: 'validation',
        label: '需求验证',
        segments: [
          {
            start: '00:12',
            end: '01:08',
            transcript:
              '在 2025 年做创业，起点应该是清晰的问题，而不是一个看起来聪明的功能。先确认这个痛点是否真实且足够强烈。',
          },
          {
            start: '01:34',
            end: '02:26',
            transcript:
              '越早验证需求，越能减少无效的产品迭代。先通过访谈、落地页或轻量测试去确认用户是否真的在意这个问题。',
          },
          {
            start: '03:18',
            end: '04:02',
            transcript:
              '如果多个用户反复提到同一个痛点，并且已经在用低效方式自行解决，这通常说明你找到了值得切入的主题。',
          },
        ],
      },
      {
        id: 'mvp',
        label: 'MVP 范围',
        segments: [
          {
            start: '05:02',
            end: '05:58',
            transcript:
              'MVP 只需要聚焦一个足够清晰的核心价值闭环，让用户在最短路径里真正感受到价值，而不是做成一个完整产品。',
          },
          {
            start: '06:24',
            end: '07:05',
            transcript:
              '自动化、设置项和精细体验都应该等核心行为被反复验证后再补，第一版先不要被边缘能力拖慢。',
          },
        ],
      },
      {
        id: 'fundraising',
        label: '融资',
        segments: [
          {
            start: '08:40',
            end: '09:26',
            transcript:
              '融资效率来自 traction、叙事和市场时机的同步成立。哪怕只是早期信号，也能显著提升故事的可信度。',
          },
          {
            start: '10:15',
            end: '11:12',
            transcript:
              '一份可信的 pitch deck 需要讲清楚市场窗口、竞争优势和团队能力，也就是为什么是现在、为什么是你们、为什么能赢。',
          },
          {
            start: '12:34',
            end: '13:18',
            transcript:
              '更适合优先接触对你所在赛道已经有理解的天使或基金，这类投资人更容易快速判断并建立信任。',
          },
        ],
      },
    ],
    chatMessages: [
      {
        role: 'assistant' as const,
        text: '这个视频梳理了 2025 年创业的完整路径，核心包含：\n\n1. 想法验证：如何快速判断需求是否真实存在\n2. MVP 开发：如何用更小范围做出可验证产品\n3. 融资路径：从天使轮到 Series A 的准备重点\n4. 团队搭建：如何找到真正互补的联合创始人',
      },
      {
        role: 'user' as const,
        text: '视频里关于融资给了哪些具体建议？',
      },
      {
        role: 'assistant' as const,
        text: '关于融资，视频给出的建议包括：\n• 先用自有资源验证方向，尽量提高议价能力\n• 优先接触与你行业认知更匹配的天使投资人\n• 用清晰且有说服力的 Pitch Deck 去解释机会和进展',
      },
    ],
    prompts: ['关键点', '大纲', '关键问题'],
    askPlaceholder: '围绕这个视频继续提问...',
    transcriptHeading: '字幕速览',
    transcriptNote:
      '字幕区按时间片段组织，用户可以快速回跳到视频中的相关段落。',
    summaryHeading: '自动摘要',
    summaryBody:
      '2025 年创业效率最高的团队，往往都在尽量压缩“验证需求、交付 MVP、拿到初步 traction”这三个步骤之间的时间差。',
    mindMapHeading: '内容关系图',
    mindMapBody:
      '问题定义 → 用户验证 → MVP 范围 → traction 指标 → 融资叙事 → 关键招聘。',
    notesHeading: '保存笔记',
    notesBody: '这里适合沉淀高价值观点、行动项，以及带时间戳的观察记录。',
  },
};

type VideoChatCopy = typeof copy.en;

type VideoChatPageProps = {
  locale: string;
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

type HighlightSegment = {
  start: string;
  end: string;
  transcript: string;
};

type HighlightTopic = {
  id: string;
  label: string;
  segments: HighlightSegment[];
};

type CustomHighlightTopic = {
  id: string;
  label: string;
  sourceId: string;
};

const VIDEO_DURATION_SECONDS = 45 * 60 + 20;
const INITIAL_PLAYBACK_POSITION = 12 * 60 + 34;

function parseTimestampToSeconds(timestamp: string) {
  const [minutes = '0', seconds = '0'] = timestamp.split(':');
  return Number(minutes) * 60 + Number(seconds);
}

function formatSecondsAsTimestamp(totalSeconds: number) {
  const safeTotal = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeTotal / 60);
  const seconds = safeTotal % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function resolveHighlightTopic(
  query: string,
  topics: HighlightTopic[]
): HighlightTopic | undefined {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return topics[0];
  }

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  const scoredTopics = topics.map((topic) => {
    const haystack = [
      topic.id,
      topic.label,
      ...topic.segments.map((segment) => segment.transcript),
    ]
      .join(' ')
      .toLowerCase();

    const exactMatch = haystack.includes(normalizedQuery) ? 4 : 0;
    const tokenScore = queryTokens.reduce(
      (score, token) => score + (haystack.includes(token) ? 1 : 0),
      0
    );

    return {
      topic,
      score: exactMatch + tokenScore,
    };
  });

  return scoredTopics.sort((a, b) => b.score - a.score)[0]?.topic ?? topics[0];
}

export function VideoChatPage({ locale }: VideoChatPageProps) {
  const content = locale === 'zh' ? copy.zh : copy.en;
  const [subtitleLanguage, setSubtitleLanguage] = useState(
    content.subtitleLanguages[0]?.value ?? 'en-auto'
  );
  const [chatInput, setChatInput] = useState('');
  const [chatInputMode, setChatInputMode] = useState('auto');
  const [playbackPosition, setPlaybackPosition] = useState(
    INITIAL_PLAYBACK_POSITION
  );
  const [customHighlightDraft, setCustomHighlightDraft] = useState('');
  const [customHighlightTopics, setCustomHighlightTopics] = useState<
    CustomHighlightTopic[]
  >([]);
  const [isCustomHighlightEditing, setIsCustomHighlightEditing] =
    useState(false);
  const [selectedHighlightTopic, setSelectedHighlightTopic] = useState(
    content.highlightTopics[0]?.id ?? ''
  );
  const [activeHighlightTimestamp, setActiveHighlightTimestamp] = useState(
    content.highlightTopics[0]?.segments[0]?.start ?? ''
  );
  const displayedSubtitleItems =
    subtitleLanguage === 'zh-cn'
      ? copy.zh.subtitleItems
      : copy.en.subtitleItems;

  const subtitleExportText = displayedSubtitleItems
    .map((item) => `${item.timestamp} ${item.text}`)
    .join('\n\n');

  const selectedSubtitleLanguage =
    content.subtitleLanguages.find((item) => item.value === subtitleLanguage) ??
    content.subtitleLanguages[0];
  const selectedCustomHighlightTopic = customHighlightTopics.find(
    (item) => item.id === selectedHighlightTopic
  );
  const activeHighlight =
    content.highlightTopics.find((item) =>
      item.id ===
      (selectedCustomHighlightTopic?.sourceId ?? selectedHighlightTopic)
    ) ??
    content.highlightTopics[0];
  const playbackProgress = Math.min(
    100,
    (playbackPosition / VIDEO_DURATION_SECONDS) * 100
  );

  async function handleCopySubtitles() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(subtitleExportText);
  }

  function handleDownloadSubtitles() {
    if (typeof document === 'undefined') {
      return;
    }

    const blob = new Blob([subtitleExportText], {
      type: 'text/plain;charset=utf-8',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = `subtitles-${selectedSubtitleLanguage?.value ?? 'export'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleHighlightTopicChange(topic: HighlightTopic) {
    setSelectedHighlightTopic(topic.id);
    setActiveHighlightTimestamp(topic.segments[0]?.start ?? '');
  }

  function handleCustomHighlightTopicChange(topic: CustomHighlightTopic) {
    const matchedTopic = content.highlightTopics.find(
      (item) => item.id === topic.sourceId
    );

    setSelectedHighlightTopic(topic.id);
    setActiveHighlightTimestamp(matchedTopic?.segments[0]?.start ?? '');
  }

  function handleOpenCustomHighlightEditor() {
    setCustomHighlightDraft('');
    setIsCustomHighlightEditing(true);
  }

  function handleCancelCustomHighlight() {
    setCustomHighlightDraft('');
    setIsCustomHighlightEditing(false);
  }

  function handleConfirmCustomHighlight() {
    const normalizedValue = customHighlightDraft.trim();

    if (!normalizedValue) {
      handleCancelCustomHighlight();
      return;
    }

    const matchedTopic = resolveHighlightTopic(
      normalizedValue,
      content.highlightTopics
    );
    const nextCustomTopic: CustomHighlightTopic = {
      id: `custom-${Date.now()}`,
      label: normalizedValue,
      sourceId: matchedTopic?.id ?? content.highlightTopics[0]?.id ?? '',
    };

    setCustomHighlightTopics((current) => [...current, nextCustomTopic]);
    setSelectedHighlightTopic(nextCustomTopic.id);
    setActiveHighlightTimestamp(matchedTopic?.segments[0]?.start ?? '');
    setCustomHighlightDraft('');
    setIsCustomHighlightEditing(false);
  }

  function handleJumpToHighlight(segment: HighlightSegment) {
    setPlaybackPosition(parseTimestampToSeconds(segment.start));
    setActiveHighlightTimestamp(segment.start);
  }

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
                className="border-primary bg-card h-10 rounded-xl pr-10 pl-10 shadow-xs focus-visible:border-primary focus-visible:ring-0"
                defaultValue=""
                placeholder={content.searchPlaceholder}
              />
              <ArrowRight className="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2" />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ThemeToggler
                className="border-border bg-card text-foreground inline-flex size-9 items-center justify-center rounded-lg border shadow-xs transition-colors hover:bg-muted [&_svg]:size-4"
              />
              <TopBadge icon={Globe}>
                {locale === 'zh' ? '中文' : 'EN'}
              </TopBadge>
              <TopMetric icon={Coins}>
                {content.credits}
              </TopMetric>
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
              <div className="aspect-video w-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.18))]" />

              <button
                className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/15"
                type="button"
                aria-label="Play video"
              >
                <Play className="size-7 fill-current" />
              </button>

              <div className="absolute right-5 bottom-5 left-5 flex flex-col gap-3 rounded-xl bg-black/80 px-4 py-3 text-white backdrop-blur-md lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3 text-sm">
                  <Play className="size-4 fill-current" />
                  <Volume2 className="size-4 text-white/75" />
                  <span className="text-white/75">
                    {formatSecondsAsTimestamp(playbackPosition)} /{' '}
                    {formatSecondsAsTimestamp(VIDEO_DURATION_SECONDS)}
                  </span>
                </div>

                <div className="flex flex-1 items-center gap-3 lg:max-w-[420px]">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="bg-primary h-full rounded-full transition-[width] duration-300"
                      style={{ width: `${playbackProgress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 text-white/75">
                  <Captions className="size-4" />
                  <Settings2 className="size-4" />
                  <Fullscreen className="size-4" />
                </div>
              </div>
            </div>

            <HighlightPanel
              content={content}
              locale={locale}
              customHighlightDraft={customHighlightDraft}
              customHighlightTopics={customHighlightTopics}
              activeHighlight={activeHighlight}
              activeHighlightTimestamp={activeHighlightTimestamp}
              isCustomHighlightEditing={isCustomHighlightEditing}
              onCustomHighlightTopicChange={setCustomHighlightDraft}
              onOpenCustomHighlightEditor={handleOpenCustomHighlightEditor}
              onCancelCustomHighlight={handleCancelCustomHighlight}
              onConfirmCustomHighlight={handleConfirmCustomHighlight}
              onTopicChange={handleHighlightTopicChange}
              onCustomTopicSelect={handleCustomHighlightTopicChange}
              onJumpToSegment={handleJumpToHighlight}
              selectedHighlightTopic={selectedHighlightTopic}
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
                  {content.chatMessages.map((message, index) => (
                    <ChatBubble
                      key={`${message.role}-${index}`}
                      message={message}
                    />
                  ))}
                </div>
              </ScrollArea>

              <div className="border-border space-y-3 border-t px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  {content.prompts.map((prompt, index) => (
                    <Button
                      key={prompt}
                      variant="outline"
                      className="border-border bg-background h-8 rounded-full px-3 text-xs font-medium"
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
              <SummaryPanel content={content} />
            </SidebarContent>
            <SidebarContent value="captions">
              <CaptionsPanel
                content={content}
                displayedSubtitleItems={displayedSubtitleItems}
                subtitleLanguage={subtitleLanguage}
                onSubtitleLanguageChange={setSubtitleLanguage}
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

function SummaryPanel({ content }: { content: VideoChatCopy }) {
  return (
    <div className="border-border bg-card/70 h-full overflow-hidden rounded-2xl border shadow-xs">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-5 p-5">
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            {content.title}
          </h1>

          <div>
            <h2 className="text-base font-semibold tracking-tight">
              {content.summaryHeading}
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              {content.summaryBody}
            </p>

            <div className="mt-5 space-y-4">
              {content.summaryPoints.map((point, index) => (
                <div key={point} className="flex gap-3">
                  <div className="text-primary min-w-5 text-sm font-semibold">
                    {index + 1}.
                  </div>
                  <p className="text-muted-foreground text-sm leading-6">
                    {point}
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
  customHighlightTopics,
  activeHighlight,
  activeHighlightTimestamp,
  isCustomHighlightEditing,
  selectedHighlightTopic,
  onCustomHighlightTopicChange,
  onOpenCustomHighlightEditor,
  onCancelCustomHighlight,
  onConfirmCustomHighlight,
  onTopicChange,
  onCustomTopicSelect,
  onJumpToSegment,
}: {
  content: VideoChatCopy;
  locale: string;
  customHighlightDraft: string;
  customHighlightTopics: CustomHighlightTopic[];
  activeHighlight?: HighlightTopic;
  activeHighlightTimestamp: string;
  isCustomHighlightEditing: boolean;
  selectedHighlightTopic: string;
  onCustomHighlightTopicChange: (value: string) => void;
  onOpenCustomHighlightEditor: () => void;
  onCancelCustomHighlight: () => void;
  onConfirmCustomHighlight: () => void;
  onTopicChange: (topic: HighlightTopic) => void;
  onCustomTopicSelect: (topic: CustomHighlightTopic) => void;
  onJumpToSegment: (segment: HighlightSegment) => void;
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

          {customHighlightTopics.map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => onCustomTopicSelect(topic)}
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

          {content.highlightTopics.map((topic) => (
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
          {activeHighlight?.segments.map((segment) => (
            <button
              key={`${activeHighlight.id}-${segment.start}-${segment.end}`}
              type="button"
              onClick={() => onJumpToSegment(segment)}
              className={cn(
                'border-border bg-background hover:bg-muted/60 block w-full rounded-2xl border p-4 text-left transition-colors',
                activeHighlightTimestamp === segment.start &&
                  'bg-accent/55 dark:bg-accent/30'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="bg-primary/12 text-primary dark:bg-primary/18 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold">
                  <Clock3 className="size-3.5" />
                  {segment.start} - {segment.end}
                </span>
                <span className="text-primary inline-flex items-center gap-2 text-sm font-semibold">
                  <Play className="size-4 fill-current" />
                  {locale === 'zh' ? '跳转' : 'Jump'}
                </span>
              </div>
              <p className="text-foreground mt-3 text-sm leading-7 font-medium">
                {segment.transcript}
              </p>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function CaptionsPanel({
  content,
  displayedSubtitleItems,
  subtitleLanguage,
  onSubtitleLanguageChange,
  onCopySubtitles,
  onDownloadSubtitles,
}: {
  content: VideoChatCopy;
  displayedSubtitleItems: SubtitleItem[];
  subtitleLanguage: string;
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
              {content.subtitleLanguages.map((language) => (
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
          {displayedSubtitleItems.map((item) => (
            <SubtitleListItem key={item.timestamp} item={item} merged />
          ))}
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
