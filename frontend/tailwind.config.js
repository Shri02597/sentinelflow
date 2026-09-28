/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Surfaces, darkest to lightest. The console layers these instead of
        // using flat cards on a flat background, which is what gives it depth.
        bg: {
          DEFAULT: '#080b12',
          sunken: '#05070c',
          panel: '#0e131d',
          panel2: '#141b28',
          raised: '#1a2333',
        },
        // Hairlines are borders, not grey — a slightly blue translucent white
        // reads as a lit edge rather than a drawn line.
        line: {
          DEFAULT: 'rgba(148, 163, 184, 0.10)',
          strong: 'rgba(148, 163, 184, 0.18)',
          accent: 'rgba(34, 211, 238, 0.35)',
        },
        accent: {
          DEFAULT: '#22d3ee',
          dim: '#0e7490',
          soft: 'rgba(34, 211, 238, 0.12)',
          glow: 'rgba(34, 211, 238, 0.45)',
        },
        severity: {
          low: '#34d399',
          medium: '#fbbf24',
          high: '#fb923c',
          critical: '#f87171',
        },
        // ShopFlow keeps its own identity so the two apps stay visually
        // distinct at a glance, which is the whole point of the split.
        shop: {
          50: '#f5f7ff',
          100: '#eaeefe',
          200: '#d5ddfd',
          300: '#b3c2fb',
          400: '#8b9ff8',
          500: '#6b7ff2',
          600: '#5763e8',
          700: '#474dd4',
          800: '#3c40ad',
          900: '#353a8a',
        },
        ink: {
          DEFAULT: '#0f172a',
          soft: '#475569',
          faint: '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      // Tints in the 8–22% range are the ones this design actually uses for
      // "coloured surface, hairline border, legible text". The default scale
      // jumps 5 → 10 → 20, which is too coarse for that.
      opacity: {
        8: '0.08',
        12: '0.12',
        15: '0.15',
        18: '0.18',
        22: '0.22',
        35: '0.35',
        45: '0.45',
        60: '0.6',
        80: '0.8',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        // Layered rather than a single drop shadow: a tight contact shadow
        // plus a wide ambient one is what separates a surface from a backdrop.
        card: '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -12px rgba(0,0,0,0.6)',
        raised: '0 2px 4px rgba(0,0,0,0.4), 0 16px 40px -16px rgba(0,0,0,0.7)',
        pop: '0 12px 48px -12px rgba(0,0,0,0.8)',
        'glow-accent': '0 0 0 1px rgba(34,211,238,0.25), 0 0 24px -4px rgba(34,211,238,0.4)',
        'glow-critical': '0 0 0 1px rgba(248,113,113,0.3), 0 0 28px -6px rgba(248,113,113,0.5)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, rgba(148,163,184,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.045) 1px, transparent 1px)',
        'accent-sheen': 'linear-gradient(135deg, rgba(34,211,238,0.18), rgba(34,211,238,0.02))',
        'shop-sheen': 'linear-gradient(135deg, rgba(107,127,242,0.16), rgba(107,127,242,0.02))',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(248,113,113,0.45)' },
          '70%': { boxShadow: '0 0 0 8px rgba(248,113,113,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(248,113,113,0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.28s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 1.6s infinite',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
