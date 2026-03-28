'use client';

import { Space_Grotesk } from 'next/font/google';
import {
  ArrowRight,
  Captions,
  ChevronDown,
  Copy,
  FileText,
  Fullscreen,
  GitBranch,
  Globe,
  Lightbulb,
  List,
  MessageSquare,
  NotebookPen,
  Play,
  Search,
  SendHorizontal,
  Settings2,
  Share2,
  Sparkles,
  Volume2,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import { cn } from '@/shared/lib/utils';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
});

const copy = {
  en: {
    searchPlaceholder: 'Paste a video link to start analyzing...',
    credits: '128 Credits',
    duration: '8.27 min',
    overview: 'Overview',
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
        range: '00:12 - 00:38',
        text: 'Building a startup in 2025 starts with a clear problem, not a clever feature.',
      },
      {
        range: '01:34 - 02:08',
        text: 'Founders who validate demand early dramatically reduce wasted product cycles and avoid shipping noise.',
      },
      {
        range: '04:10 - 04:49',
        text: 'A credible pitch deck explains why the market matters now, why your team is positioned to win, and what traction already exists.',
      },
      {
        range: '07:42 - 08:19',
        text: 'The first team should stay small, move fast, and stay tightly aligned around one operating principle.',
      },
    ],
    subtitlesIntro:
      '00:12 Building a startup in 2025 starts with a clear problem, not a clever feature.',
    subtitlesBody:
      '01:34 Founders who validate demand early dramatically reduce wasted product cycles.\n04:10 A credible pitch deck explains why this market matters now and why your team can win.\n07:42 Your first team should be small, fast, and deeply aligned on the mission.',
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
    credits: '128 积分',
    duration: '8.27 分钟',
    overview: '概览',
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
        range: '00:12 - 00:38',
        text: '在 2025 年做创业，起点应该是清晰的问题，而不是一个看起来聪明的功能。',
      },
      {
        range: '01:34 - 02:08',
        text: '越早验证需求，越能减少无效的产品迭代，把资源集中在真正有价值的方向上。',
      },
      {
        range: '04:10 - 04:49',
        text: '一份可信的 pitch deck 需要讲清楚市场窗口、竞争优势、团队能力，以及已经发生的 traction。',
      },
      {
        range: '07:42 - 08:19',
        text: '第一批成员要保持小而精，并围绕一个清晰的执行原则高速协作。',
      },
    ],
    subtitlesIntro:
      '00:12 在 2025 年做创业，起点应该是清晰的问题，而不是一个看起来聪明的功能。',
    subtitlesBody:
      '01:34 越早验证需求，越能减少无效的产品迭代。\n04:10 一份可信的 pitch deck 需要讲清楚市场窗口、竞争优势和团队能力。\n07:42 第一批成员要小而精，并且在方向上高度一致。',
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

type VideoChatPageProps = {
  locale: string;
};

type Message = {
  role: 'assistant' | 'user';
  text: string;
};

export function VideoChatPage({ locale }: VideoChatPageProps) {
  const content = locale === 'zh' ? copy.zh : copy.en;

  return (
    <div
      className={cn(
        spaceGrotesk.className,
        'bg-background text-foreground min-h-screen'
      )}
    >
      <header className="border-border bg-card/95 sticky top-0 z-20 border-b backdrop-blur">
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
                className="border-border bg-card h-10 rounded-xl pr-10 pl-10 shadow-xs"
                defaultValue=""
                placeholder={content.searchPlaceholder}
              />
              <ArrowRight className="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2" />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <TopBadge icon={Globe}>
                {locale === 'zh' ? '中文' : 'EN'}
              </TopBadge>
              <TopBadge icon={Zap} muted>
                {content.credits}
              </TopBadge>
              <div className="border-border flex size-9 items-center justify-center rounded-full border-2 bg-[var(--color-accent)] text-sm font-semibold text-white">
                J
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-65px)] w-full max-w-[1360px] xl:h-[calc(100vh-65px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:overflow-hidden 2xl:max-w-[1440px]">
        <section className="min-w-0 p-4 lg:p-6 xl:h-full xl:min-h-0 xl:overflow-hidden">
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
                  <span className="text-white/75">12:34 / 45:20</span>
                </div>

                <div className="flex flex-1 items-center gap-3 lg:max-w-[420px]">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                    <div className="bg-primary h-full w-[37%] rounded-full" />
                  </div>
                </div>

                <div className="flex items-center gap-3 text-white/75">
                  <Captions className="size-4" />
                  <Settings2 className="size-4" />
                  <Fullscreen className="size-4" />
                </div>
              </div>
            </div>

            <Tabs
              defaultValue="overview"
              className="flex min-h-0 flex-1 flex-col"
            >
              <TabsList className="border-border bg-muted h-auto w-fit shrink-0 justify-start gap-1 rounded-xl border p-1">
                <WorkspaceTabTrigger
                  value="overview"
                  icon={FileText}
                  label={content.overview}
                />
                <WorkspaceTabTrigger
                  value="subtitles"
                  icon={Captions}
                  label={content.subtitles}
                />
              </TabsList>

              <TabsContent
                value="overview"
                className="mt-5 min-h-0 flex-1 outline-none"
              >
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
              </TabsContent>

              <TabsContent
                value="subtitles"
                className="mt-5 min-h-0 flex-1 outline-none"
              >
                <div className="border-border bg-card/70 h-full overflow-hidden rounded-2xl border shadow-xs">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      <div className="bg-card overflow-hidden rounded-xl">
                        {content.subtitleItems.map((item) => (
                          <SubtitleListItem
                            key={item.range}
                            range={item.range}
                            text={item.text}
                          />
                        ))}
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
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

              <div className="border-border bg-card space-y-3 border-t px-5 py-4">
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

                <div className="border-border bg-card flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm">
                  <Sparkles className="text-muted-foreground size-4 shrink-0" />
                  <Input
                    aria-label="Ask anything about this video"
                    className="h-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
                    placeholder={content.askPlaceholder}
                  />
                  <Button size="icon-sm" className="size-9 rounded-lg">
                    <SendHorizontal className="size-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <SidebarContent
              value="summary"
              title={content.summaryHeading}
              body={content.summaryBody}
              icon={List}
            />
            <SidebarContent
              value="captions"
              title={content.transcriptHeading}
              body={content.subtitlesIntro}
              icon={Captions}
            />
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

function SubtitleListItem({ range, text }: { range: string; text: string }) {
  return (
    <div className="border-border grid gap-3 border-b px-4 py-4 last:border-b-0 md:grid-cols-[132px_minmax(0,1fr)] md:gap-4">
      <div className="text-primary text-xs font-semibold tracking-wide md:pt-1">
        {range}
      </div>
      <p className="text-muted-foreground text-sm leading-6">{text}</p>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end gap-3">
        <div className="bg-primary text-primary-foreground max-w-[280px] rounded-xl px-4 py-3 text-sm leading-6">
          {message.text}
        </div>
        <Avatar className="border-border size-8 border bg-[var(--color-accent)]">
          <AvatarFallback className="bg-transparent text-sm font-semibold text-white">
            J
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
        <Sparkles className="size-4" />
      </div>
      <div className="bg-muted text-foreground max-w-full rounded-xl px-4 py-3 text-sm leading-7 shadow-xs">
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
}: {
  value: string;
  title: string;
  body: string;
  icon: LucideIcon;
}) {
  return (
    <TabsContent
      value={value}
      className="mt-0 flex min-h-0 flex-1 outline-none"
    >
      <div className="flex flex-1 items-center justify-center p-5">
        <div className="border-border bg-background w-full max-w-xl rounded-2xl border p-6 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
              <Icon className="size-5" />
            </div>
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
    </TabsContent>
  );
}
