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

### `Quiz`
Top-level quiz entity.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| title | String | Admin-facing name |
| bodyPart | String | `'stopy'` \| `'twarz'` \| `'dlonie'` \| `'dekolt'` |
| isActive | Boolean | Default `true`. Inactive quizzes not shown to users. |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Multiple quizzes can share the same `bodyPart`.

### `QuizNode`
A single node in the decision tree — either a question or a result.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| quizId | String | FK → Quiz (cascade delete) |
| type | QuizNodeType | `START` \| `QUESTION` \| `RESULT` |
| positionX | Float | Canvas X position (React Flow) |
| positionY | Float | Canvas Y position (React Flow) |
| data | Json | See below |

`data` shape by type:
- **START**: `{}` (no data)
- **QUESTION**: `{ question: string, options: { key: string, label: string }[] }`
- **RESULT**: `{ title: string, description: string, extras: string }`

### `QuizNodeType` (enum)
`START | QUESTION | RESULT`

### `QuizEdge`
A directed connection between two nodes, triggered by a specific answer option.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| quizId | String | FK → Quiz (cascade delete) |
| sourceNodeId | String | FK → QuizNode (cascade delete) |
| targetNodeId | String | FK → QuizNode (cascade delete) |
| sourceHandle | String | Answer key, e.g. `'A'`, `'B'`, `'C'`, `'D'` |

### `QuizResult`
Service configuration for a RESULT node. 1:1 with `QuizNode` of type `RESULT`.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| nodeId | String | Unique FK → QuizNode (cascade delete) |
| mainServiceId | String? | Optional FK → Service |

### `QuizResultSuggestion`
Ordered list of additional service suggestions for a result.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| resultId | String | FK → QuizResult (cascade delete) |
| serviceId | String | FK → Service |
| order | Int | Display order |

---

## Backend

New module: `apps/server/src/modules/quiz/` with `quiz.router.ts`, `quiz.controller.ts`, `quiz.service.ts`.

### Public endpoints (used by `ServiceQuiz.tsx`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/quizzes?bodyPart=stopy` | List active quizzes for a body part |
| GET | `/api/quizzes/:id` | Full quiz: nodes, edges, results with services |

### Admin endpoints (protected by `adminMiddleware`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/quizzes` | List all quizzes (all body parts) |
| POST | `/api/admin/quizzes` | Create new quiz (title + bodyPart) |
| PATCH | `/api/admin/quizzes/:id` | Update title / bodyPart / isActive |
| DELETE | `/api/admin/quizzes/:id` | Delete quiz and all its nodes/edges |
| PUT | `/api/admin/quizzes/:id/tree` | **Replace full tree** — all nodes + edges in one transaction |

`PUT /tree` is the primary save operation. It receives the complete React Flow state (nodes array + edges array), deletes all existing nodes/edges for the quiz in a `prisma.$transaction`, then creates the new ones. This keeps the save logic simple and avoids partial-update conflicts.

Result configuration (mainService, suggestions) is sent as part of the node data in the tree payload and upserted during `PUT /tree`.

---

## Frontend — Admin

### New routes (added to `router.tsx`)

```
/admin/quizy              → AdminQuizzes      (list page)
/admin/quizy/:id/edytor   → AdminQuizEditor   (canvas editor)
```

### New pages

**`apps/web/src/pages/admin/AdminQuizzes.tsx`**
- Lists all quizzes grouped/filterable by body part (tab bar: Wszystkie / 🦶 Stopy / 🧖 Twarz / ...)
- Each quiz shown as a card: title, body part emoji, node/result count, active/inactive badge, "Edytuj drzewo →" button
- "Nowy quiz" button opens a modal (title + bodyPart select) → creates via `POST /api/admin/quizzes` → redirects to editor
- Toggle isActive inline on the card

**`apps/web/src/pages/admin/AdminQuizEditor.tsx`**
- Loads quiz via `GET /api/admin/quizzes/:id` (full tree)
- Renders React Flow canvas with three custom node types:
  - **StartNode** — dark pill, no inputs, one output handle
  - **QuestionNode** — white card with question text; one output handle per answer option (labelled A/B/C/D)
  - **ResultNode** — green-bordered card showing result title + linked service name
- Toolbar (top bar): quiz title, active badge, "+ Pytanie", "+ Wynik", "Zapisz" button
- Right panel (appears on node click): edit node fields inline
  - For QUESTION: edit question text, add/remove/reorder options
  - For RESULT: edit title/description/extras, pick mainService from service dropdown, add/remove suggestions
- "Zapisz" calls `PUT /api/admin/quizzes/:id/tree` with full React Flow state serialized to the API shape
- Zoom controls (React Flow built-in)

### Dependencies to add

```
reactflow   (aka @xyflow/react — v12+)
```

---

## Frontend — ServiceQuiz.tsx Refactor

`ServiceQuiz.tsx` becomes data-driven. Changes:

1. **Props unchanged**: `onClose`, `onAccept` — no impact on `BookingWizard.tsx`
2. **New fetch**: on body part selection, calls `GET /api/quizzes?bodyPart={part}` to load available quizzes
3. **Quiz selection step**: if more than one quiz returned for the body part, shows a selection screen (quiz title cards) before starting
4. **Tree traversal**: replaces hardcoded `QUESTIONS` array and `computeResult()`:
   - State: `currentNodeId` (starts at START node's first target)
   - On answer: find edge where `sourceNodeId === currentNodeId && sourceHandle === answer` → set `currentNodeId = edge.targetNodeId`
   - If target node type === `RESULT` → show result screen
5. **Result screen**: uses `QuizResult` data from API (title, description, extras, mainService, suggestions) instead of hardcoded `RESULTS` map
6. **`onAccept`** receives the same `QuizResult`-shaped object — `BookingWizard` integration unchanged

**New file**: `apps/web/src/api/quiz.api.ts` — fetch functions for public quiz endpoints.

---

## Admin Navigation

Add "Quizy" entry to the admin sidebar (existing `AdminLayout` component), pointing to `/admin/quizy`. Position: after "Usługi".

---

## Migration

1. Run `prisma migrate dev` to add the 5 new tables
2. Migrate existing hardcoded quiz data: write a one-time seed script that creates a `Quiz` record for `bodyPart: 'stopy'` and populates its nodes/edges/results to match the current `QUESTIONS` + `RESULTS` constants in `ServiceQuiz.tsx` — so existing behaviour is preserved after the refactor

---

## Out of Scope

- Quiz analytics (how many users completed, which results most common)
- A/B testing between quizzes for the same body part
- Preview mode in the editor (run through quiz from admin)
- Multilingual quiz content
