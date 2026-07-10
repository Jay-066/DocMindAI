/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        base: '#0A0E14',
        surface: '#12161F',
        surface2: '#171C27',
        border: '#1E2430',
        accent: {
          DEFAULT: '#3B82F6',
          hover: '#60A5FA',
          dim: '#1D4ED8',
        },
        eval: {
          faithfulness: '#22C55E',
          relevancy: '#06B6D4',
          precision: '#A78BFA',
          recall: '#F97316',
        },
        warn: '#F59E0B',
        danger: '#EF4444',
        ink: {
          DEFAULT: '#E7EAF0',
          dim: '#9AA4B2',
          faint: '#5B6474',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(59,130,246,0.15), 0 8px 24px -8px rgba(59,130,246,0.25)',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        flowDash: {
          to: { strokeDashoffset: '-24' },
        },
      },
      animation: {
        pulseSoft: 'pulseSoft 1.6s ease-in-out infinite',
        slideUp: 'slideUp 0.35s ease-out',
        flowDash: 'flowDash 1.2s linear infinite',
      },
    },
  },
  plugins: [],
};
