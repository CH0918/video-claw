'use client';

import { FormEvent, useRef, useState } from 'react';
import { ArrowUp, Facebook, Youtube } from 'lucide-react';
import { RiTwitterXFill } from 'react-icons/ri';

import { useRouter } from '@/core/i18n/navigation';

type VideoClawHomeLinkFormProps = {
  placeholder: string;
  submitLabel: string;
};

const supportedPlatforms = [
  {
    name: 'YouTube',
    icon: Youtube,
    className: 'text-[#FF0033]',
  },
  {
    name: 'X',
    icon: RiTwitterXFill,
    className: 'text-foreground',
  },
  {
    name: 'Facebook',
    icon: Facebook,
    className: 'text-[#1877F2]',
  },
];

export function VideoClawHomeLinkForm({
  placeholder,
  submitLabel,
}: VideoClawHomeLinkFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextValue = value.trim();

    const target = nextValue
      ? `/video/chat?url=${encodeURIComponent(nextValue)}`
      : '/video/chat';

    if (!nextValue) {
      inputRef.current?.blur();
    }

    router.push(target);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="border-border/70 min-w-0 border-b px-2 pb-4">
        <input
          id="hero-link-input"
          name="hero-link"
          ref={inputRef}
          type="text"
          inputMode="url"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className="placeholder:text-muted-foreground h-14 w-full bg-transparent text-base outline-none sm:h-16 sm:text-lg"
        />
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-3 px-1 pt-1 text-xs">
        {supportedPlatforms.map((platform) => {
          const Icon = platform.icon;

          return (
            <span
              key={platform.name}
              className="inline-flex items-center gap-2"
              aria-label={platform.name}
              title={platform.name}
            >
              <Icon className={`h-4.5 w-4.5 ${platform.className}`} />
            </span>
          );
        })}

        <button
          type="submit"
          aria-label={submitLabel}
          className="bg-primary text-primary-foreground focus-visible:ring-primary/30 ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
        >
          <ArrowUp className="h-7 w-7" />
        </button>
      </div>
    </form>
  );
}
