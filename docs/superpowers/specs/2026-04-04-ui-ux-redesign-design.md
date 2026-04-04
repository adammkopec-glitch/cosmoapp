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

### Desktop (`Navbar.tsx`)

> Logika nawigacji żyje w `apps/web/src/components/layout/Navbar.tsx` (nie w `PublicLayout.tsx`). `PublicLayout.tsx` tylko renderuje `<Navbar />` jako child — modyfikujemy wyłącznie `Navbar.tsx`.

- **Domyślna:** `background: transparent`, `color: espresso` — gdy hero jest ciemny: `color: ivory`
- **Po scrollnięciu (>80px):** `background: rgba(250,247,242,0.92)`, `backdrop-filter: blur(12px)`, `border-bottom: 1px solid rgba(28,21,16,0.08)`
- **Logo:** font Cormorant Garamond, 13px, letter-spacing 6px, uppercase — "Cosmo"
- **Linki:** DM Sans, 11px, uppercase, letter-spacing 2px, kolor Mink
- **CTA "Rezerwacja":** prostokątny przycisk Espresso po prawej stronie

### Mobile

- Hamburger: dwie poziome linie różnej długości (22px + 16px), Espresso
- **ThemeToggle:** usuwamy `<ThemeToggle />` z nawigacji — nowy editorial look nie przewiduje dark mode toggle w headerze. Klasa `.dark` w `index.css` zostaje (nie usuwamy) ale nie będzie eksponowana użytkownikowi.
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

- Nagłówek sekcji: `position: sticky; top: 72px` (wysokość navu w nowym designie — h-[72px]; obecny nav to h-16/64px, nowy design zwiększa do 72px dla lepszych proporcji)
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
- **Dane:** hardcoded tablica 3 cytatów w komponencie (brak publicznego endpointu reviews filtrowanego po ratingu — dodanie takiego endpointu byłoby zmianą backendu, co jest poza scope). Cytaty uzupełniane ręcznie przez właściciela salonu w kodzie lub przez zmienną środowiskową.

```ts
// przykładowa struktura
const testimonials = [
  { quote: "...", author: "Kasia M.", label: "Klientka od 2 lat" },
  { quote: "...", author: "Anna W.", label: "Klientka od roku" },
  { quote: "...", author: "Marta K.", label: "Nowa klientka" },
]
```

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
- **Hook:** `useClipReveal()` — custom hook z Intersection Observer (vanilla, nie Framer Motion)
- **Uzasadnienie:** strony publiczne mogą mieć 10-20 obrazów jednocześnie; Framer Motion `whileInView` na każdym z nich tworzy wielu obserwatorów — vanilla Intersection Observer jest lżejszy i szybszy dla wielu elementów
- **CSS:** `clipPath: inset(100% 0 0 0)` → `inset(0 0 0 0)`, duration 700ms, easing `cubic-bezier(0.76, 0, 0.24, 1)`
- **Użycie:** wszystkie `<img>` i zdjęcia tła w sekcjach publicznych — przez komponent `<ClipRevealImage />`

### C — Sticky Sections
- **CSS only:** `position: sticky; top: 72px` na nagłówkach sekcji (72px = wysokość nowego navu)
- Dotyczy: sekcja usług na `/uslugi`, sekcja na homepage

### D — (usunięty ze scope)
> Animacja D (split text reveal) została usunięta ze scope w trakcie brainstormingu na rzecz innych efektów.

### E — Floating Booking CTA
- **Trigger:** `window.scrollY > 400`
- **Ukrycie:** na pathname `/rezerwacja`, `/auth/*` i `/user/*`
- **Animacja:** `translateY(100%)` → `translateY(0)`, 400ms
- **Wygląd:** `position: fixed; bottom: 0; left: 0; right: 0; z-index: 40`
- `background: rgba(28,21,16,0.88); backdrop-filter: blur(16px)`
- Tekst po lewej (eyebrow Caramel + tytuł Ivory italic), CTA Caramel po prawej
- **Konflikt z `MobileBottomNav`:** `MobileBottomNav` renderuje się w `PublicLayout` tylko na mobile. `FloatingBookingCTA` zastępuje `MobileBottomNav` — `MobileBottomNav` zostaje usunięty z `PublicLayout.tsx` (jego funkcjonalność nawigacyjna przechodzi do fullscreen overlay menu). `pb-20 md:pb-0` na `<main>` w `PublicLayout.tsx` zmienia się na `pb-0`.

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

## 8. Zależności

| Pakiet | Status | Wersja | Cel |
|--------|--------|--------|-----|
| `framer-motion` | **już zainstalowana** | `^11.2.6` (z package.json) | Page transitions — `AnimatePresence` dodajemy do istniejącej zależności |
| Google Fonts: Cormorant Garamond | nowa | — | Display typography (via `@import` w index.css) |
| Google Fonts: DM Sans Condensed | nowa | — | Eyebrow labels (via `@import` w index.css) |

**Brak nowych zależności JS** — `framer-motion` jest już w projekcie (`BeforeAfterSlider.tsx` go używa). Tylko nowe Google Fonts w CSS.

---

## 9. Pliki do modyfikacji

**Konfiguracja:**
- `apps/web/src/index.css` — nowe tokeny CSS, Google Fonts import, utility klasy
- `apps/web/tailwind.config.ts` — nowe kolory, nowe font families, nowe animacje

**Layout:**
- `apps/web/src/components/layout/Navbar.tsx` — nowa nawigacja (scroll behavior, mobile overlay, usunięcie ThemeToggle, usunięcie MobileBottomNav)
- `apps/web/src/components/layout/PublicLayout.tsx` — usunięcie `<MobileBottomNav />`, usunięcie `pb-20`, dodanie `<FloatingBookingCTA />`
- `apps/web/src/router.tsx` — `AnimatePresence` wrapper na `<Outlet />`

**Komponenty globalne (nowe):**
- `apps/web/src/components/ui/FloatingBookingCTA.tsx` — NOWY
- `apps/web/src/components/ui/ClipRevealImage.tsx` — NOWY (wrapper na obrazy z Intersection Observer)
- `apps/web/src/hooks/useClipReveal.ts` — NOWY custom hook

**Komponenty globalne (modyfikowane):**
- `apps/web/src/components/ui/button.tsx` — prostokątne style (border-radius: 0)

**Karty usług — NOWY komponent wyekstrahowany ze stron:**
- `apps/web/src/components/ui/ServiceCard.tsx` — NOWY, wyekstrahowany z `ServiceList.tsx` i `Home.tsx` (wcześniej inline), z nowym wyglądem glassmorphism

**Strony publiczne:**
- `apps/web/src/pages/public/Home.tsx` — nowy hero + cytaty klientów (hardcoded)
- `apps/web/src/pages/public/ServiceList.tsx` — sticky header + użycie nowego `<ServiceCard />`
- `apps/web/src/pages/public/ServiceDetail.tsx` — `<ClipRevealImage />`, nowe style
- `apps/web/src/pages/public/About.tsx` — `<ClipRevealImage />` na zdjęciach
- `apps/web/src/pages/public/Metamorphoses.tsx` — `<ClipRevealImage />`

**Booking & User:**
- `apps/web/src/pages/user/BookingWizard.tsx` — nowy progress bar i style kroków
- `apps/web/src/pages/user/Loyalty.tsx` — ciemna karta lojalnościowa

---

## 10. Zakres poza scope

- Admin panel (`/admin/*`) — bez zmian
- Employee panel (`/employee/*`) — bez zmian
- Backend/API — bez zmian
- Logika autentykacji — bez zmian
- Schemat bazy danych — bez zmian
