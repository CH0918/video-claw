import type { ReactNode } from 'react';
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  GraduationCap,
  MessageSquareMore,
  Mic2,
  ScanSearch,
  Search,
  Sparkles,
  TimerReset,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
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
    <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-[13px] font-semibold text-secondary-foreground">
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
            className="rounded-2xl border border-border bg-card p-7 shadow-lg"
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

          <div className="w-full max-w-[760px] rounded-3xl border-2 border-primary/90 bg-transparent p-2.5 shadow-xl sm:p-3">
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

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex h-10 items-center gap-2 border-b border-border bg-muted/60 px-4">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              <span className="flex-1 text-center text-xs text-muted-foreground">Video Claw</span>
            </div>
            <video
              className="aspect-video w-full"
              src="https://res.video-claw.cloud/product_demo.mp4"
              autoPlay
              loop
              muted
              playsInline
            />
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
            <p className="text-base leading-7 text-background/60 sm:text-lg">
              {page.principles.description}
            </p>
          </div>

          <div className="grid gap-5 border-y border-white/10 py-8 md:grid-cols-2 xl:grid-cols-4">
            {page.principles.items.map((item) => (
              <div key={item.title} className="text-center">
                <div className="text-lg font-semibold text-primary">{item.title}</div>
                <p className="mt-2 text-sm leading-6 text-background/60">
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
                <p className="mt-3 text-sm leading-6 text-background/60">
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

          <Accordion type="single" collapsible className="space-y-3">
            {page.faq.items.map((item, index) => (
              <AccordionItem
                key={item.question}
                value={`faq-${index}`}
                className="rounded-2xl border border-border bg-card px-6 last:border-b"
              >
                <AccordionTrigger className="py-5 text-lg font-semibold hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-7 text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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
