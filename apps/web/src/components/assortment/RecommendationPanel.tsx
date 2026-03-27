import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, CheckCircle, Clock, Trash2, ShoppingBag } from 'lucide-react';
import { recommendationsApi, type AppointmentRecommendation } from '@/api/recommendations.api';
import { RecommendationModal } from './RecommendationModal';
import { toast } from 'sonner';

interface RecommendationPanelProps {
  appointmentId: string;
}

function RecCard({
  rec,
  appointmentId,
}: {
  rec: AppointmentRecommendation;
  appointmentId: string;
}) {
  const queryClient = useQueryClient();

  const pickupMutation = useMutation({
    mutationFn: () => recommendationsApi.markPickedUp(appointmentId, rec.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations', 'panel', appointmentId] });
      toast.success('Oznaczono jako odebrane');
    },
    onError: () => toast.error('Nie udało się zaktualizować'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => recommendationsApi.remove(appointmentId, rec.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations', 'panel', appointmentId] });
      toast.success('Rekomendacja usunięta');
    },
    onError: () => toast.error('Nie udało się usunąć'),
  });

  return (
    <div className="flex items-start gap-3 p-3 border rounded-xl text-sm">
      <div className="w-10 h-10 rounded-lg bg-gray-50 flex-shrink-0 overflow-hidden">
        {rec.product?.imagePath ? (
          <img src={rec.product.imagePath} alt={rec.name} className="w-full h-full object-cover" />
        ) : (
          <Package size={20} className="text-gray-200 m-2.5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{rec.name}</p>
        {rec.comment && <p className="text-xs text-muted-foreground mt-0.5">{rec.comment}</p>}
        <p className="text-xs text-gray-400 mt-0.5">Spec: {rec.addedBy.name}</p>
        {rec.pickedUp ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium mt-1">
            <CheckCircle size={12} /> Odebrano
          </span>
        ) : (
          <button
            onClick={() => pickupMutation.mutate()}
            disabled={pickupMutation.isPending}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-1 transition-colors disabled:opacity-50"
          >
            <Clock size={12} />
            {pickupMutation.isPending ? 'Aktualizowanie...' : 'Oznacz jako odebrane'}
          </button>
        )}
      </div>
      <button
        onClick={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-50"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export function RecommendationPanel({ appointmentId }: RecommendationPanelProps) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: recs = [], isLoading } = useQuery<AppointmentRecommendation[]>({
    queryKey: ['recommendations', 'panel', appointmentId],
    queryFn: () => recommendationsApi.getForAppointment(appointmentId),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Polecone produkty</p>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
        >
          <ShoppingBag size={12} />
          Poleć produkty
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Ładowanie...</p>
      ) : recs.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Brak rekomendacji dla tej wizyty</p>
      ) : (
        <div className="space-y-2">
          {recs.map((rec) => (
            <RecCard key={rec.id} rec={rec} appointmentId={appointmentId} />
          ))}
        </div>
      )}

      {modalOpen && (
        <RecommendationModal
          appointmentId={appointmentId}
          onClose={() => {
            setModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['recommendations', 'panel', appointmentId] });
          }}
        />
      )}
    </div>
  );
}
