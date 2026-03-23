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
