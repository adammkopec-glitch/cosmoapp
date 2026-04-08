import { useQuery } from '@tanstack/react-query';
import { skinJournalApi } from '@/api/skin-journal.api';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-gray-100 animate-pulse rounded ${className}`} />
);

const MOOD_EMOJI = ['', '😔', '😕', '😐', '🙂', '😊'];

interface Props {
  userId: string;
}

export function DrawerJournalTab({ userId }: Props) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['skinJournal', 'admin', userId],
    queryFn: () => skinJournalApi.adminGetJournal(userId, 1),
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) return (
    <div className="space-y-2 p-3">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  );

  if (isError) return (
    <div className="p-3 text-sm text-red-600">
      Błąd ładowania dziennika.
      <button onClick={() => refetch()} className="ml-2 underline">Spróbuj ponownie</button>
    </div>
  );

  const entries = data?.entries ?? [];

  return (
    <div className="p-3 space-y-2">
      <Link
        to={`/admin/uzytkownicy/${userId}?tab=dziennik`}
        className="text-xs text-indigo-600 hover:underline block mb-2"
      >
        Otwórz pełny dziennik ↗
      </Link>
      {entries.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">Brak wpisów w dzienniku.</p>
      )}
      {entries.map((entry) => (
        <div key={entry.id} className="border border-gray-100 rounded p-2 text-xs">
          <div className="flex justify-between">
            <span className="font-medium">
              {format(new Date(entry.date), 'd MMM yyyy', { locale: pl })}
            </span>
            {entry.mood && <span>{MOOD_EMOJI[entry.mood]}</span>}
          </div>
          {entry.notes && (
            <div className="text-gray-500 mt-0.5 line-clamp-2">{entry.notes}</div>
          )}
          {entry.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {entry.tags.map((t: string) => (
                <span key={t} className="bg-gray-100 rounded px-1.5 py-0.5 text-[10px]">{t}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
