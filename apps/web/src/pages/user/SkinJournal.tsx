import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, X, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { skinJournalApi, type SkinJournalEntry } from '@/api/skin-journal.api';

const MOODS: string[] = ['😟', '😕', '😐', '🙂', '😊'];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Comment Section (expandable) ──────────────────────────────────────────

function CommentSection({ entry, userId }: { entry: SkinJournalEntry; userId: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const unread = entry.comments.filter((c) => c.authorId !== userId && !c.readAt).length;

  const markRead = useMutation({
    mutationFn: () => skinJournalApi.markEntryRead(entry.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal'] });
      qc.invalidateQueries({ queryKey: ['journal', 'unread'] });
    },
  });

  const toggle = () => {
    if (!open && unread > 0) markRead.mutate();
    setOpen((v) => !v);
  };

  if (entry.comments.length === 0) return null;

  return (
    <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 10, marginTop: 8 }}>
      <button
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: unread > 0 ? 'rgba(184,145,58,0.1)' : 'rgba(0,0,0,0.04)',
          border: `1px solid ${unread > 0 ? 'rgba(184,145,58,0.25)' : 'rgba(0,0,0,0.1)'}`,
          borderRadius: 10,
          padding: '7px 12px',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 600,
          color: unread > 0 ? '#B8913A' : '#6B6560',
        }}
      >
        <span>
          💬 Komentarz kosmetologa
          {unread > 0 && (
            <span style={{ background: '#B8913A', color: '#fff', borderRadius: 20, padding: '1px 6px', fontSize: 10, marginLeft: 6 }}>
              {unread} {unread === 1 ? 'nowy' : 'nowych'}
            </span>
          )}
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div style={{ marginTop: 6, background: 'rgba(26,18,8,0.03)', borderRadius: 10, padding: '10px 12px' }}>
          {entry.comments.map((c) => (
            <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 26, height: 26, minWidth: 26, borderRadius: '50%', background: '#1A1208', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>
                {c.author.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1208' }}>{c.author.name} (kosmetolog)</span>
                <p style={{ fontSize: 12, color: '#4B4036', margin: '3px 0 2px' }}>{c.content}</p>
                <span style={{ fontSize: 10, color: '#B0A89E' }}>{formatTime(c.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Admin Entry Card ───────────────────────────────────────────────────────

function AdminEntryCard({ entry }: { entry: SkinJournalEntry }) {
  return (
    <div style={{ background: '#fff', border: '2px solid rgba(26,18,8,0.15)', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#1A1208', color: '#fff' }}>
          👩‍⚕️ Notatka kosmetologa
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6B6560' }}>{formatDate(entry.date)}</span>
      </div>
      {entry.notes && <p style={{ fontSize: 14, color: '#4B4036', lineHeight: 1.6, margin: 0 }}>{entry.notes}</p>}
      {entry.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {entry.tags.map((tag) => (
            <span key={tag} style={{ fontSize: 11, padding: '3px 10px', background: 'rgba(26,18,8,0.07)', color: '#4B4036', borderRadius: 20, fontWeight: 500 }}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── User Entry Card ────────────────────────────────────────────────────────

function EntryCard({ entry, userId, onDelete }: { entry: SkinJournalEntry; userId: string; onDelete: (id: string) => void }) {
  if (entry.isAdminEntry) return <AdminEntryCard entry={entry} />;

  const mood = entry.mood;

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e0d8', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 12, color: '#999', margin: '0 0 4px' }}>{formatDate(entry.date)}</p>
          {mood !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 24 }}>{MOODS[(mood ?? 3) - 1]}</span>
              <span style={{ fontSize: 14, color: '#666' }}>
                Nastrój {mood}/5
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => { if (window.confirm('Czy na pewno chcesz usunąć ten wpis?')) onDelete(entry.id); }}
          style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 6, color: '#ef4444', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
        >
          <Trash2 size={13} /> Usuń
        </button>
      </div>

      {entry.photoPath && (
        <img src={`/uploads/${entry.photoPath}`} alt="Zdjęcie wpisu" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
      )}

      {entry.notes && <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6, margin: '0 0 12px' }}>{entry.notes}</p>}

      {entry.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: entry.comments.length > 0 ? 10 : 0 }}>
          {entry.tags.map((tag) => (
            <span key={tag} style={{ fontSize: 11, padding: '3px 10px', background: '#fdf6ec', color: '#B8913A', border: '1px solid #f0e0c0', borderRadius: 20, fontWeight: 500 }}>{tag}</span>
          ))}
        </div>
      )}

      <CommentSection entry={entry} userId={userId} />
    </div>
  );
}

// ─── Add Entry Form ─────────────────────────────────────────────────────────

function AddEntryForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [mood, setMood] = useState(3);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [tagsRaw, setTagsRaw] = useState('');
  const [photo, setPhoto] = useState<File | undefined>(undefined);

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('mood', String(mood));
      fd.append('date', date);
      if (notes.trim()) fd.append('notes', notes.trim());
      const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
      tags.forEach((t) => fd.append('tags', t));
      if (photo) fd.append('photo', photo);
      return skinJournalApi.createEntry(fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal'] });
      toast.success('Wpis dodany!');
      onClose();
    },
    onError: () => toast.error('Nie udało się dodać wpisu'),
  });

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e0d8', borderRadius: 16, padding: 24, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-heading, serif)', fontSize: 18, color: '#1A1208', margin: 0 }}>Nowy wpis</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: 4 }}><X size={20} /></button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 6, fontWeight: 500 }}>Data</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e0d8', borderRadius: 8, fontSize: 14, color: '#1A1208', background: '#faf9f7', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 8, fontWeight: 500 }}>Nastrój skóry</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {MOODS.map((emoji, idx) => {
            const val = idx + 1;
            const selected = mood === val;
            return (
              <button key={val} onClick={() => setMood(val)} style={{ flex: 1, padding: '10px 4px', fontSize: 22, border: selected ? '2px solid #B8913A' : '2px solid #e5e0d8', borderRadius: 10, background: selected ? '#fdf6ec' : '#faf9f7', cursor: 'pointer', lineHeight: 1 }}>{emoji}</button>
            );
          })}
        </div>
        <p style={{ fontSize: 12, color: '#999', margin: '6px 0 0' }}>Wybrano: {MOODS[mood - 1]} ({mood}/5)</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 6, fontWeight: 500 }}>Notatki (opcjonalnie)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Jak wygląda skóra dziś? Czy zabiegi przynoszą efekty?" rows={3} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e0d8', borderRadius: 8, fontSize: 14, color: '#1A1208', background: '#faf9f7', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 6, fontWeight: 500 }}>Tagi (opcjonalnie, oddzielone przecinkami)</label>
        <input type="text" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="np. nawilżenie, trądzik, po zabiegu" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e0d8', borderRadius: 8, fontSize: 14, color: '#1A1208', background: '#faf9f7', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 6, fontWeight: 500 }}>Zdjęcie (opcjonalnie)</label>
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0])} style={{ width: '100%', padding: '8px 0', fontSize: 13, color: '#666' }} />
        {photo && <p style={{ fontSize: 12, color: '#B8913A', marginTop: 4 }}>{photo.name}</p>}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '10px 20px', border: '1px solid #e5e0d8', borderRadius: 8, background: '#fff', color: '#666', cursor: 'pointer', fontSize: 14 }}>Anuluj</button>
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending} style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: '#B8913A', color: '#fff', cursor: mutation.isPending ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: mutation.isPending ? 0.7 : 1 }}>
          {mutation.isPending ? 'Dodawanie...' : 'Dodaj wpis'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function UserSkinJournal() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['journal', page],
    queryFn: () => skinJournalApi.getJournal(page),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => skinJournalApi.deleteEntry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal'] });
      toast.success('Wpis usunięty');
    },
    onError: () => toast.error('Nie udało się usunąć wpisu'),
  });

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #B8913A, #d4a84b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading, serif)', fontSize: 22, color: '#1A1208', margin: 0, fontWeight: 700 }}>
              Dziennik Kosmetologa
            </h1>
            <p style={{ fontSize: 13, color: '#999', margin: 0 }}>Twój osobisty dziennik pielęgnacji</p>
          </div>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#B8913A', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            <Plus size={16} /> Nowy wpis
          </button>
        )}
      </div>

      {showForm && <AddEntryForm onClose={() => setShowForm(false)} />}

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e5e0d8', borderTopColor: '#B8913A', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {!isLoading && data?.entries.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px solid #e5e0d8' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#fdf6ec', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <BookOpen size={30} color="#B8913A" />
          </div>
          <h3 style={{ fontFamily: 'var(--font-heading, serif)', fontSize: 18, color: '#1A1208', margin: '0 0 8px' }}>Zacznij prowadzić dziennik</h3>
          <p style={{ fontSize: 14, color: '#999', margin: '0 0 24px', lineHeight: 1.6 }}>Dokumentuj efekty zabiegów, samopoczucie i postępy</p>
          <button onClick={() => setShowForm(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 24px', background: '#B8913A', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            <Plus size={16} /> Dodaj pierwszy wpis
          </button>
        </div>
      )}

      {!isLoading && data && data.entries.length > 0 && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {data.entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} userId={user?.id ?? ''} onDelete={(id) => deleteMutation.mutate(id)} />
            ))}
          </div>

          {data.totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', border: '1px solid #e5e0d8', borderRadius: 8, background: '#fff', color: page === 1 ? '#ccc' : '#444', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                <ChevronLeft size={14} /> Poprzednia
              </button>
              <span style={{ fontSize: 13, color: '#666' }}>{page} / {data.totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', border: '1px solid #e5e0d8', borderRadius: 8, background: '#fff', color: page === data.totalPages ? '#ccc' : '#444', cursor: page === data.totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                Następna <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
