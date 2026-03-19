/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#1a56db', 700: '#0e3a8c', 800: '#1e3a5f', 900: '#1e293b' },
        accent: { 50: '#ecfdf5', 100: '#d1fae5', 500: '#10b981', 600: '#059669' },
      },
    },
  },
  plugins: [],
};
