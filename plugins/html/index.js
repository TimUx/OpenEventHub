import { fetchUrlToBuffer } from '../utils/fetch-url.js';
import { filterNotExpiredEvents } from '../utils/is-future-event.js';
import { inferAllDay } from '../utils/temporal-all-day.js';
import { extractToubizWidgetConfig, fetchToubizEventsFromHtml } from '../utils/toubiz.js';

const MONTHS_DE = {
  januar: 1,
  februar: 2,
  märz: 3,
  maerz: 3,
  april: 4,
  mai: 5,
  juni: 6,
  juli: 7,
  august: 8,
  september: 9,
  oktober: 10,
  november: 11,
  dezember: 12,
};

const MONTHS_EN = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const BLOCK_BREAK_TAGS =
  'h[1-6]|p|div|section|article|aside|li|dt|dd|tr|td|th|br|hr|figcaption|blockquote|header|footer|main|nav';

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
}

function stripTags(html) {
  return decodeHtmlEntities(String(html).replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function toIsoOrNull(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  // Prefer date-only as UTC midnight to avoid TZ shifts for calendar listings.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00.000Z`;
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.toISOString();
}

function eventCandidate(fields, confidence = 0.8) {
  const title = fields.title?.trim() || null;
  const startAt = fields.startAt ?? null;
  if (!title || !startAt || !isMeaningfulTitle(title)) return null;
  const endAt = fields.endAt ?? null;
  const images = normalizeImageList(fields.images);
  return {
    isEvent: true,
    title,
    summary: fields.summary?.trim() || null,
    description: fields.description?.trim() || null,
    startAt,
    endAt,
    allDay: inferAllDay(startAt, endAt, fields.allDay),
    organizerName: fields.organizerName?.trim() || null,
    venueName: fields.venueName?.trim() || null,
    venueAddress: fields.venueAddress?.trim() || null,
    isRecurring: Boolean(fields.isRecurring),
    extractionConfidence: confidence,
    ...(images.length > 0 ? { images } : {}),
  };
}

function normalizeImageList(value) {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  const out = [];
  for (const item of items) {
    if (typeof item === 'string' && item.trim()) {
      out.push(item.trim());
      continue;
    }
    if (item && typeof item === 'object') {
      const url = item.url ?? item.contentUrl ?? item['@id'];
      if (typeof url === 'string' && url.trim()) out.push(url.trim());
    }
  }
  return [...new Set(out)];
}

function extractPageImages(html) {
  const urls = [];
  const ogRe =
    /<meta\b[^>]*(?:property|name)=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
  const ogReAlt =
    /<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["'][^>]*>/gi;
  for (const match of html.matchAll(ogRe)) {
    if (match[1]) urls.push(match[1].trim());
  }
  for (const match of html.matchAll(ogReAlt)) {
    if (match[1]) urls.push(match[1].trim());
  }
  const twitterRe =
    /<meta\b[^>]*(?:property|name)=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(twitterRe)) {
    if (match[1]) urls.push(match[1].trim());
  }
  return [...new Set(urls.filter(Boolean))];
}

function attachPageImages(events, pageImages) {
  if (!pageImages.length) return events;
  return events.map((event) => {
    const images = [...new Set([...(event.images ?? []), ...pageImages])];
    return images.length > 0 ? { ...event, images } : event;
  });
}

function mergeEvents(groups) {
  const seen = new Set();
  const out = [];
  for (const group of groups) {
    for (const event of group) {
      if (!event?.isEvent || !event.title || !event.startAt) continue;
      const key = `${event.title.toLowerCase()}|${event.startAt}|${event.endAt ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(event);
    }
  }
  out.sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)));
  return out;
}

function htmlToPlainLines(html) {
  let text = String(html);
  text = text.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');
  text = text.replace(new RegExp(`<(${BLOCK_BREAK_TAGS})(\\s[^>]*)?>`, 'gi'), '\n');
  text = text.replace(new RegExp(`</(${BLOCK_BREAK_TAGS})>`, 'gi'), '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  text = decodeHtmlEntities(text);
  return text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function parseMonthHeading(line) {
  const trimmed = line.trim();
  let match = /^([A-Za-zÄÖÜäöüß]+)\s+(20\d{2})$/u.exec(trimmed);
  if (match) {
    const key = match[1].toLowerCase();
    const month = MONTHS_DE[key] ?? MONTHS_EN[key];
    if (month) return { year: Number(match[2]), month };
  }
  match = /^(?:termine|veranstaltungen|events|kalender|programm)\s+(20\d{2})$/iu.exec(trimmed);
  if (match) return { year: Number(match[1]), month: null };
  match = /^(20\d{2})$/.exec(trimmed);
  if (match) return { year: Number(match[1]), month: null };
  return null;
}

function isDateFragment(line) {
  const cleaned = line.trim();
  if (!cleaned) return true;
  if (/^[+–—-]/u.test(cleaned)) return true;
  if (/^\d{1,2}\.\d{1,2}/u.test(cleaned)) return true;
  if (/^\d{1,2}\s*\+/u.test(cleaned)) return true;
  if (/^\d{4}-\d{2}-\d{2}/u.test(cleaned)) return true;
  return false;
}

function looksLikeTitle(line) {
  const cleaned = line.trim();
  if (!cleaned || cleaned.length < 3) return false;
  if (parseMonthHeading(cleaned)) return false;
  if (isDateFragment(cleaned)) return false;
  return true;
}

function isMeaningfulTitle(title) {
  const cleaned = String(title ?? '').trim();
  if (!looksLikeTitle(cleaned)) return false;
  if (cleaned === '.' || cleaned === '-' || cleaned === '–') return false;
  if (/^20\d{2}$/.test(cleaned)) return false;
  return true;
}

function resolveYear(context, explicitYear) {
  if (explicitYear) return Number(explicitYear);
  if (context?.year) return context.year;
  return null;
}

/**
 * Parse a single line that may contain a date (or range) and optional title.
 * Markup-agnostic: works for table cells, list items, divs after flattening.
 */
function parseDateTitleLine(line, context) {
  const cleaned = line.replace(/\u00a0/g, ' ').trim();
  if (!cleaned) return null;

  // ISO: 2026-08-01 Title / 2026-08-01 – 2026-08-03 Title
  let m =
    /^(20\d{2}-\d{2}-\d{2})(?:[Tt]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?\s*(?:[–—-]|bis|to)\s*(20\d{2}-\d{2}-\d{2})(?:[Tt]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?\s*[:|–—-]?\s*(.+)$/iu.exec(
      cleaned,
    );
  if (m) {
    const startAt = toIsoOrNull(m[1]);
    const endAt = toIsoOrNull(m[2]);
    const title = m[3].trim();
    if (startAt && title && isMeaningfulTitle(title)) return { startAt, endAt, title };
  }

  m =
    /^(20\d{2}-\d{2}-\d{2})(?:[Tt]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?\s*[:|–—-]?\s*(.+)$/u.exec(
      cleaned,
    );
  if (m) {
    const startAt = toIsoOrNull(m[1]);
    const title = m[2].trim();
    if (startAt && isMeaningfulTitle(title)) return { startAt, endAt: null, title };
  }

  // 15 + 16.08.2026 Title
  m = /^(\d{1,2})\s*\+\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*[:|–—-]?\s*(.+)$/u.exec(cleaned);
  if (m) {
    const year = Number(m[4]);
    const month = Number(m[3]);
    const startAt = isoDate(year, month, Number(m[1]));
    const endAt = isoDate(year, month, Number(m[2]));
    const title = m[5].trim();
    if (startAt && endAt && isMeaningfulTitle(title)) return { startAt, endAt, title };
  }

  // 01.08. + 02.08. Title  (trailing dots on both dates are required)
  m = /^(\d{1,2})\.(\d{1,2})\.\s*\+\s*(\d{1,2})\.(\d{1,2})\.\s*[:|–—-]?\s*(.+)$/u.exec(cleaned);
  if (m) {
    const year = resolveYear(context);
    if (year) {
      const startAt = isoDate(year, Number(m[2]), Number(m[1]));
      const endAt = isoDate(year, Number(m[4]), Number(m[3]));
      const title = m[5].trim();
      if (startAt && endAt && isMeaningfulTitle(title)) return { startAt, endAt, title };
    }
  }

  // 31.07. – 02.08. Title / 31.07.2026 – 02.08.2026 Title
  m =
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})?\s*[–—-]\s*(\d{1,2})\.(\d{1,2})\.(\d{4})?\s*[:|–—-]?\s*(.+)$/u.exec(
      cleaned,
    );
  if (m) {
    const startYear = resolveYear(context, m[3]);
    const endYear = resolveYear(context, m[6] || m[3]);
    if (startYear && endYear) {
      let sy = startYear;
      let ey = endYear;
      const startMonth = Number(m[2]);
      const endMonth = Number(m[5]);
      if (!m[3] && !m[6] && startMonth > endMonth && context?.month && context.month <= endMonth) {
        sy = startYear - 1;
      }
      const startAt = isoDate(sy, startMonth, Number(m[1]));
      const endAt = isoDate(ey, endMonth, Number(m[4]));
      const title = m[7].trim();
      if (startAt && endAt && isMeaningfulTitle(title)) return { startAt, endAt, title };
    }
  }

  // 28+29.03 Title (must not consume a trailing year as the title)
  m = /^(\d{1,2})\s*\+\s*(\d{1,2})\.(\d{1,2})\.\s*[:|–—-]?\s*(.+)$/u.exec(cleaned);
  if (m) {
    const year = resolveYear(context);
    if (year) {
      const month = Number(m[3]);
      const startAt = isoDate(year, month, Number(m[1]));
      const endAt = isoDate(year, month, Number(m[2]));
      const title = m[4].trim();
      if (startAt && endAt && isMeaningfulTitle(title)) return { startAt, endAt, title };
    }
  }

  // 04.04.2026 Title / 04.04. Title
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})?\s*[:|–—-]?\s*(.+)$/u.exec(cleaned);
  if (m) {
    const rest = m[4].trim();
    if (isMeaningfulTitle(rest)) {
      const year = resolveYear(context, m[3]);
      if (year) {
        const startAt = isoDate(year, Number(m[2]), Number(m[1]));
        if (startAt) return { startAt, endAt: null, title: rest };
      }
    }
  }

  // 1. August 2026 Title / 1 August 2026 – Title
  m = /^(\d{1,2})\.?\s+([A-Za-zÄÖÜäöüß]+)\s+(20\d{2})\s*[:|–—-]?\s*(.+)$/u.exec(cleaned);
  if (m) {
    const key = m[2].toLowerCase();
    const month = MONTHS_DE[key] ?? MONTHS_EN[key];
    const title = m[4].trim();
    if (month && isMeaningfulTitle(title)) {
      const startAt = isoDate(Number(m[3]), month, Number(m[1]));
      if (startAt) return { startAt, endAt: null, title };
    }
  }

  return null;
}

function parseDateOnly(line, context) {
  const cleaned = line.replace(/\u00a0/g, ' ').trim();
  if (!cleaned) return null;

  let m =
    /^(20\d{2}-\d{2}-\d{2})(?:[Tt]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?(?:\s*[–—-]\s*(20\d{2}-\d{2}-\d{2})(?:[Tt]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?)?$/u.exec(
      cleaned,
    );
  if (m) {
    return { startAt: toIsoOrNull(m[1]), endAt: m[2] ? toIsoOrNull(m[2]) : null };
  }

  m = /^(\d{1,2})\s*\+\s*(\d{1,2})\.(\d{1,2})\.(\d{4})$/u.exec(cleaned);
  if (m) {
    const year = Number(m[4]);
    const month = Number(m[3]);
    const startAt = isoDate(year, month, Number(m[1]));
    const endAt = isoDate(year, month, Number(m[2]));
    if (startAt && endAt) return { startAt, endAt };
  }

  m = /^(\d{1,2})\.(\d{1,2})\.\s*\+\s*(\d{1,2})\.(\d{1,2})\.$/u.exec(cleaned);
  if (m) {
    const year = resolveYear(context);
    if (year) {
      const startAt = isoDate(year, Number(m[2]), Number(m[1]));
      const endAt = isoDate(year, Number(m[4]), Number(m[3]));
      if (startAt && endAt) return { startAt, endAt };
    }
  }

  m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})?\s*[–—-]\s*(\d{1,2})\.(\d{1,2})\.(\d{4})?$/u.exec(cleaned);
  if (m) {
    const startYear = resolveYear(context, m[3]);
    const endYear = resolveYear(context, m[6] || m[3]);
    if (startYear && endYear) {
      const startAt = isoDate(startYear, Number(m[2]), Number(m[1]));
      const endAt = isoDate(endYear, Number(m[5]), Number(m[4]));
      if (startAt && endAt) return { startAt, endAt };
    }
  }

  m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})?$/u.exec(cleaned);
  if (m) {
    const year = resolveYear(context, m[3]);
    if (year) {
      const startAt = isoDate(year, Number(m[2]), Number(m[1]));
      if (startAt) return { startAt, endAt: null };
    }
  }

  m = /^(\d{1,2})\s*\+\s*(\d{1,2})\.(\d{1,2})\.$/u.exec(cleaned);
  if (m) {
    const year = resolveYear(context);
    if (year) {
      const month = Number(m[3]);
      const startAt = isoDate(year, month, Number(m[1]));
      const endAt = isoDate(year, month, Number(m[2]));
      if (startAt && endAt) return { startAt, endAt };
    }
  }

  m = /^(\d{1,2})\.?\s+([A-Za-zÄÖÜäöüß]+)\s+(20\d{2})$/u.exec(cleaned);
  if (m) {
    const key = m[2].toLowerCase();
    const month = MONTHS_DE[key] ?? MONTHS_EN[key];
    if (month) {
      const startAt = isoDate(Number(m[3]), month, Number(m[1]));
      if (startAt) return { startAt, endAt: null };
    }
  }

  return null;
}

function parseListingEvents(html) {
  const lines = htmlToPlainLines(html);
  const events = [];
  let context = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const heading = parseMonthHeading(line);
    if (heading) {
      context = { ...context, ...heading };
      continue;
    }

    const withTitle = parseDateTitleLine(line, context);
    if (withTitle?.title) {
      const event = eventCandidate(withTitle, 0.85);
      if (event) events.push(event);
      continue;
    }

    // Split markup: date on one line, title on the next (div/p/li/br)
    const dateOnly = parseDateOnly(line, context);
    const next = lines[i + 1];
    if (dateOnly?.startAt && next && looksLikeTitle(next)) {
      let title = next.trim();
      let consumed = 1;
      const next2 = lines[i + 2];
      if (next2 && looksLikeTitle(next2) && !parseDateOnly(next2, context)) {
        title = `${title} — ${next2.trim()}`;
        consumed = 2;
      }
      const event = eventCandidate({ ...dateOnly, title }, 0.85);
      if (event) events.push(event);
      i += consumed;
    }
  }

  return events;
}

function textFromCellHtml(rowHtml, cellClass) {
  const re = new RegExp(
    `<t[dh][^>]*class=["'][^"']*\\b${cellClass}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/t[dh]>`,
    'i',
  );
  const match = re.exec(rowHtml);
  if (!match) return null;
  return stripTags(match[1]);
}

function parseMarkedTableEvents(html) {
  const rowRe =
    /<tr[^>]*(?:data-oeh-event|data-event|class=["'][^"']*\boeh-event\b[^"']*["'])[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows = [...html.matchAll(rowRe)].map((m) => m[1]);
  const events = [];
  for (const rowHtml of rows) {
    const title = textFromCellHtml(rowHtml, 'title');
    const summary = textFromCellHtml(rowHtml, 'summary');
    const description = textFromCellHtml(rowHtml, 'description');
    const startAtRaw = textFromCellHtml(rowHtml, 'start-at') ?? textFromCellHtml(rowHtml, 'start');
    const endAtRaw = textFromCellHtml(rowHtml, 'end-at') ?? textFromCellHtml(rowHtml, 'end');
    const event = eventCandidate(
      {
        title,
        summary,
        description,
        startAt: toIsoOrNull(startAtRaw),
        endAt: toIsoOrNull(endAtRaw),
      },
      0.9,
    );
    if (event) events.push(event);
  }
  return events;
}

/** Any table row: flatten cells and run the same date/title heuristics. */
function parseGenericTableEvents(html) {
  const events = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let context = null;
  for (const match of html.matchAll(rowRe)) {
    const cells = [...match[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
      stripTags(m[1]),
    );
    if (cells.length === 0) continue;
    const joined = cells.filter(Boolean).join(' — ');
    const heading = parseMonthHeading(joined) ?? parseMonthHeading(cells[0] ?? '');
    if (heading && cells.length <= 2 && !parseDateTitleLine(joined, context)) {
      context = { ...context, ...heading };
      continue;
    }
    const parsed =
      parseDateTitleLine(joined, context) ??
      (() => {
        // Common: [date][title] or [title][date]
        for (let i = 0; i < cells.length; i += 1) {
          const dateOnly = parseDateOnly(cells[i], context);
          if (!dateOnly?.startAt) continue;
          const title = cells.filter((_, idx) => idx !== i).find((c) => looksLikeTitle(c));
          if (title) return { ...dateOnly, title };
        }
        return null;
      })();
    const event = parsed ? eventCandidate(parsed, 0.82) : null;
    if (event) events.push(event);
  }
  return events;
}

function parseJsonLdEvents(html) {
  const events = [];
  const scriptRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(scriptRe)) {
    let raw = match[1].trim();
    if (!raw) continue;
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }
    const nodes = Array.isArray(data) ? data : [data];
    const queue = [...nodes];
    while (queue.length > 0) {
      const node = queue.shift();
      if (!node || typeof node !== 'object') continue;
      if (Array.isArray(node['@graph'])) queue.push(...node['@graph']);
      const types = node['@type'];
      const typeList = Array.isArray(types) ? types : types ? [types] : [];
      const isEvent = typeList.some((t) => String(t).toLowerCase().includes('event'));
      if (!isEvent) continue;
      const startAt = toIsoOrNull(node.startDate ?? node.start_date);
      const endAt = toIsoOrNull(node.endDate ?? node.end_date);
      const title = node.name ?? node.headline ?? null;
      const location = node.location;
      let venueName = null;
      let venueAddress = null;
      if (typeof location === 'string') venueName = location;
      else if (location && typeof location === 'object') {
        venueName = location.name ?? null;
        const addr = location.address;
        venueAddress =
          typeof addr === 'string'
            ? addr
            : addr
              ? [addr.streetAddress, addr.addressLocality, addr.postalCode]
                  .filter(Boolean)
                  .join(', ')
              : null;
      }
      const event = eventCandidate(
        {
          title,
          summary: typeof node.description === 'string' ? node.description.slice(0, 280) : null,
          description: typeof node.description === 'string' ? node.description : null,
          startAt,
          endAt,
          venueName,
          venueAddress,
          organizerName:
            typeof node.organizer === 'string' ? node.organizer : (node.organizer?.name ?? null),
          images: normalizeImageList(node.image ?? node.imageUrl ?? node.photo),
        },
        0.95,
      );
      if (event) events.push(event);
    }
  }
  return events;
}

function parseTimeElementEvents(html) {
  const events = [];
  const timeRe = /<time\b([^>]*)>([\s\S]*?)<\/time>/gi;
  for (const match of html.matchAll(timeRe)) {
    const attrs = match[1] ?? '';
    const inner = stripTags(match[2] ?? '');
    const dtMatch = /\bdatetime=["']([^"']+)["']/i.exec(attrs);
    const startAt = toIsoOrNull(dtMatch?.[1] ?? inner);
    if (!startAt) continue;

    const index = match.index ?? 0;
    // Prefer a heading that appears shortly before this <time> in the same region.
    const beforeHtml = html.slice(Math.max(0, index - 500), index);
    const headingMatch = [...beforeHtml.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)].at(-1);
    let title = headingMatch ? stripTags(headingMatch[2]) : '';
    if (!isMeaningfulTitle(title)) {
      const afterStart = index + match[0].length;
      const after = stripTags(html.slice(afterStart, afterStart + 240));
      const before = stripTags(beforeHtml);
      title =
        after.split(/[.|]/)[0]?.trim() || before.split(/[.|]/).filter(Boolean).at(-1)?.trim() || '';
    }
    title = title
      .replace(/^\d{1,2}\.\d{1,2}\.(\d{4})?\s*/, '')
      .replace(/^\d{4}-\d{2}-\d{2}\s*/, '')
      .trim();
    const event = eventCandidate({ title, startAt }, 0.8);
    if (event) events.push(event);
  }
  return events;
}

/** Explicit event-ish blocks: article/li/div with event|termin|card classes or itemtype. */
function parseBlockEvents(html) {
  const events = [];
  const blockRe = /<(article|li|div|section|tr)\b([^>]*?)>([\s\S]*?)<\/\1>/gi;
  let context = null;
  for (const match of html.matchAll(blockRe)) {
    const attrs = match[2] ?? '';
    const body = match[3] ?? '';
    const attrHint =
      /itemtype=["'][^"']*Event/i.test(attrs) ||
      /\b(class|id)=["'][^"']*\b(event|termin|veranstaltung|calendar-item|event-card)\b/i.test(
        attrs,
      );
    const text = stripTags(body);
    if (!text || text.length < 5) continue;

    const heading = parseMonthHeading(text.split(/\s{2,}|\n/)[0] ?? '');
    if (heading) context = { ...context, ...heading };

    const lines = htmlToPlainLines(body);
    // Prefer first parsable line combo inside the block.
    let parsed = parseDateTitleLine(text, context);
    if (!parsed) {
      for (let i = 0; i < lines.length; i += 1) {
        parsed = parseDateTitleLine(lines[i], context);
        if (parsed) break;
        const dateOnly = parseDateOnly(lines[i], context);
        const next = lines[i + 1];
        if (dateOnly?.startAt && next && looksLikeTitle(next)) {
          parsed = { ...dateOnly, title: next.trim() };
          break;
        }
      }
    }
    if (!parsed && !attrHint) continue;
    if (!parsed) continue;
    const event = eventCandidate(parsed, attrHint ? 0.88 : 0.8);
    if (event) events.push(event);
  }
  return events;
}

function extractAllEvents(html) {
  const events = filterNotExpiredEvents(
    mergeEvents([
      parseJsonLdEvents(html),
      parseMarkedTableEvents(html),
      parseTimeElementEvents(html),
      parseGenericTableEvents(html),
      parseBlockEvents(html),
      parseListingEvents(html),
    ]),
  );
  return attachPageImages(events, extractPageImages(html));
}

/** @internal exported for unit tests */
export const __test = {
  parseDateTitleLine,
  parseGermanDateTitle: parseDateTitleLine,
  parseListingEvents,
  parseMonthHeading,
  htmlToPlainLines,
  parseJsonLdEvents,
  parseGenericTableEvents,
  parseBlockEvents,
  parseTimeElementEvents,
  extractAllEvents,
  extractPageImages,
  normalizeImageList,
};

export function createPlugin() {
  return {
    metadata: {
      pluginType: 'html',
      name: 'HTML Listing Plugin',
      version: '1.3.0',
    },

    async initialize() {
      // Stateless.
    },

    async discover(context) {
      return { urls: [context.sourceUrl] };
    },

    async fetch(context) {
      return fetchUrlToBuffer(context.sourceUrl);
    },

    async parse(fetchResult) {
      const html = fetchResult.content.toString('utf-8');
      return { html };
    },

    async normalize(parseResult) {
      const html = parseResult.html ?? '';
      const staticEvents = extractAllEvents(html);

      // Embedded online event-management systems (e.g. Toubiz widget) load
      // events via API — fetch all future occurrences when a widget is present.
      let emsEvents = [];
      if (extractToubizWidgetConfig(html)) {
        emsEvents = await fetchToubizEventsFromHtml(html);
      }

      return { events: filterNotExpiredEvents(mergeEvents([emsEvents, staticEvents])) };
    },

    async emit(normalized) {
      return normalized.events;
    },

    async healthCheck() {
      return { status: 'ok' };
    },
  };
}

export default createPlugin;
