/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      colors: {
        'ultra-dark': '#0a0a0f',
        'dark-secondary': '#1a1a2e',
        'dark-tertiary': '#16213e',
        'mint': '#00d9a3',
        'mint-dark': '#00a878',
        'lavender': '#c4b5fd',
        'lavender-dark': '#8b7cc8',
        'peach': '#ffb997',
        'peach-dark': '#ff9970',
        'glass': 'rgba(255, 255, 255, 0.05)',
      },
      backdropBlur: {
        'md': '16px',
        'lg': '20px',
        'xl': '24px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-lg': '0 20px 60px rgba(0, 0, 0, 0.4)',
        'glow-mint': '0 0 20px rgba(0, 217, 163, 0.15)',
        'glow-lavender': '0 0 20px rgba(196, 181, 253, 0.15)',
        'glow-peach': '0 0 20px rgba(255, 185, 151, 0.15)',
      },
      borderColor: {
        'glass': 'rgba(255, 255, 255, 0.1)',
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '24px',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 217, 163, 0.15)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 217, 163, 0.25)' },
        },
      },
    },
  },
  plugins: [],
}