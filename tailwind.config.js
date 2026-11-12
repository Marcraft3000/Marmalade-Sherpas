/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        audit: {
          bg: "#101112",
          secondary: "#191B1D",
          surface: "#222528",
          card: "#1E2023",
          border: "#2E3236",
          text: "#F1EFE9",
          muted: "#92979B",
          lime: "#C7F36B",
          limeHover: "#B8E55A",
          limeDim: "rgba(199, 243, 107, 0.12)",
          amber: "#F59E0B",
          amberDim: "rgba(245, 158, 11, 0.15)",
          red: "#EF4444",
          redDim: "rgba(239, 68, 68, 0.15)",
          blue: "#38BDF8",
          blueDim: "rgba(56, 189, 248, 0.15)"
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        display: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.35s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
