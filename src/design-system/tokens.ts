/**
 * Vaan Vibes Management Portal — Centralized Design System Tokens
 * Unified design language matching the Coffee Show brand.
 */

export const DESIGN_TOKENS = {
  colors: {
    // Primary Brand Palette
    green: {
      DEFAULT: '#18312B',
      deep: '#0E1F1B',
      light: '#244941',
      surface: '#1E3D36',
      hover: '#142823',
    },
    beige: {
      DEFAULT: '#F5E9D3',
      light: '#FAF5EC',
      dark: '#E6D4B7',
      muted: '#D8C2A0',
    },
    gold: {
      DEFAULT: '#C8A25D',
      light: '#E0C182',
      dark: '#9F7C38',
    },
    terracotta: {
      DEFAULT: '#D96B43',
      light: '#E2835F',
    },
    // Status indicators
    status: {
      placed: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
      accepted: { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
      preparing: { bg: '#FEF9C3', text: '#854D0E', border: '#FDE047' },
      ready: { bg: '#E0E7FF', text: '#3730A3', border: '#A5B4FC' },
      completed: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
      cancelled: { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
    },
  },
  typography: {
    fontSans: "'General Sans', system-ui, -apple-system, sans-serif",
    fontMono: "'JetBrains Mono', SFMono-Regular, monospace",
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.25rem',
    full: '9999px',
  },
  shadows: {
    card: '0 2px 8px -2px rgba(24, 49, 43, 0.06), 0 1px 4px -1px rgba(24, 49, 43, 0.04)',
    hover: '0 12px 24px -8px rgba(24, 49, 43, 0.12), 0 4px 8px -2px rgba(24, 49, 43, 0.06)',
    modal: '0 25px 50px -12px rgba(14, 31, 27, 0.35)',
  },
  transitions: {
    fast: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
    normal: '250ms cubic-bezier(0.16, 1, 0.3, 1)',
    smooth: '400ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
} as const;
