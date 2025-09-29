import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

const config: Config = {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}', './public/**/*.html'],
  theme: {
    extend: {
      colors: {
        primary: '#ffffff',
        accent: {
          light: '#f5b5b5',
          DEFAULT: '#e84d4d',
          dark: '#b71c1c',
        },
        success: {
          light: '#d4edda',
          DEFAULT: '#2d6a4f',
          dark: '#1b4332',
        },
        neutral: {
          light: '#f0fff4',
          DEFAULT: '#f9fcfb',
          dark: '#1f2933',
        },
        slate: colors.slate,
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        focus: '0 0 0 3px rgba(232, 77, 77, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
