/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#d1453b',
          hover: '#b93d35',
          light: '#fee9e9',
        },
      },
    },
  },
  plugins: [],
}
