import { useState, useCallback, useEffect } from 'react';
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

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
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
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, style: { stroke: '#B8913A' } } as Edge, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback((_: any, node: Node) => setSelectedNode(node), []);
  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  // Add nodes
  const hasStart = nodes.some((n) => n.type === 'START');

  function addNode(type: 'START' | 'QUESTION' | 'RESULT') {
    const nodeId = newTempId();
    const defaultData =
      type === 'START'
        ? {}
        : type === 'QUESTION'
        ? { question: '', options: [{ key: 'A', label: '' }, { key: 'B', label: '' }] }
        : { title: '', subtitle: '', description: '', extras: '', result: { mainServiceId: null, suggestions: [] } };
    setNodes((nds) => [
      ...nds,
      { id: nodeId, type, position: { x: Math.random() * 400 + 50, y: Math.random() * 200 + 50 }, data: defaultData },
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
