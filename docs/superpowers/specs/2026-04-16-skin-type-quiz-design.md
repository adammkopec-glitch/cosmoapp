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

### Seeding

5 rekordów w `prisma/seed.ts` używając `upsert` (klucz: `skinType`) — spójne z pozostałymi seedami w projekcie. Pusta treść (`content: ''`) jako wartość domyślna. Seeding uruchamiany przez `pnpm prisma:seed`.

Seeding jest autorytatywną gwarancją istnienia 5 rekordów. Endpoint PUT używa `upsert` jako zabezpieczenie na wypadek uruchomienia przed seedem, ale admin UI nie musi obsługiwać stanu zero rekordów.

### Bez zmian w istniejących modelach

- `SkinWeatherProfile` — quiz zapisuje profil przez istniejący endpoint `upsertProfile`; brak flagi quizCompleted (obecność profilu = quiz/profil uzupełniony)
- `SkinWeatherRule`, `SkinWeatherReport` — bez zmian

---

## 3. Backend — nowe endpointy

Moduł: `apps/server/src/modules/skin-weather/`

| Method | Path | Auth | Opis |
|--------|------|------|------|
| GET | `/api/skin-weather/skin-type-advice` | user | Zwraca wszystkie 5 rekordów SkinTypeAdvice |
| PUT | `/api/skin-weather/skin-type-advice/:skinType` | admin | Upsert treści dla danego typu skóry |

`updateSkinTypeAdvice` po stronie serwisu używa `prisma.skinTypeAdvice.upsert` — tworzy rekord jeśli nie istnieje. Pusta treść (`content: ''`) jest dopuszczalna (admin może wyczyścić porady). Parametr `:skinType` musi być walidowany w serwisie przed wywołaniem Prismy — jeśli wartość nie należy do enum `SkinType` (SUCHA, TLUSTA, MIESZANA, NORMALNA, WRAZLIWA), serwis rzuca `AppError('Nieprawidłowy typ skóry', 400)`.

Pliki do zmiany:
- `skin-weather.service.ts` — dodać `getSkinTypeAdvice()`, `updateSkinTypeAdvice(skinType, content)`
- `skin-weather.controller.ts` — dodać `getSkinTypeAdvice`, `updateSkinTypeAdvice`
- `skin-weather.router.ts` — zarejestrować nowe trasy
- `prisma/schema.prisma` — dodać model `SkinTypeAdvice`
- `prisma/seed.ts` — dodać upsert dla 5 rekordów SkinTypeAdvice

---

## 4. Frontend — Quiz

### Lokalizacja
`apps/web/src/components/skin-weather/SkinTypeQuiz.tsx`

### Obsługa lokalizacji

Komponent `SkinTypeQuiz` jest renderowany wewnątrz `SkinWeatherProfile`, gdzie hook `useSkinWeatherLocation(true)` jest już montowany. Quiz przy zapisie używa tej samej strategii placeholder co istniejący `ProfileForm`: wysyła `locationLat: 0, locationLng: 0, cityName: 'Wykrywanie...'` — hook aktualizuje lokalizację automatycznie po detekcji GPS. Jeśli GPS jest zablokowany lub niedostępny, wartości `0, 0` pozostają trwałym fallbackiem — jest to zachowanie dziedziczone z istniejącego kodu i akceptowane. Implementacja NIE powinna dodawać walidacji odrzucającej `0, 0`.

### Logika punktowa

8 pytań, każda odpowiedź zawiera obiekt wag `{ SUCHA, TLUSTA, MIESZANA, NORMALNA, WRAZLIWA }`.
Na koniec: `scores = sum of weights per type` → wybrany typ = `argmax(scores)`.

**Remis:** tylko gdy dwa typy mają dokładnie równą liczbę punktów → wyświetlamy ekran wyboru między nimi (single select z opisami). Przy różnicy 1+ pkt — wyższy wynik wygrywa.

### Pytania i wagi

Punkty per typ nie są symetryczne — to właściwość quizu wynikająca z wag poszczególnych pytań. Algorytm `argmax` działa poprawnie niezależnie od tej asymetrii.

---

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
2. Wizard: progress bar (krok X/8) + pytanie + odpowiedzi (single select, card-style)
3. Przyciski: Wstecz / Dalej
4. Krok 9 — Wynik:
   - Chip z typem + nazwa + opis
   - Opcja „Zmień ręcznie" (select z 5 opcjami)
   - Jeśli remis dokładny → ekran wyboru między dwoma typami
5. Krok 10 — Problemy skórne (multi-select, opcjonalne, istniejące SKIN_CONCERNS)
6. „Zapisz profil" → `skinWeatherApi.upsertProfile({ skinType, skinConcerns, locationLat: 0, locationLng: 0, cityName: 'Wykrywanie...' })` → invalidate queries → widok główny

### Powracający użytkownik (ma profil)

```
[Twoja Skóra]
  ┌─ Sekcja A: Twój typ skóry ──────────────────┐
  │  chip z typem + przycisk "Zmień"             │
  │  Porady admina dla tego typu (treść)         │
  │  (gdy content puste: "Admin nie dodał jeszcze│
  │   porad dla tego typu skóry.")               │
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

Przycisk „Zmień" — inline (bez modala, zgodnie z wzorcem projektu): rozwija panel z dwoma opcjami:
- „Wykonaj quiz ponownie" → montuje `<SkinTypeQuiz />` jako inline wizard
- „Wybierz ręcznie" → select z 5 opcjami + przycisk Zapisz

### Collapsible "Ustawienia profilu" (na dole strony)

Sekcja zwijana, domyślnie zamknięta. Zawiera:
- **Problemy skórne** — multi-select `skinConcerns` (te same opcje co w quizie, krok 10); edytowalne po zapisaniu profilu; przycisk „Zapisz zmiany"
- **Powiadomienia push** — toggle (istniejący `notificationsEnabled`); zapis przez `upsertProfile`
- **Lokalizacja** — informacja tylko do odczytu (miasto wykryte z GPS); auto-aktualizowane przez `useSkinWeatherLocation`

Zmiana typu skóry **nie jest** częścią collapsible — obsługuje ją wyłącznie przycisk „Zmień" w Sekcji A.

---

## 6. Frontend — Panel admina

### Nawigacja

**Porady dla typów skóry są dodane jako nowa zakładka (tab) w istniejącej stronie `/admin/pogoda-skory`** — nie tworzymy osobnej trasy. Strona `SkinWeatherRules` dostaje dwa taby:
- `Reguły pogodowe` (istniejąca zawartość)
- `Porady dla typów skóry` (nowa sekcja)

Bez zmian w `router.tsx` i `AdminLayout.tsx`.

### Widok zakładki "Porady dla typów skóry"

- 5 kart (jedna per typ skóry) wyświetlanych zawsze (endpoint upsert tworzy brakujące rekordy)
- Każda karta: nazwa typu + opis + textarea z treścią porad
- Przycisk „Zapisz" per karta (niezależne zapisy)
- Wskaźnik „Ostatnia aktualizacja: ..."
- Pusta treść jest dozwolona

---

## 7. API frontend

`apps/web/src/api/skin-weather.api.ts` — nowe funkcje:
```typescript
getSkinTypeAdvice: () =>
  api.get('/skin-weather/skin-type-advice').then(r => r.data),
updateSkinTypeAdvice: (skinType: string, content: string) =>
  api.put(`/skin-weather/skin-type-advice/${skinType}`, { content }).then(r => r.data),
```

---

## 8. Pliki do stworzenia / zmodyfikowania

| Plik | Akcja |
|------|-------|
| `apps/server/prisma/schema.prisma` | Dodać model `SkinTypeAdvice` |
| `apps/server/prisma/migrations/...` | Nowa migracja |
| `apps/server/prisma/seed.ts` | Dodać upsert dla 5 rekordów SkinTypeAdvice |
| `apps/server/src/modules/skin-weather/skin-weather.service.ts` | Dodać `getSkinTypeAdvice`, `updateSkinTypeAdvice` |
| `apps/server/src/modules/skin-weather/skin-weather.controller.ts` | Dodać handlery |
| `apps/server/src/modules/skin-weather/skin-weather.router.ts` | Zarejestrować trasy |
| `apps/web/src/api/skin-weather.api.ts` | Dodać `getSkinTypeAdvice`, `updateSkinTypeAdvice` |
| `apps/web/src/components/skin-weather/SkinTypeQuiz.tsx` | **Nowy** — wizard quizu (8 pytań + wynik + problemy) |
| `apps/web/src/pages/user/SkinWeatherProfile.tsx` | Przebudować — quiz dla nowych, nowy layout dla powracających |
| `apps/web/src/pages/admin/SkinWeatherRules.tsx` | Dodać drugi tab "Porady dla typów skóry" |

---

## 9. Brak zmian w

- `router.tsx`, `AdminLayout.tsx` — nawigacja admina bez zmian
- `SkinWeatherRule` / `SkinWeatherReport` — reguły pogodowe bez zmian
- `SkinWeatherWidget.tsx` (dashboard) — bez zmian
- Istniejące endpointy skin-weather — bez zmian
