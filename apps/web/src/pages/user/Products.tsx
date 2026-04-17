import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Calendar, Sparkles, Package, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { recommendationsApi, type RecommendationGroup, type AppointmentRecommendation } from '../../api/recommendations.api';
import { toast } from 'sonner';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function RecommendationCard({ rec, appointmentId }: { rec: AppointmentRecommendation; appointmentId: string }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => recommendationsApi.remove(appointmentId, rec.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      toast.success('Usunięto rekomendację');
    },
    onError: () => toast.error('Nie udało się usunąć'),
  });

  return (
    <div className="bg-white border border-[#B8913A]/20 rounded-xl p-4 flex gap-3 min-h-[72px]">
      {/* Product image */}
      <div className="w-16 h-16 rounded-xl bg-gray-50 flex-shrink-0 overflow-hidden border border-gray-100">
        {rec.product?.imagePath ? (
          <img src={rec.product.imagePath} alt={rec.name} className="w-full h-full object-cover" />
        ) : (
          <Package size={24} className="text-gray-200 m-4" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#1A1208] text-sm leading-snug">{rec.name}</p>
            {rec.product?.brand && (
              <p className="eyebrow mt-0.5">{rec.product.brand}</p>
            )}
          </div>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="flex-shrink-0 p-2.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {rec.comment && (
          <p className="text-xs text-gray-600 leading-relaxed mt-1">{rec.comment}</p>
        )}

        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-400">Spec: {rec.addedBy.name}</p>
          {rec.pickedUp ? (
            <span className="inline-flex items-center gap-1 text-xs text-[#B8913A] font-semibold">
              <CheckCircle size={12} /> Odebrano
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <Clock size={12} /> Oczekuje odbioru
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AppointmentGroup({ group }: { group: RecommendationGroup }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-[#B8913A]/10 flex items-center justify-center flex-shrink-0">
          <Calendar size={14} className="text-[#B8913A]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1A1208]">{group.serviceName}</p>
          <p className="text-xs text-gray-500">{formatDate(group.appointmentDate)}</p>
        </div>
      </div>
      <div className="ml-9 flex flex-col gap-2">
        {group.recommendations.map((rec) => (
          <RecommendationCard key={rec.id} rec={rec} appointmentId={group.appointmentId} />
        ))}
      </div>
    </div>
  );
}

function SkeletonGroup() {
  return (
    <div className="mb-6 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-gray-200" />
        <div className="flex flex-col gap-1">
          <div className="h-3.5 bg-gray-200 rounded w-36" />
          <div className="h-3 bg-gray-100 rounded w-24" />
        </div>
      </div>
      <div className="ml-9 flex flex-col gap-2">
        <div className="bg-gray-100 rounded-xl p-4 h-20" />
        <div className="bg-gray-100 rounded-xl p-4 h-16" />
      </div>
    </div>
  );
}

export function UserProducts() {
  const { data: groups, isLoading } = useQuery({
    queryKey: ['recommendations'],
    queryFn: recommendationsApi.getMy,
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-6 pb-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#B8913A]/10 flex items-center justify-center">
            <ShoppingBag size={18} className="text-[#B8913A]" />
          </div>
          <h1 className="font-heading text-xl font-bold text-[#1A1208]">Moje Produkty</h1>
        </div>
        <p className="text-sm text-gray-500 ml-12">
          Rekomendacje od specjalistów po Twoich wizytach
        </p>
      </div>

      <div className="px-4 pt-5">
        {isLoading ? (
          <>
            <SkeletonGroup />
            <SkeletonGroup />
            <SkeletonGroup />
          </>
        ) : !groups || groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#B8913A]/10 flex items-center justify-center mb-4">
              <ShoppingBag size={28} className="text-[#B8913A]/60" />
            </div>
            <h3 className="font-heading text-base font-semibold text-[#1A1208] mb-2">
              Brak rekomendacji
            </h3>
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
              Po Twojej wizycie specjalista może dodać rekomendacje produktów do pielęgnacji domowej
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-[#B8913A]">
              <Sparkles size={14} />
              <span>Zadbaj o siebie między wizytami</span>
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <AppointmentGroup key={group.appointmentId} group={group} />
          ))
        )}
      </div>
    </div>
  );
}
