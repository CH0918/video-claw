import { redirect } from '@/core/i18n/navigation';

export default async function VideoChatRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ url?: string }>;
}) {
  const { locale } = await params;
  const resolved = await searchParams;
  const target = resolved?.url
    ? `/youtube-summary?url=${encodeURIComponent(resolved.url)}`
    : '/youtube-summary';
  redirect({ href: target, locale });
}
