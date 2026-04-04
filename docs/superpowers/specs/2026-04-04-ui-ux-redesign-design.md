# COSMO — UI/UX Redesign Spec
**Date:** 2026-04-04
**Direction:** Editorial Rebrand — "Atelier" (Plan B)
**Scope:** Frontend visual layer only — zero changes to backend, routing, or business logic.

---

## 1. Design Direction

**Aesthetic:** Editorial / High Fashion — inspiracja: Glossier, Aesop, Byredo, Charlotte Tilbury.
**Filozofia:** Duże białe przestrzenie, typografia jak w magazynie Vogue, ciepłe kremowe tło, poczucie ekskluzywnego atelier. Klient wchodzi i mówi "wow, nigdy czegoś takiego nie widziałem" w branży kosmetycznej w Polsce.

---

## 2. Design Tokens

### Paleta kolorów

| Nazwa | Hex | Użycie |
|-------|-----|--------|
| Ivory | `#FAF7F2` | Tło główne (zastępuje `#FDFAF6`) |
| Cream | `#F0EBE3` | Tło sekcji (zastępuje `#F5F0EB`) |
| Caramel | `#C4A882` | Akcent główny (zastępuje złoto `#B8913A`) |
| Walnut | `#8C6A4A` | Akcent głęboki |
| Espresso | `#1C1510` | Tekst główny, CTA (zastępuje `#1A1208`) |
| Mink | `#6B5A4E` | Tekst wtórny |

### Typografia

| Rola | Czcionka | Weight | Styl | Użycie |
|------|----------|--------|------|--------|
| Display | Cormorant Garamond (NEW) | 300 | italic | Wielkie nagłówki hero, cytaty klientów |
| Heading | Playfair Display (obecna) | 700 | — | H2/H3 na podstronach |
| Eyebrow | DM Sans Condensed (NEW) | 600 | uppercase | Podtytuły sekcji, tagi — letter-spacing: 6px |
| Body | DM Sans (obecna) | 400 | — | Cały tekst body |

**Cormorant Garamond** ładowany z Google Fonts (darmowy): weights 300, 300 italic.

### Przyciski

- Wszystkie przyciski: `border-radius: 0` (prostokątne — zastępuje `rounded-full`)
- Tekst: `text-transform: uppercase`, `letter-spacing: 0.2em`, `font-size: 0.625rem`
- Primary: `bg-espresso text-ivory`
- Secondary: `border border-espresso text-espresso`
- Ghost/link: `border-b border-caramel` (underline tylko na dole)

---

## 3. Nawigacja

### Desktop (`PublicLayout`)

- **Domyślna:** `background: transparent`, `color: espresso` — gdy hero jest ciemny: `color: ivory`
- **Po scrollnięciu (>80px):** `background: rgba(250,247,242,0.92)`, `backdrop-filter: blur(12px)`, `border-bottom: 1px solid rgba(28,21,16,0.08)`
- **Logo:** font Cormorant Garamond, 13px, letter-spacing 6px, uppercase — "Cosmo"
- **Linki:** DM Sans, 11px, uppercase, letter-spacing 2px, kolor Mink
- **CTA "Rezerwacja":** prostokątny przycisk Espresso po prawej stronie

### Mobile

- Hamburger: dwie poziome linie różnej długości (22px + 16px), Espresso
- **Fullscreen overlay menu:**
  - Tło: `#1C1510` (Espresso), wchodzi z clip-path z góry (400ms)
  - Logo: ivory, Cormorant Garamond
  - Linki: numerowane (01, 02...) w Caramel + italic Cormorant Garamond 28px w ivory
  - CTA "Zarezerwuj wizytę": Caramel background, Espresso tekst, na dole menu
  - Zamknij: ✕ w ivory, góra-prawo

---

## 4. Hero Section (`HeroSlider` / strona główna)

- **Wysokość:** `100vh` (pełny ekran)
- **Tło:** ciemne zdjęcie z gradientem overlay `linear-gradient(to bottom, transparent 40%, rgba(28,21,16,0.7) 100%)`
- **Efekt zoom-out:** zdjęcie startuje na `transform: scale(1.08)`, animuje do `scale(1.0)` podczas scrollowania (scroll listener lub CSS scroll-driven animations)
- **Treść:**
  - Eyebrow: "Kosmetologia Estetyczna · Warszawa" — 10px, Caramel, letter-spacing 5px
  - H1: Cormorant Garamond italic 300, 52px mobile / 72px desktop, kolor Ivory, line-height 1.05
  - CTA primary: ivory background, Espresso tekst
  - CTA secondary: linia Caramel (36px) + tekst "Zobacz usługi", uppercase
  - Scroll indicator: pionowa linia 40px + "SCROLL" text, opacity 40%
- **Tekst wchodzi:** `translateY(20px) → 0` z `opacity 0 → 1`, 600ms, delay 300ms po załadowaniu strony

---

## 5. Sekcje Publiczne

### Ticker (istniejący, update)
- Tło: `#1C1510` (Espresso)
- Tekst: `rgba(250,247,242,0.5)`, uppercase, letter-spacing 4px
- Separator: `✦` w Caramel
- Prędkość: bez zmian (20s)

### Sekcja Usług — Sticky Pin Scroll

**Layout:**
```
[Sticky header — pozostaje przy górze podczas scrollu]
[Karty usług — scrollują normalnie pod nim]
```

- Nagłówek sekcji: `position: sticky; top: 80px` (wysokość navu)
- Karty usług: clip-reveal przy wejściu w viewport (Intersection Observer)
- Każda karta: delay `index * 100ms`

**Nowy wygląd karty usługi:**
- `border-radius: 4px`, `overflow: hidden`
- Górna część: ciemne zdjęcie 180px + glassmorphism overlay na dole zdjęcia
  - Overlay: `backdrop-filter: blur(12px)`, `background: rgba(250,247,242,0.1)`, `border-top: 1px solid rgba(255,255,255,0.15)`
  - Eyebrow w Caramel + nazwa usługi w Cormorant Garamond italic Ivory
- Dolna część: Ivory background, cena w Cormorant Garamond, prostokątny CTA Espresso
- Box-shadow: `0 8px 32px rgba(28,21,16,0.12)`

### Sekcja Cytatów Klientów (NOWA)

Nowa sekcja między usługami a blogiem (lub stopką):
- Tło: Cream (`#F0EBE3`)
- Eyebrow: "Co mówią klientki" — Caramel, uppercase, letter-spacing 4px
- Cytat: Cormorant Garamond italic 300, 28px, Espresso, max-width 560px, wycentrowany
- Separator: 40px linia Caramel
- Autor: DM Sans, 11px, uppercase, Mink
- Dane z istniejącego API `reviews` — pobiera 1-3 recenzje z oceną 5★

### Sekcja O nas / Metamorfozy

- Zdjęcia: clip-reveal przy scrollowaniu (clipPath inset z góry)
- Tekst obok: wchodzi z `translateY(20px)` z opóźnieniem 150ms po zdjęciu
- Bez zmian w strukturze danych

---

## 6. Animacje

### A — Page Transitions
- **Biblioteka:** Framer Motion `AnimatePresence` w `router.tsx`
- **Efekt:** Ivory overlay (`#FAF7F2`) zakrywa ekran przy wyjściu (300ms ease-in), odsłania przy wejściu (300ms ease-out)
- **Implementacja:** wrapper `<motion.div>` na `<Outlet />` w każdym layout component

### B — Clip Reveal na obrazach
- **Hook:** `useClipReveal()` — custom hook z Intersection Observer
- **CSS:** `clipPath: inset(100% 0 0 0)` → `inset(0 0 0 0)`, duration 700ms, easing `cubic-bezier(0.76, 0, 0.24, 1)`
- **Użycie:** wszystkie `<img>` i zdjęcia tła w sekcjach publicznych

### C — Sticky Sections
- **CSS only:** `position: sticky; top: 80px` na nagłówkach sekcji
- Dotyczy: sekcja usług na `/uslugi`, sekcja na homepage

### E — Floating Booking CTA
- **Trigger:** `window.scrollY > 400`
- **Ukrycie:** na pathname `/rezerwacja` i `/auth/*`
- **Animacja:** `translateY(100%)` → `translateY(0)`, 400ms
- **Wygląd:** `position: fixed; bottom: 0; left: 0; right: 0; z-index: 40`
- `background: rgba(28,21,16,0.88); backdrop-filter: blur(16px)`
- Tekst po lewej (eyebrow Caramel + tytuł Ivory italic), CTA Caramel po prawej

### F — Hero Zoom-out
- **Metoda:** scroll event listener w `HeroSlider` — `scale` interpolowany od `1.08` (scrollY=0) do `1.0` (scrollY=300)
- `transform: scale(value)` bezpośrednio na img element
- `will-change: transform` dla GPU acceleration

### G — Glassmorphism
- **Użycie:** floating CTA, nawigacja po scrollu, karty usług overlay, mobile menu tło-blur
- **CSS:** `backdrop-filter: blur(12px)` + `webkit-backdrop-filter: blur(12px)`
- Wsparcie: natywne w Safari iOS 9+, Chrome 76+

---

## 7. Panel Użytkownika

Zmiany stylistyczne — logika bez zmian:

- **Karta lojalnościowa:** ciemny gradient Espresso, glassmorphism badge tier, Cormorant Garamond dla liczby punktów
- **Karta wizyty:** Ivory background, Cormorant Garamond italic dla nazwy usługi, prostokątne CTA
- **Booking Wizard:** progress bar z numerami kółeczkami, prostokątne "Wróć/Dalej", eyebrow nad tytułem kroku, kalendarz z prostokątnymi zaznaczeniami

---

## 8. Nowe Zależności

| Pakiet | Wersja | Cel |
|--------|--------|-----|
| `framer-motion` | ^11 | Page transitions, animacje wejścia |
| Google Fonts: Cormorant Garamond | — | Display typography (via `@import` w index.css) |
| Google Fonts: DM Sans Condensed | — | Eyebrow labels (via `@import` w index.css) |

Framer Motion to jedyna nowa zależność JS. Reszta to CSS + Google Fonts.

---

## 9. Pliki do modyfikacji

**Konfiguracja:**
- `apps/web/src/index.css` — nowe tokeny CSS, Google Fonts import, utility klasy
- `apps/web/tailwind.config.ts` — nowe kolory, nowe font families, nowe animacje

**Layout:**
- `apps/web/src/layouts/PublicLayout.tsx` — nowa nawigacja (scroll behavior, mobile overlay)
- `apps/web/src/router.tsx` — AnimatePresence wrapper

**Komponenty globalne (nowe/modyfikowane):**
- `apps/web/src/components/ui/FloatingBookingCTA.tsx` — NOWY
- `apps/web/src/components/ui/ClipRevealImage.tsx` — NOWY (wrapper na obrazy)
- `apps/web/src/components/ui/Button.tsx` — prostokątne style
- `apps/web/src/components/ui/ServiceCard.tsx` — nowy wygląd glassmorphism

**Strony publiczne:**
- `apps/web/src/pages/Home.tsx` — nowy hero + cytaty klientów
- `apps/web/src/pages/ServiceList.tsx` — sticky header + nowe karty
- `apps/web/src/pages/ServiceDetail.tsx` — clip reveal, nowe style
- `apps/web/src/pages/About.tsx` — clip reveal na zdjęciach
- `apps/web/src/pages/Metamorphoses.tsx` — clip reveal

**Booking & User:**
- `apps/web/src/pages/BookingWizard.tsx` — nowy progress bar i style kroków
- `apps/web/src/pages/user/Loyalty.tsx` — ciemna karta lojalnościowa

---

## 10. Zakres poza scope

- Admin panel (`/admin/*`) — bez zmian
- Employee panel (`/employee/*`) — bez zmian
- Backend/API — bez zmian
- Logika autentykacji — bez zmian
- Schemat bazy danych — bez zmian
