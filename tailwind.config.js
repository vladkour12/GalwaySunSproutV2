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
        dark: {
          bg: '#0f0f1e',      // Very dark navy
          primary: '#1a1a3d',  // Dark blue
          secondary: '#242850', // Lighter dark blue
          accent: '#00d084',   // Teal accent
          text: '#e0e0ff',     // Light text
          border: '#3a3a5a',   // Dark border
        },
      },
    },
  },
  plugins: [],
}