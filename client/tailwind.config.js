/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Albert Sans"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.35)',
      },
      colors: {
        panel: '#0f172a',
        border: 'rgba(148, 163, 184, 0.14)',
      },
    },
  },
  plugins: [],
};
