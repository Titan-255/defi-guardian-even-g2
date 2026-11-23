/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        g2: {
          bg: "#000000",
          dim: "#1a3322",
          dark: "#00441b",
          base: "#008837",
          bright: "#00e676",
          accent: "#69f0ae",
          glow: "#b9f6ca"
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Consolas', '"Courier New"', 'monospace']
      }
    },
  },
  plugins: [],
}
