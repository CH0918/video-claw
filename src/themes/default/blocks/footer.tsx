import { Link } from '@/core/i18n/navigation';
import {
  BrandLogo,
  LocaleSelector,
  ThemeToggler,
} from '@/shared/blocks/common';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Footer as FooterType } from '@/shared/types/blocks/landing';

export function Footer({ footer }: { footer: FooterType }) {
  return (
    <footer className="bg-foreground px-6 py-16 text-background lg:px-10">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div className="max-w-[360px] space-y-4">
            {footer.brand ? <BrandLogo brand={footer.brand} /> : null}
            {footer.brand?.description ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {footer.brand.description}
              </p>
            ) : null}
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {footer.nav?.items?.map((item) => (
              <div key={item.title} className="space-y-4">
                <h4 className="text-sm font-semibold text-background">
                  {item.title}
                </h4>
                <div className="flex flex-col gap-3">
                  {item.children?.map((subItem) => (
                    <Link
                      key={`${item.title}-${subItem.title}`}
                      href={subItem.url || '/'}
                      target={subItem.target || '_self'}
                      className="text-sm text-muted-foreground transition-colors hover:text-background"
                    >
                      {subItem.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-white/10" />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-muted-foreground">
            {footer.copyright || ''}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            {footer.agreement?.items?.map((item) => (
              <Link
                key={item.title}
                href={item.url || '/'}
                target={item.target || '_self'}
                className="text-sm text-muted-foreground underline transition-colors hover:text-background"
              >
                {item.title}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {footer.show_theme !== false ? <ThemeToggler type="toggle" /> : null}
            {footer.show_locale !== false ? (
              <LocaleSelector type="button" />
            ) : null}
            {footer.social?.items?.map((item) => (
              <Link
                key={item.title}
                href={item.url || '/'}
                target={item.target || '_self'}
                className="rounded-full bg-white/5 p-2 text-muted-foreground transition-colors hover:text-background"
                aria-label={item.title || 'Social link'}
              >
                {item.icon ? <SmartIcon name={item.icon as string} size={18} /> : null}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
