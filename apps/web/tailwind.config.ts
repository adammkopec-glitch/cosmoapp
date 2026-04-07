// apps/web/tailwind.config.ts
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        heading: ['Playfair Display', 'serif'],
        eyebrow: ['DM Sans', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      colors: {
        // Semantic tokens (HSL-based for dark mode compatibility)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Editorial palette — fixed values
        ivory: '#FAF7F2',
        cream: '#F0EBE3',
        caramel: '#C4A882',
        walnut: '#8C6A4A',    // deep accent — used in service card shadows and deep hover states
        espresso: '#1C1510',
        mink: '#6B5A4E',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "slide-up": {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" }
        },
        "clip-reveal": {
          from: { clipPath: "inset(100% 0 0 0)" },
          to: { clipPath: "inset(0% 0 0 0)" }
        },
        "overlay-in": {
          from: { clipPath: "inset(0 0 100% 0)" },
          to: { clipPath: "inset(0 0 0% 0)" }
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "slide-up": "slide-up 0.6s cubic-bezier(0.76,0,0.24,1) forwards",
        "clip-reveal": "clip-reveal 0.7s cubic-bezier(0.76,0,0.24,1) forwards",
        "overlay-in": "overlay-in 0.4s ease-in-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
