import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/hooks/useSocket';
import { homecareApi } from '@/api/homecare.api';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Clock, Sun, ShoppingBag, ChevronDown, ChevronUp, Sparkles, Trash2 } from 'lucide-react';

type HomecareRoutineItem = {
  id: string;
  appointmentId: string;
  first48h: string;
  followingDays: string;
  products: string;
  sentAt: string;
  appointment: {
    id: string;
    date: string;
    service: { id: string; name: string };
  };
};

export const HomecareRoutinePage = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: routines = [], isLoading } = useQuery<HomecareRoutineItem[]>({
    queryKey: ['homecare', 'my'],
    queryFn: homecareApi.getMy,
  });

  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    homecareApi.markViewed().catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['homecare-unread'] });
  }, []);

  useEffect(() => {
    if (!isConnected || !socket) return;
    const onNotification = () => {
      queryClient.invalidateQueries({ queryKey: ['homecare', 'my'] });
    };
    socket.on('notification:new', onNotification);
    return () => { socket.off('notification:new', onNotification); };
  }, [isConnected, socket, queryClient]);

  const { mutate: deleteMutate } = useMutation({
    mutationFn: (id: string) => homecareApi.deleteMyRoutine(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['homecare', 'my'] }),
  });

  if (isLoading) {
    return <div className="animate-pulse p-8 text-center text-muted-foreground">Wczytywanie...</div>;
  }

  if (routines.length === 0) {
    return (
      <div className="space-y-6 animate-enter">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">Moja Rutyna</h1>
          <p className="text-sm text-muted-foreground mt-1">Personalizowana pielęgnacja domowa po wizycie</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <Sparkles size={48} className="text-primary/30" />
          <p className="text-muted-foreground">Twoja rutyna pojawi się tutaj po wizycie w salonie</p>
        </div>
      </div>
    );
  }

  const [active, ...history] = routines;

  const formatDate = (dateStr: string) =>
    format(new Date(dateStr), 'd MMMM yyyy', { locale: pl });

  return (
    <div className="space-y-8 animate-enter">
      <div>
        <h1 className="text-2xl font-heading font-bold text-primary">Moja Rutyna</h1>
        <p className="text-sm text-muted-foreground mt-1">Personalizowana pielęgnacja domowa po wizycie</p>
      </div>

      {/* Active routine */}
      <div className="rounded-2xl border p-6 space-y-5" style={{ borderColor: 'rgba(184,145,58,0.2)', background: 'rgba(184,145,58,0.03)' }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-bold text-primary">{active.appointment.service.name}</h2>
            <p className="text-sm text-muted-foreground">{formatDate(active.appointment.date)}</p>
          </div>
          <button
            onClick={() => deleteMutate(active.id)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Usuń rutynę"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <RoutineSection icon={<Clock size={18} />} label="Pierwsze 48 godzin" content={active.first48h} />
          <RoutineSection icon={<Sun size={18} />} label="Kolejne dni" content={active.followingDays} />
          <RoutineSection icon={<ShoppingBag size={18} />} label="Zalecane produkty" content={active.products} />
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Poprzednie rutyny</h3>
          <div className="space-y-2">
            {history.map((r) => {
              const isOpen = expandedId === r.id;
              return (
                <div key={r.id} className="rounded-xl border" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                  <div className="flex items-center">
                    <button
                      className="flex-1 flex items-center justify-between px-4 py-3 text-left min-h-[48px]"
                      onClick={() => setExpandedId(isOpen ? null : r.id)}
                    >
                      <span>
                        <span className="text-sm font-medium">{r.appointment.service.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{formatDate(r.appointment.date)}</span>
                      </span>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button
                      onClick={() => deleteMutate(r.id)}
                      className="px-3 py-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-r-xl"
                      title="Usuń rutynę"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                      <div className="pt-3">
                        <RoutineSection icon={<Clock size={16} />} label="Pierwsze 48 godzin" content={r.first48h} />
                        <RoutineSection icon={<Sun size={16} />} label="Kolejne dni" content={r.followingDays} />
                        <RoutineSection icon={<ShoppingBag size={16} />} label="Zalecane produkty" content={r.products} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

function RoutineSection({ icon, label, content }: { icon: React.ReactNode; label: string; content: string }) {
  if (!content) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#B8913A' }}>
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-[13px] text-foreground/80 whitespace-pre-wrap pl-6" style={{ lineHeight: 1.6 }}>{content}</p>
    </div>
  );
}
