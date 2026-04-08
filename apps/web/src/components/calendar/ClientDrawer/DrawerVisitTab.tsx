import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { appointmentsApi } from '@/api/appointments.api';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-gray-100 animate-pulse rounded ${className}`} />
);

interface Props {
  appointment: any;
}

export function DrawerVisitTab({ appointment }: Props) {
  const qc = useQueryClient();

  const { data: user, isLoading, isError, refetch } = useQuery({
    queryKey: ['user', appointment.userId],
    queryFn: () => usersApi.getById(appointment.userId),
    staleTime: 2 * 60 * 1000,
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => appointmentsApi.updateStatus(appointment.id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });

  if (isLoading) return (
    <div className="space-y-3 p-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-16 w-full" />
    </div>
  );

  if (isError) return (
    <div className="p-3 text-sm text-red-600">
      Błąd ładowania danych.
      <button onClick={() => refetch()} className="ml-2 underline">Spróbuj ponownie</button>
    </div>
  );

  const hasAllergies = !!(user as any)?.cardAllergies || !!(user as any)?.cardConditions;

  return (
    <div className="p-3 space-y-3 text-sm">
      <div>
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Usługa</div>
        <div className="font-semibold">{appointment.service?.name}</div>
        <div className="text-gray-500">
          {new Date(appointment.date).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
          {' · '}
          {appointment.service?.price} zł
        </div>
      </div>

      {hasAllergies && (
        <div className="bg-red-50 border-l-4 border-red-400 rounded p-2">
          <div className="text-xs font-semibold text-red-600 mb-1">⚠️ Alergie / Schorzenia</div>
          {(user as any)?.cardAllergies && <div className="text-xs text-gray-700">{(user as any).cardAllergies}</div>}
          {(user as any)?.cardConditions && <div className="text-xs text-gray-700">{(user as any).cardConditions}</div>}
        </div>
      )}

      {(user as any)?.cardPreferences && (
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Preferencje</div>
          <div className="text-gray-600 text-xs">{(user as any).cardPreferences}</div>
        </div>
      )}

      {(user as any)?.cardStaffNotes && (
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notatki pracownika</div>
          <div className="text-gray-600 text-xs">{(user as any).cardStaffNotes}</div>
        </div>
      )}

      {appointment.notes && (
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Uwagi do wizyty</div>
          <div className="text-gray-600 text-xs">{appointment.notes}</div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {appointment.status === 'PENDING' && (
          <button
            onClick={() => updateStatus.mutate('CONFIRMED')}
            disabled={updateStatus.isPending}
            className="flex-1 bg-green-600 text-white text-xs py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            ✓ Potwierdź
          </button>
        )}
        {['PENDING', 'CONFIRMED'].includes(appointment.status) && (
          <button
            onClick={() => updateStatus.mutate('COMPLETED')}
            disabled={updateStatus.isPending}
            className="flex-1 bg-indigo-600 text-white text-xs py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            Zrealizowana
          </button>
        )}
        {['PENDING', 'CONFIRMED'].includes(appointment.status) && (
          <button
            onClick={() => updateStatus.mutate('CANCELLED')}
            disabled={updateStatus.isPending}
            className="flex-1 bg-red-500 text-white text-xs py-2 rounded hover:bg-red-600 disabled:opacity-50"
          >
            Anuluj
          </button>
        )}
      </div>
    </div>
  );
}
