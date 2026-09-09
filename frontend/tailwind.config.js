/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0b0f17',
          panel: '#111827',
          panel2: '#161e2e',
        },
        accent: {
          DEFAULT: '#22d3ee',
          dim: '#0891b2',
        },
        severity: {
          low: '#22c55e',
          medium: '#eab308',
          high: '#f97316',
          critical: '#ef4444',
        },
      },
    },
  },
  plugins: [],
}
