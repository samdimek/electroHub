import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        volt: {
          DEFAULT: '#C6FF3A',
          dim: '#9BDB1F',
        },
        ink: {
          950: '#0B0E11',
          900: '#12161B',
          800: '#1A1F26',
          700: '#242B33',
          600: '#3A424C',
          400: '#6B7684',
          200: '#B7C0CA',
          100: '#E6EAEE',
        },
        signal: {
          amber: '#FFB13C',
          red: '#FF5D5D',
          blue: '#4EA1FF',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '4px',
        lg: '6px',
      },
    },
  },
  plugins: [],
};

export default config;
