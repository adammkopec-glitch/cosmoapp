# Quiz Admin — Design Spec
**Date:** 2026-03-23
**Status:** Approved
**Scope:** Admin panel for building and managing service recommendation quizzes with a visual decision tree editor.

---

## Overview

The COSMO app currently has a hardcoded `ServiceQuiz.tsx` component with 6 questions and 5 results for foot care services. This feature makes quizzes fully dynamic: admins build quiz decision trees visually, connect results to real services from the database, and publish quizzes for any body part. The `ServiceQuiz.tsx` component becomes data-driven, reading quiz structure from the API instead of hardcoded constants.

---

## Database Schema (Prisma)

Five new models added to `apps/server/prisma/schema.prisma`.

### `BodyPart` (enum)
```
STOPY | TWARZ | DLONIE | DEKOLT
```
Used on `Quiz.bodyPart`. Enforces valid values at the DB and Zod validation layer.

### `Quiz`
Top-level quiz entity.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| title | String | Admin-facing name |
| bodyPart | BodyPart | Enum — one of `STOPY / TWARZ / DLONIE / DEKOLT` |
| isActive | Boolean | Default `true`. Inactive quizzes not shown to users. |
| createdAt | DateTime | |
| updatedAt | DateTime @updatedAt | |

Multiple quizzes can share the same `bodyPart`.

### `QuizNodeType` (enum)
```
START | QUESTION | RESULT
```

### `QuizNode`
A single node in the decision tree.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| quizId | String | FK → Quiz (cascade delete) |
| type | QuizNodeType | `START` \| `QUESTION` \| `RESULT` |
| positionX | Float | Canvas X position (`@xyflow/react`) |
| positionY | Float | Canvas Y position (`@xyflow/react`) |
| data | Json | See below |

`data` shape by type:
- **START**: `{}` (no data)
- **QUESTION**: `{ question: string, options: { key: string, label: string }[] }`
- **RESULT**: `{ title: string, subtitle: string, description: string, extras: string }` — `subtitle` is a short one-liner shown in the BookingWizard recommendation banner (e.g. "Masaż stóp i łydek, peeling cukrowy")

**START node constraint:** Each quiz has exactly one START node, and that node has exactly one outgoing edge. The editor enforces this: the "+ START" button is only shown when no START node exists; connecting a second edge from START is blocked in the UI.

### `QuizEdge`
A directed connection between two nodes, triggered by a specific answer option.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| quizId | String | FK → Quiz (cascade delete) |
| sourceNodeId | String | FK → QuizNode (cascade delete) |
| targetNodeId | String | FK → QuizNode (cascade delete) |
| sourceHandle | String | Answer key, e.g. `'A'`, `'B'`, `'C'`, `'D'`. For START node edges: `'default'`. |

### `QuizResult`
Service configuration for a RESULT node. 1:1 with `QuizNode` of type `RESULT`.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| nodeId | String | Unique FK → QuizNode (cascade delete) |
| mainServiceId | String? | Optional FK → Service |
| updatedAt | DateTime @updatedAt | |

### `QuizResultSuggestion`
Ordered list of additional service suggestions for a result.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| resultId | String | FK → QuizResult (cascade delete) |
| serviceId | String | FK → Service |
| order | Int | Display order. Unique per result: `@@unique([resultId, order])` |
| updatedAt | DateTime @updatedAt | |

---

## Backend

New module: `apps/server/src/modules/quiz/` with `quiz.router.ts`, `quiz.controller.ts`, `quiz.service.ts`.

### Public endpoints (used by `ServiceQuiz.tsx`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/quizzes?bodyPart=STOPY` | List active quizzes for a body part (id + title only). `bodyPart` param must match enum casing: `STOPY`, `TWARZ`, `DLONIE`, `DEKOLT`. The frontend must uppercase the value before calling. Zod validates the param against the enum on the backend. |
| GET | `/api/quizzes/:id` | Full quiz: nodes, edges, results with services |

The public `GET /api/quizzes/:id` response includes `positionX`/`positionY` (ignored by the quiz player, but avoids a separate admin-only endpoint).

**`GET /api/quizzes/:id` response shape:**
```jsonc
{
  "id": "quiz-cuid",
  "title": "Quiz podologiczny — stopy",
  "bodyPart": "STOPY",
  "isActive": true,
  "nodes": [
    {
      "id": "node-cuid",
      "type": "START",           // "START" | "QUESTION" | "RESULT"
      "positionX": 100,
      "positionY": 200,
      "data": {},
      "result": null             // only present on RESULT nodes
    },
    {
      "id": "node-cuid-2",
      "type": "RESULT",
      "positionX": 600,
      "positionY": 150,
      "data": {
        "title": "Pedicure relaksacyjny",
        "subtitle": "Masaż stóp i łydek, peeling cukrowy",
        "description": "Opis...",
        "extras": "Polecamy też..."
      },
      "result": {
        "id": "result-cuid",
        "mainService": { "id": "svc-cuid", "name": "Pedicure spa z masażem", "slug": "pedicure-spa", "price": 180 },
        "suggestions": [
          { "id": "svc-cuid-2", "name": "Masaż stóp i łydek", "slug": "masaz-stop", "order": 0 }
        ]
      }
    }
  ],
  "edges": [
    { "id": "edge-cuid", "sourceNodeId": "node-cuid", "targetNodeId": "node-cuid-2", "sourceHandle": "default" }
  ]
}
```

### Admin endpoints (protected by `adminMiddleware`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/quizzes` | List all quizzes (all body parts, id + title + bodyPart + isActive + node count) |
| GET | `/api/admin/quizzes/:id` | Full quiz — reuses same response shape as public `GET /api/quizzes/:id` |
| POST | `/api/admin/quizzes` | Create new quiz (title + bodyPart) |
| PATCH | `/api/admin/quizzes/:id` | Update title / bodyPart / isActive |
| DELETE | `/api/admin/quizzes/:id` | Delete quiz and all its nodes/edges |
| PUT | `/api/admin/quizzes/:id/tree` | **Replace full tree** — all nodes + edges in one transaction |

#### `PUT /api/admin/quizzes/:id/tree` — payload shape

```jsonc
{
  "nodes": [
    {
      "id": "node-1",                  // client-generated temp ID or existing cuid
      "type": "START",
      "positionX": 100,
      "positionY": 200,
      "data": {}
    },
    {
      "id": "node-2",
      "type": "QUESTION",
      "positionX": 300,
      "positionY": 200,
      "data": {
        "question": "Kiedy ostatnio byłaś u podologa?",
        "options": [
          { "key": "A", "label": "Nigdy lub ponad 2 lata temu" },
          { "key": "B", "label": "Ponad rok temu" }
        ]
      }
    },
    {
      "id": "node-3",
      "type": "RESULT",
      "positionX": 600,
      "positionY": 150,
      "data": {
        "title": "Pedicure relaksacyjny",
        "subtitle": "Masaż stóp i łydek, peeling cukrowy",
        "description": "Opis...",
        "extras": "Polecamy też..."
      },
      "result": {
        "mainServiceId": "svc-abc123",   // nullable
        "suggestions": [
          { "serviceId": "svc-def456", "order": 0 },
          { "serviceId": "svc-ghi789", "order": 1 }
        ]
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "sourceNodeId": "node-1",
      "targetNodeId": "node-2",
      "sourceHandle": "default"
    },
    {
      "id": "edge-2",
      "sourceNodeId": "node-2",
      "targetNodeId": "node-3",
      "sourceHandle": "A"
    }
  ]
}
```

The backend processes the tree in a single `prisma.$transaction`:
1. **Delete** all existing `QuizEdge`, `QuizResultSuggestion`, `QuizResult`, and `QuizNode` rows for this quiz
2. **Create** new `QuizNode` rows — **backend generates new cuids** for all nodes, ignoring the `id` values in the payload. A `tempIdMap: Map<payloadId, newDbId>` is built during creation.
3. **Create** new `QuizEdge` rows — `sourceNodeId` and `targetNodeId` are resolved via `tempIdMap`
4. **Create** `QuizResult` and `QuizResultSuggestion` rows for RESULT nodes

**Server-side validation** (returns 400 if violated):
- Exactly one node with `type === 'START'`
- The START node has exactly one outgoing edge
- All edge `sourceNodeId`/`targetNodeId` values reference node `id`s present in the payload

---

## Frontend — Admin

### New routes (added to `router.tsx`)

```
/admin/quizy              → AdminQuizzes      (list page)
/admin/quizy/:id/edytor   → AdminQuizEditor   (canvas editor)
```

### New pages

**`apps/web/src/pages/admin/AdminQuizzes.tsx`**
- Lists all quizzes filterable by body part (tab bar: Wszystkie / 🦶 Stopy / 🧖 Twarz / ...)
- Each quiz shown as a card: title, body part emoji, node/result count, active/inactive badge, "Edytuj drzewo →" button
- "Nowy quiz" button opens a modal (title + bodyPart select) → creates via `POST /api/admin/quizzes` → redirects to editor
- Toggle isActive inline on the card via `PATCH /api/admin/quizzes/:id`

**`apps/web/src/pages/admin/AdminQuizEditor.tsx`**
- Loads quiz via `GET /api/admin/quizzes/:id` (full tree)
- Renders `@xyflow/react` canvas with three custom node types:
  - **StartNode** — dark pill, no inputs, one output handle (`'default'`)
  - **QuestionNode** — white card with question text; one output handle per answer option (labelled A/B/C/D). Adding an option auto-adds a handle.
  - **ResultNode** — green-bordered card showing result title + linked service name
- Toolbar (top bar): quiz title, active badge, "+ Pytanie", "+ Wynik", "Zapisz" button
- Right panel (appears on node click): edit node fields inline
  - For QUESTION: edit question text, add/remove/reorder options
  - For RESULT: edit title/description/extras, pick mainService from service dropdown, add/remove suggestions
- "Zapisz" serializes full `@xyflow/react` state to `PUT /tree` payload shape and calls the API
- Zoom + minimap controls (`@xyflow/react` built-in)

### Dependencies to add

```
@xyflow/react   ^12.3.0
```

---

## Frontend — ServiceQuiz.tsx Refactor

`ServiceQuiz.tsx` becomes data-driven. Changes:

1. **Props**: `onClose` and `onAccept` signatures unchanged. `onAccept` now receives an `ApiQuizResult` object (see shape below) instead of the old hardcoded `QuizResult` type. `BookingWizard.tsx` must be updated to consume the new shape.

**`ApiQuizResult` shape** (what `onAccept` receives after refactor):
```typescript
interface ApiQuizResult {
  title: string;
  subtitle: string;   // from RESULT node data.subtitle — shown in BookingWizard banner
  description: string;
  extras: string;
  mainService: { id: string; name: string; slug: string; price: number } | null;
  suggestions: { id: string; name: string; slug: string }[];
}
```
The old `key: ResultKey` is removed. `BookingWizard.tsx` cleanup: remove the `CATEGORY_KEYWORDS` map and `filterCategory` state — they are dead code after this refactor.

**BookingWizard changes** (`handleQuizAccept`):
- If `mainService` is non-null: pre-select that service in the service list (call the existing `onSelect`/`setSelectedService` mechanism) and advance to the next step immediately. The recommendation banner is still shown with `title` + `subtitle`.
- If `mainService` is null: show all services unfiltered with the banner (fallback — same as current behaviour when no service is matched). The banner still shows `title` + `subtitle` from the result.

2. **New fetch**: on body part selection, calls `GET /api/quizzes?bodyPart={PART}` to load available quizzes
3. **Quiz selection step**: if more than one quiz returned for the body part, shows a selection screen (quiz title cards) before starting
4. **Tree traversal**:
   - State: `currentNodeId` — initialized to the `targetNodeId` of the START node's single outgoing edge
   - On answer `key`: find edge where `sourceNodeId === currentNodeId && sourceHandle === key` → set `currentNodeId = edge.targetNodeId`
   - If new current node type === `RESULT` → show result screen using that node's `QuizResult` data
5. **Result screen**: renders `title`, `description`, `extras`, `mainService.name`, and `suggestions` from API data

**New file**: `apps/web/src/api/quiz.api.ts` — typed fetch functions for public quiz endpoints.

---

## Admin Navigation

Add "Quizy" entry to the admin sidebar (existing `AdminLayout` component), pointing to `/admin/quizy`. Position: after "Usługi".

---

## Migration

1. Run `prisma migrate dev` to add the 5 new models and 2 new enums
2. **Seed existing quiz**: write a one-time seed script (`prisma/seeds/quiz-stopy.ts`) that models the current hardcoded logic as an explicit decision tree. The existing `computeResult()` is an `if/else` chain — it maps to nodes and edges as follows:
   - One START node → connects to Q6 (medical conditions) first, since it has the highest priority
   - Q6 answers A/B → RESULT: cukrzycowy (direct, skips other questions)
   - Q6 answers C/D → Q1 (podolog history)
   - Q1 answer A → RESULT: leczniczy; Q1 answers B/C/D → Q2
   - Q2 answer A → RESULT: leczniczy; Q2 answers B/C/D → Q3
   - Q3 answer A → RESULT: leczniczy; Q3 answers B/C/D → Q4
   - Q4 answer A → RESULT: leczniczy; Q4 answers B/C/D → Q5
   - Q5 (expectations) answers: A→leczniczy, B→kompleksowy, C→estetyczny, D→relaks
   - This restructuring faithfully reproduces `computeResult()` as a graph. Q5 answer A routes to leczniczy just as in the original code (checked before B/C/D). The tree short-circuits to `cukrzycowy` at Q6 before reaching Q1–Q5.

---

## Out of Scope

- Quiz analytics (how many users completed, which results most common)
- A/B testing between quizzes for the same body part
- Preview mode in the editor (run through quiz from admin)
- Multilingual quiz content
