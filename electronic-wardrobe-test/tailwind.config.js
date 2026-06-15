/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fef3ee",
          100: "#fde4d7",
          200: "#fac5ae",
          300: "#f69d7b",
          400: "#f17047",
          500: "#ee4d24",
          600: "#df351a",
          700: "#b92417",
          800: "#931f1b",
          900: "#771d1b",
        },
      },
    },
  },
  plugins: [],
};
