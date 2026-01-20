import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        sage: {
          50: '#f4f6f3',
          100: '#e6ebe4',
          200: '#cdd7c9',
          300: '#b4c3ae',
          400: '#A8B5A0',
          500: '#8a9c82',
          600: '#6f7e68',
          700: '#586454',
          800: '#495246',
          900: '#3e453b',
        },
        cream: '#F8F6F3',
        warmgray: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
      },
    },
  },
  plugins: [],
};
export default config;
