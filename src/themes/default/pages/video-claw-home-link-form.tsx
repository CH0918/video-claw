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
          className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-[13px] placeholder:text-muted-foreground/65 sm:h-16 sm:text-lg sm:placeholder:text-base"
        />
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-2 px-1 pt-0 text-[11px] leading-none sm:gap-3 sm:pt-1 sm:text-xs">
        {supportedPlatforms.map((platform) => {
          const Icon = platform.icon;

          return (
            <span
              key={platform.name}
              className="inline-flex items-center gap-1.5"
              aria-label={platform.name}
              title={platform.name}
            >
              <Icon className={`h-4 w-4 ${platform.className} sm:h-4.5 sm:w-4.5`} />
            </span>
          );
        })}

        <button
          type="submit"
          aria-label={submitLabel}
          className="bg-primary text-primary-foreground focus-visible:ring-primary/30 ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none sm:h-11 sm:w-11"
        >
          <ArrowUp className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>
    </form>
  );
}
