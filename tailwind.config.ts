import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core palette
        obsidian: '#0F1115',
        bone: '#F6F5F3',
        slate: '#2A2F3A',

        // Text hierarchy (WCAG AA compliant on bone)
        'text-primary': '#0F1115',
        'text-secondary': '#4A4D55',
        'text-tertiary': '#6B6E76',
        'text-placeholder': '#9B9DA3',

        // Emotional accents
        moss: '#5F7A6A',
        ember: '#C46A4A',
        sun: '#E3B873',
        inkblue: '#2F4C5F',
        terracotta: '#B5543A',

        // Surface variants
        'bone-warm': '#ECEAE6',
        'slate-light': '#3A4050',
        'moss-light': '#EEF2EF',
        'inkblue-light': '#ECF0F3',
        'terracotta-light': '#F5EEEB',

        background: '#F6F5F3',
        foreground: '#0F1115',

        // Dark mode — "Deep Night" theme
        dark: {
          bg: '#0C0D10',
          surface: '#161821',
          'surface-raised': '#1E2029',
          'surface-hover': '#252731',
          border: 'rgba(255,255,255,0.06)',
          'text-primary': '#E8E6E2',
          'text-secondary': '#A3A5AB',
          'text-tertiary': '#6E7078',
          'text-placeholder': '#4A4C54',
          moss: '#6E9A7E',
          'moss-subtle': 'rgba(110,154,126,0.12)',
          inkblue: '#4A7A96',
          'inkblue-subtle': 'rgba(74,122,150,0.12)',
          terracotta: '#D4694E',
          'terracotta-subtle': 'rgba(212,105,78,0.10)',
          sun: '#E8C07A',
          'sun-subtle': 'rgba(232,192,122,0.10)',
          ember: '#D47A5C',
          'avatar-bg': '#252731',
        },

        // DEPRECATED v1 — kept for forest page compatibility only
        ash: '#A6A8AD',

        // Legacy colors — kept for forest page (skipped in redesign)
        lavender: {
          50: "#f2eef6",
          100: "#e6deed",
          200: "#ccbddb",
          300: "#b29cc9",
          400: "#997ab8",
          500: "#7f59a6",
          600: "#664785",
          700: "#4c3663",
          800: "#332442",
          900: "#191221",
          950: "#120c17",
        },
        "tea-green": {
          50: "#e9fbeb",
          100: "#d4f7d6",
          200: "#a9efae",
          300: "#7ee785",
          400: "#53df5c",
          500: "#28d733",
          600: "#20ac29",
          700: "#18811f",
          800: "#105615",
          900: "#082b0a",
          950: "#061e07",
        },
        "muted-teal": {
          50: "#f1f5f0",
          100: "#e4eae1",
          200: "#c8d5c3",
          300: "#adc0a5",
          400: "#92ab87",
          500: "#769669",
          600: "#5f7854",
          700: "#475a3f",
          800: "#2f3c2a",
          900: "#181e15",
          950: "#11150f",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'h1': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em', fontWeight: '600' }],
        'h2': ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '-0.015em', fontWeight: '600' }],
        'h3': ['1.125rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em', fontWeight: '500' }],
        'body': ['0.9375rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        'body-medium': ['0.9375rem', { lineHeight: '1.5rem', fontWeight: '500' }],
        'micro': ['0.8125rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'micro-medium': ['0.8125rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        'label': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.02em', fontWeight: '500' }],
      },
      spacing: {
        'xs': '0.25rem',
        'sm': '0.5rem',
        'md': '0.75rem',
        'base': '1rem',
        'lg': '1.5rem',
        'xl': '2rem',
        '2xl': '3rem',
        '3xl': '4rem',
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        'full': '9999px',
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(15, 17, 21, 0.04)',
        'card': '0 2px 8px rgba(15, 17, 21, 0.06)',
        'elevated': '0 4px 16px rgba(15, 17, 21, 0.08)',
        'modal': '0 8px 32px rgba(15, 17, 21, 0.12)',
      },
      transitionDuration: {
        'calm': '300ms',
        'slow': '500ms',
        'deliberate': '700ms',
      },
      transitionTimingFunction: {
        'calm': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      },
      keyframes: {
        fadeSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        gentlePulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'fade-slide-up': 'fadeSlideUp 500ms cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in': 'fadeIn 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        'gentle-pulse': 'gentlePulse 3s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
};
export default config;
