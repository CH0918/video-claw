import { ReactNode } from 'react';
import { Space_Grotesk } from 'next/font/google';

import { getThemeBlock } from '@/core/theme';
import {
  Footer as FooterType,
  Header as HeaderType,
} from '@/shared/types/blocks/landing';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
});

export default async function LandingLayout({
  children,
  header,
  footer,
}: {
  children: ReactNode;
  header: HeaderType;
  footer: FooterType;
}) {
  const Header = await getThemeBlock('header');
  const Footer = await getThemeBlock('footer');

  return (
    <div className={`${spaceGrotesk.className} min-h-screen bg-background`}>
      <Header header={header} />
      {children}
      <Footer footer={footer} />
    </div>
  );
}
