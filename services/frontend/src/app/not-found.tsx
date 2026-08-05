import { getDictionary } from '../i18n/get-dictionary';
import { getRequestLocale } from '../i18n/request-locale';

export default async function NotFound() {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  return (
    <div className="space-y-3 py-16 text-center">
      <h1 className="font-bold text-3xl">{dictionary.notFound.title}</h1>
      <p className="text-[var(--muted)]">{dictionary.notFound.body}</p>
      <a href="/" className="text-primary">
        OpenEventHub
      </a>
    </div>
  );
}
