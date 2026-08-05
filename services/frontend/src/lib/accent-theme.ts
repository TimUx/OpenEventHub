/**
 * Curated accent palettes for OpenEventHub.
 * Each accent defines light + dark primary tokens with text contrast
 * that meets WCAG AA (≥ 4.5:1) for normal text on the accent surface
 * (app bar / primary buttons use `--primary-contrast` on `--primary`).
 */

export const ACCENT_STORAGE_KEY = 'oeh-accent';
export const THEME_STORAGE_KEY = 'oeh-theme';

export type AccentId = 'blue' | 'teal' | 'green' | 'navy' | 'orange' | 'crimson' | 'slate';

export type AccentTokens = {
  readonly primary: string;
  readonly primaryBright: string;
  readonly primarySoft: string;
  readonly primaryContrast: string;
};

export type AccentDefinition = {
  readonly id: AccentId;
  /** Swatch shown in the picker (light-mode primary). */
  readonly swatch: string;
  readonly light: AccentTokens;
  readonly dark: AccentTokens;
};

export const ACCENT_THEMES: readonly AccentDefinition[] = [
  {
    id: 'blue',
    swatch: '#1565c0',
    light: {
      primary: '#1565c0',
      primaryBright: '#1e88e5',
      primarySoft: '#e3f2fd',
      primaryContrast: '#ffffff',
    },
    dark: {
      primary: '#42a5f5',
      primaryBright: '#64b5f6',
      primarySoft: '#16324d',
      primaryContrast: '#0b1520',
    },
  },
  {
    id: 'teal',
    swatch: '#00838f',
    light: {
      primary: '#00838f',
      primaryBright: '#00acc1',
      primarySoft: '#e0f7fa',
      primaryContrast: '#ffffff',
    },
    dark: {
      primary: '#26c6da',
      primaryBright: '#4dd0e1',
      primarySoft: '#12333a',
      primaryContrast: '#061418',
    },
  },
  {
    id: 'green',
    swatch: '#2e7d32',
    light: {
      primary: '#2e7d32',
      primaryBright: '#43a047',
      primarySoft: '#e8f5e9',
      primaryContrast: '#ffffff',
    },
    dark: {
      primary: '#66bb6a',
      primaryBright: '#81c784',
      primarySoft: '#1b3320',
      primaryContrast: '#0a160c',
    },
  },
  {
    id: 'navy',
    swatch: '#1a237e',
    light: {
      primary: '#1a237e',
      primaryBright: '#303f9f',
      primarySoft: '#e8eaf6',
      primaryContrast: '#ffffff',
    },
    dark: {
      primary: '#7986cb',
      primaryBright: '#9fa8da',
      primarySoft: '#1c2248',
      primaryContrast: '#0a0d1c',
    },
  },
  {
    id: 'orange',
    swatch: '#bf360c',
    light: {
      primary: '#bf360c',
      primaryBright: '#e65100',
      primarySoft: '#fbe9e7',
      primaryContrast: '#ffffff',
    },
    dark: {
      primary: '#ffb74d',
      primaryBright: '#ffcc80',
      primarySoft: '#3d2a14',
      primaryContrast: '#1a1208',
    },
  },
  {
    id: 'crimson',
    swatch: '#b71c1c',
    light: {
      primary: '#b71c1c',
      primaryBright: '#c62828',
      primarySoft: '#ffebee',
      primaryContrast: '#ffffff',
    },
    dark: {
      primary: '#ef5350',
      primaryBright: '#e57373',
      primarySoft: '#3a1616',
      primaryContrast: '#1a0808',
    },
  },
  {
    id: 'slate',
    swatch: '#37474f',
    light: {
      primary: '#37474f',
      primaryBright: '#546e7a',
      primarySoft: '#eceff1',
      primaryContrast: '#ffffff',
    },
    dark: {
      primary: '#90a4ae',
      primaryBright: '#b0bec5',
      primarySoft: '#243036',
      primaryContrast: '#0b1215',
    },
  },
] as const;

export const DEFAULT_ACCENT_ID: AccentId = 'blue';

export function isAccentId(value: string | null | undefined): value is AccentId {
  return ACCENT_THEMES.some((theme) => theme.id === value);
}

export function getAccentTheme(id: AccentId): AccentDefinition {
  return ACCENT_THEMES.find((theme) => theme.id === id) ?? ACCENT_THEMES[0]!;
}

/** Relative luminance (sRGB), WCAG 2.x. */
export function relativeLuminance(hex: string): number {
  const normalized = hex.replace('#', '').trim();
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;
  if (full.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const channels = [0, 1, 2].map((index) => {
    const value = Number.parseInt(full.slice(index * 2, index * 2 + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

/** Contrast ratio between two hex colors (WCAG). */
export function contrastRatio(foregroundHex: string, backgroundHex: string): number {
  const lighter = Math.max(relativeLuminance(foregroundHex), relativeLuminance(backgroundHex));
  const darker = Math.min(relativeLuminance(foregroundHex), relativeLuminance(backgroundHex));
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA for normal text. */
export const MIN_ACCENT_CONTRAST = 4.5;

export function accentMeetsContrast(tokens: AccentTokens): boolean {
  return contrastRatio(tokens.primaryContrast, tokens.primary) >= MIN_ACCENT_CONTRAST;
}

export function applyAccentToDocument(accentId: AccentId): void {
  document.documentElement.dataset.accent = accentId;
}

export function applyThemeModeToDocument(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark);
}

export function readStoredAccent(): AccentId {
  if (typeof window === 'undefined') {
    return DEFAULT_ACCENT_ID;
  }
  const stored = window.localStorage.getItem(ACCENT_STORAGE_KEY);
  return isAccentId(stored) ? stored : DEFAULT_ACCENT_ID;
}

export function readStoredDarkMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
}

export function persistAccent(accentId: AccentId): void {
  window.localStorage.setItem(ACCENT_STORAGE_KEY, accentId);
}

export function persistThemeMode(dark: boolean): void {
  window.localStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light');
}
