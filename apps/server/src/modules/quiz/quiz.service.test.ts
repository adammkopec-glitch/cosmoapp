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
