'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import {
  BrandLogo,
  LocaleSelector,
  SignUser,
  ThemeToggler,
} from '@/shared/blocks/common';
import { SignModal } from '@/shared/blocks/sign/sign-modal';
import { Header as HeaderType } from '@/shared/types/blocks/landing';

export function Header({ header }: { header: HeaderType }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <div className="flex items-center gap-8">
          {header.brand ? <BrandLogo brand={header.brand} /> : null}

          <nav className="hidden items-center gap-8 lg:flex">
            {header.nav?.items?.map((item) => (
              <Link
                key={item.title}
                href={item.url || '/'}
                target={item.target || '_self'}
                className="text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {header.show_theme !== false ? <ThemeToggler type="toggle" /> : null}
          {header.show_locale !== false ? (
            <LocaleSelector type="button" />
          ) : null}
          <SignUser anonymousVariant="avatar" showModal={false} />
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          className="rounded-md border border-border p-2 lg:hidden"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-border bg-background px-6 py-4 lg:hidden">
          <nav className="flex flex-col gap-3">
            {header.nav?.items?.map((item) => (
              <Link
                key={item.title}
                href={item.url || '/'}
                target={item.target || '_self'}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {item.title}
              </Link>
            ))}
          </nav>

          <div className="mt-4 flex items-center gap-3">
            {header.show_theme !== false ? <ThemeToggler type="toggle" /> : null}
            {header.show_locale !== false ? (
              <LocaleSelector type="button" />
            ) : null}
            <SignUser anonymousVariant="avatar" showModal={false} />
          </div>
        </div>
      ) : null}
      <SignModal />
    </header>
  );
}
