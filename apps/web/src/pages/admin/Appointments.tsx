import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/hooks/useSocket';
import { useNotificationStore } from '@/store/notification.store';
import {
  format,
  isSameDay,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronDown, Calendar, List } from 'lucide-react';
import { toast } from 'sonner';

import { appointmentsApi } from '@/api/appointments.api';
import { servicesApi } from '@/api/services.api';
import { HomecareRoutinePanel } from '@/components/homecare/HomecareRoutinePanel';
import { CalendarView } from '@/components/calendar/CalendarView';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekująca',
  CONFIRMED: 'Potwierdzona',
  CANCELLED: 'Anulowana',
  COMPLETED: 'Zakończona',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  CONFIRMED: 'bg-green-100 text-green-800 border-green-300',
  CANCELLED: 'bg-red-100 text-red-800 border-red-300',
  COMPLETED: 'bg-primary/10 text-primary border-primary/30',
};

const ALL_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const;

// ─── Price helpers ─────────────────────────────────────────────────────────────

function calcDiscountedPrice(price: number, reward: any): number {
  if (!reward) return price;
  if (reward.discountType === 'PERCENTAGE') {
    return Math.max(0, price * (1 - Number(reward.discountValue) / 100));
  }
  if (reward.discountType === 'AMOUNT') {
    return Math.max(0, price - Number(reward.discountValue));
  }
  return price;
}

function PriceDisplay({ service, coupon }: { service: any; coupon?: any }) {
  if (!service?.price) return null;
  const base = Number(service.price);
  const reward = coupon?.reward;
  const discounted = reward ? calcDiscountedPrice(base, reward) : base;
  const hasDiscount = reward && discounted < base;

  return (
    <span className="flex items-center gap-1.5 flex-wrap">
      {hasDiscount ? (
        <>
          <span className="line-through text-muted-foreground text-xs">{base.toFixed(2)} zł</span>
          <span className="font-bold text-green-600 text-xs">{discounted.toFixed(2)} zł</span>
          <span className="text-[10px] bg-green-100 text-green-700 border border-green-300 px-1.5 py-0.5 rounded-full font-medium">
            Kupon: {reward.name}
          </span>
        </>
      ) : (
        <span className="font-bold text-primary text-xs">{base.toFixed(2)} zł</span>
      )}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[status] ?? 'bg-muted'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Status select ────────────────────────────────────────────────────────────

function StatusSelect({ appointmentId, current }: { appointmentId: string; current: string }) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: (status: string) => appointmentsApi.updateStatus(appointmentId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Status zaktualizowany');
    },
    onError: () => toast.error('Błąd aktualizacji statusu'),
  });

  return (
    <select
      value={current}
      disabled={isPending}
      onChange={(e) => mutate(e.target.value)}
      className="text-xs border border-input rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
    >
      {ALL_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

// ─── Appointment card (shared) ────────────────────────────────────────────────

function AppointmentRow({ a, highlighted = false }: { a: any; highlighted?: boolean }) {
  const qc = useQueryClient();
  const { mutate: approveMutate, isPending: isApproving } = useMutation({
    mutationFn: () => appointmentsApi.approveReschedule(a.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); toast.success('Zmiana terminu zatwierdzona'); },
    onError: () => toast.error('Błąd podczas zatwierdzania'),
  });
  const { mutate: rejectMutate, isPending: isRejecting } = useMutation({
    mutationFn: () => appointmentsApi.rejectReschedule(a.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); toast.success('Zmiana terminu odrzucona'); },
    onError: () => toast.error('Błąd podczas odrzucania'),
  });

  const baseClass = a.rescheduleStatus === 'PENDING'
    ? 'bg-red-50 border-red-400'
    : highlighted
      ? 'bg-primary/5 border-primary/40 ring-2 ring-primary/20 animate-pulse'
      : 'bg-background';

  return (
    <div className={`flex flex-col gap-3 p-4 border rounded-xl hover:shadow-sm transition-shadow ${baseClass}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{a.service?.name}</p>
            <PriceDisplay service={a.service} coupon={a.coupon} />
            {a.rescheduleStatus === 'PENDING' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-400">
                🔄 Prośba o zmianę terminu
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {a.user?.name}{' '}
            <span className="opacity-70">({a.user?.email})</span>
            {a.user?.phone && <span className="opacity-70"> · {a.user.phone}</span>}
          </p>
          {a.employee && (
            <p className="text-xs text-muted-foreground">Pracownik: {a.employee.name}</p>
          )}
          {a.allergies && (
            <p className="text-xs text-orange-600">⚠ Alergie: {a.allergies}</p>
          )}
          {a.notes && <p className="text-xs italic text-muted-foreground">Uwagi: {a.notes}</p>}
          {a.rescheduleStatus === 'PENDING' && a.rescheduleDate && (
            <p className="text-xs text-red-700">
              Proponowany termin: <strong>{format(new Date(a.rescheduleDate), 'dd.MM.yyyy HH:mm', { locale: pl })}</strong>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-xs font-medium">
              {format(new Date(a.date), 'dd.MM.yyyy', { locale: pl })}
            </p>
            <p className="text-sm font-bold">{format(new Date(a.date), 'HH:mm')}</p>
          </div>
          <StatusBadge status={a.status} />
          <StatusSelect appointmentId={a.id} current={a.status} />
          {a.rescheduleStatus === 'PENDING' && (
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => approveMutate()}
                disabled={isApproving || isRejecting}
                className="text-xs px-2.5 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {isApproving ? '...' : 'Zatwierdź'}
              </button>
              <button
                onClick={() => rejectMutate()}
                disabled={isApproving || isRejecting}
                className="text-xs px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                {isRejecting ? '...' : 'Odrzuć'}
              </button>
            </div>
          )}
          {a.photoPath && (
            <a
              href={a.photoPath}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary underline hover:no-underline"
            >
              Zdjęcie
            </a>
          )}
        </div>
      </div>
      {(a.status === 'CONFIRMED' || a.status === 'COMPLETED') && (
        <HomecareRoutinePanel appointmentId={a.id} />
      )}
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

function ListView({ appointments }: { appointments: any[] }) {
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterEmployee, setFilterEmployee] = useState<string>('');
  const [showArchive, setShowArchive] = useState(false);
  const { unreadAppointmentIds, markAllRead } = useNotificationStore();

  // Clear highlights when component mounts (user is viewing the page)
  useEffect(() => {
    markAllRead();
  }, []);

  const employees: string[] = Array.from(
    new Set(appointments.filter((a) => a.employee?.name).map((a) => a.employee.name))
  );

  const filtered = appointments.filter(
    (a) =>
      (!filterStatus || a.status === filterStatus) &&
      (!filterEmployee || a.employee?.name === filterEmployee)
  );

  const activeFiltered = filtered.filter((a) => a.status !== 'COMPLETED');
  const archivedFiltered = filtered.filter((a) => a.status === 'COMPLETED');

  const isCompletedFilter = filterStatus === 'COMPLETED';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Wszystkie statusy</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        {employees.length > 0 && (
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Wszyscy pracownicy</option>
            {employees.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}

        <span className="text-sm text-muted-foreground self-center">
          {filtered.length} wizyt
        </span>
      </div>

      {/* Active appointments */}
      {!isCompletedFilter && (
        <div className="space-y-3">
          {activeFiltered.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-xl">
              Brak aktywnych wizyt spełniających kryteria filtrów
            </div>
          ) : (
            activeFiltered.map((a) => (
              <AppointmentRow key={a.id} a={a} highlighted={unreadAppointmentIds.has(a.id)} />
            ))
          )}
        </div>
      )}

      {/* Archive section */}
      {archivedFiltered.length > 0 && (
        <div className="space-y-3">
          {!isCompletedFilter && (
            <button
              onClick={() => setShowArchive((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors w-full py-2 border-t pt-4"
            >
              <ChevronDown
                size={16}
                className={`transition-transform ${showArchive ? 'rotate-0' : '-rotate-90'}`}
              />
              Archiwum ({archivedFiltered.length})
            </button>
          )}

          {(isCompletedFilter || showArchive) && (
            <div className="space-y-3">
              {archivedFiltered.map((a) => (
                <AppointmentRow key={a.id} a={a} highlighted={unreadAppointmentIds.has(a.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* No results at all */}
      {isCompletedFilter && archivedFiltered.length === 0 && (
        <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-xl">
          Brak wizyt spełniających kryteria filtrów
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const AdminAppointments = () => {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const { socket } = useSocket();
  const qc = useQueryClient();

  useEffect(() => {
    if (!socket) return;
    const handler = () => qc.invalidateQueries({ queryKey: ['appointments'] });
    socket.on('appointment:created', handler);
    socket.on('appointment:updated', handler);
    socket.on('appointment:deleted', handler);
    return () => {
      socket.off('appointment:created', handler);
      socket.off('appointment:updated', handler);
      socket.off('appointment:deleted', handler);
    };
  }, [socket, qc]);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.getAll(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.getAll(),
    staleTime: 10 * 60 * 1000,
  });

  const pendingCount = appointments.filter((a: any) => a.status === 'PENDING').length;
  const todayCount = appointments.filter((a: any) =>
    isSameDay(new Date(a.date), new Date())
  ).length;

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-primary">Wizyty</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Oczekujące: <strong>{pendingCount}</strong> · Dzisiaj:{' '}
            <strong>{todayCount}</strong>
          </p>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 border rounded-lg p-1 bg-muted/30">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'list' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
            }`}
          >
            <List size={14} /> Lista
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'calendar' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
            }`}
          >
            <Calendar size={14} /> Terminarz
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground animate-pulse">Ładowanie...</div>
      ) : view === 'list' ? (
        <ListView appointments={appointments} />
      ) : (
        <div className="h-[calc(100vh-120px)]">
          <CalendarView
            appointments={appointments}
            services={services}
            onRefetch={() => qc.invalidateQueries({ queryKey: ['appointments'] })}
          />
        </div>
      )}
    </div>
  );
};
