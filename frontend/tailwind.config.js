/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#f5f5f5",
        secondary: "#a0a0a0",
        danger: "#ff6b6b",
        success: "#51cf66",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "sans-serif"],
      },
      animation: {
        "slide-in": "slideIn 0.3s ease",
      },
      keyframes: {
        slideIn: {
          from: {
            opacity: "0",
            transform: "translateY(5px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
    },
  },
  plugins: [],
};
