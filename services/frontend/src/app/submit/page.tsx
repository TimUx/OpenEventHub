import type { Metadata } from 'next';

import { SubmitForms } from '../../components/submit-forms';
import { getDictionary } from '../../i18n/get-dictionary';
import { getRequestLocale } from '../../i18n/request-locale';
import { pageMetadata } from '../../lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  return pageMetadata({
    title: dictionary.submit.metaTitle,
    description: dictionary.submit.metaDescription,
    path: '/submit',
  });
}

export default function SubmitPage() {
  return <SubmitForms />;
}
