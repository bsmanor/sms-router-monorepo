/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          subtle: 'var(--bg-surface-subtle)',
          elevated: 'var(--bg-surface-elevated)',
          code: 'var(--bg-surface-code)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
        line: {
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
          focus: 'var(--border-focus)',
        },
        action: {
          primary: 'var(--action-primary-bg)',
          'primary-text': 'var(--action-primary-text)',
          'primary-hover': 'var(--action-primary-hover)',
        },
        brand: {
          DEFAULT: 'var(--brand-accent)',
          subtle: 'var(--brand-accent-subtle)',
          border: 'var(--brand-accent-border)',
        },
        status: {
          'success-bg': 'var(--status-success-bg)',
          'success-border': 'var(--status-success-border)',
          'success-text': 'var(--status-success-text)',

          'warning-bg': 'var(--status-warning-bg)',
          'warning-border': 'var(--status-warning-border)',
          'warning-text': 'var(--status-warning-text)',

          'danger-bg': 'var(--status-danger-bg)',
          'danger-border': 'var(--status-danger-border)',
          'danger-text': 'var(--status-danger-text)',

          'info-bg': 'var(--status-info-bg)',
          'info-border': 'var(--status-info-border)',
          'info-text': 'var(--status-info-text)',
        }
      }
    },
  },
  plugins: [],
}
