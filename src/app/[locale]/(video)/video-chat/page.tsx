import { redirect } from '@/core/i18n/navigation';

export default async function VideoChatRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: '/youtube-summary', locale });
}
