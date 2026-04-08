import { useQuery } from '@tanstack/react-query';
import { recommendationsApi, type RecommendationGroup } from '@/api/recommendations.api';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-gray-100 animate-pulse rounded ${className}`} />
);

interface Props {
  userId: string;
}

export function DrawerProductsTab({ userId }: Props) {
  const { data: groups, isLoading, isError, refetch } = useQuery<RecommendationGroup[]>({
    queryKey: ['recommendations', 'user', userId],
    queryFn: () => recommendationsApi.getByUser(userId),
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) return (
    <div className="space-y-2 p-3">
      {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
    </div>
  );

  if (isError) return (
    <div className="p-3 text-sm text-red-600">
      Błąd ładowania produktów.
      <button onClick={() => refetch()} className="ml-2 underline">Spróbuj ponownie</button>
    </div>
  );

  const allGroups = groups ?? [];

  if (allGroups.length === 0) return (
    <p className="p-3 text-xs text-gray-400 text-center py-4">Brak poleconych produktów.</p>
  );

  return (
    <div className="p-3 space-y-3">
      {allGroups.map((group) => (
        <div key={group.appointmentId}>
          <div className="text-[10px] text-gray-400 mb-1">
            {group.serviceName} · {format(new Date(group.appointmentDate), 'd MMM yyyy', { locale: pl })}
          </div>
          {group.recommendations.map((rec) => (
            <div key={rec.id} className="border border-gray-100 rounded p-2 mb-1 text-xs">
              <div className="font-medium">{rec.name}</div>
              {rec.comment && <div className="text-gray-500">{rec.comment}</div>}
              <div className="text-gray-400 mt-0.5">
                Polecił/a: {rec.addedBy?.name}
                {rec.pickedUp && <span className="ml-2 text-green-600">✓ odebrane</span>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
