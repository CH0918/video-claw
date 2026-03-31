import type { ReactNode } from 'react';
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  CirclePlay,
  GraduationCap,
  MessageSquareMore,
  Mic2,
  ScanSearch,
  Search,
  Sparkles,
  TimerReset,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { VideoClawHomeLinkForm } from '@/themes/default/pages/video-claw-home-link-form';

type ButtonData = {
  title: string;
  url: string;
  target?: string;
};

type IconName =
  | 'search'
  | 'scan-search'
  | 'message-square-more'
  | 'timer-reset'
  | 'book-open'
  | 'sparkles'
  | 'graduation-cap'
  | 'briefcase-business'
  | 'mic-2';

type IconCard = {
  icon: IconName;
  title: string;
  description: string;
};

type FAQItem = {
  question: string;
  answer: string;
};

type PrincipleCard = {
  title: string;
  description: string;
};

type DemoHit = {
  time: string;
  label: string;
};

type HomePageData = {
  hero: {
    badge: string;
    title: string;
    description: string;
    input_placeholder: string;
    chips: string[];
    primary_button: ButtonData;
    secondary_button?: ButtonData;
    trust_items: string[];
  };
  demo: {
    eyebrow: string;
    title: string;
    description: string;
    browser_url: string;
    search_label: string;
    search_terms: string[];
    search_hint: string;
    hits_label: string;
    hits: DemoHit[];
    chat_label: string;
    chat_title: string;
    chat_answer: string;
    player_caption: string;
  };
  use_cases: {
    eyebrow: string;
    title: string;
    description: string;
    items: IconCard[];
  };
  features: {
    eyebrow: string;
    title: string;
    description: string;
    items: IconCard[];
  };
  principles: {
    eyebrow: string;
    title: string;
    description: string;
    items: PrincipleCard[];
    cards: PrincipleCard[];
  };
  faq: {
    eyebrow: string;
    title: string;
    description: string;
    items: FAQItem[];
  };
  cta: {
    title: string;
    description: string;
    primary_button: ButtonData;
    secondary_button?: ButtonData;
  };
};

const icons: Record<IconName, React.ComponentType<{ className?: string }>> = {
  search: Search,
  'scan-search': ScanSearch,
  'message-square-more': MessageSquareMore,
  'timer-reset': TimerReset,
  'book-open': BookOpen,
  sparkles: Sparkles,
  'graduation-cap': GraduationCap,
  'briefcase-business': BriefcaseBusiness,
  'mic-2': Mic2,
};

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-[13px] font-semibold text-primary">
      {children}
    </div>
  );
}

function PrimaryButton({ button }: { button: ButtonData }) {
  return (
    <Link
      href={button.url}
      target={button.target || '_self'}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
    >
      <span>{button.title}</span>
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function SecondaryButton({ button }: { button: ButtonData }) {
  return (
    <Link
      href={button.url}
      target={button.target || '_self'}
      className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
    >
      {button.title}
    </Link>
  );
}

function IconCardGrid({
  items,
  columns = 'md:grid-cols-2 xl:grid-cols-3',
}: {
  items: IconCard[];
  columns?: string;
}) {
  return (
    <div className={`grid gap-5 ${columns}`}>
      {items.map((item) => {
        const Icon = icons[item.icon];

        return (
          <div
            key={item.title}
            className="rounded-2xl border border-border bg-card p-7 shadow-[0_8px_40px_rgba(29,25,23,0.06)]"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function VideoClawHome({
  page,
}: {
  locale?: string;
  page: HomePageData;
}) {
  return (
    <main className="bg-background text-foreground">
      <section className="flex min-h-[calc(100svh-4.5rem)] items-center px-6 pb-12 pt-24 sm:pb-16 sm:pt-28 lg:min-h-0 lg:px-10 lg:pb-20 lg:pt-36">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-5 sm:gap-6 lg:gap-8">
          <h1 className="max-w-[15ch] text-center text-[1.75rem] font-bold leading-[1.15] tracking-tight text-balance sm:max-w-[820px] sm:text-5xl sm:leading-tight lg:max-w-[900px] lg:text-[56px]">
            {page.hero.title}
          </h1>

          <p className="max-w-[680px] text-center text-sm leading-6 text-muted-foreground sm:max-w-[760px] sm:text-lg sm:leading-7">
            {page.hero.description}
          </p>

          <div className="w-full max-w-[760px] rounded-3xl border-2 border-primary/90 bg-transparent p-2.5 shadow-[0_8px_32px_rgba(217,119,87,0.12)] sm:p-3">
            <VideoClawHomeLinkForm
              placeholder={page.hero.input_placeholder}
              submitLabel={page.hero.primary_button.title}
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-6">
            {page.hero.trust_items.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Check className="h-4 w-4 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>

        </div>
      </section>

      <section className="px-6 py-16 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-[1440px]">
          <div className="mx-auto mb-12 flex max-w-[760px] flex-col items-center gap-4 text-center">
            <SectionEyebrow>{page.demo.eyebrow}</SectionEyebrow>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {page.demo.title}
            </h2>
            <p className="text-base leading-7 text-muted-foreground sm:text-lg">
              {page.demo.description}
            </p>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_12px_48px_rgba(29,25,23,0.08)]">
            <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              <div className="flex flex-1 justify-center">
                <div className="inline-flex items-center gap-2 rounded-md bg-background px-3 py-1 text-xs text-muted-foreground">
                  <CirclePlay className="h-3.5 w-3.5" />
                  {page.demo.browser_url}
                </div>
              </div>
            </div>

            <div className="grid min-h-[560px] lg:grid-cols-[320px_1fr]">
              <aside className="border-b border-border bg-muted p-5 lg:border-b-0 lg:border-r">
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-semibold">{page.demo.search_label}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {page.demo.search_terms.map((term) => (
                        <span
                          key={term}
                          className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {page.demo.search_hint}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold">{page.demo.hits_label}</p>
                    <div className="mt-3 space-y-3">
                      {page.demo.hits.map((hit) => (
                        <div
                          key={`${hit.time}-${hit.label}`}
                          className="rounded-xl border border-border bg-card p-3"
                        >
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                            {hit.time}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {hit.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>

              <div className="flex flex-col gap-5 p-5">
                <div className="relative flex min-h-[320px] flex-1 items-center justify-center rounded-2xl bg-foreground">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
                    <CirclePlay className="h-9 w-9 text-primary-foreground" />
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 h-1 rounded-full bg-white/15">
                    <div className="h-1 w-[42%] rounded-full bg-primary" />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-sm font-semibold">{page.demo.chat_label}</p>
                    <h3 className="mt-3 text-lg font-semibold">
                      {page.demo.chat_title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {page.demo.chat_answer}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-sm font-semibold">{page.demo.player_caption}</p>
                    <div className="mt-4 space-y-3">
                      {page.demo.hits.slice(0, 2).map((hit) => (
                        <div
                          key={`caption-${hit.time}`}
                          className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground"
                        >
                          <span className="font-semibold text-foreground">
                            {hit.time}
                          </span>{' '}
                          {hit.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="use-cases" className="bg-muted px-6 py-16 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-[1440px]">
          <div className="mx-auto mb-12 flex max-w-[760px] flex-col items-center gap-4 text-center">
            <SectionEyebrow>{page.use_cases.eyebrow}</SectionEyebrow>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {page.use_cases.title}
            </h2>
            <p className="text-base leading-7 text-muted-foreground sm:text-lg">
              {page.use_cases.description}
            </p>
          </div>

          <IconCardGrid
            items={page.use_cases.items}
            columns="md:grid-cols-2 xl:grid-cols-3"
          />
        </div>
      </section>

      <section id="features" className="px-6 py-16 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-[1440px]">
          <div className="mx-auto mb-12 flex max-w-[760px] flex-col items-center gap-4 text-center">
            <SectionEyebrow>{page.features.eyebrow}</SectionEyebrow>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {page.features.title}
            </h2>
            <p className="text-base leading-7 text-muted-foreground sm:text-lg">
              {page.features.description}
            </p>
          </div>

          <IconCardGrid items={page.features.items} />
        </div>
      </section>

      <section className="bg-foreground px-6 py-16 text-background lg:px-10 lg:py-20">
        <div className="mx-auto max-w-[1440px]">
          <div className="mx-auto mb-12 flex max-w-[760px] flex-col items-center gap-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[13px] font-semibold text-primary">
              {page.principles.eyebrow}
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {page.principles.title}
            </h2>
            <p className="text-base leading-7 text-muted-foreground sm:text-lg">
              {page.principles.description}
            </p>
          </div>

          <div className="grid gap-5 border-y border-white/10 py-8 md:grid-cols-2 xl:grid-cols-4">
            {page.principles.items.map((item) => (
              <div key={item.title} className="text-center">
                <div className="text-lg font-semibold text-primary">{item.title}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 xl:grid-cols-3">
            {page.principles.cards.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="px-6 py-16 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-[960px]">
          <div className="mx-auto mb-12 flex max-w-[760px] flex-col items-center gap-4 text-center">
            <SectionEyebrow>{page.faq.eyebrow}</SectionEyebrow>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {page.faq.title}
            </h2>
            <p className="text-base leading-7 text-muted-foreground sm:text-lg">
              {page.faq.description}
            </p>
          </div>

          <div className="space-y-4">
            {page.faq.items.map((item) => (
              <div
                key={item.question}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <h3 className="text-lg font-semibold">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-20 pt-4 lg:px-10 lg:pb-24">
        <div className="mx-auto max-w-[960px] rounded-[28px] border border-border bg-muted p-8 text-center lg:p-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {page.cta.title}
          </h2>
          <p className="mx-auto mt-4 max-w-[680px] text-base leading-7 text-muted-foreground sm:text-lg">
            {page.cta.description}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <PrimaryButton button={page.cta.primary_button} />
            {page.cta.secondary_button ? (
              <SecondaryButton button={page.cta.secondary_button} />
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
