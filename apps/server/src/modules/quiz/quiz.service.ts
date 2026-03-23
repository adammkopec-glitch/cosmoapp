import prisma from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
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
