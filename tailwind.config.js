/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Lexend', 'Inter', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        brand: {
          50: '#EEF2FF',
          100: '#DCE4FF',
          200: '#B7C6FF',
          300: '#8EA4FA',
          400: '#5B7FF0',
          500: '#3358E0',
          600: '#2741C2',
          700: '#1F349B',
          800: '#192A7A',
          900: '#101A4D',
        },
        ink: {
          900: '#0B1220',
          800: '#101729',
          700: '#1A2336',
          600: '#27324A',
        },
        surface: {
          DEFAULT: '#F6F7FB',
          card: '#FFFFFF',
          dark: '#0F1729',
          darkCard: '#161F33',
        },
        area: {
          monitoramento: '#3358E0',
          planejamento: '#7C5CFF',
          credenciamento: '#0D9C95',
          tecnico: '#F2790F',
        },
        status: {
          success: '#16A34A',
          warning: '#D97706',
          danger: '#ff0000',
          info: '#2563EB',
        },
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,26,77,0.04), 0 1px 12px rgba(16,26,77,0.06)',
        popover: '0 8px 30px rgba(16,26,77,0.18)',
      },
    },
  },
  plugins: [],
}
