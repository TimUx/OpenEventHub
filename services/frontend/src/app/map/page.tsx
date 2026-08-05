import { Suspense } from 'react';

import { MapBrowser } from '../../components/map-browser';

export default function MapPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[var(--muted)]">…</div>}>
      <MapBrowser />
    </Suspense>
  );
}
