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
