'use client';

import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';

export function PricingButton({
  title,
  url,
  featured,
  comingSoon,
  comingSoonMessage,
}: {
  title: string;
  url: string;
  featured?: boolean;
  comingSoon?: boolean;
  comingSoonMessage?: string;
}) {
  const base = `mt-6 inline-flex w-full items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90`;
  const style = featured
    ? `${base} bg-primary text-primary-foreground`
    : `${base} border border-border bg-card text-foreground hover:bg-muted`;

  if (comingSoon) {
    return (
      <button
        type="button"
        className={style}
        onClick={() => toast.info(comingSoonMessage)}
      >
        {title}
      </button>
    );
  }

  return (
    <Link href={url} className={style}>
      {title}
    </Link>
  );
}
