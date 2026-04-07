'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { usePathname } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/ui/drawer';
import { useAppContext } from '@/shared/contexts/app';
import { useMediaQuery } from '@/shared/hooks/use-media-query';

import { SignInForm } from './sign-in-form';
import { SignUpForm } from './sign-up-form';

const AUTH_MODE_QUERY_KEY = 'auth_mode';
const AUTH_EMAIL_QUERY_KEY = 'auth_email';
const AUTH_VERIFIED_QUERY_KEY = 'auth_verified';

function removeAuthModalQueryParams() {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  url.searchParams.delete(AUTH_MODE_QUERY_KEY);
  url.searchParams.delete(AUTH_EMAIL_QUERY_KEY);
  url.searchParams.delete(AUTH_VERIFIED_QUERY_KEY);

  window.history.replaceState({}, '', url.toString());
}

export function SignModal({ callbackUrl }: { callbackUrl?: string }) {
  const t = useTranslations('common.sign');
  const { isShowSignModal, setIsShowSignModal } = useAppContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [defaultEmail, setDefaultEmail] = useState('');

  const isDesktop = useMediaQuery('(min-width: 768px)');

  const modalMode = searchParams?.get(AUTH_MODE_QUERY_KEY) || '';
  const modalEmail = searchParams?.get(AUTH_EMAIL_QUERY_KEY) || '';
  const hasAuthModalQuery = !!modalMode;

  const currentCallbackUrl = useMemo(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete(AUTH_MODE_QUERY_KEY);
    params.delete(AUTH_EMAIL_QUERY_KEY);
    params.delete(AUTH_VERIFIED_QUERY_KEY);

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const effectiveCallbackUrl =
    hasAuthModalQuery
      ? currentCallbackUrl || '/'
      : callbackUrl || currentCallbackUrl || '/';

  useEffect(() => {
    if (modalMode !== 'sign-in') {
      return;
    }

    setMode('sign-in');
    setDefaultEmail(modalEmail);
    setIsShowSignModal(true);
    removeAuthModalQueryParams();
  }, [modalEmail, modalMode, setIsShowSignModal]);

  const handleOpenChange = (open: boolean) => {
    setIsShowSignModal(open);
    if (!open) {
      setMode('sign-in');
      setDefaultEmail('');
    }
  };

  const title =
    mode === 'sign-in' ? t('sign_in_title') : t('sign_up_title');
  const description =
    mode === 'sign-in' ? t('sign_in_description') : t('sign_up_description');

  const formContent =
    mode === 'sign-in' ? (
      <SignInForm
        callbackUrl={effectiveCallbackUrl}
        defaultEmail={defaultEmail}
        onSwitchToSignUp={() => setMode('sign-up')}
      />
    ) : (
      <SignUpForm
        callbackUrl={effectiveCallbackUrl}
        onSwitchToSignIn={() => setMode('sign-in')}
      />
    );

  if (isDesktop) {
    return (
      <Dialog open={isShowSignModal} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isShowSignModal} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        {mode === 'sign-in' ? (
          <SignInForm
            callbackUrl={effectiveCallbackUrl}
            defaultEmail={defaultEmail}
            className="mt-8 px-4"
            onSwitchToSignUp={() => setMode('sign-up')}
          />
        ) : (
          <SignUpForm
            callbackUrl={effectiveCallbackUrl}
            className="mt-8 px-4"
            onSwitchToSignIn={() => setMode('sign-in')}
          />
        )}
        <DrawerFooter className="pt-4">
          <DrawerClose asChild>
            <Button variant="outline">{t('cancel_title')}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
