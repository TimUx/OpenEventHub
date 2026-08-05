/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          bright: 'var(--primary-bright)',
          soft: 'var(--primary-soft)',
          contrast: 'var(--primary-contrast)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          bright: 'var(--accent-bright)',
          muted: 'var(--primary-soft)',
        },
        success: { DEFAULT: 'var(--success)' },
        ink: { DEFAULT: 'var(--foreground)', soft: 'var(--muted)' },
        paper: { DEFAULT: 'var(--background)', elevated: 'var(--card)' },
      },
      fontFamily: {
        display: ['var(--font-sans)', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        sans: ['var(--font-sans)', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        soft: 'var(--shadow)',
      },
    },
  },
  plugins: [],
};

export default config;
