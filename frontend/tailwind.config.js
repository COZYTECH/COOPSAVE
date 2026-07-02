/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17211b',
        moss: '#2f6f4e',
        mint: '#dff5e6',
        clay: '#b66a42',
        gold: '#e9b44c',
        paper: '#f8faf8'
      },
      boxShadow: {
        panel: '0 18px 50px rgba(23, 33, 27, 0.08)'
      }
    }
  },
  plugins: []
};
