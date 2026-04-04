# COSMO UI/UX Editorial Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform COSMO's visual layer into an editorial high-fashion aesthetic — Cormorant Garamond display type, warm caramel palette, 6 premium animation effects — without touching any backend, routing, or business logic.

**Architecture:** Pure CSS/component-level changes on top of the existing React 19 + Vite frontend. New shared hooks (`useClipReveal`) and components (`ClipRevealImage`, `FloatingBookingCTA`, `ServiceCard`) replace inline patterns. Framer Motion (already installed at ^11.2.6) handles page transitions via `AnimatePresence` in `PublicLayout`. All public-facing pages updated; admin/employee panels untouched.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v3, Framer Motion ^11.2.6 (existing), Google Fonts (new: Cormorant Garamond 300/300i, DM Sans Condensed 600)

**Spec:** `docs/superpowers/specs/2026-04-04-ui-ux-redesign-design.md`

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `apps/web/tailwind.config.ts` | New color tokens (ivory, cream, caramel, walnut, espresso, mink), new font families (display, eyebrow), clip-reveal keyframe |
| Modify | `apps/web/src/index.css` | Google Fonts @import, updated CSS variables, editorial utility classes |
| Modify | `apps/web/src/components/ui/button.tsx` | `border-radius: 0`, uppercase letter-spacing variants |
| Create | `apps/web/src/hooks/useClipReveal.ts` | Intersection Observer hook for clip-path reveal |
| Create | `apps/web/src/components/ui/ClipRevealImage.tsx` | Image wrapper using useClipReveal |
| Create | `apps/web/src/components/ui/FloatingBookingCTA.tsx` | Fixed scroll-triggered glassmorphism CTA bar |
| Modify | `apps/web/src/components/layout/Navbar.tsx` | Scroll transparency, new mobile fullscreen overlay, remove ThemeToggle |
| Modify | `apps/web/src/components/layout/PublicLayout.tsx` | Remove MobileBottomNav, add FloatingBookingCTA, AnimatePresence wrapper |
| Create | `apps/web/src/components/ui/ServiceCard.tsx` | Extracted + glassmorphism card (was inline in ServiceList/Home) |
| Modify | `apps/web/src/pages/public/Home.tsx` | New hero (zoom-out, dark), ticker update, testimonials section |
| Modify | `apps/web/src/pages/public/ServiceList.tsx` | Sticky header, use ServiceCard, clip-reveal |
| Modify | `apps/web/src/pages/public/About.tsx` | ClipRevealImage on photos |
| Modify | `apps/web/src/pages/public/MetamorphosesGallery.tsx` | ClipRevealImage on photos |
| Modify | `apps/web/src/pages/public/ServiceDetail.tsx` | ClipRevealImage on hero image |
| Modify | `apps/web/src/pages/user/BookingWizard.tsx` | New progress bar, rectangular step buttons |
| Modify | `apps/web/src/pages/user/Loyalty.tsx` | Dark gradient loyalty card |

**Run dev server throughout:** `cd cosmo-app && pnpm dev` — frontend on http://localhost:5173

---

## Task 1: Design Tokens — Tailwind + CSS Variables

**Files:**
- Modify: `apps/web/tailwind.config.ts`
- Modify: `apps/web/src/index.css`

- [ ] **Step 1: Update tailwind.config.ts — new colors + fonts**

Replace the `extend` block in `tailwind.config.ts`:

```ts
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
        // Editorial palette — fixed values, not HSL-variable
        ivory: '#FAF7F2',
        cream: '#F0EBE3',
        caramel: '#C4A882',
        walnut: '#8C6A4A',
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
```

- [ ] **Step 2: Update index.css — Google Fonts, CSS variables, editorial utilities**

Replace the entire content of `apps/web/src/index.css`:

```css
/* apps/web/src/index.css */
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300;1,400&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');
/* Note: DM Sans does not have a "Condensed" axis. The eyebrow style is achieved
   via letter-spacing: 0.4em + font-size: 10px + uppercase — not a separate font file. */

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    color-scheme: light;
    --background: 40 33% 97%;        /* #FAF7F2 ivory */
    --foreground: 20 48% 8%;         /* #1C1510 espresso */

    --card: 0 0% 100%;
    --card-foreground: 20 48% 8%;

    --popover: 0 0% 100%;
    --popover-foreground: 20 48% 8%;

    --primary: 33 35% 65%;           /* #C4A882 caramel */
    --primary-foreground: 20 48% 8%;

    --secondary: 30 28% 91%;         /* #F0EBE3 cream */
    --secondary-foreground: 20 48% 8%;

    --muted: 30 28% 91%;
    --muted-foreground: 20 17% 37%;  /* #6B5A4E mink */

    --accent: 30 28% 91%;
    --accent-foreground: 20 48% 8%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 40 33% 97%;

    --border: 30 20% 88%;
    --input: 30 20% 88%;
    --ring: 33 35% 65%;

    --radius: 0rem;                   /* editorial: no radius by default */
  }

  .dark {
    --background: 22 20% 15%;
    --foreground: 34 30% 96%;
    --card: 22 15% 20%;
    --card-foreground: 34 30% 96%;
    --popover: 22 15% 20%;
    --popover-foreground: 34 30% 96%;
    --primary: 33 35% 65%;
    --primary-foreground: 22 20% 15%;
    --secondary: 22 10% 30%;
    --secondary-foreground: 34 30% 96%;
    --muted: 22 10% 25%;
    --muted-foreground: 22 10% 65%;
    --accent: 22 10% 30%;
    --accent-foreground: 34 30% 96%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 34 30% 96%;
    --border: 22 10% 25%;
    --input: 22 10% 25%;
    --ring: 33 35% 65%;
  }
}

@layer base {
  html, body { overflow-x: hidden; }
  * { @apply border-border; }
  body {
    @apply bg-ivory text-espresso font-sans antialiased;
    transition: background-color 0.2s;
  }
}

@layer components {
  /* Editorial eyebrow label */
  .eyebrow {
    @apply text-[10px] font-eyebrow font-semibold tracking-[0.4em] uppercase text-caramel;
  }

  /* Display heading — Cormorant Garamond italic */
  .display {
    @apply font-display font-light italic leading-[1.05] tracking-[-0.02em];
  }

  /* Glass effect */
  .glass {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .glass-dark {
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    background: rgba(28, 21, 16, 0.88);
  }
}

@layer utilities {
  /* Clip reveal — applied by useClipReveal hook */
  .clip-hidden { clip-path: inset(100% 0 0 0); }
  .clip-visible { clip-path: inset(0% 0 0 0); transition: clip-path 0.7s cubic-bezier(0.76,0,0.24,1); }

  /* Stagger delays for clip reveal */
  .delay-100 { transition-delay: 100ms; }
  .delay-200 { transition-delay: 200ms; }
  .delay-300 { transition-delay: 300ms; }
  .delay-400 { transition-delay: 400ms; }
}
```

- [ ] **Step 3: Start dev server and verify no build errors**

```bash
cd cosmo-app/apps/web && pnpm dev
```

Expected: Server starts on http://localhost:5173 with no TypeScript or CSS errors in terminal. The page will look broken (ivory background, no styled buttons yet) — that's expected. Stop server after check.

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/web/tailwind.config.ts apps/web/src/index.css
git commit -m "feat: add editorial design tokens — caramel palette, Cormorant Garamond, clip-reveal keyframes"
```

---

## Task 2: Button Component — Rectangular Style

**Files:**
- Modify: `apps/web/src/components/ui/button.tsx`

- [ ] **Step 1: Read the current button.tsx to understand its variant system**

File is at `apps/web/src/components/ui/button.tsx`. It uses `cva()` from `class-variance-authority`.

- [ ] **Step 2: Update button variants to rectangular editorial style**

Find the `buttonVariants` `cva()` call and update the base class and variants:

```tsx
// In the cva() base string, change rounded-full/rounded-md → remove rounding
// Change: "inline-flex items-center ... rounded-md ..."
// To keep letter-spacing and uppercase for all sizes

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-[10px] font-sans font-medium tracking-[0.2em] uppercase transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-espresso text-ivory shadow hover:bg-espresso/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-espresso bg-transparent text-espresso shadow-sm hover:bg-espresso hover:text-ivory",
        secondary: "bg-cream text-espresso shadow-sm hover:bg-cream/80",
        ghost: "text-espresso hover:bg-cream",
        link: "text-espresso underline-offset-4 hover:underline border-b border-caramel pb-0.5 tracking-[0.15em]",
        caramel: "bg-caramel text-espresso shadow hover:bg-caramel/90",
      },
      size: {
        default: "h-10 px-8 py-2",
        sm: "h-8 px-5 py-1.5 text-[9px]",
        lg: "h-12 px-10 py-3 text-[11px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

- [ ] **Step 3: Verify dev server — check buttons look rectangular with uppercase text**

Open http://localhost:5173 — any page with buttons should show rectangular (no pill shape), uppercase, letter-spaced buttons. The overall spacing will be more geometric.

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/web/src/components/ui/button.tsx
git commit -m "feat: rectangular editorial button variants — uppercase, tracking, no border-radius"
```

---

## Task 3: useClipReveal Hook + ClipRevealImage Component

**Files:**
- Create: `apps/web/src/hooks/useClipReveal.ts`
- Create: `apps/web/src/components/ui/ClipRevealImage.tsx`

- [ ] **Step 1: Create useClipReveal.ts**

```ts
// apps/web/src/hooks/useClipReveal.ts
import { useEffect, useRef, useState } from 'react';

interface UseClipRevealOptions {
  threshold?: number;  // 0–1, default 0.15
  delay?: number;      // ms delay after element enters viewport
}

export function useClipReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseClipRevealOptions = {}
) {
  const { threshold = 0.15, delay = 0 } = options;
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => setRevealed(true), delay);
          } else {
            setRevealed(true);
          }
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, delay]);

  return { ref, revealed };
}
```

- [ ] **Step 2: Create ClipRevealImage.tsx**

```tsx
// apps/web/src/components/ui/ClipRevealImage.tsx
import { useClipReveal } from '@/hooks/useClipReveal';
import { cn } from '@/lib/utils';

interface ClipRevealImageProps {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  delay?: number;
  objectFit?: 'cover' | 'contain';
}

export const ClipRevealImage = ({
  src,
  alt,
  className,
  wrapperClassName,
  delay = 0,
  objectFit = 'cover',
}: ClipRevealImageProps) => {
  const { ref, revealed } = useClipReveal<HTMLDivElement>({ delay });

  return (
    <div
      ref={ref}
      className={cn('overflow-hidden', wrapperClassName)}
      style={{
        clipPath: revealed ? 'inset(0% 0 0 0)' : 'inset(100% 0 0 0)',
        transition: 'clip-path 0.7s cubic-bezier(0.76,0,0.24,1)',
      }}
    >
      <img
        src={src}
        alt={alt}
        className={cn(
          'w-full h-full transition-transform duration-700',
          objectFit === 'cover' ? 'object-cover' : 'object-contain',
          className
        )}
        style={{
          transform: revealed ? 'scale(1)' : 'scale(1.05)',
          transition: 'transform 0.9s cubic-bezier(0.76,0,0.24,1)',
        }}
      />
    </div>
  );
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd cosmo-app/apps/web && npx tsc --noEmit
```

Expected: No errors related to the new files.

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/web/src/hooks/useClipReveal.ts apps/web/src/components/ui/ClipRevealImage.tsx
git commit -m "feat: useClipReveal hook + ClipRevealImage component — Intersection Observer clip-path reveal"
```

---

## Task 4: FloatingBookingCTA Component

**Files:**
- Create: `apps/web/src/components/ui/FloatingBookingCTA.tsx`

- [ ] **Step 1: Create FloatingBookingCTA.tsx**

```tsx
// apps/web/src/components/ui/FloatingBookingCTA.tsx
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const HIDDEN_PATHS = ['/rezerwacja', '/auth', '/user', '/admin', '/employee'];

export const FloatingBookingCTA = () => {
  const [visible, setVisible] = useState(false);
  const location = useLocation();

  const isHidden = HIDDEN_PATHS.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && !isHidden && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
          className="fixed bottom-0 left-0 right-0 z-40 glass-dark border-t border-caramel/30"
          style={{ borderTop: '1px solid rgba(196,168,130,0.3)' }}
        >
          <div className="container flex items-center justify-between py-3">
            <div>
              <p className="eyebrow mb-0.5">Gotowa na zmianę?</p>
              <p className="font-display text-sm text-ivory" style={{ fontStyle: 'italic' }}>
                Zarezerwuj wizytę online
              </p>
            </div>
            <Link
              to="/rezerwacja"
              className="shrink-0 px-6 py-3 bg-caramel text-espresso text-[9px] font-semibold tracking-[0.3em] uppercase hover:bg-caramel/90 transition-colors"
            >
              Rezerwuj →
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd cosmo-app/apps/web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd cosmo-app
git add apps/web/src/components/ui/FloatingBookingCTA.tsx
git commit -m "feat: FloatingBookingCTA — glassmorphism scroll-triggered booking bar"
```

---

## Task 5: Navbar Redesign

**Files:**
- Modify: `apps/web/src/components/layout/Navbar.tsx`

The current `Navbar.tsx` is 174 lines. We rewrite it completely — keeping the same `useAuth`, `useNavigate`, and `authApi.logout` logic, just changing all visual aspects.

- [ ] **Step 1: Rewrite Navbar.tsx**

```tsx
// apps/web/src/components/layout/Navbar.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/api/auth.api';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
  { to: '/uslugi', label: 'Usługi', num: '01' },
  { to: '/metamorfozy', label: 'Metamorfozy', num: '02' },
  { to: '/blog', label: 'Blog', num: '03' },
  { to: '/o-nas', label: 'O nas', num: '04' },
  { to: '/kontakt', label: 'Kontakt', num: '05' },
  { to: '/program-lojalnosciowy', label: 'Lojalność', num: '06' },
];

export const Navbar = () => {
  const { isAuthenticated, isAdmin, isEmployee, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      logout();
      navigate('/');
    } catch (e) {
      console.error(e);
    }
    setMobileOpen(false);
  };

  const panelLink = isAdmin ? '/admin' : isEmployee ? '/employee' : '/user';
  const panelLabel = isAdmin ? 'Panel Admina' : isEmployee ? 'Panel Pracownika' : 'Moje Konto';

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          height: '72px',
          background: scrolled ? 'rgba(250,247,242,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(28,21,16,0.08)' : 'none',
        }}
      >
        <div className="container h-full flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="font-display text-[13px] tracking-[0.45em] uppercase"
            style={{ color: scrolled ? '#1C1510' : '#FAF7F2', fontStyle: 'normal', fontWeight: 300 }}
          >
            Cosmo
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="text-[11px] tracking-[0.2em] uppercase transition-colors hover:text-caramel"
                style={{ color: scrolled ? '#6B5A4E' : 'rgba(250,247,242,0.75)' }}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/rezerwacja"
                  data-tour="navbar-booking-btn"
                  className="px-6 py-2.5 text-[10px] tracking-[0.25em] uppercase font-medium transition-opacity hover:opacity-90"
                  style={{
                    background: scrolled ? '#1C1510' : '#FAF7F2',
                    color: scrolled ? '#FAF7F2' : '#1C1510',
                  }}
                >
                  Rezerwacja
                </Link>
                <Link
                  to={panelLink}
                  className="text-[10px] tracking-[0.2em] uppercase transition-colors hover:text-caramel"
                  style={{ color: scrolled ? '#6B5A4E' : 'rgba(250,247,242,0.6)' }}
                >
                  {panelLabel}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-[10px] tracking-[0.2em] uppercase transition-colors hover:text-caramel"
                  style={{ color: scrolled ? '#6B5A4E' : 'rgba(250,247,242,0.6)' }}
                >
                  Wyloguj
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className="text-[10px] tracking-[0.2em] uppercase transition-colors hover:text-caramel"
                  style={{ color: scrolled ? '#6B5A4E' : 'rgba(250,247,242,0.7)' }}
                >
                  Zaloguj
                </Link>
                <Link
                  to="/rezerwacja"
                  className="px-6 py-2.5 text-[10px] tracking-[0.25em] uppercase font-medium transition-opacity hover:opacity-90"
                  style={{
                    background: scrolled ? '#1C1510' : '#FAF7F2',
                    color: scrolled ? '#FAF7F2' : '#1C1510',
                  }}
                >
                  Rezerwacja
                </Link>
              </>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2 justify-self-end"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Zamknij menu' : 'Otwórz menu'}
          >
            <span
              className="block h-px w-[22px] transition-all duration-300"
              style={{ background: scrolled ? '#1C1510' : '#FAF7F2' }}
            />
            <span
              className="block h-px w-[14px] transition-all duration-300"
              style={{ background: scrolled ? '#1C1510' : '#FAF7F2' }}
            />
          </button>
        </div>
      </nav>

      {/* Mobile fullscreen overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: '#1C1510' }}
          >
            {/* Header row */}
            <div className="container flex items-center justify-between" style={{ height: '72px' }}>
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="font-display text-[13px] tracking-[0.45em] uppercase text-ivory"
                style={{ fontStyle: 'normal', fontWeight: 300 }}
              >
                Cosmo
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-ivory text-2xl leading-none p-2"
                aria-label="Zamknij menu"
              >
                ✕
              </button>
            </div>

            {/* Nav links */}
            <div className="container flex-1 flex flex-col justify-center gap-1">
              {NAV_LINKS.map(({ to, label, num }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-baseline gap-4 py-3 border-b border-ivory/10 group"
                >
                  <span className="eyebrow text-caramel">{num}</span>
                  <span
                    className="font-display text-[28px] text-ivory transition-colors group-hover:text-caramel"
                    style={{ fontStyle: 'italic', fontWeight: 300 }}
                  >
                    {label}
                  </span>
                </Link>
              ))}
            </div>

            {/* Bottom area */}
            <div className="container pb-8 flex flex-col gap-3 border-t border-ivory/10 pt-6">
              {isAuthenticated ? (
                <>
                  <Link
                    to={panelLink}
                    onClick={() => setMobileOpen(false)}
                    className="text-[10px] tracking-[0.3em] uppercase text-ivory/60 hover:text-ivory transition-colors py-2"
                  >
                    {panelLabel}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-[10px] tracking-[0.3em] uppercase text-ivory/60 hover:text-ivory transition-colors text-left py-2"
                  >
                    Wyloguj
                  </button>
                </>
              ) : (
                <Link
                  to="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-[10px] tracking-[0.3em] uppercase text-ivory/60 hover:text-ivory transition-colors py-2"
                >
                  Zaloguj się
                </Link>
              )}
              <Link
                to="/rezerwacja"
                onClick={() => setMobileOpen(false)}
                className="mt-2 py-4 text-center text-[10px] tracking-[0.3em] uppercase font-medium bg-caramel text-espresso hover:bg-caramel/90 transition-colors"
              >
                Zarezerwuj wizytę
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
```

- [ ] **Step 2: Start dev server and verify navbar**

```bash
cd cosmo-app && pnpm dev
```

Open http://localhost:5173. Check:
- Nav is transparent and shows ivory text on homepage (which has dark hero background)
- Scroll down → nav becomes frosted cream with dark text
- On mobile: hamburger shows two lines, tap → fullscreen dark overlay with italic links and numbered labels
- Logo displays "Cosmo" in Cormorant Garamond style

- [ ] **Step 3: Commit**

```bash
cd cosmo-app
git add apps/web/src/components/layout/Navbar.tsx
git commit -m "feat: editorial navbar — scroll transparency, fullscreen mobile overlay, Cormorant Garamond logo"
```

---

## Task 6: PublicLayout — Remove MobileBottomNav, Add FloatingCTA, Page Transitions

**Files:**
- Modify: `apps/web/src/components/layout/PublicLayout.tsx`

- [ ] **Step 1: Rewrite PublicLayout.tsx**

```tsx
// apps/web/src/components/layout/PublicLayout.tsx
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { FloatingBookingCTA } from '@/components/ui/FloatingBookingCTA';

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit:    { opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } },
};

// Cream curtain overlay on page change
const curtainVariants = {
  initial: { scaleY: 0, originY: 0 },
  animate: { scaleY: 0, originY: 0 },
  exit:    { scaleY: [0, 1, 1, 0], originY: [0, 0, 1, 1],
             transition: { duration: 0.6, times: [0, 0.4, 0.6, 1], ease: 'easeInOut' } },
};

export const PublicLayout = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          className="flex-1 pt-[72px]"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <Footer />
      <FloatingBookingCTA />
    </div>
  );
};
```

> Note: `pt-[72px]` compensates for the fixed navbar (now 72px tall). The old layout used `sticky` nav — we now use `fixed` nav.

- [ ] **Step 2: Verify page transitions in browser**

Open http://localhost:5173, navigate between pages (Home → Usługi → O nas). You should see a gentle fade between pages. The floating CTA bar should appear after scrolling 400px on any public page, and disappear on `/rezerwacja`.

- [ ] **Step 3: Check that admin/employee/user layouts are unaffected**

Navigate to `/auth/login` — it should use `PublicLayout`. Navigate to any `/admin/*` — unaffected (uses `AdminLayout`).

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/web/src/components/layout/PublicLayout.tsx
git commit -m "feat: PublicLayout — AnimatePresence transitions, FloatingBookingCTA, fixed nav offset, remove MobileBottomNav"
```

---

## Task 7: ServiceCard Component

**Files:**
- Create: `apps/web/src/components/ui/ServiceCard.tsx`

This extracts the inline card markup from `ServiceList.tsx` (and later `Home.tsx`) into a reusable component with the new glassmorphism style.

- [ ] **Step 1: Verify import paths before writing the file**

Read `apps/web/src/pages/public/ServiceList.tsx` and `apps/web/src/lib/utils.ts` to confirm:
- `formatPrice` is exported from `@/lib/utils` (it is — visible in existing ServiceList imports)
- `ServiceRating` path: check existing usage in `ServiceList.tsx` — it imports from `@/components/reviews/ServiceRating`

If paths differ from the above, update the imports in Step 2 accordingly.

- [ ] **Step 2: Create ServiceCard.tsx**

```tsx
// apps/web/src/components/ui/ServiceCard.tsx
import { Link } from 'react-router-dom';
import { formatPrice } from '@/lib/utils';
import { ServiceRating } from '@/components/reviews/ServiceRating';

interface ServiceCardProps {
  service: {
    id: string;
    slug: string;
    name: string;
    description?: string;
    durationMinutes: number;
    price: number;
    imagePath?: string;
    category?: string;
    avgRating?: number;
    reviewCount?: number;
  };
  index?: number; // for stagger delay
}

export const ServiceCard = ({ service, index = 0 }: ServiceCardProps) => {
  const delay = index * 80; // ms stagger

  return (
    <Link
      to={`/uslugi/${service.slug}`}
      className="block group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-1"
        style={{
          boxShadow: '0 8px 32px rgba(28,21,16,0.10)',
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(28,21,16,0.18)')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(28,21,16,0.10)')
        }
      >
        {/* Image with glassmorphism overlay */}
        <div className="relative overflow-hidden" style={{ height: '200px' }}>
          {service.imagePath ? (
            <img
              src={service.imagePath}
              alt={service.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-cream to-caramel/40" />
          )}
          {/* Dark gradient + glassmorphism label */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 35%, rgba(28,21,16,0.72) 100%)' }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 p-4 glass"
            style={{
              background: 'rgba(250,247,242,0.08)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {service.category && (
              <p className="eyebrow mb-1" style={{ color: '#C4A882' }}>
                {service.category} · {service.durationMinutes} min
              </p>
            )}
            <h2
              className="font-display text-[18px] text-ivory leading-tight"
              style={{ fontStyle: 'italic', fontWeight: 300 }}
            >
              {service.name}
            </h2>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex items-center justify-between px-5 py-4 bg-ivory"
          style={{ borderTop: '1px solid rgba(28,21,16,0.06)' }}
        >
          <div>
            <span className="font-display text-[20px] text-espresso" style={{ fontWeight: 300 }}>
              {formatPrice(service.price)}
            </span>
            {(service.avgRating !== undefined) && (
              <div className="mt-0.5">
                <ServiceRating avgRating={service.avgRating} reviewCount={service.reviewCount ?? 0} />
              </div>
            )}
          </div>
          <div className="px-5 py-2.5 bg-espresso text-ivory text-[9px] tracking-[0.25em] uppercase font-medium hover:bg-espresso/90 transition-colors">
            Umów wizytę
          </div>
        </div>
      </div>
    </Link>
  );
};
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd cosmo-app/apps/web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd cosmo-app
git add apps/web/src/components/ui/ServiceCard.tsx
git commit -m "feat: ServiceCard component — glassmorphism overlay, Cormorant Garamond title, rectangular CTA"
```

---

## Task 8: Home.tsx Redesign — Hero + Ticker + Testimonials

**Files:**
- Modify: `apps/web/src/pages/public/Home.tsx`

The hero currently uses `<HeroSlider />` (a separate component). We update `HeroSlider` to support the new design, and update `Home.tsx` to add the testimonials section and update the ticker.

- [ ] **Step 1: Read HeroSlider component**

```bash
find cosmo-app/apps/web/src -name "HeroSlider*" -type f
```

Read the full file. Identify:
- Where the slide image is rendered — is it an `<img>` tag or a `div` with `background-image` CSS?
- The component's outer container dimensions (height, overflow)
- State variable names for the current slide

- [ ] **Step 2: Update HeroSlider — add zoom-out effect**

Based on what you found in Step 1, add scroll-based scale to the image element:

If `<img>` element:
```tsx
// Add scroll listener in HeroSlider:
const [heroScale, setHeroScale] = useState(1.08);
useEffect(() => {
  const onScroll = () => {
    const progress = Math.min(window.scrollY / 300, 1);
    setHeroScale(1.08 - 0.08 * progress);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);

// On the <img> element:
style={{ transform: `scale(${heroScale})`, willChange: 'transform', transition: 'none' }}
```

If `background-image` div:
```tsx
// Same heroScale state + listener, applied as:
style={{ transform: `scale(${heroScale})`, willChange: 'transform', backgroundImage: `url(...)`, backgroundSize: 'cover' }}
```

Also update the HeroSlider outer container: change any fixed height to `min-height: 100vh`.

In `HeroSlider.tsx`, find where the background image is rendered (likely an `<img>` or `background-image` div). Add `will-change: transform` and scroll-based scale:

```tsx
// Add this hook inside HeroSlider component:
const [scale, setScale] = useState(1.08);

useEffect(() => {
  const onScroll = () => {
    const progress = Math.min(window.scrollY / 300, 1);
    setScale(1.08 - 0.08 * progress); // 1.08 → 1.0
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);

// Then on the image/background element, add:
// style={{ transform: `scale(${scale})`, willChange: 'transform', transition: 'none' }}
```

Also update the HeroSlider container to `min-height: 100vh`.

- [ ] **Step 3: Add Testimonials section to Home.tsx**

After the services section (or wherever makes sense in the flow), add a testimonials section. Add the `testimonials` array near the top of the file (alongside existing `tickerItems` and `faqSchema`):

```tsx
const testimonials = [
  {
    quote: 'Po raz pierwszy poczułam, że ktoś naprawdę rozumie moją skórę i wie, czego potrzebuję.',
    author: 'Kasia M.',
    label: 'Klientka od 2 lat',
  },
  {
    quote: 'Wychodząc z gabinetu czuję się jak nowa osoba. Profesjonalizm na najwyższym poziomie.',
    author: 'Anna W.',
    label: 'Klientka od roku',
  },
  {
    quote: 'Najlepszy salon w okolicy — dbałość o detal i autentyczna troska o klienta.',
    author: 'Marta K.',
    label: 'Stała klientka',
  },
];
```

Add the testimonials section JSX to `Home.tsx`, after the "best services" section:

```tsx
{/* Testimonials */}
<section style={{ background: '#F0EBE3', padding: '80px 0' }}>
  <div className="container text-center">
    <p className="eyebrow mb-8">Co mówią klientki</p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto">
      {testimonials.map((t, i) => (
        <div key={i} className="flex flex-col items-center">
          <p
            className="font-display text-[20px] text-espresso mb-6 leading-relaxed"
            style={{ fontStyle: 'italic', fontWeight: 300 }}
          >
            "{t.quote}"
          </p>
          <div className="w-8 h-px bg-caramel mb-4" />
          <p className="eyebrow" style={{ color: '#6B5A4E' }}>
            {t.author} · {t.label}
          </p>
        </div>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 4: Update Ticker styles in Home.tsx**

Find the ticker section (dark background band). Update inline styles:
- Background: `#1C1510` (already dark, just verify)
- Separator: change any `·` or `•` to `✦` with color `#C4A882`
- Text color: `rgba(250,247,242,0.5)`
- Letter-spacing: `0.25em`

- [ ] **Step 5: Verify in browser**

Open http://localhost:5173. Check:
- Hero fills full viewport height
- Scrolling down causes the hero image to subtly "zoom out" (scale 1.08 → 1.0)
- Ticker has dark background with caramel `✦` separators
- Testimonials section visible with italic quotes on cream background

- [ ] **Step 6: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/public/Home.tsx apps/web/src/components/public/HeroSlider.tsx
git commit -m "feat: Home redesign — hero zoom-out, testimonials section, updated ticker"
```

---

## Task 9: ServiceList.tsx — Sticky Header + ServiceCard

**Files:**
- Modify: `apps/web/src/pages/public/ServiceList.tsx`

- [ ] **Step 1: Confirm ServiceListSkeleton import path**

The existing `ServiceList.tsx` imports `ServiceListSkeleton` from `@/components/skeletons`. Verify this path is correct by checking:
```bash
find cosmo-app/apps/web/src/components/skeletons -type f
```
Use whatever path exists. If the file is `@/components/skeletons/index.ts` or `@/components/skeletons/ServiceListSkeleton.tsx`, update the import in Step 2 accordingly.

- [ ] **Step 2: Rewrite ServiceList.tsx**

Replace the current inline card markup with `<ServiceCard />` and add a sticky section header layout:

```tsx
// apps/web/src/pages/public/ServiceList.tsx
import { useQuery } from '@tanstack/react-query';
import { servicesApi } from '@/api/services.api';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { PageSEO } from '@/components/shared/SEO';
import { ServiceListSkeleton } from '@/components/skeletons';
import { ServiceCard } from '@/components/ui/ServiceCard';
import { useClipReveal } from '@/hooks/useClipReveal';

export const ServiceList = () => {
  const { data: services, isLoading } = useQuery({ queryKey: ['services'], queryFn: servicesApi.getAll });
  const { ref: headerRef, revealed: headerRevealed } = useClipReveal({ threshold: 0.1 });

  if (isLoading) return (
    <section className="py-16" style={{ background: '#FAF7F2' }}>
      <div className="container"><ServiceListSkeleton count={6} /></div>
    </section>
  );

  return (
    <>
      <PageSEO
        title="Usługi — Kosmetologia i Podologia Limanowa"
        description="Pełna oferta zabiegów kosmetycznych i podologicznych w Limanowej."
        canonical="/uslugi"
      />

      {/* Hero */}
      <section className="py-24 text-center" style={{ background: '#F0EBE3' }}>
        <div className="container">
          <p className="eyebrow mb-5">Nasza Oferta</p>
          <h1
            className="font-display text-5xl md:text-7xl text-espresso mb-6"
            style={{ fontStyle: 'italic', fontWeight: 300 }}
          >
            Nasze Usługi
          </h1>
          <p className="text-mink text-lg max-w-lg mx-auto font-light">
            Profesjonalne zabiegi kosmetyczne i podologiczne wykonywane z pasją i precyzją.
          </p>
        </div>
      </section>

      {/* Sticky layout: header left, cards right */}
      <section data-tour="services-list" style={{ background: '#FAF7F2' }}>
        <div className="container py-16">
          <div className="flex gap-16 items-start">
            {/* Sticky sidebar header */}
            <div
              ref={headerRef as React.RefObject<HTMLDivElement>}
              className="hidden lg:block w-56 shrink-0"
              style={{
                position: 'sticky',
                top: '72px',
                opacity: headerRevealed ? 1 : 0,
                transform: headerRevealed ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 0.6s ease, transform 0.6s ease',
              }}
            >
              <p className="eyebrow mb-4">Zabiegi</p>
              <h2
                className="font-display text-4xl text-espresso leading-tight"
                style={{ fontStyle: 'italic', fontWeight: 300 }}
              >
                Co możemy dla Ciebie zrobić
              </h2>
              <div className="w-8 h-px bg-caramel mt-6 mb-4" />
              <p className="text-mink text-sm leading-relaxed">
                Każdy zabieg wykonujemy z pełnym zaangażowaniem i dbałością o detal.
              </p>
            </div>

            {/* Cards grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              {services?.map((service: any, i: number) => (
                <ServiceCard key={service.id} service={service} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
```

- [ ] **Step 2: Verify in browser**

Open http://localhost:5173/uslugi. Check:
- Hero section has large italic Cormorant heading + eyebrow
- On desktop (≥1024px): sticky sidebar header stays while cards scroll beneath
- Cards use the new glassmorphism style from `ServiceCard`
- On mobile: full-width single-column cards, no sidebar

- [ ] **Step 3: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/public/ServiceList.tsx
git commit -m "feat: ServiceList redesign — sticky sidebar header, ServiceCard with glassmorphism"
```

---

## Task 10: ClipRevealImage on About + MetamorphosesGallery

**Files:**
- Modify: `apps/web/src/pages/public/About.tsx`
- Modify: `apps/web/src/pages/public/MetamorphosesGallery.tsx`

- [ ] **Step 1: Read About.tsx to identify image elements**

Read `apps/web/src/pages/public/About.tsx`. Identify all `<img>` tags.

- [ ] **Step 2: Replace img tags in About.tsx with ClipRevealImage**

For each `<img src="..." alt="..." className="..." />` in About.tsx, replace with:
```tsx
import { ClipRevealImage } from '@/components/ui/ClipRevealImage';

// Replace <img src={x} alt={y} className="w-full h-full object-cover" />
// With:
<ClipRevealImage src={x} alt={y} className="w-full h-full" wrapperClassName="w-full h-full" />
```

Also update the About hero section heading to use `font-display` (Cormorant Garamond) for the main title, and add an eyebrow label.

- [ ] **Step 3: Replace img tags in MetamorphosesGallery.tsx with ClipRevealImage**

Read `apps/web/src/pages/public/MetamorphosesGallery.tsx`. Replace `<img>` tags with `<ClipRevealImage />`. The before/after images should use staggered delays:
```tsx
<ClipRevealImage src={item.beforeImage} alt="Przed" delay={0} wrapperClassName="w-full aspect-square" />
<ClipRevealImage src={item.afterImage} alt="Po" delay={150} wrapperClassName="w-full aspect-square" />
```

- [ ] **Step 4: Verify in browser**

Open http://localhost:5173/o-nas and http://localhost:5173/metamorfozy. Scroll down — images should reveal with the clip-path animation (sliding up from below).

- [ ] **Step 5: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/public/About.tsx apps/web/src/pages/public/MetamorphosesGallery.tsx
git commit -m "feat: ClipRevealImage on About and MetamorphosesGallery pages"
```

---

## Task 11: ServiceDetail.tsx — ClipRevealImage + Editorial Header

**Files:**
- Modify: `apps/web/src/pages/public/ServiceDetail.tsx`

- [ ] **Step 1: Read ServiceDetail.tsx to understand structure**

Read `apps/web/src/pages/public/ServiceDetail.tsx`.

- [ ] **Step 2: Replace hero image with ClipRevealImage**

Find the main service image (likely at the top of the detail page). Replace:
```tsx
// Before:
<img src={service.imagePath} alt={service.name} className="w-full h-full object-cover" />

// After:
<ClipRevealImage
  src={service.imagePath}
  alt={service.name}
  wrapperClassName="w-full h-[50vh]"
  className="w-full h-full"
/>
```

Update the service name heading to use `font-display` italic:
```tsx
<h1 className="font-display text-4xl md:text-6xl text-espresso" style={{ fontStyle: 'italic', fontWeight: 300 }}>
  {service.name}
</h1>
```

Add eyebrow above the heading:
```tsx
<p className="eyebrow mb-4">{service.category} · {service.durationMinutes} min</p>
```

- [ ] **Step 3: Verify in browser**

Open any service detail page (e.g., http://localhost:5173/uslugi/manicure). The hero image should reveal with clip-path on page load, and the heading should appear in Cormorant Garamond italic.

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/public/ServiceDetail.tsx
git commit -m "feat: ServiceDetail — ClipRevealImage hero, editorial display heading"
```

---

## Task 12: BookingWizard.tsx — Editorial Progress Bar

**Files:**
- Modify: `apps/web/src/pages/user/BookingWizard.tsx` (1143 lines — read first, make surgical changes)

The BookingWizard is large. We only update the step progress bar UI and button styles. Logic is untouched.

- [ ] **Step 1: Read BookingWizard.tsx top section to find progress bar**

```bash
head -100 cosmo-app/apps/web/src/pages/user/BookingWizard.tsx
```

Find the step indicator component/markup (likely renders step numbers 1–4 with labels).

- [ ] **Step 2: Replace step indicator with editorial version**

Find the progress bar JSX (search for `step` or the step label text like "Usługa", "Termin"). Replace the step indicator with:

```tsx
{/* Editorial step progress bar */}
<div className="flex items-center gap-0 mb-8">
  {steps.map((stepLabel, i) => {
    const stepNum = i + 1;
    const isActive = stepNum === currentStep;
    const isDone = stepNum < currentStep;
    return (
      <React.Fragment key={stepNum}>
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-6 h-6 flex items-center justify-center text-[10px] font-medium transition-colors"
            style={{
              background: isActive || isDone ? '#1C1510' : 'transparent',
              color: isActive || isDone ? '#FAF7F2' : '#6B5A4E',
              border: isActive || isDone ? 'none' : '1px solid #C4A882',
              borderRadius: '50%',
            }}
          >
            {isDone ? '✓' : stepNum}
          </div>
          <span
            className="text-[10px] tracking-[0.2em] uppercase hidden sm:block"
            style={{ color: isActive ? '#1C1510' : '#6B5A4E' }}
          >
            {stepLabel}
          </span>
        </div>
        {i < steps.length - 1 && (
          <div
            className="flex-1 h-px mx-3 transition-colors"
            style={{ background: stepNum < currentStep ? '#C4A882' : '#E0D8CC' }}
          />
        )}
      </React.Fragment>
    );
  })}
</div>
```

> Note: `steps` array and `currentStep` variable names may differ — use whatever names exist in the file. The goal is to match the editorial aesthetic, not change the logic.

- [ ] **Step 3: Update Prev/Next buttons in wizard**

Find the "Dalej" / "Wróć" buttons. Update their className to use rectangular editorial style:
```tsx
// Wróć button:
className="px-8 py-3 border border-espresso text-espresso text-[10px] tracking-[0.25em] uppercase hover:bg-espresso hover:text-ivory transition-colors"

// Dalej button:
className="px-8 py-3 bg-espresso text-ivory text-[10px] tracking-[0.25em] uppercase hover:bg-espresso/90 transition-colors"
```

- [ ] **Step 4: Verify in browser**

Open http://localhost:5173/rezerwacja. Check that:
- Progress bar shows numbered circles with labels
- Active step has filled espresso circle, done steps have checkmark
- Connector line between steps is caramel for completed, light gray for future

- [ ] **Step 5: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/user/BookingWizard.tsx
git commit -m "feat: BookingWizard — editorial progress bar, rectangular step buttons"
```

---

## Task 13: UserLoyalty.tsx — Dark Gradient Loyalty Card

**Files:**
- Modify: `apps/web/src/pages/user/Loyalty.tsx`

- [ ] **Step 1: Read UserLoyalty.tsx to understand the loyalty card structure**

Read `apps/web/src/pages/user/Loyalty.tsx`. Find the component that shows the user's points total and tier.

- [ ] **Step 2: Update the loyalty points card to dark gradient + glassmorphism**

Find the points display card (the one showing total points and tier). Replace its container styles:

```tsx
// Before: likely white card with light background
// After: dark espresso gradient card

// Container:
style={{
  background: 'linear-gradient(135deg, #2a1f15 0%, #1C1510 100%)',
  boxShadow: '0 8px 32px rgba(28,21,16,0.25)',
  position: 'relative',
  overflow: 'hidden',
}}

// Points number:
className="font-display text-5xl text-ivory"
style={{ fontWeight: 300 }}

// "punktów" label:
className="eyebrow mt-1"
style={{ color: 'rgba(250,247,242,0.4)' }}

// Tier badge (glassmorphism):
style={{
  background: 'rgba(250,247,242,0.06)',
  border: '1px solid rgba(196,168,130,0.25)',
  backdropFilter: 'blur(8px)',
}}
// Badge text:
className="eyebrow"
style={{ color: '#C4A882' }}
```

- [ ] **Step 3: Verify in browser (requires logged-in user)**

Log in, navigate to http://localhost:5173/user/lojalnosc. The loyalty card should display as a dark espresso gradient with ivory points number and caramel tier badge.

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/user/Loyalty.tsx
git commit -m "feat: UserLoyalty — dark gradient card with glassmorphism tier badge"
```

---

## Task 14: Final Check + Full Build

- [ ] **Step 1: Run full TypeScript check**

```bash
cd cosmo-app/apps/web && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run production build**

```bash
cd cosmo-app && pnpm build
```

Expected: Build completes successfully. Note any bundle size warnings but don't block on them.

- [ ] **Step 3: Visual QA checklist in browser**

Start dev server and check each page:

| URL | What to check |
|-----|---------------|
| `/` | Hero 100vh, ivory text, transparent nav; scroll → nav frosts; hero image zooms out; ticker dark + ✦ caramel; testimonials section |
| `/uslugi` | Sticky sidebar on desktop, glassmorphism cards, clip-reveal on load |
| `/uslugi/:slug` | ClipRevealImage hero, Cormorant heading, eyebrow label |
| `/o-nas` | ClipRevealImage on photos with stagger |
| `/metamorfozy` | ClipRevealImage on before/after |
| Nav mobile | Fullscreen dark overlay, numbered italic links, caramel CTA button |
| Page transition | Navigate between pages — gentle fade |
| Floating CTA | Appears after 400px scroll, hidden on /rezerwacja |
| `/rezerwacja` | Editorial progress bar, rectangular buttons |
| `/user/lojalnosc` | Dark gradient loyalty card (requires login) |

- [ ] **Step 4: Final commit**

```bash
cd cosmo-app
git add -A
git commit -m "feat: COSMO editorial redesign — full visual QA passed

- Cormorant Garamond display typography
- Caramel #C4A882 accent palette
- Transparent→frosted navbar with fullscreen mobile overlay
- Hero zoom-out scroll effect
- ClipRevealImage across public pages
- ServiceCard glassmorphism
- Sticky service list sidebar
- Testimonials section
- FloatingBookingCTA glassmorphism bar
- Page transitions (AnimatePresence)
- Editorial BookingWizard progress bar
- Dark loyalty card"
```
