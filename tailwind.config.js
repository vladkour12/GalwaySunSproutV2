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
        'dark-bg': '#191835',
        'dark-bg-secondary': '#1f1d3d',
        'dark-bg-tertiary': '#2a2850',
        'accent-teal': '#00B365',
        'accent-coral': '#FF6464',
        'accent-orange': '#FF9E00',
      },
    },
  },
  plugins: [],
}