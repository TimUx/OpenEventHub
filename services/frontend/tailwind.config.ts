/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#10221f',
          soft: '#1a332e',
        },
        paper: {
          DEFAULT: '#f3f6f4',
          elevated: '#ffffff',
        },
        teal: {
          DEFAULT: '#0f766e',
          bright: '#14b8a6',
          muted: '#99f6e4',
        },
        sand: {
          DEFAULT: '#d6c7a8',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 12px 40px rgba(16, 34, 31, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
