import type { Metadata } from 'next';

import { SubmitForms } from '../../components/submit-forms';
import { getDictionary } from '../../i18n/get-dictionary';
import { getRequestLocale } from '../../i18n/request-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  return {
    title: dictionary.submit.metaTitle,
    description: dictionary.submit.metaDescription,
  };
}

export default function SubmitPage() {
  return <SubmitForms />;
}
