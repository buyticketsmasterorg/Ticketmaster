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
    },
  },
  plugins: [],
}

