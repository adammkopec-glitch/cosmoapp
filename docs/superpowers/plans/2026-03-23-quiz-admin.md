# Quiz Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully dynamic quiz system — admins design decision trees in a React Flow canvas, link results to real services, and publish quizzes for any body part; `ServiceQuiz.tsx` reads from the API instead of hardcoded constants.

**Architecture:** New Prisma models (`Quiz`, `QuizNode`, `QuizEdge`, `QuizResult`, `QuizResultSuggestion`) back a new Express module; the admin builds trees visually in `@xyflow/react`; the existing `ServiceQuiz.tsx` is refactored to traverse the tree data from the API at runtime.

**Tech Stack:** Prisma + PostgreSQL, Express 5, Zod, Vitest (backend tests), React 19, @xyflow/react ^12.3.0, TanStack Query, Axios.

**Spec:** `docs/superpowers/specs/2026-03-23-quiz-admin-design.md`

---

## File Map

### New files
| File | Purpose |
|------|---------|
| `apps/server/src/modules/quiz/quiz.service.ts` | All DB queries — list, get, create, patch, delete, saveTree |
| `apps/server/src/modules/quiz/quiz.controller.ts` | HTTP handlers — parse req, call service, return JSON |
| `apps/server/src/modules/quiz/quiz.router.ts` | Route definitions — public + admin middleware |
| `apps/server/src/modules/quiz/quiz.service.test.ts` | Vitest unit tests for saveTree validation |
| `apps/web/src/api/quiz.api.ts` | Axios fetch functions for public quiz endpoints |
| `apps/web/src/pages/admin/AdminQuizzes.tsx` | Admin list page — filter, create, toggle active |
| `apps/web/src/pages/admin/AdminQuizEditor.tsx` | Canvas editor — React Flow + right panel |
| `apps/web/src/components/quiz-editor/StartNode.tsx` | Custom React Flow node: START |
| `apps/web/src/components/quiz-editor/QuestionNode.tsx` | Custom React Flow node: QUESTION |
| `apps/web/src/components/quiz-editor/ResultNode.tsx` | Custom React Flow node: RESULT |
| `apps/server/prisma/seeds/quiz-stopy.ts` | One-time seed — existing hardcoded quiz as a tree |

### Modified files
| File | Change |
|------|--------|
| `apps/server/prisma/schema.prisma` | Add 5 models + 2 enums |
| `apps/server/src/app.ts` | Mount quiz router |
| `apps/web/src/router.tsx` | Add `/admin/quizy` + `/admin/quizy/:id/edytor` routes |
| `apps/web/src/components/ServiceQuiz.tsx` | Full refactor — data-driven tree traversal |
| `apps/web/src/pages/user/BookingWizard.tsx` | Use `ApiQuizResult`, remove `CATEGORY_KEYWORDS` |
| `apps/web/src/components/layouts/AdminLayout.tsx` (or wherever the admin sidebar lives) | Add "Quizy" nav link |

---

## Task 1: Prisma schema — add quiz models

**Files:**
- Modify: `apps/server/prisma/schema.prisma`

- [ ] **Step 1.1: Add enums and models to schema**

Open `apps/server/prisma/schema.prisma`. At the end of the file, add:

```prisma
enum BodyPart {
  STOPY
  TWARZ
  DLONIE
  DEKOLT
}

enum QuizNodeType {
  START
  QUESTION
  RESULT
}

model Quiz {
  id        String     @id @default(cuid())
  title     String
  bodyPart  BodyPart
  isActive  Boolean    @default(true)
  nodes     QuizNode[]
  edges     QuizEdge[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model QuizNode {
  id          String       @id @default(cuid())
  quizId      String
  quiz        Quiz         @relation(fields: [quizId], references: [id], onDelete: Cascade)
  type        QuizNodeType
  positionX   Float
  positionY   Float
  data        Json
  result      QuizResult?
  sourceEdges QuizEdge[]   @relation("EdgeSource")
  targetEdges QuizEdge[]   @relation("EdgeTarget")
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model QuizEdge {
  id           String   @id @default(cuid())
  quizId       String
  quiz         Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
  sourceNodeId String
  sourceNode   QuizNode @relation("EdgeSource", fields: [sourceNodeId], references: [id], onDelete: Cascade)
  targetNodeId String
  targetNode   QuizNode @relation("EdgeTarget", fields: [targetNodeId], references: [id], onDelete: Cascade)
  sourceHandle String
  createdAt    DateTime @default(now())
}

model QuizResult {
  id            String                 @id @default(cuid())
  nodeId        String                 @unique
  node          QuizNode               @relation(fields: [nodeId], references: [id], onDelete: Cascade)
  mainServiceId String?
  mainService   Service?               @relation(fields: [mainServiceId], references: [id])
  suggestions   QuizResultSuggestion[]
  updatedAt     DateTime               @updatedAt
}

model QuizResultSuggestion {
  id        String     @id @default(cuid())
  resultId  String
  result    QuizResult @relation(fields: [resultId], references: [id], onDelete: Cascade)
  serviceId String
  service   Service    @relation(fields: [serviceId], references: [id])
  order     Int
  updatedAt DateTime   @updatedAt

  @@unique([resultId, order])
}
```

Also add back-relations to the existing `Service` model (find the `Service` model and add):
```prisma
  quizResults       QuizResult[]
  quizSuggestions   QuizResultSuggestion[]
```

- [ ] **Step 1.2: Run migration**

```bash
cd apps/server
pnpm prisma:migrate
# When prompted for migration name, enter: add_quiz_models
```

Expected: Migration created and applied. `prisma generate` runs automatically.

- [ ] **Step 1.3: Verify Prisma client has new types**

```bash
cd apps/server
pnpm prisma:generate
```

Expected: No errors. `BodyPart`, `QuizNodeType` enums available in `@prisma/client`.

- [ ] **Step 1.4: Commit**

```bash
git add apps/server/prisma/schema.prisma apps/server/prisma/migrations/
git commit -m "feat: add quiz models to prisma schema"
```

---

## Task 2: Backend — quiz.service.ts

**Files:**
- Create: `apps/server/src/modules/quiz/quiz.service.ts`

- [ ] **Step 2.1: Create module directory and service file**

```bash
mkdir -p apps/server/src/modules/quiz
```

Create `apps/server/src/modules/quiz/quiz.service.ts`:

```typescript
import prisma from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { BodyPart, QuizNodeType } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TreeNodePayload {
  id: string; // temp client ID
  type: QuizNodeType;
  positionX: number;
  positionY: number;
  data: Record<string, unknown>;
  result?: {
    mainServiceId: string | null;
    suggestions: { serviceId: string; order: number }[];
  };
}

export interface TreeEdgePayload {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildNodeInclude() {
  return {
    result: {
      include: {
        mainService: { select: { id: true, name: true, slug: true, price: true } },
        suggestions: {
          include: { service: { select: { id: true, name: true, slug: true } } },
          orderBy: { order: 'asc' as const },
        },
      },
    },
  };
}

function formatQuiz(quiz: any) {
  return {
    id: quiz.id,
    title: quiz.title,
    bodyPart: quiz.bodyPart,
    isActive: quiz.isActive,
    nodes: (quiz.nodes ?? []).map((n: any) => ({
      id: n.id,
      type: n.type,
      positionX: n.positionX,
      positionY: n.positionY,
      data: n.data,
      result: n.result
        ? {
            id: n.result.id,
            mainService: n.result.mainService ?? null,
            suggestions: n.result.suggestions.map((s: any) => ({
              id: s.service.id,
              name: s.service.name,
              slug: s.service.slug,
              order: s.order,
            })),
          }
        : null,
    })),
    edges: (quiz.edges ?? []).map((e: any) => ({
      id: e.id,
      sourceNodeId: e.sourceNodeId,
      targetNodeId: e.targetNodeId,
      sourceHandle: e.sourceHandle,
    })),
  };
}

// ─── Public ───────────────────────────────────────────────────────────────────

export async function listActiveByBodyPart(bodyPart: BodyPart) {
  const quizzes = await prisma.quiz.findMany({
    where: { bodyPart, isActive: true },
    select: { id: true, title: true },
    orderBy: { createdAt: 'asc' },
  });
  return quizzes;
}

export async function getQuizById(id: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      nodes: { include: buildNodeInclude() },
      edges: true,
    },
  });
  if (!quiz) throw new AppError('Quiz not found', 404);
  return formatQuiz(quiz);
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function listAllQuizzes() {
  const quizzes = await prisma.quiz.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { nodes: true } },
    },
  });
  return quizzes.map((q) => ({
    id: q.id,
    title: q.title,
    bodyPart: q.bodyPart,
    isActive: q.isActive,
    nodeCount: q._count.nodes,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  }));
}

export async function createQuiz(title: string, bodyPart: BodyPart) {
  const quiz = await prisma.quiz.create({ data: { title, bodyPart } });
  return quiz;
}

export async function patchQuiz(id: string, data: { title?: string; bodyPart?: BodyPart; isActive?: boolean }) {
  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) throw new AppError('Quiz not found', 404);
  return prisma.quiz.update({ where: { id }, data });
}

export async function deleteQuiz(id: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) throw new AppError('Quiz not found', 404);
  await prisma.quiz.delete({ where: { id } });
}

// ─── Save tree ────────────────────────────────────────────────────────────────

export function validateTree(nodes: TreeNodePayload[], edges: TreeEdgePayload[]): void {
  const startNodes = nodes.filter((n) => n.type === 'START');
  if (startNodes.length !== 1) {
    throw new AppError('Tree must have exactly one START node', 400);
  }
  const startId = startNodes[0].id;
  const startEdges = edges.filter((e) => e.sourceNodeId === startId);
  if (startEdges.length !== 1) {
    throw new AppError('START node must have exactly one outgoing edge', 400);
  }
  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const edge of edges) {
    if (!nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)) {
      throw new AppError('Edge references a node ID not present in the payload', 400);
    }
  }
}

export async function saveTree(quizId: string, nodes: TreeNodePayload[], edges: TreeEdgePayload[]) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) throw new AppError('Quiz not found', 404);

  validateTree(nodes, edges);

  return prisma.$transaction(async (tx) => {
    // 1. Delete existing tree
    // QuizNode cascade-deletes QuizResult and QuizResultSuggestion automatically (onDelete: Cascade in schema).
    // Delete edges first (FK to QuizNode), then nodes (which cascades the rest).
    await tx.quizEdge.deleteMany({ where: { quizId } });
    await tx.quizNode.deleteMany({ where: { quizId } });

    // 2. Create nodes — generate new IDs, build tempId→dbId map
    const tempIdMap = new Map<string, string>();
    for (const n of nodes) {
      const created = await tx.quizNode.create({
        data: {
          quizId,
          type: n.type,
          positionX: n.positionX,
          positionY: n.positionY,
          data: n.data,
        },
      });
      tempIdMap.set(n.id, created.id);
    }

    // 3. Create edges
    for (const e of edges) {
      await tx.quizEdge.create({
        data: {
          quizId,
          sourceNodeId: tempIdMap.get(e.sourceNodeId)!,
          targetNodeId: tempIdMap.get(e.targetNodeId)!,
          sourceHandle: e.sourceHandle,
        },
      });
    }

    // 4. Create result configs for RESULT nodes
    for (const n of nodes) {
      if (n.type === 'RESULT' && n.result !== undefined) {
        const dbNodeId = tempIdMap.get(n.id)!;
        const quizResult = await tx.quizResult.create({
          data: {
            nodeId: dbNodeId,
            mainServiceId: n.result.mainServiceId ?? null,
          },
        });
        for (const sug of n.result.suggestions ?? []) {
          await tx.quizResultSuggestion.create({
            data: {
              resultId: quizResult.id,
              serviceId: sug.serviceId,
              order: sug.order,
            },
          });
        }
      }
    }

    return getQuizById(quizId);
  });
}
```

- [ ] **Step 2.2: Commit**

```bash
git add apps/server/src/modules/quiz/quiz.service.ts
git commit -m "feat: add quiz service (list, get, create, patch, delete, saveTree)"
```

---

## Task 3: Backend — quiz.service.test.ts

**Files:**
- Create: `apps/server/src/modules/quiz/quiz.service.test.ts`

- [ ] **Step 3.1: Write tests for validateTree**

Create `apps/server/src/modules/quiz/quiz.service.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { validateTree } from './quiz.service';
import type { TreeNodePayload, TreeEdgePayload } from './quiz.service';

const start: TreeNodePayload = { id: 'n1', type: 'START', positionX: 0, positionY: 0, data: {} };
const q1: TreeNodePayload = { id: 'n2', type: 'QUESTION', positionX: 200, positionY: 0, data: { question: 'Q?', options: [] } };
const r1: TreeNodePayload = { id: 'n3', type: 'RESULT', positionX: 400, positionY: 0, data: { title: 'R', subtitle: 'S', description: 'D', extras: 'E' } };

const edgeStartToQ1: TreeEdgePayload = { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', sourceHandle: 'default' };
const edgeQ1ToR1: TreeEdgePayload = { id: 'e2', sourceNodeId: 'n2', targetNodeId: 'n3', sourceHandle: 'A' };

describe('validateTree', () => {
  it('passes for a valid minimal tree', () => {
    expect(() => validateTree([start, q1, r1], [edgeStartToQ1, edgeQ1ToR1])).not.toThrow();
  });

  it('throws when no START node', () => {
    expect(() => validateTree([q1, r1], [edgeQ1ToR1])).toThrow('exactly one START node');
  });

  it('throws when two START nodes', () => {
    const start2: TreeNodePayload = { ...start, id: 'n4' };
    expect(() => validateTree([start, start2, q1], [edgeStartToQ1])).toThrow('exactly one START node');
  });

  it('throws when START has no outgoing edge', () => {
    expect(() => validateTree([start, q1], [])).toThrow('exactly one outgoing edge');
  });

  it('throws when START has two outgoing edges', () => {
    const edge2: TreeEdgePayload = { id: 'e3', sourceNodeId: 'n1', targetNodeId: 'n3', sourceHandle: 'default' };
    expect(() => validateTree([start, q1, r1], [edgeStartToQ1, edge2])).toThrow('exactly one outgoing edge');
  });

  it('throws when edge references unknown node ID', () => {
    const badEdge: TreeEdgePayload = { id: 'e4', sourceNodeId: 'n1', targetNodeId: 'GHOST', sourceHandle: 'default' };
    expect(() => validateTree([start, q1], [badEdge])).toThrow('node ID not present');
  });
});
```

- [ ] **Step 3.2: Run tests and verify they pass**

```bash
cd apps/server
pnpm vitest run src/modules/quiz/quiz.service.test.ts
```

Expected: 6 tests, all PASS.

- [ ] **Step 3.3: Commit**

```bash
git add apps/server/src/modules/quiz/quiz.service.test.ts
git commit -m "test: add validateTree unit tests"
```

---

## Task 4: Backend — controller, router, register in app

**Files:**
- Create: `apps/server/src/modules/quiz/quiz.controller.ts`
- Create: `apps/server/src/modules/quiz/quiz.router.ts`
- Modify: `apps/server/src/app.ts`

- [ ] **Step 4.1: Create quiz.controller.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BodyPart } from '@prisma/client';
import * as quizService from './quiz.service';
import { AppError } from '../../utils/AppError';

const bodyPartSchema = z.nativeEnum(BodyPart);

export async function listActive(req: Request, res: Response, next: NextFunction) {
  try {
    const bodyPart = bodyPartSchema.safeParse(req.query.bodyPart);
    if (!bodyPart.success) throw new AppError('Invalid bodyPart. Use STOPY, TWARZ, DLONIE or DEKOLT', 400);
    const quizzes = await quizService.listActiveByBodyPart(bodyPart.data);
    res.json({ status: 'success', data: { quizzes } });
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const quiz = await quizService.getQuizById(req.params.id);
    res.json({ status: 'success', data: { quiz } });
  } catch (err) { next(err); }
}

export async function listAll(req: Request, res: Response, next: NextFunction) {
  try {
    const quizzes = await quizService.listAllQuizzes();
    res.json({ status: 'success', data: { quizzes } });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({ title: z.string().min(1), bodyPart: z.nativeEnum(BodyPart) });
    const { title, bodyPart } = schema.parse(req.body);
    const quiz = await quizService.createQuiz(title, bodyPart);
    res.status(201).json({ status: 'success', data: { quiz } });
  } catch (err) { next(err); }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      title: z.string().min(1).optional(),
      bodyPart: z.nativeEnum(BodyPart).optional(),
      isActive: z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    const quiz = await quizService.patchQuiz(req.params.id, data);
    res.json({ status: 'success', data: { quiz } });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await quizService.deleteQuiz(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function saveTree(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      nodes: z.array(z.object({
        id: z.string(),
        type: z.enum(['START', 'QUESTION', 'RESULT']),
        positionX: z.number(),
        positionY: z.number(),
        data: z.record(z.unknown()),
        result: z.object({
          mainServiceId: z.string().nullable(),
          suggestions: z.array(z.object({ serviceId: z.string(), order: z.number() })),
        }).optional(),
      })),
      edges: z.array(z.object({
        id: z.string(),
        sourceNodeId: z.string(),
        targetNodeId: z.string(),
        sourceHandle: z.string(),
      })),
    });
    const { nodes, edges } = schema.parse(req.body);
    const quiz = await quizService.saveTree(req.params.id, nodes as any, edges);
    res.json({ status: 'success', data: { quiz } });
  } catch (err) { next(err); }
}
```

- [ ] **Step 4.2: Create quiz.router.ts**

Admin routes must be registered **before** the public `/:id` route to prevent Express matching the literal string `admin` as an `:id` parameter.

```typescript
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import * as ctrl from './quiz.controller';

const router = Router();

// Admin routes registered BEFORE /:id to avoid param conflict
router.get('/admin/list', authenticate, requireAdmin, ctrl.listAll);
router.post('/admin', authenticate, requireAdmin, ctrl.create);
router.patch('/admin/:id', authenticate, requireAdmin, ctrl.patch);
router.delete('/admin/:id', authenticate, requireAdmin, ctrl.remove);
router.put('/admin/:id/tree', authenticate, requireAdmin, ctrl.saveTree);
router.get('/admin/:id', authenticate, requireAdmin, ctrl.getOne); // admin full-tree get

// Public routes
router.get('/', ctrl.listActive);
router.get('/:id', ctrl.getOne);

export default router;
```

- [ ] **Step 4.3: Register in app.ts**

Open `apps/server/src/app.ts`. Find where other routers are mounted (look for lines like `app.use('/api/services', servicesRouter)`). Add:

```typescript
import quizRouter from './modules/quiz/quiz.router';
// ...
app.use('/api/quizzes', quizRouter);
```

- [ ] **Step 4.4: Verify server starts**

```bash
cd apps/server
pnpm dev
```

Expected: Server starts on port 3001, no errors. Test with:
```bash
curl http://localhost:3001/api/quizzes?bodyPart=STOPY
# Expected: { "status": "success", "data": { "quizzes": [] } }
```

- [ ] **Step 4.5: Commit**

```bash
git add apps/server/src/modules/quiz/
git add apps/server/src/app.ts
git commit -m "feat: add quiz API module (controller + router + app registration)"
```

---

## Task 5: Frontend API file — quiz.api.ts

**Files:**
- Create: `apps/web/src/api/quiz.api.ts`

- [ ] **Step 5.1: Create API client**

```typescript
import { api } from '@/lib/axios';

export interface QuizListItem {
  id: string;
  title: string;
}

export interface QuizResultConfig {
  id: string;
  mainService: { id: string; name: string; slug: string; price: number } | null;
  suggestions: { id: string; name: string; slug: string; order: number }[];
}

export interface QuizNodeData {
  id: string;
  type: 'START' | 'QUESTION' | 'RESULT';
  positionX: number;
  positionY: number;
  data: Record<string, unknown>;
  result: QuizResultConfig | null;
}

export interface QuizEdgeData {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string;
}

export interface FullQuiz {
  id: string;
  title: string;
  bodyPart: string;
  isActive: boolean;
  nodes: QuizNodeData[];
  edges: QuizEdgeData[];
}

export interface AdminQuizSummary {
  id: string;
  title: string;
  bodyPart: string;
  isActive: boolean;
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiQuizResult {
  title: string;
  subtitle: string;
  description: string;
  extras: string;
  mainService: { id: string; name: string; slug: string; price: number } | null;
  suggestions: { id: string; name: string; slug: string }[];
}

export const quizApi = {
  // Public
  listByBodyPart: async (bodyPart: string): Promise<QuizListItem[]> => {
    const res = await api.get('/quizzes', { params: { bodyPart: bodyPart.toUpperCase() } });
    return res.data.data.quizzes;
  },
  getById: async (id: string): Promise<FullQuiz> => {
    const res = await api.get(`/quizzes/${id}`);
    return res.data.data.quiz;
  },

  // Admin
  adminList: async (): Promise<AdminQuizSummary[]> => {
    const res = await api.get('/quizzes/admin/list');
    return res.data.data.quizzes;
  },
  adminGet: async (id: string): Promise<FullQuiz> => {
    const res = await api.get(`/quizzes/admin/${id}`);
    return res.data.data.quiz;
  },
  create: async (title: string, bodyPart: string): Promise<{ id: string }> => {
    const res = await api.post('/quizzes/admin', { title, bodyPart });
    return res.data.data.quiz;
  },
  patch: async (id: string, data: { title?: string; bodyPart?: string; isActive?: boolean }) => {
    const res = await api.patch(`/quizzes/admin/${id}`, data);
    return res.data.data.quiz;
  },
  remove: async (id: string) => {
    await api.delete(`/quizzes/admin/${id}`);
  },
  saveTree: async (id: string, nodes: unknown[], edges: unknown[]) => {
    const res = await api.put(`/quizzes/admin/${id}/tree`, { nodes, edges });
    return res.data.data.quiz;
  },
};
```

- [ ] **Step 5.2: Commit**

```bash
git add apps/web/src/api/quiz.api.ts
git commit -m "feat: add quiz API client (public + admin)"
```

---

## Task 6: Admin list page — AdminQuizzes.tsx

**Files:**
- Create: `apps/web/src/pages/admin/AdminQuizzes.tsx`

- [ ] **Step 6.1: Create AdminQuizzes page**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Edit2 } from 'lucide-react';
import { quizApi } from '@/api/quiz.api';

const BODY_PARTS = [
  { value: 'ALL', label: 'Wszystkie', emoji: '' },
  { value: 'STOPY', label: 'Stopy', emoji: '🦶' },
  { value: 'TWARZ', label: 'Twarz', emoji: '🧖' },
  { value: 'DLONIE', label: 'Dłonie', emoji: '💅' },
  { value: 'DEKOLT', label: 'Dekolt', emoji: '✨' },
];

export default function AdminQuizzes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBodyPart, setNewBodyPart] = useState('STOPY');

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ['admin-quizzes'],
    queryFn: quizApi.adminList,
  });

  const createMutation = useMutation({
    mutationFn: () => quizApi.create(newTitle, newBodyPart),
    onSuccess: (quiz) => {
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] });
      toast.success('Quiz utworzony');
      setModalOpen(false);
      setNewTitle('');
      navigate(`/admin/quizy/${quiz.id}/edytor`);
    },
    onError: () => toast.error('Błąd podczas tworzenia quizu'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      quizApi.patch(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] }),
    onError: () => toast.error('Błąd'),
  });

  const filtered = filter === 'ALL' ? quizzes : quizzes.filter((q) => q.bodyPart === filter);

  const bodyPartEmoji = (bp: string) => BODY_PARTS.find((b) => b.value === bp)?.emoji ?? '';

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1A1208' }}>Quizy dopasowania</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(26,18,8,0.5)' }}>
            Zarządzaj quizami dla każdej części ciała
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: '#1A1208', color: '#FDFAF6' }}
        >
          <Plus size={16} /> Nowy quiz
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {BODY_PARTS.map((bp) => (
          <button
            key={bp.value}
            onClick={() => setFilter(bp.value)}
            className="px-4 py-1.5 rounded-full text-sm font-medium border transition-colors"
            style={
              filter === bp.value
                ? { background: '#1A1208', color: '#fff', borderColor: '#1A1208' }
                : { borderColor: 'rgba(0,0,0,0.15)', color: 'rgba(26,18,8,0.7)' }
            }
          >
            {bp.emoji} {bp.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-sm" style={{ color: 'rgba(26,18,8,0.4)' }}>Ładowanie...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm" style={{ color: 'rgba(26,18,8,0.4)' }}>Brak quizów. Utwórz pierwszy.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-white border rounded-xl p-4 flex items-center gap-4"
              style={{ borderColor: '#e8e0d4' }}
            >
              <span className="text-2xl">{bodyPartEmoji(quiz.bodyPart)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ color: '#1A1208' }}>{quiz.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(26,18,8,0.4)' }}>
                  {quiz.nodeCount} węzłów
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Active toggle */}
                <button
                  onClick={() => toggleMutation.mutate({ id: quiz.id, isActive: !quiz.isActive })}
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={
                    quiz.isActive
                      ? { background: '#e8f5e9', color: '#2e7d32' }
                      : { background: '#fff3e0', color: '#e65100' }
                  }
                >
                  {quiz.isActive ? 'Aktywny' : 'Nieaktywny'}
                </button>
                <button
                  onClick={() => navigate(`/admin/quizy/${quiz.id}/edytor`)}
                  className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border"
                  style={{ borderColor: 'rgba(0,0,0,0.15)', color: 'rgba(26,18,8,0.7)' }}
                >
                  <Edit2 size={13} /> Edytuj drzewo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-lg" style={{ color: '#1A1208' }}>Nowy quiz</h2>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'rgba(26,18,8,0.6)' }}>Nazwa</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                style={{ borderColor: 'rgba(0,0,0,0.15)' }}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="np. Quiz podologiczny — stopy"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'rgba(26,18,8,0.6)' }}>Część ciała</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                style={{ borderColor: 'rgba(0,0,0,0.15)' }}
                value={newBodyPart}
                onChange={(e) => setNewBodyPart(e.target.value)}
              >
                {BODY_PARTS.filter((b) => b.value !== 'ALL').map((b) => (
                  <option key={b.value} value={b.value}>{b.emoji} {b.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => createMutation.mutate()}
                disabled={!newTitle.trim() || createMutation.isPending}
                className="flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ background: '#1A1208', color: '#FDFAF6', opacity: !newTitle.trim() ? 0.5 : 1 }}
              >
                {createMutation.isPending ? 'Tworzenie...' : 'Utwórz i edytuj'}
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm border"
                style={{ borderColor: 'rgba(0,0,0,0.15)' }}
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6.2: Commit**

```bash
git add apps/web/src/pages/admin/AdminQuizzes.tsx
git commit -m "feat: add AdminQuizzes list page"
```

---

## Task 7: React Flow custom node components

**Files:**
- Create: `apps/web/src/components/quiz-editor/StartNode.tsx`
- Create: `apps/web/src/components/quiz-editor/QuestionNode.tsx`
- Create: `apps/web/src/components/quiz-editor/ResultNode.tsx`

First, install the dependency:
- [ ] **Step 7.1: Install @xyflow/react**

```bash
cd apps/web
pnpm add @xyflow/react@^12.3.0
```

Expected: Package added to `apps/web/package.json`.

- [ ] **Step 7.2: Create StartNode.tsx**

```tsx
import { Handle, Position } from '@xyflow/react';

export default function StartNode() {
  return (
    <div
      className="px-5 py-2 rounded-full text-white text-xs font-bold select-none"
      style={{ background: '#1A1208', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}
    >
      START
      <Handle type="source" position={Position.Right} id="default" style={{ background: '#B8913A' }} />
    </div>
  );
}
```

- [ ] **Step 7.3: Create QuestionNode.tsx**

```tsx
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface QuestionNodeData {
  question: string;
  options: { key: string; label: string }[];
  selected?: boolean;
}

export default function QuestionNode({ data, selected }: NodeProps) {
  const d = data as QuestionNodeData;
  return (
    <div
      className="bg-white rounded-xl shadow-sm min-w-[180px] max-w-[220px]"
      style={{ border: `2px solid ${selected ? '#B8913A' : '#1565c0'}` }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#1565c0' }} />
      <div className="px-3 pt-2.5 pb-1">
        <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: '#1565c0' }}>Pytanie</p>
        <p className="text-[10px] font-medium leading-snug" style={{ color: '#1A1208' }}>
          {d.question || <span style={{ color: '#aaa' }}>Brak treści</span>}
        </p>
      </div>
      <div className="px-3 pb-2.5 space-y-1 mt-1">
        {(d.options ?? []).map((opt) => (
          <div key={opt.key} className="flex items-center justify-between">
            <span className="text-[9px]" style={{ color: '#555' }}>
              <span style={{ color: '#B8913A', fontWeight: 700 }}>{opt.key}.</span> {opt.label}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={opt.key}
              style={{ position: 'relative', transform: 'none', top: 'auto', right: 'auto', background: '#1565c0', width: 8, height: 8 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7.4: Create ResultNode.tsx**

```tsx
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface ResultNodeData {
  title: string;
  subtitle: string;
  description: string;
  extras: string;
  result?: {
    mainServiceId: string | null;
    mainServiceName?: string;
    suggestions: { serviceId: string; order: number }[];
  };
}

export default function ResultNode({ data, selected }: NodeProps) {
  const d = data as ResultNodeData;
  return (
    <div
      className="bg-white rounded-xl shadow-sm min-w-[160px] max-w-[200px]"
      style={{ border: `2px solid ${selected ? '#B8913A' : '#4caf50'}`, background: '#f1f8e9' }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#4caf50' }} />
      <div className="px-3 py-2.5">
        <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: '#2e7d32' }}>🏁 Wynik</p>
        <p className="text-[10px] font-semibold leading-snug" style={{ color: '#1A1208' }}>
          {d.title || <span style={{ color: '#aaa' }}>Brak tytułu</span>}
        </p>
        {d.result?.mainServiceName && (
          <p className="text-[9px] mt-1" style={{ color: '#555' }}>→ {d.result.mainServiceName}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7.5: Commit**

```bash
git add apps/web/src/components/quiz-editor/
git commit -m "feat: add React Flow custom node components (Start, Question, Result)"
```

---

## Task 8: Admin editor page — AdminQuizEditor.tsx

**Files:**
- Create: `apps/web/src/pages/admin/AdminQuizEditor.tsx`

- [ ] **Step 8.1: Create AdminQuizEditor.tsx**

This is the main canvas editor. It's the most complex file in this plan (~350 lines). Key sections:

```tsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from 'sonner';
import { ChevronLeft, Plus, Save } from 'lucide-react';
import { quizApi } from '@/api/quiz.api';
import { servicesApi } from '@/api/services.api';
import StartNode from '@/components/quiz-editor/StartNode';
import QuestionNode from '@/components/quiz-editor/QuestionNode';
import ResultNode from '@/components/quiz-editor/ResultNode';

const nodeTypes = { START: StartNode, QUESTION: QuestionNode, RESULT: ResultNode };

// Convert API quiz data → React Flow nodes/edges
function quizToFlow(quiz: any): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = quiz.nodes.map((n: any) => ({
    id: n.id,
    type: n.type,
    position: { x: n.positionX, y: n.positionY },
    data: {
      ...n.data,
      ...(n.type === 'RESULT' && n.result
        ? {
            result: {
              mainServiceId: n.result.mainService?.id ?? null,
              mainServiceName: n.result.mainService?.name ?? null,
              suggestions: n.result.suggestions.map((s: any) => ({ serviceId: s.id, order: s.order })),
            },
          }
        : {}),
    },
  }));
  const edges: Edge[] = quiz.edges.map((e: any) => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    sourceHandle: e.sourceHandle,
    animated: false,
    style: { stroke: '#B8913A' },
  }));
  return { nodes, edges };
}

// Convert React Flow state → PUT /tree payload
function flowToPayload(nodes: Node[], edges: Edge[]) {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type!,
      positionX: n.position.x,
      positionY: n.position.y,
      data: n.data,
      ...(n.type === 'RESULT' ? { result: (n.data as any).result ?? { mainServiceId: null, suggestions: [] } } : {}),
    })),
    edges: edges.map((e) => ({
      id: e.id,
      sourceNodeId: e.source,
      targetNodeId: e.target,
      sourceHandle: e.sourceHandle ?? 'default',
    })),
  };
}

let tempIdCounter = 0;
function newTempId() { return `temp-${++tempIdCounter}`; }

export default function AdminQuizEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Load quiz
  // NOTE: TanStack Query v5 removed onSuccess from useQuery — use useEffect instead
  const { data: quiz, isLoading } = useQuery({
    queryKey: ['admin-quiz', id],
    queryFn: () => quizApi.adminGet(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (quiz && !initialized) {
      const { nodes: n, edges: e } = quizToFlow(quiz);
      setNodes(n);
      setEdges(e);
      setInitialized(true);
    }
  }, [quiz, initialized]);

  // Load services for result node dropdown
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: servicesApi.getAll,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const { nodes: n, edges: e } = flowToPayload(nodes, edges);
      return quizApi.saveTree(id!, n, e);
    },
    onSuccess: () => {
      toast.success('Drzewo zapisane');
      queryClient.invalidateQueries({ queryKey: ['admin-quiz', id] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Błąd zapisu'),
  });

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, style: { stroke: '#B8913A' } }, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback((_: any, node: Node) => setSelectedNode(node), []);
  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  // Add nodes
  const hasStart = nodes.some((n) => n.type === 'START');

  function addNode(type: 'START' | 'QUESTION' | 'RESULT') {
    const id = newTempId();
    const defaultData =
      type === 'START'
        ? {}
        : type === 'QUESTION'
        ? { question: '', options: [{ key: 'A', label: '' }, { key: 'B', label: '' }] }
        : { title: '', subtitle: '', description: '', extras: '', result: { mainServiceId: null, suggestions: [] } };
    setNodes((nds) => [
      ...nds,
      { id, type, position: { x: Math.random() * 400 + 50, y: Math.random() * 200 + 50 }, data: defaultData },
    ]);
  }

  // Update selected node data
  function updateSelectedData(patch: Record<string, unknown>) {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, ...patch } } : n)),
    );
    setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, ...patch } } : null);
  }

  if (isLoading) return <div className="p-8 text-sm" style={{ color: 'rgba(26,18,8,0.4)' }}>Ładowanie...</div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b" style={{ borderColor: '#e0d8ce' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/quizy')} className="flex items-center gap-1 text-sm" style={{ color: 'rgba(26,18,8,0.5)' }}>
            <ChevronLeft size={16} /> Quizy
          </button>
          <span className="font-semibold text-sm" style={{ color: '#1A1208' }}>{quiz?.title}</span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={quiz?.isActive ? { background: '#e8f5e9', color: '#2e7d32' } : { background: '#fff3e0', color: '#e65100' }}
          >
            {quiz?.isActive ? 'Aktywny' : 'Nieaktywny'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!hasStart && (
            <button onClick={() => addNode('START')} className="flex items-center gap-1 text-xs px-3 py-1.5 border rounded-lg" style={{ borderColor: 'rgba(0,0,0,0.15)' }}>
              <Plus size={12} /> START
            </button>
          )}
          <button onClick={() => addNode('QUESTION')} className="flex items-center gap-1 text-xs px-3 py-1.5 border rounded-lg" style={{ borderColor: 'rgba(0,0,0,0.15)' }}>
            <Plus size={12} /> Pytanie
          </button>
          <button onClick={() => addNode('RESULT')} className="flex items-center gap-1 text-xs px-3 py-1.5 border rounded-lg" style={{ borderColor: 'rgba(0,0,0,0.15)' }}>
            <Plus size={12} /> Wynik
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-semibold"
            style={{ background: '#B8913A', color: 'white' }}
          >
            <Save size={13} /> {saveMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
          </button>
        </div>
      </div>

      {/* Canvas + right panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background gap={20} color="#ddd" />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* Right panel */}
        {selectedNode && (
          <div className="w-64 bg-white border-l overflow-y-auto p-4 space-y-3 text-sm" style={{ borderColor: '#e0d8ce' }}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-xs uppercase tracking-wide" style={{ color: '#B8913A' }}>
                {selectedNode.type === 'QUESTION' ? 'Pytanie' : selectedNode.type === 'RESULT' ? 'Wynik' : 'START'}
              </p>
              <button
                onClick={() => {
                  setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                  setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
                  setSelectedNode(null);
                }}
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: '#fce4ec', color: '#c62828' }}
              >
                Usuń
              </button>
            </div>

            {selectedNode.type === 'QUESTION' && (
              <QuestionPanel data={selectedNode.data as any} onChange={updateSelectedData} />
            )}
            {selectedNode.type === 'RESULT' && (
              <ResultPanel data={selectedNode.data as any} services={services} onChange={updateSelectedData} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-panels ───────────────────────────────────────────────────────────────

function QuestionPanel({ data, onChange }: { data: any; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'rgba(26,18,8,0.6)' }}>Treść pytania</label>
        <textarea
          className="w-full border rounded-lg px-2 py-1.5 text-xs outline-none resize-none"
          style={{ borderColor: 'rgba(0,0,0,0.15)' }}
          rows={3}
          value={data.question ?? ''}
          onChange={(e) => onChange({ question: e.target.value })}
        />
      </div>
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'rgba(26,18,8,0.6)' }}>Opcje odpowiedzi</label>
        {(data.options ?? []).map((opt: any, i: number) => (
          <div key={opt.key} className="flex gap-1.5 mb-1.5">
            <span className="text-[10px] font-bold w-4 flex-shrink-0 mt-1.5" style={{ color: '#B8913A' }}>{opt.key}</span>
            <input
              className="flex-1 border rounded px-2 py-1 text-xs outline-none"
              style={{ borderColor: 'rgba(0,0,0,0.15)' }}
              value={opt.label}
              onChange={(e) => {
                const opts = [...(data.options ?? [])];
                opts[i] = { ...opts[i], label: e.target.value };
                onChange({ options: opts });
              }}
            />
          </div>
        ))}
        <button
          className="text-xs mt-1"
          style={{ color: '#B8913A' }}
          onClick={() => {
            const keys = ['A', 'B', 'C', 'D', 'E', 'F'];
            const nextKey = keys[(data.options ?? []).length] ?? String.fromCharCode(65 + (data.options ?? []).length);
            onChange({ options: [...(data.options ?? []), { key: nextKey, label: '' }] });
          }}
        >
          + Dodaj opcję
        </button>
      </div>
    </div>
  );
}

function ResultPanel({ data, services, onChange }: { data: any; services: any[]; onChange: (p: Record<string, unknown>) => void }) {
  const result = data.result ?? { mainServiceId: null, suggestions: [] };

  return (
    <div className="space-y-3">
      {(['title', 'subtitle', 'description', 'extras'] as const).map((field) => (
        <div key={field}>
          <label className="text-xs font-medium block mb-1 capitalize" style={{ color: 'rgba(26,18,8,0.6)' }}>{field}</label>
          <textarea
            className="w-full border rounded-lg px-2 py-1.5 text-xs outline-none resize-none"
            style={{ borderColor: 'rgba(0,0,0,0.15)' }}
            rows={2}
            value={data[field] ?? ''}
            onChange={(e) => onChange({ [field]: e.target.value })}
          />
        </div>
      ))}
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'rgba(26,18,8,0.6)' }}>Główny zabieg</label>
        <select
          className="w-full border rounded-lg px-2 py-1.5 text-xs outline-none"
          style={{ borderColor: 'rgba(0,0,0,0.15)' }}
          value={result.mainServiceId ?? ''}
          onChange={(e) => onChange({ result: { ...result, mainServiceId: e.target.value || null, mainServiceName: services.find((s: any) => s.id === e.target.value)?.name ?? null } })}
        >
          <option value="">— brak —</option>
          {services.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 8.2: Commit**

```bash
git add apps/web/src/pages/admin/AdminQuizEditor.tsx
git commit -m "feat: add AdminQuizEditor with React Flow canvas"
```

---

## Task 9: Routes + admin nav

**Files:**
- Modify: `apps/web/src/router.tsx`
- Modify: admin layout sidebar (find where admin nav links are defined)

- [ ] **Step 9.1: Add routes to router.tsx**

Open `apps/web/src/router.tsx`. Find the admin route block (lines with `/admin/...`). Add:

```tsx
import AdminQuizzes from './pages/admin/AdminQuizzes';
import AdminQuizEditor from './pages/admin/AdminQuizEditor';
```

Inside the admin routes block, add after the `/uslugi/:slug` route:
```tsx
{ path: 'quizy', element: <AdminQuizzes /> },
{ path: 'quizy/:id/edytor', element: <AdminQuizEditor /> },
```

- [ ] **Step 9.2: Add sidebar nav link**

Find the admin sidebar component. Search for it:
```bash
grep -r "uslugi\|Usługi\|admin.*nav\|AdminLayout" apps/web/src --include="*.tsx" -l
```

Open the found layout file. Find the nav link for "Usługi" and add after it:
```tsx
<NavLink to="/admin/quizy">Quizy</NavLink>
```
(Match the exact JSX pattern used by other nav links in that file.)

- [ ] **Step 9.3: Verify navigation works**

Start the dev server (`pnpm dev` from `cosmo-app/`) and open `http://localhost:5173/admin/quizy`. Verify the page loads and shows "Quizy dopasowania".

- [ ] **Step 9.4: Commit**

```bash
git add apps/web/src/router.tsx
git add apps/web/src/components/layouts/  # or wherever the sidebar file is
git commit -m "feat: add quiz admin routes and sidebar nav link"
```

---

## Task 10: Refactor ServiceQuiz.tsx — data-driven

**Files:**
- Modify: `apps/web/src/components/ServiceQuiz.tsx`

- [ ] **Step 10.1: Rewrite ServiceQuiz.tsx**

Replace the entire file content with:

```tsx
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { quizApi, type FullQuiz, type ApiQuizResult } from '@/api/quiz.api';

interface Props {
  onClose: () => void;
  onAccept: (result: ApiQuizResult) => void;
}

type BodyPart = 'STOPY' | 'TWARZ' | 'DLONIE' | 'DEKOLT' | null;

const BODY_PARTS = [
  { key: 'STOPY' as const, label: 'Stopy', emoji: '🦶', available: true },
  { key: 'TWARZ' as const, label: 'Twarz', emoji: '🧖', available: false },
  { key: 'DLONIE' as const, label: 'Dłonie', emoji: '💅', available: false },
  { key: 'DEKOLT' as const, label: 'Dekolt', emoji: '✨', available: false },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ServiceQuiz({ onClose, onAccept }: Props) {
  const [bodyPart, setBodyPart] = useState<BodyPart>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [depth, setDepth] = useState(0); // tracks progress for bar

  // Fetch quizzes for selected body part
  // NOTE: TanStack Query v5 removed onSuccess from useQuery — use useEffect instead
  const { data: quizList = [], isLoading: loadingList } = useQuery({
    queryKey: ['quizzes', bodyPart],
    queryFn: () => quizApi.listByBodyPart(bodyPart!),
    enabled: !!bodyPart,
  });

  useEffect(() => {
    if (quizList.length === 1) setSelectedQuizId(quizList[0].id);
  }, [quizList]);

  // Fetch full quiz tree once selected
  const { data: quiz, isLoading: loadingQuiz } = useQuery({
    queryKey: ['quiz', selectedQuizId],
    queryFn: () => quizApi.getById(selectedQuizId!),
    enabled: !!selectedQuizId,
  });

  useEffect(() => {
    if (!quiz) return;
    const startNode = quiz.nodes.find((n) => n.type === 'START');
    if (startNode) {
      const startEdge = quiz.edges.find((e) => e.sourceNodeId === startNode.id);
      if (startEdge) setCurrentNodeId(startEdge.targetNodeId);
    }
  }, [quiz]);

  const currentNode = quiz?.nodes.find((n) => n.id === currentNodeId) ?? null;
  const isResult = currentNode?.type === 'RESULT';

  // Count total QUESTION nodes for progress bar
  const totalQuestions = quiz?.nodes.filter((n) => n.type === 'QUESTION').length ?? 0;
  const progressPct = bodyPart === null ? 0 : isResult ? 100 : totalQuestions > 0 ? (depth / totalQuestions) * 100 : 0;

  function handleAnswer(optionKey: string) {
    if (!quiz || !currentNodeId) return;
    const edge = quiz.edges.find((e) => e.sourceNodeId === currentNodeId && e.sourceHandle === optionKey);
    if (edge) {
      setCurrentNodeId(edge.targetNodeId);
      setDepth((d) => d + 1);
    }
  }

  function buildResult(node: FullQuiz['nodes'][0]): ApiQuizResult {
    const d = node.data as any;
    const r = node.result;
    return {
      title: d.title ?? '',
      subtitle: d.subtitle ?? '',
      description: d.description ?? '',
      extras: d.extras ?? '',
      mainService: r?.mainService ?? null,
      suggestions: r?.suggestions ?? [],
    };
  }

  const loading = loadingList || loadingQuiz;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full mx-4 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#B8913A' }}>
            Quiz dopasowania zabiegu
          </p>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-60 transition-opacity" style={{ color: 'rgba(26,18,8,0.4)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full" style={{ background: '#F0ECE4' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%`, background: '#B8913A' }}
          />
        </div>

        {loading && (
          <p className="text-sm text-center py-4" style={{ color: 'rgba(26,18,8,0.4)' }}>Ładowanie...</p>
        )}

        {/* Body part selection */}
        {!loading && bodyPart === null && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold" style={{ color: '#1A1208' }}>Jakiej części ciała dotyczy zabieg?</h2>
            <div className="grid grid-cols-2 gap-3">
              {BODY_PARTS.map(({ key, label, emoji, available }) => (
                <div key={key} className="relative">
                  <button
                    onClick={() => available ? setBodyPart(key) : undefined}
                    disabled={!available}
                    className="w-full rounded-xl border p-4 flex flex-col items-center gap-2 text-sm font-medium transition-all"
                    style={{ borderColor: 'rgba(0,0,0,0.1)', color: '#1A1208', opacity: available ? 1 : 0.5, cursor: available ? 'pointer' : 'not-allowed' }}
                    onMouseEnter={(e) => { if (!available) return; (e.currentTarget as HTMLButtonElement).style.borderColor = '#B8913A'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(184,145,58,0.06)'; }}
                    onMouseLeave={(e) => { if (!available) return; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.1)'; (e.currentTarget as HTMLButtonElement).style.background = ''; }}
                  >
                    <span className="text-2xl">{emoji}</span>
                    {label}
                  </button>
                  {!available && (
                    <span className="absolute top-2 right-2 text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(184,145,58,0.15)', color: '#B8913A' }}>
                      Wkrótce
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quiz selection (multiple quizzes for body part) */}
        {!loading && bodyPart !== null && !selectedQuizId && quizList.length > 1 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold" style={{ color: '#1A1208' }}>Wybierz quiz</h2>
            {quizList.map((q) => (
              <button
                key={q.id}
                onClick={() => setSelectedQuizId(q.id)}
                className="w-full text-left px-4 py-3 rounded-xl border text-sm font-medium"
                style={{ borderColor: 'rgba(0,0,0,0.1)', color: '#1A1208' }}
              >
                {q.title}
              </button>
            ))}
          </div>
        )}

        {/* Question screen */}
        {!loading && currentNode?.type === 'QUESTION' && (
          <div className="space-y-4">
            <div>
              <p className="text-xs" style={{ color: 'rgba(26,18,8,0.4)' }}>Pytanie {depth + 1}</p>
              <h2 className="text-lg font-semibold mt-1 leading-snug" style={{ color: '#1A1208' }}>
                {(currentNode.data as any).question}
              </h2>
            </div>
            <div className="space-y-2">
              {((currentNode.data as any).options ?? []).map(({ key, label }: { key: string; label: string }) => (
                <button
                  key={key}
                  onClick={() => handleAnswer(key)}
                  className="w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all"
                  style={{ borderColor: 'rgba(0,0,0,0.1)', color: '#1A1208' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(184,145,58,0.06)'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#B8913A'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = ''; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.1)'; }}
                >
                  <span className="font-bold mr-2" style={{ color: '#B8913A' }}>{key}.</span>{label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Result screen */}
        {!loading && currentNode?.type === 'RESULT' && (() => {
          const result = buildResult(currentNode as any);
          return (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="text-3xl">✨</div>
                <h2 className="text-xl font-bold" style={{ color: '#1A1208' }}>{result.title}</h2>
                <p className="text-sm font-medium" style={{ color: '#B8913A' }}>{result.subtitle}</p>
              </div>
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(184,145,58,0.06)', border: '1px solid rgba(184,145,58,0.2)' }}>
                <p className="text-sm" style={{ color: 'rgba(26,18,8,0.8)' }}>{result.description}</p>
                {result.extras && (
                  <p className="text-xs" style={{ color: 'rgba(26,18,8,0.5)' }}>
                    <span className="font-semibold">Polecamy dodatkowo: </span>{result.extras}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => onAccept(result)}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: '#1A1208', color: '#FDFAF6' }}
                >
                  Zarezerwuj ten zabieg
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl text-sm font-medium border transition-opacity hover:opacity-70"
                  style={{ borderColor: 'rgba(0,0,0,0.15)', color: 'rgba(26,18,8,0.7)' }}
                >
                  Wróć do listy usług
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
```

Note: The old exported types `QuizResult` and `ResultKey` are removed. `ApiQuizResult` is now exported from `quiz.api.ts`.

- [ ] **Step 10.2: Commit**

```bash
git add apps/web/src/components/ServiceQuiz.tsx
git commit -m "feat: refactor ServiceQuiz to be data-driven (API-based tree traversal)"
```

---

## Task 11: Update BookingWizard.tsx

**Files:**
- Modify: `apps/web/src/pages/user/BookingWizard.tsx`

- [ ] **Step 11.1: Update imports and types**

Open `apps/web/src/pages/user/BookingWizard.tsx`.

Replace the import line:
```tsx
import ServiceQuiz, { type QuizResult, type ResultKey } from '@/components/ServiceQuiz';
```
With:
```tsx
import ServiceQuiz from '@/components/ServiceQuiz';
import type { ApiQuizResult } from '@/api/quiz.api';
```

- [ ] **Step 11.2: Remove CATEGORY_KEYWORDS and update state**

Remove the entire `CATEGORY_KEYWORDS` constant (lines ~128–136).

Change the state declarations — find `filterCategory` and `recommendation` state:

```tsx
// REMOVE:
const [filterCategory, setFilterCategory] = useState<string>('');
const [recommendation, setRecommendation] = useState<QuizResult | null>(null);

// REPLACE WITH:
const [filterCategory, setFilterCategory] = useState<string>('');
const [recommendation, setRecommendation] = useState<ApiQuizResult | null>(null);
```

- [ ] **Step 11.3: Update handleQuizAccept**

Find and replace `handleQuizAccept`:

```tsx
// REMOVE old:
const handleQuizAccept = (result: QuizResult) => {
  setRecommendation(result);
  setQuizOpen(false);
  const keyword = CATEGORY_KEYWORDS[result.key];
  const match = categories.find((c) => c.toLowerCase().includes(keyword));
  if (match) setFilterCategory(match);
};

// REPLACE WITH:
const handleQuizAccept = (result: ApiQuizResult) => {
  setRecommendation(result);
  setQuizOpen(false);
  if (result.mainService) {
    // Find matching service in loaded list and select it directly
    const match = services.find((s: any) => s.id === result.mainService!.id);
    if (match) {
      setState((prev) => ({ ...prev, service: match }));
      setStep(1); // advance to employee selection
    }
  }
  // If no mainService: stay on service step, show all services with banner
};
```

Note: Check the actual variable name used for the step setter (`setStep` or similar) and state setter (`setState` or similar) in the existing file and use those exact names.

- [ ] **Step 11.4: Verify TypeScript compiles**

```bash
cd apps/web
pnpm build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 11.5: Commit**

```bash
git add apps/web/src/pages/user/BookingWizard.tsx
git commit -m "feat: update BookingWizard to use ApiQuizResult, remove CATEGORY_KEYWORDS"
```

---

## Task 12: Seed script — existing quiz as decision tree

**Files:**
- Create: `apps/server/prisma/seeds/quiz-stopy.ts`

- [ ] **Step 12.1: Create seed script**

```bash
mkdir -p apps/server/prisma/seeds
```

Create `apps/server/prisma/seeds/quiz-stopy.ts`:

```typescript
import { PrismaClient, BodyPart, QuizNodeType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding quiz for STOPY...');

  // Delete existing STOPY quiz if present (idempotent)
  await prisma.quiz.deleteMany({ where: { bodyPart: 'STOPY' } });

  const quiz = await prisma.quiz.create({
    data: { title: 'Quiz podologiczny — stopy', bodyPart: BodyPart.STOPY, isActive: true },
  });

  // ── Node helpers ──
  const pos = (x: number, y: number) => ({ positionX: x, positionY: y });

  // Create all nodes
  const start = await prisma.quizNode.create({ data: { quizId: quiz.id, type: QuizNodeType.START, ...pos(50, 300), data: {} } });

  // Q6 — medical conditions (checked first — highest priority)
  const q6 = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.QUESTION, ...pos(250, 300),
      data: {
        question: 'Czy masz cukrzycę, problemy z krążeniem lub inne schorzenia?',
        options: [
          { key: 'A', label: 'Tak, mam cukrzycę' },
          { key: 'B', label: 'Tak, mam problemy z krążeniem' },
          { key: 'C', label: 'Mam inne schorzenia' },
          { key: 'D', label: 'Nie, jestem zdrowa/y' },
        ],
      },
    },
  });

  // Q1-Q4 (chained — any A → leczniczy)
  const q1 = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.QUESTION, ...pos(500, 200),
      data: {
        question: 'Kiedy ostatnio byłaś/byłeś u podologa?',
        options: [
          { key: 'A', label: 'Nigdy lub ponad 2 lata temu' },
          { key: 'B', label: 'Ponad rok temu' },
          { key: 'C', label: 'Kilka miesięcy temu' },
          { key: 'D', label: 'Byłam/byłem niedawno' },
        ],
      },
    },
  });
  const q2 = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.QUESTION, ...pos(750, 150),
      data: {
        question: 'Czy masz odciski, nagniotki lub zgrubiały naskórek?',
        options: [
          { key: 'A', label: 'Tak, spore i uciążliwe' },
          { key: 'B', label: 'Tak, ale niewielkie' },
          { key: 'C', label: 'Zgrubiały naskórek na piętach' },
          { key: 'D', label: 'Nie mam' },
        ],
      },
    },
  });
  const q3 = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.QUESTION, ...pos(1000, 150),
      data: {
        question: 'Jak wygląda stan twoich paznokci u nóg?',
        options: [
          { key: 'A', label: 'Wrastający paznokieć lub silna deformacja' },
          { key: 'B', label: 'Zgrubienie lub przebarwienie' },
          { key: 'C', label: 'Zaniedbane, ale bez bólu' },
          { key: 'D', label: 'Są w dobrym stanie' },
        ],
      },
    },
  });
  const q4 = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.QUESTION, ...pos(1250, 150),
      data: {
        question: 'Czy odczuwasz ból lub dyskomfort podczas chodzenia?',
        options: [
          { key: 'A', label: 'Tak, często' },
          { key: 'B', label: 'Czasami' },
          { key: 'C', label: 'Rzadko' },
          { key: 'D', label: 'Nie' },
        ],
      },
    },
  });
  const q5 = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.QUESTION, ...pos(1500, 200),
      data: {
        question: 'Czego przede wszystkim oczekujesz od zabiegu?',
        options: [
          { key: 'A', label: 'Ulgi od bólu i problemów zdrowotnych' },
          { key: 'B', label: 'Kompleksowej pielęgnacji' },
          { key: 'C', label: 'Poprawy wyglądu paznokci i stóp' },
          { key: 'D', label: 'Relaksu i przyjemności' },
        ],
      },
    },
  });

  // RESULT nodes
  const rCukrzycowy = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.RESULT, ...pos(500, 450),
      data: { title: 'Zabieg dla stóp cukrzycowych', subtitle: 'Konsultacja, wkładki ortopedyczne, pielęgnacja przy schorzeniach', description: 'Specjalistyczny zabieg dostosowany do potrzeb osób z cukrzycą lub problemami z krążeniem.', extras: 'Koniecznie poinformuj specjalistkę o przyjmowanych lekach i historii choroby.' },
    },
  });
  const rLeczniczy = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.RESULT, ...pos(1800, 50),
      data: { title: 'Zabieg podologiczny leczniczy', subtitle: 'Usuwanie odcisków, korekta wrastającego paznokcia', description: 'Zabieg skupiony na leczeniu konkretnych dolegliwości stóp.', extras: 'Polecamy również konsultację w sprawie wkładek ortopedycznych.' },
    },
  });
  const rKompleksowy = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.RESULT, ...pos(1800, 200),
      data: { title: 'Kompleksowy zabieg pielęgnacyjny', subtitle: 'Peeling, masaż, nawilżanie', description: 'Pełna regeneracja stóp łącząca oczyszczanie i nawilżanie.', extras: 'Uzupełnij o okłady parafinowe dla głębszego nawilżenia.' },
    },
  });
  const rEstetyczny = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.RESULT, ...pos(1800, 350),
      data: { title: 'Zabieg pielęgnacyjno-estetyczny', subtitle: 'Klasyczny pedicure, hybryda, zdobienie', description: 'Zabieg nastawiony na piękny wygląd paznokci i zadbanych stóp.', extras: 'Zapytaj o nasze wzory zdobieniowe i kolekcje kolorów sezonu.' },
    },
  });
  const rRelaks = await prisma.quizNode.create({
    data: {
      quizId: quiz.id, type: QuizNodeType.RESULT, ...pos(1800, 500),
      data: { title: 'Pedicure spa z masażem', subtitle: 'Masaż stóp i łydek, peeling cukrowy, okłady parafinowe', description: 'Luksusowe doświadczenie dla zmęczonych stóp.', extras: 'Połącz z aromaterapią dla pełnego spa.' },
    },
  });

  // Create QuizResult records (no mainService linked — admin can link via editor later)
  for (const node of [rCukrzycowy, rLeczniczy, rKompleksowy, rEstetyczny, rRelaks]) {
    await prisma.quizResult.create({ data: { nodeId: node.id } });
  }

  // ── Edges ──
  const edge = (src: string, tgt: string, handle: string) =>
    prisma.quizEdge.create({ data: { quizId: quiz.id, sourceNodeId: src, targetNodeId: tgt, sourceHandle: handle } });

  // START → Q6
  await edge(start.id, q6.id, 'default');

  // Q6: A/B → cukrzycowy, C/D → Q1
  await edge(q6.id, rCukrzycowy.id, 'A');
  await edge(q6.id, rCukrzycowy.id, 'B');
  await edge(q6.id, q1.id, 'C');
  await edge(q6.id, q1.id, 'D');

  // Q1: A → leczniczy, B/C/D → Q2
  await edge(q1.id, rLeczniczy.id, 'A');
  await edge(q1.id, q2.id, 'B');
  await edge(q1.id, q2.id, 'C');
  await edge(q1.id, q2.id, 'D');

  // Q2: A → leczniczy, B/C/D → Q3
  await edge(q2.id, rLeczniczy.id, 'A');
  await edge(q2.id, q3.id, 'B');
  await edge(q2.id, q3.id, 'C');
  await edge(q2.id, q3.id, 'D');

  // Q3: A → leczniczy, B/C/D → Q4
  await edge(q3.id, rLeczniczy.id, 'A');
  await edge(q3.id, q4.id, 'B');
  await edge(q3.id, q4.id, 'C');
  await edge(q3.id, q4.id, 'D');

  // Q4: A → leczniczy, B/C/D → Q5
  await edge(q4.id, rLeczniczy.id, 'A');
  await edge(q4.id, q5.id, 'B');
  await edge(q4.id, q5.id, 'C');
  await edge(q4.id, q5.id, 'D');

  // Q5: A → leczniczy, B → kompleksowy, C → estetyczny, D → relaks
  await edge(q5.id, rLeczniczy.id, 'A');
  await edge(q5.id, rKompleksowy.id, 'B');
  await edge(q5.id, rEstetyczny.id, 'C');
  await edge(q5.id, rRelaks.id, 'D');

  console.log('✓ Quiz seeded successfully:', quiz.id);
  console.log('  Nodes: 12 (1 START, 6 QUESTION, 5 RESULT)');
  console.log('  Edges: 20');
  console.log('  Note: Link mainService on result nodes via the admin quiz editor.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 12.2: Run the seed**

```bash
cd apps/server
npx tsx prisma/seeds/quiz-stopy.ts
```

Expected:
```
Seeding quiz for STOPY...
✓ Quiz seeded successfully: clxxx...
  Nodes: 12 (1 START, 6 QUESTION, 5 RESULT)
  Edges: 20
```

- [ ] **Step 12.3: Verify quiz appears in admin**

Open `http://localhost:5173/admin/quizy` — the seeded quiz should appear in the list.

- [ ] **Step 12.4: Commit**

```bash
git add apps/server/prisma/seeds/quiz-stopy.ts
git commit -m "feat: add seed script for existing STOPY quiz as decision tree"
```

---

## Task 13: End-to-end smoke test

- [ ] **Step 13.1: Run backend tests**

```bash
cd apps/server
pnpm test
```

Expected: All tests pass (including the 6 `validateTree` tests from Task 3).

- [ ] **Step 13.2: Manual end-to-end flow**

Start full stack: `cd cosmo-app && pnpm dev`

1. **Admin quiz list**: Go to `http://localhost:5173/admin/quizy` → seeded quiz visible
2. **Open editor**: Click "Edytuj drzewo" → canvas loads with 12 nodes
3. **Create new quiz**: Click "+ Nowy quiz", enter title, select body part → redirects to empty canvas
4. **Add nodes**: Click "+ Pytanie", "+ Wynik", drag on canvas, connect with edge
5. **Edit node**: Click a QUESTION node → right panel shows fields, edit question text, see node update
6. **Save tree**: Click "Zapisz" → toast "Drzewo zapisane"
7. **Public quiz**: Go to `/rezerwacja` → click quiz button → body part screen → select Stopy → quiz loads from API → answer questions → result screen shows

- [ ] **Step 13.3: Final commit**

```bash
git add -A
git commit -m "feat: quiz admin complete — DB schema, API, canvas editor, ServiceQuiz refactor"
```
