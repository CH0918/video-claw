import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP, oneTap } from 'better-auth/plugins';
import { getLocale } from 'next-intl/server';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import * as schema from '@/config/db/schema';
import { isCloudflareWorker } from '@/shared/lib/env';
import { VerificationCode } from '@/shared/blocks/email/verification-code';
import {
  getCookieFromCtx,
  getHeaderValue,
  guessLocaleFromAcceptLanguage,
} from '@/shared/lib/cookie';
import { getUuid } from '@/shared/lib/hash';
import { getClientIp } from '@/shared/lib/ip';
import { grantCreditsForNewUser } from '@/shared/models/credit';
import { getEmailService } from '@/shared/services/email';
import { grantRoleForNewUser } from '@/shared/services/rbac';

function debugAuthLog(step: string, payload?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') return;
  console.log('[signup-debug][server]', step, payload || {});
}

// Static auth options - NO database connection
// This ensures zero database calls during build time
const authOptions = {
  appName: envConfigs.app_name,
  baseURL: envConfigs.auth_url,
  secret: envConfigs.auth_secret,
  trustedOrigins: envConfigs.app_url ? [envConfigs.app_url] : [],
  user: {
    // Allow persisting custom columns on user table.
    // Without this, better-auth may ignore extra properties during create/update.
    additionalFields: {
      utmSource: {
        type: 'string',
        // Not user-editable input; we set it internally.
        input: false,
        required: false,
        defaultValue: '',
      },
      ip: {
        type: 'string',
        input: false,
        required: false,
        defaultValue: '',
      },
      locale: {
        type: 'string',
        input: false,
        required: false,
        defaultValue: '',
      },
    },
  },
  advanced: {
    database: {
      generateId: () => getUuid(),
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  logger: {
    verboseLogging: false,
    // Disable all logs during build and production
    disabled: true,
  },
};

// get auth options with configs
export async function getAuthOptions(configs: Record<string, string>) {
  const emailVerificationEnabled =
    configs.email_verification_enabled === 'true' &&
    !!configs.resend_api_key &&
    !!configs.resend_sender_email;

  return {
    ...authOptions,
    // Add database connection only when actually needed (runtime)
    // D1 is only available inside Cloudflare Workers runtime (not during build)
    database: (envConfigs.database_url || (envConfigs.database_provider === 'd1' && isCloudflareWorker))
      ? drizzleAdapter(db(), {
          provider: getDatabaseProvider(envConfigs.database_provider),
          schema: schema,
        })
      : null,
    databaseHooks: {
      user: {
        create: {
          before: async (user: any, ctx: any) => {
            try {
              const ip = await getClientIp();
              if (ip) {
                user.ip = ip;
              }

              // Prefer NEXT_LOCALE cookie (next-intl). Fallback to accept-language.
              const localeFromCookie = getCookieFromCtx(ctx, 'NEXT_LOCALE');

              const localeFromHeader = guessLocaleFromAcceptLanguage(
                getHeaderValue(ctx, 'accept-language')
              );

              const locale =
                (localeFromCookie || localeFromHeader || (await getLocale())) ??
                '';

              if (locale && typeof locale === 'string') {
                user.locale = locale.slice(0, 20);
              }

              // Only set on first creation; never overwrite later.
              if (user?.utmSource) return user;

              const raw = getCookieFromCtx(ctx, 'utm_source');
              if (!raw || typeof raw !== 'string') return user;

              // Keep it small & safe.
              const decoded = decodeURIComponent(raw).trim();
              const sanitized = decoded
                .replace(/[^\w\-.:]/g, '') // allow a-zA-Z0-9_ - . :
                .slice(0, 100);

              if (sanitized) {
                user.utmSource = sanitized;
              }
            } catch {
              // best-effort only
            }
            return user;
          },
          after: async (user: any) => {
            try {
              if (!user.id) {
                throw new Error('user id is required');
              }
              debugAuthLog('databaseHooks.user.create.after', {
                userId: user.id,
                email: user.email,
                emailVerified: user.emailVerified,
                emailVerificationEnabled,
              });

              // Grant initial credits immediately only when the user is already verified
              // or when email verification is not required for sign-up.
              if (!emailVerificationEnabled || user.emailVerified) {
                await grantCreditsForNewUser(user);
              }

              // grant role for new user
              await grantRoleForNewUser(user);
            } catch (e) {
              console.log('grant credits or role for new user failed', e);
            }
          },
        },
      },
    },
    emailAndPassword: {
      enabled: configs.email_auth_enabled !== 'false',
      requireEmailVerification: emailVerificationEnabled,
      // Avoid creating a session immediately after sign up when verification is required.
      autoSignIn: emailVerificationEnabled ? false : true,
    },
    ...(emailVerificationEnabled
        ? {
          emailVerification: {
            sendOnSignUp: false,
            sendOnSignIn: false,
            autoSignInAfterVerification: false,
            expiresIn: 60 * 60 * 24,
          },
        }
      : {}),
    socialProviders: await getSocialProviders(configs),
    plugins: getAuthPlugins(configs, emailVerificationEnabled),
  };
}

// get social providers with configs
export async function getSocialProviders(configs: Record<string, string>) {
  const providers: any = {};

  // google auth
  if (configs.google_client_id && configs.google_client_secret) {
    providers.google = {
      clientId: configs.google_client_id,
      clientSecret: configs.google_client_secret,
    };
  }

  // github auth
  if (configs.github_client_id && configs.github_client_secret) {
    providers.github = {
      clientId: configs.github_client_id,
      clientSecret: configs.github_client_secret,
    };
  }

  return providers;
}

// get auth plugins with configs
function getAuthPlugins(configs: Record<string, string>, emailVerificationEnabled: boolean) {
  const plugins: any[] = [];

  if (configs.google_client_id && configs.google_one_tap_enabled === 'true') {
    plugins.push(oneTap());
  }

  if (emailVerificationEnabled) {
    plugins.push(
      emailOTP({
        sendVerificationOnSignUp: true,
        otpLength: 6,
        expiresIn: 300,
        async sendVerificationOTP({ email, otp }) {
          try {
            debugAuthLog('emailOTP.sendVerificationOTP:start', {
              email,
            });
            const emailService = await getEmailService(configs as any);
            const logoUrl = 'https://res.video-claw.cloud/logo.png';
            const senderEmail = configs.resend_sender_email || '';
            const from = senderEmail
              ? senderEmail.includes('<')
                ? senderEmail
                : `${envConfigs.app_name} <${senderEmail}>`
              : undefined;

            await emailService.sendEmail({
              from,
              to: email,
              subject: `${otp} is your verification code – ${envConfigs.app_name}`,
              react: VerificationCode({
                appName: envConfigs.app_name,
                logoUrl,
                code: otp,
              }),
            });
            debugAuthLog('emailOTP.sendVerificationOTP:sent', {
              email,
            });
          } catch (e) {
            console.log('send verification OTP failed:', e);
          }
        },
      })
    );

    plugins.push({
      id: 'grant-initial-credits-after-email-otp-verify',
      hooks: {
        after: [
          {
            matcher(ctx: any) {
              return (
                ctx.path === '/email-otp/verify-email' ||
                ctx.path === '/verify-email'
              );
            },
            async handler(ctx: any) {
              const returned = ctx?.context?.returned as any;
              const verifiedUser = returned?.user;
              debugAuthLog('hooks.after.verify-email', {
                path: ctx?.path,
                returnedStatus: returned?.status,
                userId: verifiedUser?.id,
                email: verifiedUser?.email,
                emailVerified: verifiedUser?.emailVerified,
              });

              if (!returned?.status || !verifiedUser?.id || !verifiedUser?.email) {
                return {};
              }
              if (verifiedUser.emailVerified !== true) {
                return {};
              }

              try {
                await grantCreditsForNewUser(verifiedUser);
              } catch (e) {
                console.log('grant credits after email verify failed', e);
              }

              return {};
            },
          },
        ],
      },
    });
  }

  return plugins;
}

// convert database provider to better-auth database provider
export function getDatabaseProvider(
  provider: string
): 'sqlite' | 'pg' | 'mysql' {
  switch (provider) {
    case 'sqlite':
      return 'sqlite';
    case 'turso':
      return 'sqlite';
    case 'd1':
      return 'sqlite';
    case 'postgresql':
      return 'pg';
    case 'mysql':
      return 'mysql';
    default:
      throw new Error(
        `Unsupported database provider for auth: ${envConfigs.database_provider}`
      );
  }
}
