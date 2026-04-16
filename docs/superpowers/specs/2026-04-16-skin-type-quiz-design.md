# Skin Type Quiz & Recommendations — Design Spec
**Date:** 2026-04-16
**Feature:** Wywiad skórny (quiz) + porady per typ skóry w zakładce "Twoja Skóra"

---

## 1. Cel

Zastąpienie bezpośredniego wyboru typu skóry w profilu **wieloetapowym wywiadem** (8 pytań, logika punktowa), który precyzyjnie wyznacza typ skóry użytkownika. Równolegle admin może tworzyć treści porad dla każdego z 5 typów skóry. Porady skórne i raport pogodowy pozostają oddzielne, ale w tej samej zakładce.

---

## 2. Schemat danych

### Nowy model Prisma

```prisma
model SkinTypeAdvice {
  id        String   @id @default(cuid())
  skinType  SkinType @unique
  content   String   @db.Text
  updatedAt DateTime @updatedAt
}
```

- 5 rekordów seedowanych przy migracji (SUCHA, TLUSTA, MIESZANA, NORMALNA, WRAZLIWA) z pustą treścią
- Admin wypełnia w panelu administracyjnym

### Bez zmian w istniejących modelach

- `SkinWeatherProfile` — quiz zapisuje profil przez istniejący endpoint `upsertProfile`; brak flagi quizCompleted (obecność profilu = quiz/profil uzupełniony)
- `SkinWeatherRule`, `SkinWeatherReport` — bez zmian

---

## 3. Backend — nowe endpointy

Moduł: `apps/server/src/modules/skin-weather/`

| Method | Path | Auth | Opis |
|--------|------|------|------|
| GET | `/api/skin-weather/skin-type-advice` | user | Zwraca wszystkie 5 rekordów SkinTypeAdvice |
| PUT | `/api/skin-weather/skin-type-advice/:skinType` | admin | Aktualizuje treść dla danego typu skóry |

Pliki do zmiany:
- `skin-weather.service.ts` — dodać `getSkinTypeAdvice()`, `updateSkinTypeAdvice(skinType, content)`
- `skin-weather.controller.ts` — dodać `getSkinTypeAdvice`, `updateSkinTypeAdvice`
- `skin-weather.router.ts` — zarejestrować nowe trasy
- `prisma/schema.prisma` — dodać model `SkinTypeAdvice`
- `prisma/seed.ts` lub migracja — zaseedować 5 rekordów

---

## 4. Frontend — Quiz

### Lokalizacja
`apps/web/src/components/skin-weather/SkinTypeQuiz.tsx`

### Logika punktowa

8 pytań, każda odpowiedź zawiera obiekt wag `{ SUCHA, TLUSTA, MIESZANA, NORMALNA, WRAZLIWA }`.
Na koniec: `scores = sum of weights per type` → wybrany typ = `argmax(scores)`.
Remis (dwa typy z równą liczbą punktów) → ekran wyboru między nimi.

### Pytania

| # | Pytanie | Maks. pkt na typ |
|---|---------|-----------------|
| 1 | Jak czuje się skóra 2–3 h po myciu? | 3 |
| 2 | Jak wyglądają Twoje pory? | 3 |
| 3 | Tendencja do wyprysków? | 3 |
| 4 | Reakcja na nowe kosmetyki? | 3 |
| 5 | Skóra w ciągu dnia bez makijażu? | 3 |
| 6 | Reakcja na mróz/wiatr/słońce? | 3 |
| 7 | Co czujesz nakładając krem? | 3 |
| 8 | Widoczne naczynka / zaczerwienienia? | 3 |

Maks. łączny wynik na typ: ~24 pkt.

### Szczegółowe wagi odpowiedzi

**Pytanie 1** — Jak czuje się skóra 2–3 h po myciu?
- Napięta, ciągnie, szorstka → S:3
- Lśni, czuć przetłuszczenie → T:3
- Lśni tylko nos/czoło/broda → M:3
- Komfortowo, bez odczuć → N:3
- Lekko piecze lub czerwienieje → W:3

**Pytanie 2** — Jak wyglądają Twoje pory?
- Prawie niewidoczne, skóra matowa → S:2, N:1
- Duże, widoczne na całej twarzy → T:3
- Duże tylko w strefie T → M:3
- Małe, ledwo widoczne → N:2
- Widoczne naczynka, reaktywna → W:2

**Pytanie 3** — Tendencja do wyprysków?
- Rzadko, skóra raczej sucha → S:2
- Często, na całej twarzy → T:3
- Głównie w strefie T → M:3
- Sporadycznie → N:2
- Reakcje alergiczne lub podrażnienia → W:2

**Pytanie 4** — Reakcja na nowe kosmetyki?
- Szybko wchłania, „chce więcej" → S:2
- Zatyka pory, pojawia się połysk → T:2
- Różnie w różnych strefach → M:2
- Zazwyczaj bez reakcji → N:3
- Często podrażnienie, zaczerwienienie → W:3

**Pytanie 5** — Skóra w ciągu dnia bez makijażu?
- Matowa, może się łuszczyć → S:3
- Błyszcząca, tłusta → T:3
- Tłusta w środku, sucha na bokach → M:3
- Równomierna, zdrowy wygląd → N:3
- Zaczerwieniona, widoczne naczynka → W:3

**Pytanie 6** — Reakcja na mróz/wiatr/słońce?
- Bardzo sucha, piecze, łuszczy się → S:3
- Przetłuszcza się jeszcze bardziej → T:2
- Różnie, zależnie od strefy → M:2
- Lekko reaguje → N:2
- Silne zaczerwienienia, pieczenie → W:3

**Pytanie 7** — Co czujesz nakładając krem?
- Skóra „pije" krem, chce więcej → S:3
- Długo się wchłania, zostaje tłusta warstwa → T:3
- Inaczej w różnych miejscach twarzy → M:3
- Krem wchłania się normalnie → N:3
- Często pieczenie lub swędzenie → W:3

**Pytanie 8** — Widoczne naczynka / skłonność do zaczerwienień?
- Nie, skóra sucha ale bez zaczerwienień → S:1
- Nie, główny problem to tłustość → T:1
- Nie, główny problem to strefa T → M:1
- Nie, skóra jest zrównoważona → N:2
- Tak, często się czerwienię → W:3

---

## 5. Frontend — przepływ użytkownika

### Nowy użytkownik (brak profilu)

1. Wejście na `/user/pogoda-skory` → brak profilu → renderowany `<SkinTypeQuiz />`
2. Wizard: progress bar (krok X/8) + pytanie + odpowiedzi (single select)
3. Przyciski: Wstecz / Dalej
4. Krok 9 — Wynik:
   - Chip z typem + nazwa + opis
   - Opcja „Zmień ręcznie" (select z 5 opcjami)
5. Krok 10 — Problemy skórne (multi-select, opcjonalne, istniejące SKIN_CONCERNS)
6. „Zapisz profil" → `skinWeatherApi.upsertProfile(...)` → invalidate queries → widok główny

### Powracający użytkownik (ma profil)

```
[Twoja Skóra]
  ┌─ Sekcja A: Twój typ skóry ──────────────────┐
  │  chip z typem + przycisk "Zmień"             │
  │  Porady admina dla tego typu (treść)         │
  └──────────────────────────────────────────────┘
  ┌─ Sekcja B: Raport pogodowy ─────────────────┐
  │  (istniejący TodayReport)                    │
  └──────────────────────────────────────────────┘
  ┌─ Sekcja C: Historia raportów ───────────────┐
  │  (istniejący ReportHistory)                  │
  └──────────────────────────────────────────────┘
  [Ustawienia profilu — collapsible na dole]
  (powiadomienia, lokalizacja, zmiana typu skóry)
```

Przycisk „Zmień" otwiera modal z opcją: ponowny quiz lub ręczny wybór.

---

## 6. Frontend — Panel admina

### Lokalizacja
Nowa sekcja w istniejącej stronie `apps/web/src/pages/admin/SkinWeatherRules.tsx`
lub nowa strona `apps/web/src/pages/admin/SkinTypeAdvice.tsx` z osobną trasą.

**Preferowane: osobna strona** (`/admin/typy-skory`) — zachowanie separacji odpowiedzialności.

### Widok
- 5 kart (jedna per typ skóry)
- Każda karta: nazwa typu + textarea z treścią porad
- Przycisk „Zapisz" per karta (niezależne zapisy)
- Wskaźnik „Ostatnia aktualizacja: ..."

---

## 7. API frontend

`apps/web/src/api/skin-weather.api.ts` — nowe funkcje:
```typescript
getSkinTypeAdvice: () => api.get('/skin-weather/skin-type-advice').then(r => r.data),
updateSkinTypeAdvice: (skinType: string, content: string) =>
  api.put(`/skin-weather/skin-type-advice/${skinType}`, { content }).then(r => r.data),
```

---

## 8. Pliki do stworzenia / zmodyfikowania

| Plik | Akcja |
|------|-------|
| `prisma/schema.prisma` | Dodać model `SkinTypeAdvice` |
| `prisma/migrations/...` | Nowa migracja |
| `skin-weather.service.ts` | Dodać `getSkinTypeAdvice`, `updateSkinTypeAdvice` |
| `skin-weather.controller.ts` | Dodać handlery |
| `skin-weather.router.ts` | Zarejestrować trasy |
| `src/api/skin-weather.api.ts` | Dodać `getSkinTypeAdvice`, `updateSkinTypeAdvice` |
| `src/components/skin-weather/SkinTypeQuiz.tsx` | **Nowy** — wizard quizu |
| `src/pages/user/SkinWeatherProfile.tsx` | Przebudować — quiz dla nowych, nowy layout dla powracających |
| `src/pages/admin/SkinTypeAdvice.tsx` | **Nowy** — admin edytuje porady |
| `src/router.tsx` | Dodać trasę `/admin/typy-skory` |
| `apps/web/src/components/layout/AdminLayout.tsx` | Dodać link do nowej trasy |

---

## 9. Brak zmian w

- `SkinWeatherRule` / `SkinWeatherReport` — reguły pogodowe bez zmian
- `SkinWeatherWidget.tsx` (dashboard) — bez zmian
- Istniejące endpointy skin-weather — bez zmian
