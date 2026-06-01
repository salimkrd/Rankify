/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    fontFamily: {
      sans: ['Montserrat', 'sans-serif'],
    },
    extend: {
      colors: {
        rank: {
          primary: '#0D1B2A',
          accent: '#FFC107',
          blue: '#2563EB',
          teal: '#14B8A6',
          bg: '#F8FAFC',
        },
      },
      boxShadow: {
        soft: '0 16px 40px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
