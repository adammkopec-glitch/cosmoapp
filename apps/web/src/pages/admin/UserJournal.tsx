import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Send, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { skinJournalApi, type SkinJournalEntry } from '@/api/skin-journal.api';

const MOODS: string[] = ['😟', '😕', '😐', '🙂', '😊'];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Comment Form ───────────────────────────────────────────────────────────

function AdminCommentForm({ entryId, userId, onDone }: { entryId: string; userId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [content, setContent] = useState('');

  const add = useMutation({
    mutationFn: () => skinJournalApi.addComment(entryId, content.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-journal', userId] });
      setContent('');
      onDone();
      toast.success('Komentarz dodany');
    },
    onError: () => toast.error('Nie udało się dodać komentarza'),
  });

  return (
    <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={2}
        placeholder="Wpisz komentarz do wpisu..."
        style={{ flex: 1, padding: '8px 10px', border: '1px solid #e5e0d8', borderRadius: 10, fontSize: 13, resize: 'none', fontFamily: 'inherit', outline: 'none' }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button
          onClick={() => content.trim() && add.mutate()}
          disabled={!content.trim() || add.isPending}
          style={{ padding: '8px 12px', background: '#1A1208', color: '#fff', border: 'none', borderRadius: 8, cursor: content.trim() ? 'pointer' : 'not-allowed', opacity: content.trim() ? 1 : 0.5 }}
        >
          <Send size={14} />
        </button>
        <button
          onClick={onDone}
          style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, cursor: 'pointer' }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Entry Card (Admin view) ────────────────────────────────────────────────

function AdminEntryCard({ entry, userId }: { entry: SkinJournalEntry; userId: string }) {
  const qc = useQueryClient();
  const [showComment, setShowComment] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const deleteEntry = useMutation({
    mutationFn: () => skinJournalApi.adminDeleteEntry(userId, entry.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-journal', userId] });
      toast.success('Wpis usunięty');
    },
    onError: () => toast.error('Nie udało się usunąć wpisu'),
  });

  if (entry.isAdminEntry) {
    return (
      <div style={{ background: '#fff', border: '2px solid rgba(26,18,8,0.15)', borderRadius: 14, padding: '16px 18px', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#1A1208', color: '#fff' }}>👩‍⚕️ Moja notatka</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6B6560' }}>{formatDate(entry.date)}</span>
        </div>
        {entry.notes && <p style={{ color: '#4B4036', margin: '0 0 10px', fontSize: 13, lineHeight: 1.6 }}>{entry.notes}</p>}
        {entry.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {entry.tags.map((tag) => (
              <span key={tag} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(26,18,8,0.07)', color: '#4B4036' }}>{tag}</span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => { if (window.confirm('Usunąć tę notatkę?')) deleteEntry.mutate(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: '#DC2626', cursor: 'pointer' }}
          >
            <Trash2 size={12} /> Usuń
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e0d8', borderRadius: 14, padding: '16px 18px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 11, color: '#999', margin: '0 0 4px' }}>{formatDate(entry.date)}</p>
          {entry.mood !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 20 }}>{MOODS[(entry.mood ?? 3) - 1]}</span>
              <span style={{ fontSize: 13, color: '#666' }}>Nastrój {entry.mood}/5</span>
            </div>
          )}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 6px', borderRadius: 20, background: 'rgba(0,0,0,0.06)', color: '#6B6560' }}>wpis klientki</span>
      </div>

      {entry.photoPath && (
        <img src={`/uploads/${entry.photoPath}`} alt="Zdjęcie" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />
      )}

      {entry.notes && <p style={{ color: '#4B4036', margin: '0 0 10px', fontSize: 13, lineHeight: 1.6 }}>{entry.notes}</p>}

      {entry.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {entry.tags.map((tag) => (
            <span key={tag} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#fdf6ec', color: '#B8913A', border: '1px solid #f0e0c0' }}>{tag}</span>
          ))}
        </div>
      )}

      {/* Existing comments toggle */}
      {entry.comments.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <button
            onClick={() => setShowComments((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6B6560', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            💬 {entry.comments.length} {entry.comments.length === 1 ? 'komentarz' : 'komentarzy'}
            {showComments ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showComments && (
            <div style={{ marginTop: 6, background: 'rgba(26,18,8,0.03)', borderRadius: 10, padding: '8px 12px' }}>
              {entry.comments.map((c) => (
                <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 24, height: 24, minWidth: 24, borderRadius: '50%', background: '#1A1208', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700 }}>
                    {c.author.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1208' }}>{c.author.name}</span>
                    <p style={{ fontSize: 12, color: '#4B4036', margin: '2px 0 1px' }}>{c.content}</p>
                    <span style={{ fontSize: 10, color: '#B0A89E' }}>{formatTime(c.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => setShowComment((v) => !v)}
          style={{ flex: 1, background: 'rgba(184,145,58,0.1)', border: '1px solid rgba(184,145,58,0.3)', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 600, color: '#B8913A', cursor: 'pointer' }}
        >
          💬 Komentuj
        </button>
      </div>

      {showComment && <AdminCommentForm entryId={entry.id} userId={userId} onDone={() => setShowComment(false)} />}
    </div>
  );
}

// ─── Add Note Form ──────────────────────────────────────────────────────────

function AddNoteForm({ userId, onClose }: { userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');

  const create = useMutation({
    mutationFn: () =>
      skinJournalApi.adminCreateEntry(userId, {
        date,
        notes: notes.trim() || undefined,
        tags: tagsRaw.split(',').map((t) => t.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-journal', userId] });
      toast.success('Notatka dodana');
      onClose();
    },
    onError: () => toast.error('Nie udało się dodać notatki'),
  });

  return (
    <div style={{ background: '#fff', border: '2px solid rgba(26,18,8,0.15)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontWeight: 700, color: '#1A1208', fontSize: 13 }}>👩‍⚕️ Nowa notatka kosmetologa</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B0A89E' }}><X size={16} /></button>
      </div>

      <label style={{ fontSize: 11, color: '#6B6560', display: 'block', marginBottom: 4 }}>Data wizyty</label>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e0d8', borderRadius: 8, marginBottom: 10, fontSize: 13, boxSizing: 'border-box' }} />

      <label style={{ fontSize: 11, color: '#6B6560', display: 'block', marginBottom: 4 }}>Notatka</label>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Wykonane zabiegi, zalecenia, obserwacje..." style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e0d8', borderRadius: 8, marginBottom: 10, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />

      <label style={{ fontSize: 11, color: '#6B6560', display: 'block', marginBottom: 4 }}>Tagi (oddzielone przecinkami)</label>
      <input type="text" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="np. peeling, nawilżenie" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e0d8', borderRadius: 8, marginBottom: 14, fontSize: 13, boxSizing: 'border-box' }} />

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #e5e0d8', borderRadius: 8, background: '#fff', color: '#666', cursor: 'pointer', fontSize: 13 }}>Anuluj</button>
        <button onClick={() => create.mutate()} disabled={create.isPending} style={{ padding: '8px 20px', border: 'none', borderRadius: 8, background: '#1A1208', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: create.isPending ? 0.7 : 1 }}>
          {create.isPending ? 'Zapisuję...' : 'Dodaj notatkę'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

interface UserJournalProps {
  userId: string;
  userName: string;
}

export const UserJournal = ({ userId, userName }: UserJournalProps) => {
  const [page, setPage] = useState(1);
  const [showAddNote, setShowAddNote] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-journal', userId, page],
    queryFn: () => skinJournalApi.adminGetJournal(userId, page),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e5e0d8', borderRadius: 14, padding: 14, height: 80 }} className="animate-pulse" />
        ))}
      </div>
    );
  }

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div>
      {/* User info header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: 12, background: '#fff', borderRadius: 12, border: '1px solid #e5e0d8' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1A1208', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
          {userName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 600, color: '#1A1208', fontSize: 13 }}>{userName}</div>
          <div style={{ fontSize: 11, color: '#6B6560' }}>
            {total} {total === 1 ? 'wpis' : total < 5 ? 'wpisy' : 'wpisów'} w dzienniku
          </div>
        </div>
        {!showAddNote && (
          <button
            onClick={() => setShowAddNote(true)}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, background: '#1A1208', color: '#fff', border: 'none', borderRadius: 20, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={12} /> Dodaj notatkę
          </button>
        )}
      </div>

      {showAddNote && <AddNoteForm userId={userId} onClose={() => setShowAddNote(false)} />}

      {entries.length === 0 && !showAddNote && (
        <div style={{ textAlign: 'center', padding: '30px 20px', background: '#fff', border: '1px solid #e5e0d8', borderRadius: 14 }}>
          <p style={{ fontSize: 24, marginBottom: 8 }}>📓</p>
          <p style={{ fontSize: 13, color: '#6B6560', margin: 0 }}>Brak wpisów w dzienniku</p>
        </div>
      )}

      {entries.map((entry) => (
        <AdminEntryCard key={entry.id} entry={entry} userId={userId} />
      ))}

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 8 }}>
          <button disabled={page === 1} onClick={() => setPage(page - 1)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1px solid #e5e0d8', borderRadius: 8, background: '#fff', color: page === 1 ? '#ccc' : '#444', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 12 }}>
            <ChevronLeft size={12} /> Wcześniejsze
          </button>
          <span style={{ fontSize: 12, color: '#666' }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1px solid #e5e0d8', borderRadius: 8, background: '#fff', color: page >= totalPages ? '#ccc' : '#444', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: 12 }}>
            Nowsze <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
};
