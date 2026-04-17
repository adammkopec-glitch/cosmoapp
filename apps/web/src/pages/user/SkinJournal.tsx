import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, X, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { skinJournalApi, type SkinJournalEntry } from '@/api/skin-journal.api';
import { SummaryModal } from '@/components/skin-journal/SummaryModal';

const MOODS: string[] = ['😟', '😕', '😐', '🙂', '😊'];

const JOURNAL_CATEGORIES = [
  { slug: 'stopy',       label: '#stopy' },
  { slug: 'twarz',       label: '#twarz' },
  { slug: 'wlosy',       label: '#włosy' },
  { slug: 'skora_ciala', label: '#skóra ciała' },
] as const;

type CategorySlug = typeof JOURNAL_CATEGORIES[number]['slug'];

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
          padding: '10px 12px',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 600,
          color: unread > 0 ? '#B8913A' : '#6B6560',
          minHeight: 44,
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
    <div className="journal-admin-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, rowGap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#1A1208', color: '#fff', whiteSpace: 'nowrap', flexShrink: 0 }}>
          👩‍⚕️ Notatka kosmetologa
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6B6560', flexShrink: 0 }}>{formatDate(entry.date)}</span>
      </div>
      {entry.notes && <p style={{ fontSize: 14, color: '#4B4036', lineHeight: 1.6, margin: 0 }}>{entry.notes}</p>}
      {entry.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {entry.tags.map((tag) => {
            const cat = JOURNAL_CATEGORIES.find((c) => c.slug === tag);
            return (
              <span key={tag} style={{ fontSize: 11, fontWeight: 700, color: '#4B4036' }}>
                {cat ? cat.label : `#${tag}`}
              </span>
            );
          })}
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
    <div className="journal-entry-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 12, color: '#999', margin: '0 0 4px' }}>{formatDate(entry.date)}</p>
          {mood !== null && (
            <div className="flex gap-1 items-end" aria-label={`Nastrój: ${entry.mood}/5`}>
              {[1,2,3,4,5].map((bar) => (
                <span key={bar} className="inline-block rounded-sm transition-all" style={{
                  width: 10,
                  height: bar <= (entry.mood ?? 0) ? 12 : 6,
                  background: bar <= (entry.mood ?? 0) ? '#C4A882' : 'rgba(196,168,130,0.2)',
                }} />
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => { if (window.confirm('Czy na pewno chcesz usunąć ten wpis?')) onDelete(entry.id); }}
          style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 8, color: '#ef4444', cursor: 'pointer', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, minHeight: 44 }}
        >
          <Trash2 size={13} /> Usuń
        </button>
      </div>

      {entry.photoPath && (
        <img src={entry.photoPath} alt="Zdjęcie wpisu" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
      )}

      {entry.notes && <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6, margin: '0 0 12px' }}>{entry.notes}</p>}

      {entry.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: entry.comments.length > 0 ? 10 : 0 }}>
          {entry.tags.map((tag) => {
            const cat = JOURNAL_CATEGORIES.find((c) => c.slug === tag);
            return (
              <span key={tag} style={{ fontSize: 12, fontWeight: 700, color: '#B8913A' }}>
                {cat ? cat.label : `#${tag}`}
              </span>
            );
          })}
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
  const [selectedCategories, setSelectedCategories] = useState<CategorySlug[]>([]);
  const [photo, setPhoto] = useState<File | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoPreview = photo ? URL.createObjectURL(photo) : null;

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('mood', String(mood));
      fd.append('date', date);
      if (notes.trim()) fd.append('notes', notes.trim());
      selectedCategories.forEach((t) => fd.append('tags', t));
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
        <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 8, fontWeight: 500 }}>Kategoria (opcjonalnie)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {JOURNAL_CATEGORIES.map((cat) => {
            const active = selectedCategories.includes(cat.slug);
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() =>
                  setSelectedCategories((prev) =>
                    active ? prev.filter((s) => s !== cat.slug) : [...prev, cat.slug]
                  )
                }
                style={{
                  padding: '8px 14px',
                  border: active ? '2px solid #B8913A' : '2px solid #e5e0d8',
                  borderRadius: 20,
                  background: active ? '#fdf6ec' : '#faf9f7',
                  color: active ? '#B8913A' : '#888',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 8, fontWeight: 500 }}>Zdjęcie (opcjonalnie)</label>

        {/* Hidden native input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => setPhoto(e.target.files?.[0])}
        />

        {!photo ? (
          /* Upload trigger area */
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              padding: '20px 16px',
              border: '2px dashed #e5e0d8',
              borderRadius: 12,
              background: '#faf9f7',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              color: '#999',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          >
            <span style={{ fontSize: 24 }}>📷</span>
            <span>Dodaj zdjęcie</span>
            <span style={{ fontSize: 11, color: '#bbb' }}>JPG, PNG, WEBP</span>
          </button>
        ) : (
          /* Preview + remove */
          <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
            <img
              src={photoPreview!}
              alt="Podgląd zdjęcia"
              style={{
                width: '100%',
                maxHeight: 200,
                objectFit: 'cover',
                borderRadius: 12,
                display: 'block',
                border: '1px solid #e5e0d8',
              }}
            />
            <button
              type="button"
              onClick={() => {
                setPhoto(undefined);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                lineHeight: 1,
              }}
              aria-label="Usuń zdjęcie"
            >
              ×
            </button>
            <p style={{ fontSize: 11, color: '#B8913A', margin: '4px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {photo.name}
            </p>
          </div>
        )}
      </div>

      <div className="journal-form-actions">
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
  const [showSummary, setShowSummary] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['journal', page],
    queryFn: () => skinJournalApi.getJournal(page),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['journal-summary', undefined, 'all'],
    queryFn: () => skinJournalApi.getSummary('all'),
    staleTime: 60_000,
  });

  const streak = summaryData?.activity.currentStreak ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => skinJournalApi.deleteEntry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal'] });
      toast.success('Wpis usunięty');
    },
    onError: () => toast.error('Nie udało się usunąć wpisu'),
  });

  return (
    <div data-tour="skin-journal" style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px 40px' }}>
      {/* Header */}
      <div className="journal-header">
        <div className="journal-header-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #B8913A, #d4a84b)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen size={22} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--font-heading, serif)', fontSize: 20, color: '#1A1208', margin: 0, fontWeight: 700 }}>
              Dziennik Kosmetologa
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 13, color: '#999', margin: 0 }}>Twój osobisty dziennik pielęgnacji</p>
              {streak > 0 && (
                <span className="journal-streak" style={{ background: streak >= 7 ? '#fef3c7' : '#fdf6ec', border: `1px solid ${streak >= 7 ? '#fcd34d' : '#e8d5a0'}`, color: streak >= 7 ? '#d97706' : '#B8913A' }}>
                  🔥 {streak} {streak === 1 ? 'dzień' : 'dni'}
                </span>
              )}
            </div>
          </div>
        </div>
        {!showForm && (
          <div className="journal-header-buttons">
            <button
              onClick={() => setShowSummary(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 16px', background: '#fdf6ec', color: '#B8913A', border: '1px solid #e8d5a0', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              Podsumowanie
            </button>
            <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 16px', background: '#B8913A', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              <Plus size={16} /> Nowy wpis
            </button>
          </div>
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
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true" className="mx-auto mb-3 opacity-40">
            <rect x="10" y="6" width="28" height="36" rx="3" stroke="#C4A882" strokeWidth="1.5"/>
            <path d="M16 16h16M16 22h16M16 28h10" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M10 12h4V6" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
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

      {showSummary && <SummaryModal onClose={() => setShowSummary(false)} />}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .journal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          padding-top: 8px;
          gap: 12px;
        }
        .journal-header-buttons {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .journal-streak {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
        }
        .journal-entry-card {
          background: #fff;
          border: 1px solid #e5e0d8;
          border-radius: 14px;
          padding: 18px 20px;
        }
        .journal-admin-card {
          background: #fff;
          border: 2px solid rgba(26,18,8,0.15);
          border-radius: 14px;
          padding: 18px 20px;
        }
        .journal-form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        @media (max-width: 600px) {
          .journal-header {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          .journal-header-left {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .journal-header-buttons {
            display: flex;
            gap: 8px;
          }
          .journal-header-buttons button {
            flex: 1;
            min-width: 0 !important;
          }
          .journal-entry-card,
          .journal-admin-card {
            padding: 14px 14px;
          }
          .journal-form-actions {
            flex-direction: column-reverse;
          }
          .journal-form-actions button {
            width: 100%;
          }
          .journal-streak {
            align-self: flex-start;
            margin-top: 2px;
          }
        }
      `}</style>
    </div>
  );
}
