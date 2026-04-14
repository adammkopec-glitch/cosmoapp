import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, addDays, startOfMonth, addMonths, subMonths, getDaysInMonth, getDay, isBefore, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Plus, X, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { appointmentsApi } from '@/api/appointments.api';
import { employeesApi } from '@/api/employees.api';
import { reviewsApi } from '@/api/reviews.api';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { AppointmentListSkeleton } from '@/components/skeletons';
import { FollowUpReminderWidget } from '@/components/appointments/FollowUpReminderWidget';
import { ReviewForm } from '@/components/reviews/ReviewForm';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekująca',
  CONFIRMED: 'Potwierdzona',
  CANCELLED: 'Anulowana',
  COMPLETED: 'Zakończona',
};

const STATUS_STYLES: Record<string, { background: string; color: string; borderLeft: string }> = {
  PENDING:   { background: 'rgba(184,145,58,0.12)',  color: '#92400E', borderLeft: '3px solid #92400E' },
  CONFIRMED: { background: 'rgba(34,197,94,0.12)',   color: '#15803D', borderLeft: '3px solid #15803D' },
  CANCELLED: { background: 'rgba(239,68,68,0.12)',   color: '#DC2626', borderLeft: '3px solid #DC2626' },
  COMPLETED: { background: 'rgba(184,145,58,0.1)',   color: '#B8913A', borderLeft: '3px solid #B8913A' },
};

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

export const UserAppointments = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', 'me'],
    queryFn: appointmentsApi.getMy,
  });

  const { data: pendingReviews = [] } = useQuery({
    queryKey: ['reviews-pending'],
    queryFn: reviewsApi.getPending,
  });

  useEffect(() => {
    if (!socket) return;
    const handler = () => queryClient.invalidateQueries({ queryKey: ['appointments', 'me'] });
    socket.on('appointment:updated', handler);
    socket.on('appointment:created', handler);
    socket.on('appointment:deleted', handler);
    return () => {
      socket.off('appointment:updated', handler);
      socket.off('appointment:created', handler);
      socket.off('appointment:deleted', handler);
    };
  }, [socket, queryClient]);

  const upcoming = appointments.filter(
    (a: any) => a.status === 'PENDING' || a.status === 'CONFIRMED'
  );
  const past = appointments.filter(
    (a: any) => a.status === 'CANCELLED' || a.status === 'COMPLETED'
  );

  if (isLoading) return <AppointmentListSkeleton count={3} />;

  return (
    <div className="space-y-8 animate-enter" data-tour="appointments-list">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold" style={{ color: '#1A1208' }}>
          Moje Wizyty
        </h1>
        <Link
          to="/rezerwacja"
          className="inline-flex items-center gap-1.5 py-2.5 px-5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: '#1A1208', color: '#fff' }}
        >
          <Plus size={16} /> Umów wizytę
        </Link>
      </div>

      <FollowUpReminderWidget />

      {appointments.length === 0 && (
        <div
          className="rounded-[24px] p-10 text-center space-y-5"
          style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
        >
          <div
            className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
            style={{ background: 'rgba(184,145,58,0.1)' }}
          >
            <CalendarDays size={36} style={{ color: '#B8913A' }} />
          </div>
          <div>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true" className="mx-auto mb-3 opacity-40">
              <rect x="8" y="12" width="32" height="28" rx="3" stroke="#C4A882" strokeWidth="1.5"/>
              <path d="M8 20h32" stroke="#C4A882" strokeWidth="1.5"/>
              <path d="M16 8v8M32 8v8" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M17 30h4M27 30h4M17 36h4" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <h3 className="font-heading font-bold text-xl mb-2" style={{ color: '#1A1208' }}>
              Twoja historia zaczyna się teraz
            </h3>
            <p className="text-sm" style={{ color: 'rgba(26,18,8,0.55)' }}>
              Umów pierwszą wizytę i odkryj pełne możliwości COSMO — śledzenie serii zabiegowych, punkty lojalnościowe i wiele więcej.
            </p>
          </div>
          <Link
            to="/rezerwacja"
            className="inline-flex items-center gap-2 py-3 px-8 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: '#1A1208', color: '#fff' }}
          >
            <Plus size={16} /> Umów pierwszą wizytę
          </Link>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold" style={{ color: '#1A1208' }}>Nadchodzące wizyty</h2>
          <div className="grid gap-4">
            {upcoming.map((a: any) => (
              <AppointmentCard key={a.id} appointment={a} hasPendingReview={pendingReviews.some((p) => p.id === a.id)} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold" style={{ color: 'rgba(26,18,8,0.5)' }}>Historia</h2>
          <div className="grid gap-4 opacity-75">
            {past.map((a: any) => (
              <AppointmentCard key={a.id} appointment={a} hasPendingReview={pendingReviews.some((p) => p.id === a.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

function AppointmentCard({ appointment: a, hasPendingReview }: { appointment: any; hasPendingReview: boolean }) {
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const canReschedule = a.status === 'PENDING' || a.status === 'CONFIRMED';
  const statusStyle = STATUS_STYLES[a.status] ?? { background: 'rgba(0,0,0,0.06)', color: 'rgba(26,18,8,0.6)' };

  return (
    <>
      <div
        className="rounded-[20px] overflow-hidden"
        style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        {/* Header */}
        <div className="p-5 flex flex-row justify-between items-start gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#B8913A' }}>
              {canReschedule ? 'Nadchodząca wizyta' : 'Przeszła wizyta'}
            </p>
            <h3 className="text-[15px] font-heading font-bold" style={{ color: '#1A1208' }}>
              {a.service?.name}
            </h3>
            {a.service?.price && (() => {
              const base = Number(a.service.price);
              const reward = a.coupon?.reward;
              const discounted = reward ? calcDiscountedPrice(base, reward) : base;
              const hasDiscount = reward && discounted < base;
              return (
                <div className="flex items-center gap-2 flex-wrap">
                  {hasDiscount ? (
                    <>
                      <span className="line-through text-sm" style={{ color: 'rgba(26,18,8,0.4)' }}>
                        {base.toFixed(2)} zł
                      </span>
                      <span className="font-bold text-sm" style={{ color: '#15803D' }}>
                        {discounted.toFixed(2)} zł
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(34,197,94,0.12)', color: '#15803D', border: '1px solid rgba(34,197,94,0.2)' }}
                      >
                        {reward.discountType === 'PERCENTAGE'
                          ? `-${Number(reward.discountValue)}%`
                          : `-${Number(reward.discountValue).toFixed(2)} zł`}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold text-sm" style={{ color: '#B8913A' }}>
                      {base.toFixed(2)} zł
                    </span>
                  )}
                </div>
              );
            })()}
            <p className="text-sm" style={{ color: 'rgba(26,18,8,0.5)' }}>
              {format(new Date(a.date), "EEEE, d MMMM yyyy 'o' HH:mm", { locale: pl })}
            </p>
            {a.employee && (
              <p className="text-sm" style={{ color: 'rgba(26,18,8,0.5)' }}>
                Pracownik:{' '}
                <span className="font-medium" style={{ color: '#1A1208' }}>{a.employee.name}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span
              className="text-[11px] font-bold px-3 py-1.5 rounded-full"
              style={statusStyle}
            >
              {STATUS_LABELS[a.status] ?? a.status}
            </span>
            {canReschedule && (
              <button
                className="text-sm px-4 py-2.5 rounded-xl border transition-colors hover:opacity-80"
                style={{ borderColor: 'rgba(0,0,0,0.15)', color: '#1A1208' }}
                onClick={() => setRescheduleOpen(true)}
                disabled={a.rescheduleStatus === 'PENDING'}
              >
                {a.rescheduleStatus === 'PENDING' ? 'Zmiana w toku...' : 'Zmień termin'}
              </button>
            )}
          </div>
        </div>

        {/* Post-visit CTA */}
        {a.status === 'COMPLETED' && (
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            {reviewOpen ? (
              <div className="p-4">
                <ReviewForm
                  appointmentId={a.id}
                  serviceName={a.service?.name ?? 'Wizyta'}
                  employeeName={a.employee?.name}
                  date={a.date}
                  onDone={() => setReviewOpen(false)}
                />
              </div>
            ) : (
              <div className="px-5 pb-4 pt-3 flex gap-2">
                {hasPendingReview && (
                  <button
                    onClick={() => setReviewOpen(true)}
                    className="flex-1 text-center py-2.5 rounded-full text-[13px] font-semibold border transition-opacity hover:opacity-80"
                    style={{ borderColor: '#B8913A', color: '#B8913A' }}
                  >
                    ★ Oceń wizytę
                  </button>
                )}
                <Link
                  to="/rezerwacja"
                  className="flex-1 text-center py-2.5 rounded-full text-[13px] font-semibold transition-opacity hover:opacity-80"
                  style={{ background: '#1A1208', color: '#fff' }}
                >
                  Rezerwuj znowu
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Details */}
        {(a.rescheduleStatus === 'PENDING' || a.notes || a.allergies || a.problemDescription || a.staffNote || a.photoPath) && (
          <div
            className="px-5 pb-5 space-y-2 text-sm"
            style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
          >
            {a.rescheduleStatus === 'PENDING' && a.rescheduleDate && (
              <p
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 mt-3"
                style={{ color: '#1D4ED8', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}
              >
                <span>⏳</span>
                <span>
                  Oczekuje na zmianę terminu na:{' '}
                  <strong>{format(new Date(a.rescheduleDate), "d MMMM yyyy 'o' HH:mm", { locale: pl })}</strong>
                </span>
              </p>
            )}
            {a.notes && (
              <p className="border-t pt-3 italic" style={{ color: 'rgba(26,18,8,0.55)', borderColor: 'rgba(0,0,0,0.06)' }}>
                Uwagi: {a.notes}
              </p>
            )}
            {a.allergies && (
              <p style={{ color: '#D97706' }}>⚠ Alergie: {a.allergies}</p>
            )}
            {a.problemDescription && (
              <p style={{ color: 'rgba(26,18,8,0.6)' }}>Opis: {a.problemDescription}</p>
            )}
            {a.staffNote && (
              <p className="border-t pt-3" style={{ borderColor: 'rgba(0,0,0,0.06)', color: 'rgba(26,18,8,0.55)' }}>
                Notatka po wizycie:{' '}
                <span style={{ color: '#1A1208' }}>{a.staffNote}</span>
              </p>
            )}
            {a.photoPath && (
              <div className="border-t pt-3" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                <img
                  src={a.photoPath}
                  alt="Zdjęcie do wizyty"
                  className="w-24 h-24 object-cover rounded-lg"
                  style={{ border: '1px solid rgba(0,0,0,0.1)' }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {rescheduleOpen && (
        <RescheduleModal
          appointment={a}
          open={rescheduleOpen}
          onClose={() => setRescheduleOpen(false)}
        />
      )}
    </>
  );
}

// ─── RescheduleCalendar ───────────────────────────────────────────────────────

type DayStatus = 'off' | 'none' | 'partial' | 'available';

const DAY_DOT: Record<DayStatus, string> = {
  off: '',
  none: '',
  partial: 'bg-yellow-400',
  available: 'bg-green-500',
};

function RescheduleCalendar({
  serviceId,
  employeeId,
  selected,
  onSelect,
}: {
  serviceId: string;
  employeeId?: string | null;
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const today = startOfDay(new Date());
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(addDays(today, 1)));

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth() + 1;

  const { data: availability = {}, isFetching } = useQuery<Record<string, DayStatus>>({
    queryKey: ['month-availability', year, month, serviceId, employeeId],
    queryFn: () => employeesApi.getMonthAvailability(year, month, serviceId, employeeId),
  });

  const daysInMonth = getDaysInMonth(viewMonth);
  const firstDow = (getDay(viewMonth) + 6) % 7;
  const DAY_NAMES = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button
          className="p-1 rounded hover:bg-accent disabled:opacity-30"
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          disabled={viewMonth <= startOfMonth(today)}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold capitalize">
          {format(viewMonth, 'LLLL yyyy', { locale: pl })}
          {isFetching && <span className="ml-2 text-xs opacity-50">...</span>}
        </span>
        <button
          className="p-1 rounded hover:bg-accent"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((n) => (
          <div key={n} className="text-center text-[10px] font-medium text-muted-foreground py-1">
            {n}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const dayDate = new Date(Date.UTC(year, month - 1, dayNum));
          const isPast = isBefore(dayDate, today);
          const status = availability[dateStr] as DayStatus | undefined;
          const isDisabled = isPast || status === 'off' || status === 'none';
          const isSelected = selected === dateStr;
          const dotClass = status ? DAY_DOT[status] : '';

          return (
            <div key={dayNum} className="flex justify-center">
              <button
                disabled={isDisabled}
                onClick={() => onSelect(dateStr)}
                className="relative flex flex-col items-center justify-center w-9 h-9 rounded-full text-sm transition-colors"
                style={
                  isSelected
                    ? { background: '#1A1208', color: '#fff' }
                    : isDisabled
                    ? { color: 'rgba(26,18,8,0.25)', cursor: 'not-allowed' }
                    : { cursor: 'pointer' }
                }
                onMouseEnter={(e) => {
                  if (!isSelected && !isDisabled) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected && !isDisabled) {
                    (e.currentTarget as HTMLButtonElement).style.background = '';
                  }
                }}
              >
                <span>{dayNum}</span>
                {!isPast && dotClass && (
                  <span className={`absolute bottom-1 w-1 h-1 rounded-full ${dotClass}`} />
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> wolny</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> częściowo</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground/30 inline-block" /> brak slotów</span>
      </div>
    </div>
  );
}

// ─── Reschedule Modal ─────────────────────────────────────────────────────────

function RescheduleModal({
  appointment,
  onClose,
}: {
  appointment: any;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const { data: slots = [], isFetching } = useQuery({
    queryKey: ['availability', selectedDate, appointment.serviceId, appointment.employeeId],
    queryFn: () =>
      employeesApi.getAvailability(selectedDate!, appointment.serviceId, appointment.employeeId),
    enabled: !!selectedDate,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const iso = `${selectedDate}T${selectedTime}:00`;
      return appointmentsApi.requestReschedule(appointment.id, iso);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'me'] });
      toast.success('Wniosek o zmianę terminu został wysłany');
      onClose();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Błąd podczas wysyłania wniosku'),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md p-6 space-y-5"
        style={{
          background: '#FDFAF6',
          borderRadius: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-lg" style={{ color: '#1A1208' }}>
            Zmień termin wizyty
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors hover:opacity-70"
            style={{ color: 'rgba(26,18,8,0.5)' }}
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-sm" style={{ color: 'rgba(26,18,8,0.55)' }}>
          Aktualny termin:{' '}
          <strong style={{ color: '#1A1208' }}>
            {format(new Date(appointment.date), "d MMMM yyyy 'o' HH:mm", { locale: pl })}
          </strong>
        </p>

        <div>
          <label className="text-xs block mb-2" style={{ color: 'rgba(26,18,8,0.5)' }}>
            Wybierz nową datę
          </label>
          <RescheduleCalendar
            serviceId={appointment.serviceId}
            employeeId={appointment.employeeId}
            selected={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              setSelectedTime(null);
            }}
          />
        </div>

        {selectedDate && (
          <div>
            <label className="text-xs block mb-2" style={{ color: 'rgba(26,18,8,0.5)' }}>
              Dostępne godziny
              {isFetching && <span className="ml-2 opacity-60">Ładowanie...</span>}
            </label>
            {!isFetching && slots.length === 0 && (
              <p className="text-sm" style={{ color: 'rgba(26,18,8,0.5)' }}>Brak godzin pracy w tym dniu.</p>
            )}
            {!isFetching && slots.length > 0 && slots.every((s) => !s.available) && (
              <p className="text-sm" style={{ color: 'rgba(26,18,8,0.5)' }}>Wszystkie terminy w tym dniu są zajęte.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <button
                  key={s.time}
                  disabled={!s.available}
                  onClick={() => s.available && setSelectedTime(s.time)}
                  className="text-sm px-3 py-1.5 rounded-lg border transition-colors"
                  style={
                    !s.available
                      ? { background: 'rgba(239,68,68,0.06)', color: '#DC2626', borderColor: 'rgba(239,68,68,0.2)', cursor: 'not-allowed', opacity: 0.7 }
                      : selectedTime === s.time
                      ? { background: '#1A1208', color: '#fff', borderColor: '#1A1208' }
                      : { borderColor: 'rgba(0,0,0,0.15)', color: '#1A1208' }
                  }
                >
                  {s.time}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>
            Anuluj
          </Button>
          <Button
            size="sm"
            disabled={!selectedDate || !selectedTime || isPending}
            onClick={() => mutate()}
            style={{ background: '#1A1208', color: '#fff', borderRadius: 20 }}
          >
            {isPending ? 'Wysyłam...' : 'Potwierdź zmianę'}
          </Button>
        </div>
      </div>
    </div>
  );
}
