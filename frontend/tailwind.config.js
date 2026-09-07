/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060B14',
          900: '#0A1220',
          800: '#101B30',
          700: '#182848',
          600: '#213458',
        },
        accent: {
          500: '#2F6FED',
          400: '#4C8DFF',
          300: '#7FB0FF',
        },
        stamp: {
          falso: '#F2545B',
          confiavel: '#34D399',
          duvidoso: '#FBBF24',
        },
        ink: {
          100: '#EAF2FF',
          400: '#8CA0C4',
          500: '#6B7FA3',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 60px -12px rgba(61, 139, 255, 0.45)',
        card: '0 20px 60px -20px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
      },
      keyframes: {
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        riseIn: 'riseIn 0.45s ease-out',
      },
    },
  },
  plugins: [],
};
