import { getSiteUrl } from '../lib/api';

/** Site-wide Schema.org WebSite + Organization for the portal homepage. */
export function SiteJsonLd() {
  const site = getSiteUrl();
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${site}/#organization`,
        name: 'OpenEventHub',
        url: site,
        logo: `${site}/brand/mark.png`,
        description:
          'AI-powered open-source Event Intelligence Platform consolidating events from many sources.',
      },
      {
        '@type': 'WebSite',
        '@id': `${site}/#website`,
        url: site,
        name: 'OpenEventHub',
        publisher: { '@id': `${site}/#organization` },
        inLanguage: ['de', 'en'],
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${site}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
