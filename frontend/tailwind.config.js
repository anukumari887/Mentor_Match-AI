/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"], [data-theme="midnight"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-raised': 'var(--surface-raised)',
        'surface-inset': 'var(--surface-inset)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-text': 'var(--accent-text)',
        'accent-subtle': 'var(--accent-subtle)',
        success: 'var(--success)',
        'success-text': 'var(--success-text)',
        'success-subtle': 'var(--success-subtle)',
        warning: 'var(--warning)',
        'warning-text': 'var(--warning-text)',
        'warning-subtle': 'var(--warning-subtle)',
        danger: 'var(--danger)',
        'danger-text': 'var(--danger-text)',
        'danger-subtle': 'var(--danger-subtle)',
        'focus-ring': 'var(--focus-ring)',
        'badge-bg': 'var(--badge-bg)',
        'badge-text': 'var(--badge-text)',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      }
    },
  },
  plugins: [],
}
