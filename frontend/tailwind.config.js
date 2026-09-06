/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
        colors: {
          accent: "var(--accent)",
          // Aesthetic Palette from User's SchemeColor:
          pastel: {
            lavender: "#D0CCE5", // Soft Lavender / Periwinkle
            mint: "#D0E7E1",     // Soft Mint / Sage Mist
            cream: "#F7F6ED",    // Warm Cream / Alabaster
            matcha: "#E1EED7",   // Pale Matcha / Pistachio Green
            blush: "#F2CFDF",    // Soft Rose / Blush Pink
          },
          campus: {
            dark: "#0b0f17",
            card: "#131b26",
            elevated: "#1a2434",
            border: "#243247",
            muted: "#94a3b8",
            accent: "#D0E7E1",
          }
        },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-subtle": "pulseSubtle 2.5s infinite ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        }
      }
    },
  },
  plugins: [],
}
