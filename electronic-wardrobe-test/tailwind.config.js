/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#baddfd",
          300: "#7cc2fc",
          400: "#36a3f9",
          500: "#0071e3",
          600: "#005bb5",
          700: "#004a94",
          800: "#003d7a",
          900: "#002d5e",
        },
      },
      borderRadius: {
        'apple': '12px',
      },
    },
  },
  plugins: [],
};
