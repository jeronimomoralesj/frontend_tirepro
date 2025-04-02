// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './pages/**/*.{js,ts,jsx,tsx,mdx}',
      './components/**/*.{js,ts,jsx,tsx,mdx}',
      './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {
        colors: {
          primary: '#8A2BE2', // Vibrant purple
          'primary-dark': '#6A1CB2',
          secondary: '#00BFFF', // Deep sky blue
          'secondary-dark': '#0099CC',
          background: '#0F172A', // Dark blue background
        },
        animation: {
          float: 'float 6s ease-in-out infinite',
          fadeIn: 'fadeIn 1s ease-out forwards',
          pulse: 'pulse 4s ease-in-out infinite',
          'spin-slow': 'spin-slow 20s linear infinite',
        },
        keyframes: {
          float: {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-20px)' },
          },
          fadeIn: {
            from: { opacity: 0, transform: 'translateY(20px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
          pulse: {
            '0%, 100%': { opacity: 0.2 },
            '50%': { opacity: 0.5 },
          },
          'spin-slow': {
            from: { transform: 'rotate(0deg)' },
            to: { transform: 'rotate(360deg)' },
          },
        },
      },
    },
    plugins: [],
  };