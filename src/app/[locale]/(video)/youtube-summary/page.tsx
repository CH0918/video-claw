import { setRequestLocale } from 'next-intl/server';

import { VideoChatPage } from '@/shared/blocks/video-chat/page';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  title: 'YouTube Summary — AI Video Summarizer & Transcript Search | VideoClaw',
  description:
    'Summarize any YouTube video with AI, search the full transcript, jump to exact timestamps, and ask follow-up questions in one workspace.',
  keywords:
    'youtube summary, youtube ai summary, youtube video summarizer, youtube transcript search, summarize youtube video',
  canonicalUrl: '/youtube-summary',
});

export default async function VideoChatRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ url?: string }>;
}) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  setRequestLocale(locale);

  return <VideoChatPage locale={locale} initialUrl={resolvedSearchParams?.url} />;
}
