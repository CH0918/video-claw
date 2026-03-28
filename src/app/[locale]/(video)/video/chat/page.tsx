import { setRequestLocale } from 'next-intl/server';

import { VideoChatPage } from '@/shared/blocks/video-chat/page';
import { getMetadata } from '@/shared/lib/seo';

export const generateMetadata = getMetadata({
  title: 'Video Chat Workspace',
  description:
    'Analyze a video, review subtitles, and chat with an AI copilot in one workspace.',
  canonicalUrl: '/video/chat',
});

export default async function VideoChatRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <VideoChatPage locale={locale} />;
}
