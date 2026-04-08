import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { getMetadata } from '@/shared/lib/seo';

export const revalidate = 3600;

export const generateMetadata = getMetadata({
  metadataKey: 'pages.index.metadata',
  canonicalUrl: '/',
  appName: 'VideoClaw',
});

const HOME_SITE_URL = 'https://video-claw.cloud';

type HomePageData = {
  hero: {
    title: string;
    description: string;
  };
  faq: {
    items: Array<{
      question: string;
      answer: string;
    }>;
  };
};

function getLocalizedHomeUrl(locale: string) {
  return locale === 'en' ? HOME_SITE_URL : `${HOME_SITE_URL}/${locale}`;
}

function getLocalizedWorkspaceUrl(locale: string) {
  return `${getLocalizedHomeUrl(locale)}/youtube-summary`;
}

function HomeStructuredData({
  locale,
  page,
}: {
  locale: string;
  page: HomePageData;
}) {
  const homeUrl = getLocalizedHomeUrl(locale);
  const workspaceUrl = getLocalizedWorkspaceUrl(locale);
  const faqItems = page.faq?.items || [];

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'VideoClaw',
      url: homeUrl,
      inLanguage: locale,
      description: page.hero.description,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${homeUrl}/youtube-summary?url={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'VideoClaw',
      url: homeUrl,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      description: page.hero.description,
      featureList: [
        'AI YouTube video summarizer',
        'YouTube transcript search',
        'Jump to exact timestamps',
        'Chat with the video',
        'Transcript-grounded answers',
      ],
      publisher: {
        '@type': 'Organization',
        name: 'VideoClaw',
        url: HOME_SITE_URL,
      },
      offers: {
        '@type': 'Offer',
        url: workspaceUrl,
        price: '0',
        priceCurrency: 'USD',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
  ];

  return structuredData.map((item, index) => (
    <script
      key={`home-jsonld-${index}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(item),
      }}
    />
  ));
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('pages.index');
  const page = t.raw('page') as HomePageData;
  const Page = await getThemePage('video-claw-home');

  return (
    <>
      <HomeStructuredData locale={locale} page={page} />
      <Page locale={locale} page={page} />
    </>
  );
}
