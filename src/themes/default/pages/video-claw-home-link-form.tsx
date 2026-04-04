'use client';

import { FormEvent, useRef, useState } from 'react';
import { ArrowUp, Loader2, Youtube } from 'lucide-react';

import { useRouter } from '@/core/i18n/navigation';

type VideoClawHomeLinkFormProps = {
  placeholder: string;
  submitLabel: string;
};

export function VideoClawHomeLinkForm({
  placeholder,
  submitLabel,
}: VideoClawHomeLinkFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const nextValue = value.trim();

    const target = nextValue
      ? `/video/chat?url=${encodeURIComponent(nextValue)}`
      : '/video/chat';

    if (!nextValue) {
      inputRef.current?.blur();
    }

    setLoading(true);
    router.push(target);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:gap-3">
      <div className="border-border/70 min-w-0 border-b px-1 pb-3 sm:px-2 sm:pb-4">
        <input
          id="hero-link-input"
          name="hero-link"
          ref={inputRef}
          type="text"
          inputMode="url"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          disabled={loading}
          className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-[13px] placeholder:text-muted-foreground/65 sm:h-16 sm:text-lg sm:placeholder:text-base disabled:opacity-60"
        />
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-2 px-1 pt-0 text-[11px] leading-none sm:gap-3 sm:pt-1 sm:text-xs">
        <span
          className="inline-flex items-center gap-1.5"
          aria-label="YouTube"
          title="YouTube"
        >
          <Youtube className="h-4 w-4 text-[#FF0033] sm:h-4.5 sm:w-4.5" />
        </span>

        <button
          type="submit"
          disabled={loading}
          aria-label={submitLabel}
          className="bg-primary text-primary-foreground focus-visible:ring-primary/30 ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-70 sm:h-11 sm:w-11"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin sm:h-6 sm:w-6" />
          ) : (
            <ArrowUp className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
        </button>
      </div>
    </form>
  );
}
