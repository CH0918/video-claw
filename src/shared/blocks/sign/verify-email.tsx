'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { authClient, useSession } from '@/core/auth/client';
import { defaultLocale } from '@/config/locale';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';

const RESEND_COOLDOWN_SECONDS = 60;
const OTP_LENGTH = 6;
const AUTH_MODE_QUERY_KEY = 'auth_mode';
const AUTH_EMAIL_QUERY_KEY = 'auth_email';
const AUTH_VERIFIED_QUERY_KEY = 'auth_verified';

function safeDecodeCallbackUrl(raw?: string) {
  if (!raw) return '/';
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith('/')) return decoded;
    return '/';
  } catch {
    return '/';
  }
}

function stripLocalePrefix(path: string, locale: string) {
  if (!path?.startsWith('/')) return '/';
  if (locale === defaultLocale) return path;
  if (path === `/${locale}`) return '/';
  if (path.startsWith(`/${locale}/`))
    return path.slice(locale.length + 1) || '/';
  return path;
}

function getCooldownKey(email?: string) {
  return `verify-email:lastSentAt:${String(email || '').toLowerCase()}`;
}

function getCooldownRemainingSeconds(email?: string) {
  if (typeof window === 'undefined') return 0;
  if (!email) return 0;
  const raw = window.localStorage.getItem(getCooldownKey(email));
  const last = raw ? Number(raw) : 0;
  if (!last || Number.isNaN(last)) return 0;
  const elapsedSeconds = Math.floor((Date.now() - last) / 1000);
  return Math.max(0, RESEND_COOLDOWN_SECONDS - elapsedSeconds);
}

function buildSignInReturnPath(path: string, email?: string) {
  const safePath = path?.startsWith('/') ? path : '/';
  const url = new URL(safePath, 'http://local');

  url.searchParams.set(AUTH_MODE_QUERY_KEY, 'sign-in');
  if (email) {
    url.searchParams.set(AUTH_EMAIL_QUERY_KEY, email);
  }
  url.searchParams.set(AUTH_VERIFIED_QUERY_KEY, '1');

  return `${url.pathname}${url.search}${url.hash}`;
}

function markSentNow(email?: string) {
  if (typeof window === 'undefined') return;
  if (!email) return;
  try {
    window.localStorage.setItem(getCooldownKey(email), String(Date.now()));
  } catch {
    // ignore
  }
}

export function VerifyEmailPage({
  email,
  callbackUrl,
  sent,
}: {
  email?: string;
  callbackUrl?: string;
  sent?: string;
}) {
  const t = useTranslations('common.sign');
  const locale = useLocale();
  const { data: session, isPending } = useSession();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const nextUrl = useMemo(() => {
    const decoded = safeDecodeCallbackUrl(callbackUrl);
    return stripLocalePrefix(decoded, locale);
  }, [callbackUrl, locale]);
  const base = locale !== defaultLocale ? `/${locale}` : '';

  const hardNavigateToNextUrl = () => {
    if (typeof window === 'undefined') return;
    window.location.assign(`${base}${nextUrl}`);
  };

  const navigateToSignInModal = () => {
    if (typeof window === 'undefined') return;
    const target = buildSignInReturnPath(nextUrl || '/', email);
    window.location.assign(`${base}${target}`);
  };

  // Initialize & tick cooldown
  useEffect(() => {
    setCooldownSeconds(getCooldownRemainingSeconds(email));
    const timer = window.setInterval(() => {
      setCooldownSeconds(getCooldownRemainingSeconds(email));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [email]);

  // If session exists, redirect
  useEffect(() => {
    if (!isPending && session?.user) {
      hardNavigateToNextUrl();
    }
  }, [isPending, session?.user, nextUrl]);

  useEffect(() => {
    if (sent === '1') {
      if (getCooldownRemainingSeconds(email) === 0) {
        markSentNow(email);
      }
      setCooldownSeconds(getCooldownRemainingSeconds(email));
      if (typeof window !== 'undefined') {
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('sent');
          window.history.replaceState({}, '', url.toString());
        } catch {
          // ignore
        }
      }
    }
  }, [sent, email]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const otpValue = otp.join('');

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    // Focus the next empty input or the last one
    const nextEmpty = newOtp.findIndex((v) => !v);
    inputRefs.current[nextEmpty >= 0 ? nextEmpty : OTP_LENGTH - 1]?.focus();
  };

  const handleVerify = async () => {
    if (!email || otpValue.length !== OTP_LENGTH) return;
    if (verifying) return;

    setVerifying(true);
    try {
      const result = await authClient.emailOtp.verifyEmail({
        email,
        otp: otpValue,
      });

      if (result?.error) {
        toast.error(result.error.message || t('verification_code_invalid'));
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
        setVerifying(false);
        return;
      }

      navigateToSignInModal();
    } catch (e: any) {
      toast.error(e?.message || t('verification_code_invalid'));
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error('email is required');
      return;
    }
    if (loading) return;

    const remaining = getCooldownRemainingSeconds(email);
    if (remaining > 0) return;

    try {
      setLoading(true);
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      });
      if (result?.error) {
        toast.error(result.error.message || 'send verification code failed');
        return;
      }
      markSentNow(email);
      setCooldownSeconds(getCooldownRemainingSeconds(email));
      toast.success(t('verification_code_sent'));
    } catch (e: any) {
      toast.error(e?.message || 'send verification code failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto w-full md:max-w-md">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">
          <h1>{t('verify_email_page_title')}</h1>
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          <h2>
            {t('verify_email_page_description')}
            {email ? ` ${email}` : ''}
          </h2>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {/* OTP Input */}
          <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <Input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={otp[i]}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className="h-12 w-12 text-center text-lg font-semibold"
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <Button
            type="button"
            className="w-full"
            disabled={verifying || otpValue.length !== OTP_LENGTH}
            onClick={handleVerify}
          >
            {verifying ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              t('verification_code_submit')
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading || cooldownSeconds > 0}
            onClick={handleResend}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : cooldownSeconds > 0 ? (
              t('resend_verification_countdown', { seconds: cooldownSeconds })
            ) : (
              t('resend_verification')
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={navigateToSignInModal}
          >
            {t('back_to_sign_in')}
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <p className="w-full text-center text-xs text-neutral-500">
          {t('verify_email_otp_tip')}
        </p>
      </CardFooter>
    </Card>
  );
}
