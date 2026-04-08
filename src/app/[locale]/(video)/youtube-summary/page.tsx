import { setRequestLocale } from 'next-intl/server';

import { VideoChatPage } from '@/shared/blocks/video-chat/page';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  metadataKey: 'pages.youtube-summary.metadata',
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
