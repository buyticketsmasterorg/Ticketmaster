/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tmBlue: "#026cdf",
        tmNavy: "#1f262d",
      },
      animation: {
        'scan': 'scan 2.5s ease-in-out infinite',
        'slideUp': 'slideUp 0.3s ease-out forwards',
        'slideDown': 'slideDown 0.3s ease-out forwards',
        'fadeIn': 'fadeIn 0.5s ease-out forwards',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(200px)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}

