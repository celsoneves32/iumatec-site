/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "rgb(225 29 72)",     // #e11d48
          dark: "rgb(190 18 60)",        // #be123c
        },
        "brand-red": "rgb(225 29 72)",   // se usas hover:text-brand-red no footer
      },
    },
  },
  plugins: [],
};
