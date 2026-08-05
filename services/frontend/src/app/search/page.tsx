import type { Metadata } from 'next';

import { SearchBrowser } from '../../components/search-browser';
import { getDictionary } from '../../i18n/get-dictionary';
import { getRequestLocale } from '../../i18n/request-locale';
import { pageMetadata } from '../../lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  return pageMetadata({
    title: dictionary.search.metaTitle,
    description: dictionary.search.metaDescription,
    path: '/search',
    index: false,
    follow: true,
  });
}

export default function SearchPage() {
  return <SearchBrowser />;
}
