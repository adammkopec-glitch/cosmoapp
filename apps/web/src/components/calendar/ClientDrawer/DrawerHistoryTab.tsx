import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appointmentsApi } from '@/api/appointments.api';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-gray-100 animate-pulse rounded ${className}`} />
);

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekująca',
  CONFIRMED: 'Potwierdzona',
  COMPLETED: 'Zrealizowana',
  CANCELLED: 'Anulowana',
};

interface Props {
  userId: string;
}

export function DrawerHistoryTab({ userId }: Props) {
  const [page, setPage] = useState(1);
  const LIMIT = 5;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['appointments', 'user', userId, page],
    queryFn: () => appointmentsApi.getAll({ userId, limit: LIMIT, page }),
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) return (
    <div className="space-y-2 p-3">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  );

  if (isError) return (
    <div className="p-3 text-sm text-red-600">
      Błąd ładowania historii.
      <button onClick={() => refetch()} className="ml-2 underline">Spróbuj ponownie</button>
    </div>
  );

  const appointments: any[] = data ?? [];

  return (
    <div className="p-3 space-y-2">
      {appointments.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">Brak historii wizyt.</p>
      )}
      {appointments.map((appt: any) => (
        <div key={appt.id} className="border border-gray-100 rounded p-2 text-xs">
          <div className="font-medium">{appt.service?.name}</div>
          <div className="text-gray-500">
            {format(new Date(appt.date), 'd MMM yyyy, HH:mm', { locale: pl })}
          </div>
          <div className="text-gray-400">{STATUS_LABELS[appt.status] ?? appt.status}</div>
        </div>
      ))}
      {(page > 1 || appointments.length === LIMIT) && (
        <div className="flex justify-between pt-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-xs text-indigo-600 disabled:opacity-40"
          >
            ← Wstecz
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={appointments.length < LIMIT}
            className="text-xs text-indigo-600 disabled:opacity-40"
          >
            Dalej →
          </button>
        </div>
      )}
    </div>
  );
}
