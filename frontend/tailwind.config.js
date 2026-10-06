/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        page: 'rgb(var(--page) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        surfaceMuted: 'rgb(var(--surface-muted) / <alpha-value>)',
        slate: {
          50: 'rgb(var(--page) / <alpha-value>)',
          100: 'rgb(var(--surface-muted) / <alpha-value>)',
          200: 'rgb(var(--border) / <alpha-value>)',
          300: 'rgb(203 213 225 / <alpha-value>)',
          400: 'rgb(148 163 184 / <alpha-value>)',
          500: 'rgb(var(--text-muted) / <alpha-value>)',
          600: 'rgb(var(--text-soft) / <alpha-value>)',
          700: 'rgb(var(--text-soft) / <alpha-value>)',
          800: 'rgb(var(--text) / <alpha-value>)',
          900: 'rgb(var(--text) / <alpha-value>)',
          950: 'rgb(11 15 25 / <alpha-value>)',
        },
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: 'rgb(var(--brand) / <alpha-value>)',
          700: 'rgb(var(--brand-hover) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: '#134e4a',
          950: '#042f2e',
        }
      },
      fontFamily: {
        sans: ['Manrope', 'Segoe UI', 'sans-serif'],
        display: ['DM Serif Display', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}
