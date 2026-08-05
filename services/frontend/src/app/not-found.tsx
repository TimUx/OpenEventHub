export default function NotFound() {
  return (
    <div className="space-y-3 py-16 text-center">
      <h1 className="font-display text-3xl">Not found</h1>
      <p className="text-[var(--muted)]">This page or event does not exist.</p>
      <a href="/" className="text-teal dark:text-teal-bright">
        Back home
      </a>
    </div>
  );
}
