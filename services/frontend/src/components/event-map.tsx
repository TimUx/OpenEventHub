'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { ApiEvent } from '../lib/api';
import { getEventCoordinates } from '../lib/map-events';

const DEFAULT_CENTER: [number, number] = [48.137154, 11.576124];
const DEFAULT_ZOOM = 11;

function markerIcon(active: boolean): L.DivIcon {
  return L.divIcon({
    className: 'oeh-map-marker',
    html: `<span class="oeh-map-marker__dot${active ? ' oeh-map-marker__dot--active' : ''}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -10],
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function EventMap({
  events,
  selectedId,
  onSelect,
  detailLabel,
  ariaLabel,
}: {
  readonly events: readonly ApiEvent[];
  readonly selectedId: string | null;
  readonly onSelect: (eventId: string) => void;
  readonly detailLabel: string;
  readonly ariaLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  const detailLabelRef = useRef(detailLabel);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    detailLabelRef.current = detailLabel;
  }, [detailLabel]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      attributionControl: true,
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) {
      return;
    }

    layer.clearLayers();
    markersRef.current.clear();

    const latLngs: L.LatLngTuple[] = [];

    for (const event of events) {
      const coords = getEventCoordinates(event);
      if (!coords) {
        continue;
      }

      const pin = L.marker([coords.latitude, coords.longitude], {
        icon: markerIcon(false),
        title: event.title,
      });
      pin.bindPopup(
        () =>
          `<strong>${escapeHtml(event.title)}</strong><br/><a href="/events/${event.id}">${escapeHtml(detailLabelRef.current)}</a>`,
      );
      pin.on('click', () => onSelectRef.current(event.id));
      pin.addTo(layer);
      markersRef.current.set(event.id, pin);
      latLngs.push([coords.latitude, coords.longitude]);
    }

    map.invalidateSize();

    if (latLngs.length === 1) {
      map.setView(latLngs[0]!, 14, { animate: true });
      return;
    }

    if (latLngs.length > 1) {
      map.fitBounds(L.latLngBounds(latLngs), {
        padding: [48, 48],
        maxZoom: 15,
        animate: true,
      });
      return;
    }

    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true });
  }, [events]);

  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const active = id === selectedId;
      marker.setIcon(markerIcon(active));
      if (active) {
        marker.openPopup();
        mapRef.current?.panTo(marker.getLatLng(), { animate: true });
      }
    }
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      className="h-[min(55dvh,520px)] min-h-72 w-full overflow-hidden rounded-xl sm:h-[min(70vh,560px)] sm:min-h-80"
      role="application"
      aria-label={ariaLabel}
    />
  );
}

export default EventMap;
