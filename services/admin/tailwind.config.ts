/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#1a1f2e', soft: '#2a3347' },
        paper: { DEFAULT: '#f4f6f9', elevated: '#ffffff' },
        accent: { DEFAULT: '#0e7490', bright: '#0891b2', muted: '#a5f3fc' },
        warn: { DEFAULT: '#b45309' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
