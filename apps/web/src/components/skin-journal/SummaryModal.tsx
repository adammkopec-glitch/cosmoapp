import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { skinJournalApi, type JournalSummary } from '@/api/skin-journal.api';

type Range = '30' | '90' | 'all';
type Tab = 'mood' | 'tags' | 'activity' | 'photos';

const MOODS = ['😟', '😕', '😐', '🙂', '😊'];

interface SummaryModalProps {
  userId?: string;
  onClose: () => void;
}

// ─── Mood Tab ────────────────────────────────────────────────────────────────

function MoodTab({ mood }: { mood: JournalSummary['mood'] }) {
  const maxAvg = Math.max(...mood.byWeek.map((w) => w.avg), 1);

  const trendBadge = () => {
    if (!mood.trend) return null;
    const map = { rising: '↑ Rosnący', falling: '↓ Malejący', stable: '→ Stabilny' };
    const colors = { rising: '#059669', falling: '#DC2626', stable: '#B8913A' };
    const bgs = { rising: '#d1fae5', falling: '#fee2e2', stable: '#fdf6ec' };
    return (
      <span style={{ display: 'inline-block', marginTop: 6, padding: '3px 10px', background: bgs[mood.trend], borderRadius: 20, fontSize: 11, color: colors[mood.trend], fontWeight: 600 }}>
        {map[mood.trend]}
      </span>
    );
  };

  return (
    <div>
      {/* Average */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        {mood.average !== null ? (
          <>
            <div style={{ fontSize: 48, fontWeight: 700, color: '#B8913A', lineHeight: 1 }}>{mood.average.toFixed(1)}</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>/ 5 — średni nastrój skóry</div>
            {trendBadge()}
          </>
        ) : (
          <div style={{ fontSize: 14, color: '#999', padding: '20px 0' }}>Brak danych o nastroju w tym okresie</div>
        )}
      </div>

      {/* Weekly bar chart */}
      {mood.byWeek.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Nastrój tygodniowo</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 70 }}>
            {mood.byWeek.map((w) => (
              <div key={w.week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ fontSize: 9, color: '#B8913A', fontWeight: 600 }}>{w.avg.toFixed(1)}</div>
                <div style={{ width: '100%', background: '#B8913A', borderRadius: '3px 3px 0 0', height: `${(w.avg / maxAvg) * 50}px`, minHeight: 4 }} />
                <div style={{ fontSize: 9, color: '#ccc' }}>{w.week.split('-W')[1] ? `T${w.week.split('-W')[1]}` : w.week}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Distribution */}
      <div>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Rozkład nastrojów</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {mood.distribution.map((d, i) => (
            <div key={d.mood} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', background: d.count > 0 ? '#fdf6ec' : '#faf9f7', border: `1px solid ${d.count > 0 ? '#e8d5a0' : '#e5e0d8'}`, borderRadius: 10 }}>
              <div style={{ fontSize: 20 }}>{MOODS[i]}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: d.count > 0 ? '#B8913A' : '#ccc', marginTop: 4 }}>{d.count}</div>
              <div style={{ fontSize: 9, color: '#999' }}>{d.count === 1 ? 'raz' : 'razy'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tags Tab ────────────────────────────────────────────────────────────────

function TagsTab({ tags }: { tags: JournalSummary['tags'] }) {
  if (tags.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 14, color: '#999' }}>Brak tagów w tym okresie</div>;
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {tags.map((t, i) => (
        <span key={t.tag} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: i < 3 ? '#fdf6ec' : '#faf9f7', border: `1px solid ${i < 3 ? '#e8d5a0' : '#e5e0d8'}`, color: i < 3 ? '#B8913A' : '#6B6560' }}>
          {t.tag} <span style={{ fontSize: 11, fontWeight: 400 }}>×{t.count}</span>
        </span>
      ))}
    </div>
  );
}

// ─── Activity Tab ─────────────────────────────────────────────────────────────

function ActivityTab({ activity }: { activity: JournalSummary['activity'] }) {
  const pct = activity.totalDays > 0 ? Math.round((activity.activeDays / activity.totalDays) * 100) : 0;
  const tiles = [
    { label: 'Wpisów', value: String(activity.totalEntries), suffix: '' },
    { label: 'Streak', value: String(activity.currentStreak), suffix: activity.currentStreak > 0 ? ' 🔥' : '' },
    { label: 'Aktywnych dni', value: `${pct}%`, suffix: '' },
    { label: 'Po wizytach', value: String(activity.afterAppointments), suffix: '' },
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {tiles.map((t) => (
          <div key={t.label} style={{ background: '#faf9f7', border: '1px solid #e5e0d8', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1A1208' }}>{t.value}{t.suffix}</div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{t.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 13, color: '#6B6560', textAlign: 'center' }}>
        Najdłuższy streak: <strong>{activity.longestStreak}</strong> {activity.longestStreak === 1 ? 'dzień' : 'dni'}
      </div>
    </div>
  );
}

// ─── Photos Tab ───────────────────────────────────────────────────────────────

function PhotosTab({ photos }: { photos: JournalSummary['photos'] }) {
  if (photos.total === 0) {
    return <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 14, color: '#999' }}>Brak zdjęć w tym okresie</div>;
  }
  return (
    <div>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>{photos.total} {photos.total === 1 ? 'zdjęcie' : 'zdjęć'} łącznie</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
        {photos.paths.map((path, i) => (
          <img key={i} src={path} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function SummaryModal({ userId, onClose }: SummaryModalProps) {
  const [range, setRange] = useState<Range>('30');
  const [tab, setTab] = useState<Tab>('mood');

  const { data, isLoading } = useQuery({
    queryKey: ['journal-summary', userId, range],
    queryFn: () =>
      userId
        ? skinJournalApi.adminGetSummary(userId, range)
        : skinJournalApi.getSummary(range),
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'mood', label: 'Nastrój' },
    { key: 'tags', label: 'Tagi' },
    { key: 'activity', label: 'Aktywność' },
    { key: 'photos', label: 'Zdjęcia' },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 }}
      />

      {/* Modal */}
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, width: '90%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto', background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 16px 60px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1208' }}>Podsumowanie dziennika</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as Range)}
              style={{ padding: '6px 10px', border: '1px solid #e5e0d8', borderRadius: 8, fontSize: 12, color: '#1A1208', background: '#faf9f7' }}
            >
              <option value="30">Ostatnie 30 dni</option>
              <option value="90">Ostatnie 90 dni</option>
              <option value="all">Cała historia</option>
            </select>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B0A89E', padding: 4 }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: 4, background: '#faf9f7', borderRadius: 12, marginBottom: 20 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{ flex: 1, padding: '8px 4px', border: 'none', borderRadius: 8, background: tab === t.key ? '#B8913A' : 'transparent', color: tab === t.key ? '#fff' : '#999', fontSize: 11, fontWeight: tab === t.key ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e5e0d8', borderTopColor: '#B8913A', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : data ? (
          <>
            {tab === 'mood' && <MoodTab mood={data.mood} />}
            {tab === 'tags' && <TagsTab tags={data.tags} />}
            {tab === 'activity' && <ActivityTab activity={data.activity} />}
            {tab === 'photos' && <PhotosTab photos={data.photos} />}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 14, color: '#999' }}>Nie udało się załadować danych</div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
