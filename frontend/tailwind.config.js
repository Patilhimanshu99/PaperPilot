/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        // Theme: Jet Black (#050505), Royal Amethyst (#3B0A6B), Electric Cyan (#00E5FF)
        bg: {
          DEFAULT: '#050505',
          elevated: '#0A0A0C',
          subtle: '#111114',
          card: '#0D0D11',
        },
        surface: {
          50: '#0c0c10',
          100: '#14141a',
          200: '#1c1c24',
          300: '#282834',
          400: '#3a3a4c',
        },
        amethyst: {
          50: '#fbf5ff',
          100: '#f4e8ff',
          200: '#e8d0fe',
          300: '#d5abfc',
          400: '#bb78f8',
          500: '#7B1FA2',
          600: '#5A0E99',
          700: '#3B0A6B', // Royal Amethyst base
          800: '#2A064D',
          900: '#1A0330',
          glow: 'rgba(59, 10, 107, 0.45)',
        },
        cyan: {
          DEFAULT: '#00E5FF', // Electric Cyan
          dim: 'rgba(0, 229, 255, 0.15)',
          glow: 'rgba(0, 229, 255, 0.35)',
          hover: '#33EBFF',
          dark: '#00B2C7',
        },
        accent: {
          DEFAULT: '#00E5FF',
          glow: 'rgba(0, 229, 255, 0.35)',
        }
      },
      boxShadow: {
        'cyan-glow': '0 0 20px -3px rgba(0, 229, 255, 0.3)',
        'cyan-sm': '0 0 10px -2px rgba(0, 229, 255, 0.25)',
        'amethyst-glow': '0 0 35px -5px rgba(59, 10, 107, 0.5)',
        'dark-card': '0 8px 32px 0 rgba(0, 0, 0, 0.7)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.55)',
      },
      borderRadius: {
        'xl2': '1rem',
        'xl3': '1.25rem',
      },
    },
  },
  plugins: [],
}
