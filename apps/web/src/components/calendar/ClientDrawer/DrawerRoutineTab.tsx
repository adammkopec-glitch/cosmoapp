import { useQuery } from '@tanstack/react-query';
import { appointmentsApi } from '@/api/appointments.api';
import { servicesApi } from '@/api/services.api';
import type { Service } from '@cosmo/shared';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-gray-100 animate-pulse rounded ${className}`} />
);

interface Props {
  userId: string;
}

export function DrawerRoutineTab({ userId }: Props) {
  const { data: lastAppt, isLoading: loadingAppt, isError: errorAppt, refetch: refetchAppt } = useQuery({
    queryKey: ['appointments', 'user', userId, 'lastCompleted'],
    queryFn: () => appointmentsApi.getAll({ userId, status: 'COMPLETED', limit: 1, page: 1 }),
    staleTime: 5 * 60 * 1000,
  });

  const slug: string | undefined = lastAppt?.[0]?.service?.slug;

  const { data: service, isLoading: loadingService, isError: errorService, refetch: refetchService } = useQuery<Service>({
    queryKey: ['service', slug],
    queryFn: () => servicesApi.getOne(slug!),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });

  if (loadingAppt || loadingService) return (
    <div className="space-y-3 p-3">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );

  if (errorAppt || errorService) return (
    <div className="p-3 text-sm text-red-600">
      Błąd ładowania rutyny.
      <button onClick={() => { refetchAppt(); refetchService(); }} className="ml-2 underline">
        Spróbuj ponownie
      </button>
    </div>
  );

  if (!slug) return (
    <p className="p-3 text-xs text-gray-400 text-center py-4">Brak ukończonych wizyt.</p>
  );

  const hasRoutine = service?.routineFirst48h || service?.routineFollowingDays || service?.routineProducts;

  if (!hasRoutine) return (
    <p className="p-3 text-xs text-gray-400 text-center py-4">
      Usługa „{service?.name}" nie ma zdefiniowanej rutyny.
    </p>
  );

  return (
    <div className="p-3 space-y-3 text-sm">
      <div className="text-xs text-gray-400">
        Na podstawie ostatniej usługi: <span className="font-medium text-gray-700">{service?.name}</span>
      </div>
      {service?.routineFirst48h && (
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Pierwsze 48h</div>
          <div className="text-xs text-gray-700 whitespace-pre-wrap">{service.routineFirst48h}</div>
        </div>
      )}
      {service?.routineFollowingDays && (
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Kolejne dni</div>
          <div className="text-xs text-gray-700 whitespace-pre-wrap">{service.routineFollowingDays}</div>
        </div>
      )}
      {service?.routineProducts && (
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Zalecane produkty</div>
          <div className="text-xs text-gray-700 whitespace-pre-wrap">{service.routineProducts}</div>
        </div>
      )}
    </div>
  );
}
