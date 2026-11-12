/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#04724D",       // Deep Emerald Green
          primaryHover: "#03593C",
          primaryDim: "rgba(4, 114, 77, 0.15)",
          primaryGlow: "rgba(4, 114, 77, 0.35)",
          light: "#F4F4F9",         // Crisp Ghost Off-White
          teal: "#B8DBD9",          // Soft Powder Teal / Ice
          tealDim: "rgba(184, 219, 217, 0.12)",
          slate: "#586F7C",         // Steel Slate Gray
          slateDim: "rgba(88, 111, 124, 0.2)",
          black: "#000000",         // Pure Obsidian Black
          surface: "#0A0D0E",       // Deep Elevated Surface
          card: "#0E1315",          // Elevated Card Background
          border: "#1C2529",         // Refined Border
          borderHover: "#2C3940",
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 3s infinite ease-in-out',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
}
