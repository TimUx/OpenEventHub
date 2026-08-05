import type { Metadata } from 'next';

import { getSiteUrl } from './api';

export function absoluteUrl(path = ''): string {
  const base = getSiteUrl();
  if (!path || path === '/') {
    return base;
  }
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function pageMetadata({
  title,
  description,
  path,
  index = true,
  follow = true,
}: {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly index?: boolean;
  readonly follow?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: path || '/' },
    robots: {
      index,
      follow,
      googleBot: {
        index,
        follow,
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}
