import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        gold: {
          300: '#fde68a',
          400: '#f5c842',
          500: '#d4a017',
          600: '#b8860b',
        },
        board: {
          light: '#F0D9B5',
          dark:  '#B58863',
          border: '#7C4D23',
        },
      },
    },
  },
  plugins: [],
};
export default config;
