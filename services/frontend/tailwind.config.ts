/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ['class'],
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
          soft: 'var(--secondary-soft)',
        },
        success: {
          DEFAULT: 'var(--success)',
          soft: 'var(--success-soft)',
        },
        // Back-compat aliases used in existing components
        teal: {
          DEFAULT: 'var(--primary)',
          bright: 'var(--primary-bright)',
          muted: 'var(--primary-soft)',
        },
        sand: {
          DEFAULT: 'var(--secondary-soft)',
        },
        ink: {
          DEFAULT: 'var(--foreground)',
          soft: 'var(--muted)',
        },
        paper: {
          DEFAULT: 'var(--background)',
          elevated: 'var(--card)',
        },
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
      minHeight: {
        tap: '44px',
      },
      minWidth: {
        tap: '44px',
      },
    },
  },
  plugins: [],
};

export default config;
