/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111d18',
        moss: '#0e3b2e',
        mint: '#e9f7ee',
        clay: '#ba1a1a',
        gold: '#c27803',
        paper: '#fbf9f5',
        'pamoja-forest': '#0e3b2e',
        'pamoja-forest-deep': '#00241a',
        'pamoja-ink': '#111d18',
        'pamoja-body': '#2d3a33',
        'pamoja-muted': '#5a6860',
        'pamoja-canvas': '#fbf9f5',
        'pamoja-surface': '#effdf4',
        'pamoja-sage': '#e9f7ee',
        'pamoja-sage-deep': '#d8e6dd',
        'pamoja-ochre': '#c27803',
        'pamoja-emerald': '#10b981'
      },
      boxShadow: {
        panel: '0 18px 50px rgba(14, 59, 46, 0.08)',
        'pamoja-soft': '0 2px 8px rgba(14, 59, 46, 0.04)',
        'pamoja-raised': '0 8px 24px -4px rgba(14, 59, 46, 0.08)',
        'pamoja-deep': '0 16px 40px -8px rgba(17, 29, 24, 0.14)'
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      maxWidth: {
        'pamoja': '1280px'
      }
    }
  },
  plugins: []
};
