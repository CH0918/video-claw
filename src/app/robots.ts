import { MetadataRoute } from 'next';

import { envConfigs } from '@/config';

export default function robots(): MetadataRoute.Robots {
  const appUrl = envConfigs.app_url;

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/*?*q=',
        '/sign-in',
        '/sign-up',
        '/verify-email',
        '/auth-callback',
        '/auth-popup',
        '/settings/*',
        '/activity/*',
        '/admin/*',
        '/chat/*',
        '/api/*',
      ],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}

