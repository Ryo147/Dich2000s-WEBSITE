// Tailwind CDN config — extends default theme with dark palette synced
// to the DICH 2000s logo. Must be loaded AFTER the Tailwind CDN script
// but BEFORE the page renders.
tailwind.config = {
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        popover: 'var(--popover)',
        'popover-foreground': 'var(--popover-foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        'status-done': 'var(--status-done)',
        'status-wip': 'var(--status-wip)',
        'status-plan': 'var(--status-plan)',
        'status-other': 'var(--status-other)',
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        sans: ['Be Vietnam Pro', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: 'calc(0.75rem + 4px)',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
};
