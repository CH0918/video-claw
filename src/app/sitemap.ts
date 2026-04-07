import { MetadataRoute } from 'next';

import { envConfigs } from '@/config';
import { locales, defaultLocale } from '@/config/locale';
import { getPosts, PostStatus, PostType } from '@/shared/models/post';

export const revalidate = 3600;

function localizedUrl(path: string, locale: string): string {
  const base = envConfigs.app_url;
  const prefix = locale === defaultLocale ? '' : `/${locale}`;
  return `${base}${prefix}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  // Static public pages
  const staticPages = ['/', '/blog', '/updates'];

  const staticEntries: MetadataRoute.Sitemap = staticPages.flatMap((path) =>
    locales.map((locale) => ({
      url: localizedUrl(path, locale),
      lastModified: now,
      changeFrequency: path === '/' ? 'daily' as const : 'weekly' as const,
      priority: path === '/' ? 1.0 : 0.7,
    }))
  );

  // Dynamic blog posts from database
  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await getPosts({
      type: PostType.ARTICLE,
      status: PostStatus.PUBLISHED,
      limit: 500,
    });

    blogEntries = posts.flatMap((post) =>
      locales.map((locale) => ({
        url: localizedUrl(`/blog/${post.slug}`, locale),
        lastModified: post.updatedAt?.toISOString() || now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
    );
  } catch (e) {
    console.log('sitemap: failed to fetch blog posts:', e);
  }

  return [...staticEntries, ...blogEntries];
}
