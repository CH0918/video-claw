'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Coins,
  Globe,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  SunDim,
  User,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';

import { authClient, signOut, useSession } from '@/core/auth/client';
import { Link, usePathname, useRouter } from '@/core/i18n/navigation';
import { localeNames, locales } from '@/config/locale';
import { SignModal } from '@/shared/blocks/sign/sign-modal';
import { LocaleSelector } from '@/shared/blocks/common/locale-selector';
import { AnimatedThemeToggler } from '@/shared/components/magicui/animated-theme-toggler';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { useAppContext } from '@/shared/contexts/app';
import { cacheSet } from '@/shared/lib/cache';
import { cn } from '@/shared/lib/utils';
import { User as UserType } from '@/shared/models/user';

function extractSessionUser(data: any): UserType | null {
  const user = data?.user ?? data?.data?.user ?? null;
  return user && typeof user === 'object' ? (user as UserType) : null;
}

export function VideoChatHeaderMenu() {
  const t = useTranslations('pages.video.chat');
  const signT = useTranslations('common.sign');
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { data: session, isPending } = useSession();
  const sessionUser = extractSessionUser(session);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<
    'language' | 'theme' | null
  >(null);
  const didFallbackSyncRef = useRef(false);

  const {
    user,
    setUser,
    fetchConfigs,
    fetchUserCredits,
    fetchUserInfo,
    setIsCheckSign,
    setIsShowSignModal,
  } = useAppContext();

  const displayUser = useMemo(() => {
    if (!user && !sessionUser) {
      return null;
    }

    return {
      ...(sessionUser ?? {}),
      ...((user as UserType | null) ?? {}),
    } as UserType;
  }, [sessionUser, user]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  useEffect(() => {
    setIsCheckSign(isPending);
  }, [isPending, setIsCheckSign]);

  useEffect(() => {
    const currentUserId = user?.id;
    const sessionUserId = sessionUser?.id;

    if (sessionUser && sessionUserId !== currentUserId) {
      setUser(sessionUser);
      void fetchUserInfo();
    } else if (!sessionUser && currentUserId && !isPending) {
      setUser(null);
    }
  }, [fetchUserInfo, isPending, sessionUser, setUser, user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (didFallbackSyncRef.current) return;
    if (isPending) return;
    if (sessionUser || user) return;

    didFallbackSyncRef.current = true;
    void (async () => {
      try {
        const result: any = await authClient.getSession();
        const freshUser = extractSessionUser(result?.data ?? result);

        if (freshUser?.id) {
          setUser(freshUser);
          void fetchUserInfo();
        }
      } catch {
        // noop
      }
    })();
  }, [fetchUserInfo, isPending, sessionUser, setUser, user]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void fetchUserCredits();
  }, [fetchUserCredits, user?.id]);

  const remainingCredits = displayUser?.credits?.remainingCredits ?? 0;
  const currentTheme = theme || 'system';

  const handleSwitchLanguage = (value: string) => {
    if (value === currentLocale) {
      return;
    }

    cacheSet('locale', value);
    const query = searchParams?.toString?.() ?? '';
    const href = query ? `${pathname}?${query}` : pathname;

    setMenuOpen(false);
    router.push(href, { locale: value });
  };

  const handleThemeChange = (value: string) => {
    if (!value) {
      return;
    }

    setTheme(value);
    setMenuOpen(false);
  };

  const themeLabel =
    currentTheme === 'light'
      ? t('menuThemeLight')
      : currentTheme === 'dark'
        ? t('menuThemeDark')
        : t('menuThemeSystem');

  return (
    <>
      <DropdownMenu
        open={menuOpen}
        onOpenChange={(open) => {
          setMenuOpen(open);
          if (!open) {
            setExpandedSection(null);
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="border-border bg-card hover:bg-muted inline-flex h-10 items-center gap-2 rounded-full border px-1.5 pr-2 shadow-xs"
          >
            <Avatar className="size-7">
              <AvatarImage
                src={displayUser?.image || ''}
                alt={displayUser?.name || ''}
              />
              <AvatarFallback
                className={cn(
                  'text-xs font-semibold',
                  displayUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {displayUser?.name?.charAt(0) || <User className="size-3.5" />}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="text-muted-foreground size-4" />
          </Button>
        </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-72 rounded-2xl p-2">
          <DropdownMenuLabel className="px-2 py-2">
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarImage
                  src={displayUser?.image || ''}
                  alt={displayUser?.name || ''}
                />
                <AvatarFallback
                  className={cn(
                    'font-semibold',
                    displayUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {displayUser?.name?.charAt(0) || (
                    <User className="size-4.5" />
                  )}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {displayUser?.name || t('menuGuestTitle')}
                </div>
                <div className="text-muted-foreground truncate text-xs">
                  {displayUser?.email || t('menuGuestDescription')}
                </div>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {displayUser ? (
            <>
              <DropdownMenuItem asChild>
                <Link className="w-full cursor-pointer" href="/settings/credits">
                  <Coins />
                  {signT('credits_title', { credits: remainingCredits })}
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link className="w-full cursor-pointer" href="/settings/profile">
                  <User />
                  {t('menuProfile')}
                </Link>
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onClick={() => setIsShowSignModal(true)}>
              <User />
              {signT('sign_in_title')}
            </DropdownMenuItem>
          )}

          <div className="space-y-1">
            <button
              type="button"
              className={cn(
                'focus:bg-accent focus:text-accent-foreground hover:bg-accent/70 relative flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-hidden transition-colors',
                expandedSection === 'language' &&
                  'bg-accent text-accent-foreground'
              )}
              onClick={() =>
                setExpandedSection((prev) =>
                  prev === 'language' ? null : 'language'
                )
              }
            >
              <Globe
                className={cn(
                  'size-4 shrink-0',
                  expandedSection === 'language'
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              />
              <span>{t('menuLanguage')}</span>
              <span
                className={cn(
                  'ml-auto text-xs',
                  expandedSection === 'language'
                    ? 'text-foreground/80'
                    : 'text-muted-foreground'
                )}
              >
                {localeNames[currentLocale]}
              </span>
              <ChevronRight
                className={cn(
                  'size-4 transition-transform',
                  expandedSection === 'language'
                    ? 'text-foreground'
                    : 'text-muted-foreground',
                  expandedSection === 'language' && 'rotate-90'
                )}
              />
            </button>

            {expandedSection === 'language' ? (
              <div className="bg-muted/50 space-y-1 rounded-xl p-1">
                {locales.map((locale) => (
                  <button
                    key={locale}
                    type="button"
                    className="focus:bg-accent focus:text-accent-foreground hover:bg-accent/70 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-hidden"
                    onClick={() => handleSwitchLanguage(locale)}
                  >
                    <span>{localeNames[locale]}</span>
                    {locale === currentLocale ? (
                      <Check className="text-primary ml-auto size-4" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              className={cn(
                'focus:bg-accent focus:text-accent-foreground hover:bg-accent/70 relative flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-hidden transition-colors',
                expandedSection === 'theme' && 'bg-accent text-accent-foreground'
              )}
              onClick={() =>
                setExpandedSection((prev) =>
                  prev === 'theme' ? null : 'theme'
                )
              }
            >
              {currentTheme === 'dark' ? (
                <Moon
                  className={cn(
                    'size-4 shrink-0',
                    expandedSection === 'theme'
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  )}
                />
              ) : (
                <SunDim
                  className={cn(
                    'size-4 shrink-0',
                    expandedSection === 'theme'
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  )}
                />
              )}
              <span>{t('menuTheme')}</span>
              <span
                className={cn(
                  'ml-auto text-xs',
                  expandedSection === 'theme'
                    ? 'text-foreground/80'
                    : 'text-muted-foreground'
                )}
              >
                {themeLabel}
              </span>
              <ChevronRight
                className={cn(
                  'size-4 transition-transform',
                  expandedSection === 'theme'
                    ? 'text-foreground'
                    : 'text-muted-foreground',
                  expandedSection === 'theme' && 'rotate-90'
                )}
              />
            </button>

            {expandedSection === 'theme' ? (
              <div className="bg-muted/50 space-y-1 rounded-xl p-1">
                <button
                  type="button"
                  className="focus:bg-accent focus:text-accent-foreground hover:bg-accent/70 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-hidden"
                  onClick={() => handleThemeChange('light')}
                >
                  <SunDim className="text-muted-foreground size-4" />
                  <span>{t('menuThemeLight')}</span>
                  {currentTheme === 'light' ? (
                    <Check className="text-primary ml-auto size-4" />
                  ) : null}
                </button>
                <button
                  type="button"
                  className="focus:bg-accent focus:text-accent-foreground hover:bg-accent/70 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-hidden"
                  onClick={() => handleThemeChange('dark')}
                >
                  <Moon className="text-muted-foreground size-4" />
                  <span>{t('menuThemeDark')}</span>
                  {currentTheme === 'dark' ? (
                    <Check className="text-primary ml-auto size-4" />
                  ) : null}
                </button>
                <button
                  type="button"
                  className="focus:bg-accent focus:text-accent-foreground hover:bg-accent/70 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-hidden"
                  onClick={() => handleThemeChange('system')}
                >
                  <Monitor className="text-muted-foreground size-4" />
                  <span>{t('menuThemeSystem')}</span>
                  {currentTheme === 'system' ? (
                    <Check className="text-primary ml-auto size-4" />
                  ) : null}
                </button>
              </div>
            ) : null}
          </div>

          {displayUser?.isAdmin ? (
            <>
              <DropdownMenuItem asChild>
                <Link className="w-full cursor-pointer" href="/admin">
                  <LayoutDashboard />
                  {signT('admin_title')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}

          {displayUser ? (
            <DropdownMenuItem
              onClick={() =>
                signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      router.push('/');
                    },
                  },
                })
              }
            >
              <LogOut />
              {signT('sign_out_title')}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {mounted ? <SignModal /> : null}
    </>
  );
}

export function VideoChatHeaderQuickActions() {
  const { user } = useAppContext();

  const remainingCredits = (user as any)?.credits?.remainingCredits ?? 0;

  return (
    <div className="flex items-center gap-1.5">
      {user ? (
        <Link
          href="/settings/credits"
          className="border-border bg-card hover:bg-muted text-foreground inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold shadow-xs transition-colors"
        >
          <Coins className="text-primary size-3.5" />
          {remainingCredits}
        </Link>
      ) : null}

      <LocaleSelector type="button" className="border-border bg-card text-foreground hover:bg-muted hover:text-foreground" />
      <AnimatedThemeToggler className="text-muted-foreground hover:text-foreground size-8 rounded-full inline-flex items-center justify-center" />
    </div>
  );
}
