/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#E10600",
          blue: "#0062A3",
          gray: "#2B2B2B",
        },
      },
    },
  },
  darkMode: "media", // ou "class" se preferires alternar manualmente
  plugins: [],
};
