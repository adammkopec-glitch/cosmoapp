import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/hooks/useSocket';
import { useNotificationStore } from '@/store/notification.store';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isSameDay,
  getHours,
  getMinutes,
} from 'date-fns';
import type { TimeBlock, WeeklyScheduleEntry, WorkDay } from '@/api/employees.api';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar, List, X } from 'lucide-react';
import { toast } from 'sonner';

import { appointmentsApi } from '@/api/appointments.api';
import { employeesApi } from '@/api/employees.api';
import { servicesApi } from '@/api/services.api';
import happyHoursApi from '@/api/happy-hours.api';
import { Button } from '@/components/ui/button';
import { HomecareRoutinePanel } from '@/components/homecare/HomecareRoutinePanel';

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

// ─── Calendar constants ────────────────────────────────────────────────────────

const APT_STATUS_STYLE: Record<string, string> = {
  PENDING:   'bg-amber-100 border-amber-400 text-amber-900',
  CONFIRMED: 'bg-green-200 border-green-500 text-green-900',
  CANCELLED: 'bg-gray-100  border-gray-400  text-gray-500 opacity-70',
  COMPLETED: 'bg-purple-100 border-purple-400 text-purple-900',
};

const APT_STATUS_LABEL: Record<string, string> = {
  PENDING:   'Oczekująca',
  CONFIRMED: 'Potwierdzona',
  CANCELLED: 'Anulowana',
  COMPLETED: 'Zakończona',
};

const CALENDAR_START = 7;
const CALENDAR_END = 21;
const SLOT_H = 56; // px per 30 min

const EMPLOYEE_PALETTE = [
  { bg: 'bg-blue-100',   border: 'border-blue-400',   text: 'text-blue-900' },
  { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-900' },
  { bg: 'bg-rose-100',   border: 'border-rose-400',   text: 'text-rose-900' },
  { bg: 'bg-amber-100',  border: 'border-amber-400',  text: 'text-amber-900' },
  { bg: 'bg-teal-100',   border: 'border-teal-400',   text: 'text-teal-900' },
];

// ─── Add Appointment Modal ────────────────────────────────────────────────────

function AddAppointmentModal({
  slot,
  employees,
  services,
  onClose,
}: {
  slot: { date: Date; hour: number; minute: number };
  employees: any[];
  services: any[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const defaultTime = `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`;

  const [form, setForm] = useState({
    time: defaultTime,
    employeeId: '',
    serviceId: services[0]?.id ?? '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    notes: '',
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const [h, m] = form.time.split(':');
      const date = new Date(slot.date);
      date.setHours(Number(h), Number(m), 0, 0);
      return appointmentsApi.createAdmin({
        clientName: form.clientName,
        clientPhone: form.clientPhone,
        clientEmail: form.clientEmail || undefined,
        serviceId: form.serviceId,
        employeeId: form.employeeId || undefined,
        date: date.toISOString(),
        notes: form.notes || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Wizyta dodana');
      onClose();
    },
    onError: () => toast.error('Błąd podczas dodawania wizyty'),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-lg">Dodaj wizytę</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X size={16} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Data</label>
            <input
              readOnly
              value={format(slot.date, 'dd.MM.yyyy', { locale: pl })}
              className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-muted"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Godzina</label>
            <input
              type="time"
              value={form.time}
              onChange={(e) => set('time', e.target.value)}
              className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Pracownik</label>
          <select
            value={form.employeeId}
            onChange={(e) => set('employeeId', e.target.value)}
            className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">— brak —</option>
            {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Zabieg</label>
          <select
            value={form.serviceId}
            onChange={(e) => set('serviceId', e.target.value)}
            className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Imię i nazwisko klientki *</label>
          <input
            value={form.clientName}
            onChange={(e) => set('clientName', e.target.value)}
            className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="np. Anna Kowalska"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Telefon *</label>
            <input
              value={form.clientPhone}
              onChange={(e) => set('clientPhone', e.target.value)}
              className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="+48 123 456 789"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email (opcjonalny)</label>
            <input
              type="email"
              value={form.clientEmail}
              onChange={(e) => set('clientEmail', e.target.value)}
              className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="anna@example.com"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Notatki</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={2}
            className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Anuluj</Button>
          <Button
            size="sm"
            disabled={isPending || !form.clientName || !form.clientPhone || !form.serviceId}
            onClick={() => mutate()}
          >
            {isPending ? 'Zapisuję...' : 'Dodaj wizytę'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Appointment Detail Modal ─────────────────────────────────────────────────

function AppointmentDetailModal({ apt, onClose }: { apt: any; onClose: () => void }) {
  const qc = useQueryClient();

  const { mutate: deleteMutate, isPending: isDeleting } = useMutation({
    mutationFn: () => appointmentsApi.remove(apt.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Wizyta usunięta');
      onClose();
    },
    onError: () => toast.error('Błąd podczas usuwania wizyty'),
  });

  const { mutate: approveMutate, isPending: isApproving } = useMutation({
    mutationFn: () => appointmentsApi.approveReschedule(apt.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Zmiana terminu zatwierdzona');
      onClose();
    },
    onError: () => toast.error('Błąd podczas zatwierdzania'),
  });

  const { mutate: rejectMutate, isPending: isRejecting } = useMutation({
    mutationFn: () => appointmentsApi.rejectReschedule(apt.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Zmiana terminu odrzucona');
      onClose();
    },
    onError: () => toast.error('Błąd podczas odrzucania'),
  });

  const handleDelete = () => {
    if (window.confirm('Na pewno usunąć tę wizytę?')) deleteMutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-lg">Szczegóły wizyty</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X size={16} /></button>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Data i godzina</span>
            <span className="font-medium">{format(new Date(apt.date), 'dd.MM.yyyy HH:mm', { locale: pl })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Zabieg</span>
            <span className="font-medium">{apt.service?.name}</span>
          </div>
          {apt.service?.durationMinutes && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Czas trwania</span>
              <span>{apt.service.durationMinutes} min</span>
            </div>
          )}
          {apt.service?.price && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Cena</span>
              <PriceDisplay service={apt.service} coupon={apt.coupon} />
            </div>
          )}
          {apt.employee && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pracownik</span>
              <span>{apt.employee.name}</span>
            </div>
          )}
          <hr className="border-border" />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Klientka</span>
            <span className="font-medium">{apt.user?.name}</span>
          </div>
          {apt.user?.email && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{apt.user.email}</span>
            </div>
          )}
          {apt.user?.phone && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Telefon</span>
              <span>{apt.user.phone}</span>
            </div>
          )}
          {apt.allergies && (
            <div className="flex justify-between">
              <span className="text-muted-foreground text-orange-600">Alergie</span>
              <span className="text-orange-600">{apt.allergies}</span>
            </div>
          )}
          {apt.notes && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Notatki</span>
              <span className="italic">{apt.notes}</span>
            </div>
          )}
          <hr className="border-border" />
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status</span>
            <StatusSelect appointmentId={apt.id} current={apt.status} />
          </div>
          {apt.rescheduleStatus === 'PENDING' && apt.rescheduleDate && (
            <>
              <hr className="border-border" />
              <div className="space-y-3">
                <p className="text-sm font-semibold">Zmiana terminu</p>
                <p className="text-sm">
                  Klient prosi o zmianę na:{' '}
                  <strong>
                    {format(new Date(apt.rescheduleDate), 'dd.MM.yyyy HH:mm', { locale: pl })}
                  </strong>
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={isApproving || isRejecting}
                    onClick={() => approveMutate()}
                  >
                    {isApproving ? 'Zatwierdzam...' : 'Zatwierdź'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={isApproving || isRejecting}
                    onClick={() => rejectMutate()}
                  >
                    {isRejecting ? 'Odrzucam...' : 'Odrzuć'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? 'Usuwam...' : 'Usuń wizytę'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Happy Hour Slot Modal ────────────────────────────────────────────────────

const DAY_NAMES_PL = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

function HappyHourSlotModal({
  slot,
  employees,
  services,
  onClose,
}: {
  slot: { date: Date; hour: number; minute: number };
  employees: any[];
  services: any[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const startDefault = `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`;
  const endHour = slot.minute === 30 ? slot.hour + 1 : slot.hour;
  const endMin = slot.minute === 30 ? 0 : 30;
  const endDefault = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

  const [form, setForm] = useState({
    name: '',
    type: 'ONE_TIME' as 'ONE_TIME' | 'RECURRING',
    startTime: startDefault,
    endTime: endDefault,
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'AMOUNT',
    discountValue: '20',
    isAllEmployees: true,
    isAllServices: true,
    employeeIds: [] as string[],
    serviceIds: [] as string[],
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const toggleId = (field: 'employeeIds' | 'serviceIds', id: string) =>
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter((x) => x !== id)
        : [...prev[field], id],
    }));

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      happyHoursApi.create({
        name: form.name || `Happy Hours ${format(slot.date, 'dd.MM HH:mm', { locale: pl })}`,
        type: form.type,
        date: form.type === 'ONE_TIME' ? format(slot.date, 'yyyy-MM-dd') : null,
        dayOfWeek: form.type === 'RECURRING' ? slot.date.getDay() : null,
        startTime: form.startTime,
        endTime: form.endTime,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        isAllEmployees: form.isAllEmployees,
        isAllServices: form.isAllServices,
        employeeIds: form.isAllEmployees ? [] : form.employeeIds,
        serviceIds: form.isAllServices ? [] : form.serviceIds,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['happy-hours'] });
      toast.success('Happy Hour dodany!');
      onClose();
    },
    onError: () => toast.error('Błąd podczas zapisywania'),
  });

  const inputCls = 'w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-lg">⭐ Nowy Happy Hour</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent"><X size={16} /></button>
        </div>

        {/* Date info */}
        <div className="rounded-lg px-3 py-2 text-sm font-medium" style={{ background: '#fffbeb', border: '1px solid #d97706', color: '#92400E' }}>
          {format(slot.date, 'EEEE, d MMMM yyyy', { locale: pl })}
        </div>

        {/* Typ */}
        <div className="grid grid-cols-2 gap-2">
          {(['ONE_TIME', 'RECURRING'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('type', t)}
              className={`py-1.5 rounded-lg text-sm border font-medium transition-all ${
                form.type === t ? 'bg-amber-100 text-amber-900 border-amber-400' : 'border-input hover:bg-accent'
              }`}
            >
              {t === 'ONE_TIME' ? `Jednorazowy` : `Co ${DAY_NAMES_PL[slot.date.getDay()]}`}
            </button>
          ))}
        </div>

        {/* Nazwa */}
        <div>
          <label className="text-xs text-muted-foreground">Nazwa (opcjonalna)</label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder={`Happy Hours ${format(slot.date, 'dd.MM HH:mm', { locale: pl })}`}
            className={inputCls}
          />
        </div>

        {/* Godziny */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Godzina od</label>
            <input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Godzina do</label>
            <input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} className={inputCls} />
          </div>
        </div>

        {/* Rabat */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Typ rabatu</label>
            <select value={form.discountType} onChange={(e) => set('discountType', e.target.value)} className={inputCls}>
              <option value="PERCENTAGE">Procentowy (%)</option>
              <option value="AMOUNT">Kwotowy (zł)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Wartość</label>
            <input
              type="number" min={0} step={0.01}
              value={form.discountValue}
              onChange={(e) => set('discountValue', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Pracownicy */}
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input type="checkbox" checked={form.isAllEmployees} onChange={(e) => set('isAllEmployees', e.target.checked)} className="rounded" />
            Wszyscy pracownicy
          </label>
          {!form.isAllEmployees && (
            <div className="border rounded-lg p-2 space-y-1 max-h-28 overflow-y-auto">
              {employees.map((emp: any) => (
                <label key={emp.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded px-2 py-1">
                  <input type="checkbox" checked={form.employeeIds.includes(emp.id)} onChange={() => toggleId('employeeIds', emp.id)} className="rounded" />
                  {emp.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Usługi */}
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input type="checkbox" checked={form.isAllServices} onChange={(e) => set('isAllServices', e.target.checked)} className="rounded" />
            Wszystkie usługi
          </label>
          {!form.isAllServices && (
            <div className="border rounded-lg p-2 space-y-1 max-h-28 overflow-y-auto">
              {services.map((svc: any) => (
                <label key={svc.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded px-2 py-1">
                  <input type="checkbox" checked={form.serviceIds.includes(svc.id)} onChange={() => toggleId('serviceIds', svc.id)} className="rounded" />
                  {svc.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Anuluj</Button>
          <Button
            size="sm"
            disabled={isPending || !form.discountValue || parseFloat(form.discountValue) <= 0}
            onClick={() => mutate()}
            style={{ background: '#D97706', color: '#fff' }}
          >
            {isPending ? 'Zapisuję...' : '⭐ Zapisz Happy Hour'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar view (weekly) ───────────────────────────────────────────────────

function CalendarView({ appointments }: { appointments: any[] }) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [filterEmployee, setFilterEmployee] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number; minute: number } | null>(null);
  const [selectedApt, setSelectedApt] = useState<any | null>(null);
  const [hhMode, setHhMode] = useState(false);
  const [hhSlot, setHhSlot] = useState<{ date: Date; hour: number; minute: number } | null>(null);
  const qcMain = useQueryClient();

  const { data: employees = [] } = useQuery({ queryKey: ['employees-pub'], queryFn: employeesApi.getAll });
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: servicesApi.getAll });
  const { data: happyHours = [] } = useQuery<any[]>({ queryKey: ['happy-hours', 'all'], queryFn: happyHoursApi.getAll });

  // Employee schedule queries (only when a specific employee is selected)
  const { data: empWeekly = [] } = useQuery<WeeklyScheduleEntry[]>({
    queryKey: ['employee-weekly-schedule', filterEmployee],
    queryFn: () => employeesApi.getWeeklySchedule(filterEmployee),
    enabled: !!filterEmployee,
  });
  const weekMonthStart = format(weekStart, 'yyyy-MM');
  const weekMonthEnd = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM');
  const { data: empWorkDaysStart = [] } = useQuery<WorkDay[]>({
    queryKey: ['employee-schedule', filterEmployee, weekMonthStart],
    queryFn: () => employeesApi.getSchedule(filterEmployee, weekMonthStart),
    enabled: !!filterEmployee,
  });
  const { data: empWorkDaysEnd = [] } = useQuery<WorkDay[]>({
    queryKey: ['employee-schedule', filterEmployee, weekMonthEnd],
    queryFn: () => employeesApi.getSchedule(filterEmployee, weekMonthEnd),
    enabled: !!filterEmployee && weekMonthEnd !== weekMonthStart,
  });
  const empWorkDays = [...empWorkDaysStart, ...empWorkDaysEnd];

  // All-employees schedule queries (when viewing all employees)
  const allEmpWeeklyResults = useQueries({
    queries: (filterEmployee ? [] : employees as any[]).map((emp: any) => ({
      queryKey: ['employee-weekly-schedule', emp.id],
      queryFn: () => employeesApi.getWeeklySchedule(emp.id),
    })),
  });
  const allEmpWorkDaysStartResults = useQueries({
    queries: (filterEmployee ? [] : employees as any[]).map((emp: any) => ({
      queryKey: ['employee-schedule', emp.id, weekMonthStart],
      queryFn: () => employeesApi.getSchedule(emp.id, weekMonthStart),
    })),
  });
  const allEmpWorkDaysEndResults = useQueries({
    queries: (filterEmployee ? [] : employees as any[]).map((emp: any) => ({
      queryKey: ['employee-schedule', emp.id, weekMonthEnd],
      queryFn: () => employeesApi.getSchedule(emp.id, weekMonthEnd),
      enabled: weekMonthEnd !== weekMonthStart,
    })),
  });

  const allEmployeeSchedules = useMemo(() => {
    if (filterEmployee) return new Map<string, { weekly: WeeklyScheduleEntry[]; workDays: WorkDay[] }>();
    return new Map<string, { weekly: WeeklyScheduleEntry[]; workDays: WorkDay[] }>(
      (employees as any[]).map((emp: any, i: number) => [
        emp.id,
        {
          weekly: (allEmpWeeklyResults[i]?.data as WeeklyScheduleEntry[]) ?? [],
          workDays: [
            ...((allEmpWorkDaysStartResults[i]?.data as WorkDay[]) ?? []),
            ...((allEmpWorkDaysEndResults[i]?.data as WorkDay[]) ?? []),
          ],
        },
      ])
    );
  }, [filterEmployee, employees, allEmpWeeklyResults, allEmpWorkDaysStartResults, allEmpWorkDaysEndResults]);

  const isTimeInBlocks = (hour: number, minute: number, blocks: TimeBlock[]): boolean => {
    const t = hour * 60 + minute;
    return blocks.some((b) => {
      const [bh, bm] = b.start.split(':').map(Number);
      const [eh, em] = b.end.split(':').map(Number);
      return t >= bh * 60 + bm && t < eh * 60 + em;
    });
  };

  const getSlotState = (day: Date, hour: number, minute: number): 'working' | 'off' | 'unknown' => {
    if (!filterEmployee) return 'unknown';
    const override = empWorkDays.find((w) => isSameDay(new Date(w.date), day));
    if (override) {
      if (!override.isWorking) return 'off';
      return isTimeInBlocks(hour, minute, override.timeBlocks ?? []) ? 'working' : 'off';
    }
    const dow = (day.getDay() + 6) % 7;
    const weekly = empWeekly.find((e) => e.dayOfWeek === dow);
    if (weekly) {
      if (!weekly.isWorking) return 'off';
      return isTimeInBlocks(hour, minute, weekly.timeBlocks) ? 'working' : 'off';
    }
    return 'unknown';
  };

  const getWorkingEmployees = (day: Date, hour: number, minute: number): any[] => {
    return (employees as any[]).filter((emp: any) => {
      const sched = allEmployeeSchedules.get(emp.id);
      if (!sched) return false;
      const override = sched.workDays.find((w) => isSameDay(new Date(w.date), day));
      if (override) {
        if (!override.isWorking) return false;
        return isTimeInBlocks(hour, minute, override.timeBlocks ?? []);
      }
      const dow = (day.getDay() + 6) % 7;
      const weekly = sched.weekly.find((e) => e.dayOfWeek === dow);
      if (weekly) {
        if (!weekly.isWorking) return false;
        return isTimeInBlocks(hour, minute, weekly.timeBlocks);
      }
      return false;
    });
  };

  const days = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 }),
  });

  const getHappyHoursForDay = (day: Date): any[] => {
    return (happyHours as any[]).filter((hh) => {
      if (!hh.isActive) return false;
      if (hh.type === 'ONE_TIME') return hh.date && isSameDay(new Date(hh.date), day);
      return hh.dayOfWeek === day.getDay();
    });
  };

  const hhTop = (startTime: string) => {
    const [h, m] = startTime.split(':').map(Number);
    return ((h * 60 + m - CALENDAR_START * 60) / 30) * SLOT_H;
  };

  const hhHeight = (startTime: string, endTime: string) => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    return Math.max((mins / 30) * SLOT_H, SLOT_H / 2);
  };

  const aptTop = (apt: any) => {
    const d = new Date(apt.date);
    const mins = getHours(d) * 60 + getMinutes(d);
    return ((mins - CALENDAR_START * 60) / 30) * SLOT_H;
  };

  const aptHeight = (apt: any) =>
    Math.max((apt.service?.durationMinutes ?? 30) / 30 * SLOT_H, SLOT_H / 2);

  const totalSlots = (CALENDAR_END - CALENDAR_START) * 2;
  const totalHeight = totalSlots * SLOT_H;

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setWeekStart((w) => subWeeks(w, 1))} className="p-1.5 rounded-lg hover:bg-accent border">
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold text-sm">
          {format(weekStart, 'd MMM', { locale: pl })} –{' '}
          {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: pl })}
        </span>
        <button onClick={() => setWeekStart((w) => addWeeks(w, 1))} className="p-1.5 rounded-lg hover:bg-accent border">
          <ChevronRight size={16} />
        </button>
        <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
          Dziś
        </Button>

        <select
          value={filterEmployee}
          onChange={(e) => setFilterEmployee(e.target.value)}
          className="ml-2 text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Wszyscy pracownicy</option>
          {employees.map((emp: any) => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>

        <button
          onClick={() => setHhMode((v) => !v)}
          className="ml-auto px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
          style={
            hhMode
              ? { background: '#D97706', color: '#fff', borderColor: '#D97706' }
              : { borderColor: '#D97706', color: '#92400E', background: 'rgba(217,119,6,0.06)' }
          }
        >
          ⭐ {hhMode ? 'Tryb Happy Hours (aktywny)' : 'Happy Hours'}
        </button>
      </div>

      {hhMode && (
        <div className="rounded-lg px-3 py-2 text-sm" style={{ background: '#fffbeb', border: '1px solid #d97706', color: '#92400E' }}>
          Kliknij wolny slot w kalendarzu, aby dodać Happy Hour na wybrany termin.
        </div>
      )}

      {/* Employee legend */}
      {employees.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {employees.map((emp: any, i: number) => {
            const p = EMPLOYEE_PALETTE[i % EMPLOYEE_PALETTE.length];
            return (
              <span key={emp.id} className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${p.bg} ${p.border} ${p.text}`}>
                <span className={`w-2 h-2 rounded-full inline-block ${p.border} border`} style={{ backgroundColor: 'currentColor' }} />
                {emp.name}
              </span>
            );
          })}
        </div>
      )}

      {/* Slot legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {filterEmployee && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-green-50 border border-green-200 inline-block" />
            Wolny termin
          </span>
        )}
        {!filterEmployee && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-green-50/50 border border-green-200 inline-block" />
            Pracownik dostępny
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-amber-100 border border-amber-400 inline-block" />
          Oczekująca
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-green-200 border border-green-500 inline-block" />
          Potwierdzona
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-purple-100 border border-purple-400 inline-block" />
          Zakończona
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-gray-100 border border-gray-400 inline-block" />
          Anulowana
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-red-100 border border-red-500 inline-block" />
          Prośba o zmianę terminu
        </span>
        {filterEmployee && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded inline-block" style={{ background: 'repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb 2px,transparent 2px,transparent 8px)', border: '1px solid #d1d5db' }} />
            Poza godzinami pracy
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded inline-block" style={{ background: 'rgba(217,119,6,0.15)', border: '1px solid #D97706' }} />
          ⭐ Happy Hours
        </span>
      </div>

      {/* Grid */}
      <div className="overflow-auto rounded-xl border bg-background" style={{ maxHeight: '75vh' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '3.5rem repeat(7, 1fr)', minWidth: 600 }}>

          {/* Header row */}
          <div className="sticky top-0 z-20 bg-background border-b h-10" />
          {days.map((day) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={`sticky top-0 z-20 border-b border-l text-center py-1.5 ${isToday ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
              >
                <p className="text-[10px] font-medium capitalize">{format(day, 'EEE', { locale: pl })}</p>
                <p className="text-sm font-bold">{format(day, 'd')}</p>
              </div>
            );
          })}

          {/* Time axis + day columns */}
          {/* Left axis */}
          <div style={{ height: totalHeight }} className="relative">
            {Array.from({ length: totalSlots }, (_, i) => {
              const hour = CALENDAR_START + Math.floor(i / 2);
              const isHour = i % 2 === 0;
              return (
                <div key={i} style={{ height: SLOT_H }} className="border-b border-border/20 flex items-start justify-end pr-2 pt-0.5">
                  {isHour && <span className="text-[10px] text-muted-foreground">{String(hour).padStart(2, '0')}:00</span>}
                </div>
              );
            })}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayApts = appointments.filter(
              (a) =>
                isSameDay(new Date(a.date), day) &&
                (!filterEmployee || a.employeeId === filterEmployee)
            );

            return (
              <div
                key={day.toISOString()}
                className="relative border-l"
                style={{ height: totalHeight }}
              >
                {/* Clickable slots */}
                {Array.from({ length: totalSlots }, (_, i) => {
                  const hour = CALENDAR_START + Math.floor(i / 2);
                  const minute = i % 2 === 0 ? 0 : 30;

                  if (!filterEmployee) {
                    const workingEmps = getWorkingEmployees(day, hour, minute);
                    return (
                      <div
                        key={i}
                        style={{ height: SLOT_H }}
                        className={`border-b border-border/20 relative flex items-center px-1 cursor-pointer ${
                          hhMode
                            ? 'hover:bg-amber-50'
                            : workingEmps.length > 0
                            ? 'bg-green-50/50 hover:bg-green-100/60'
                            : 'hover:bg-muted/40'
                        }`}
                        onClick={() => {
                          if (hhMode) setHhSlot({ date: day, hour, minute });
                          else setSelectedSlot({ date: day, hour, minute });
                        }}
                      >
                        {workingEmps.length > 0 && (
                          <div className="flex items-center">
                            {workingEmps.slice(0, 5).map((emp: any, ei: number) => (
                              <div
                                key={emp.id}
                                className="w-5 h-5 rounded-full overflow-hidden border-2 border-white flex-shrink-0 first:ml-0 -ml-1.5"
                                style={{ zIndex: workingEmps.length - ei }}
                                title={emp.name}
                              >
                                {emp.avatarPath ? (
                                  <img src={emp.avatarPath} alt={emp.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[7px] font-bold bg-blue-200 text-blue-900">
                                    {emp.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            ))}
                            {workingEmps.length > 5 && (
                              <div className="w-5 h-5 rounded-full bg-muted border-2 border-white flex items-center justify-center text-[7px] font-bold -ml-1.5 flex-shrink-0">
                                +{workingEmps.length - 5}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const state = getSlotState(day, hour, minute);
                  const slotCls =
                    state === 'off'
                      ? 'bg-[repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb_2px,transparent_2px,transparent_8px)] cursor-default'
                      : hhMode
                      ? 'hover:bg-amber-50 cursor-pointer'
                      : state === 'working'
                      ? 'bg-green-50/70 hover:bg-green-100/80 cursor-pointer'
                      : 'hover:bg-muted/40 cursor-pointer';
                  return (
                    <div
                      key={i}
                      style={{ height: SLOT_H }}
                      className={`border-b border-border/20 ${slotCls}`}
                      onClick={() => {
                        if (state === 'off') return;
                        if (hhMode) setHhSlot({ date: day, hour, minute });
                        else setSelectedSlot({ date: day, hour, minute });
                      }}
                    />
                  );
                })}

                {/* Happy Hour blocks */}
                {getHappyHoursForDay(day).map((hh: any) => (
                  <div
                    key={hh.id}
                    style={{
                      position: 'absolute',
                      top: hhTop(hh.startTime),
                      height: hhHeight(hh.startTime, hh.endTime),
                      left: 0,
                      right: 0,
                      background: 'rgba(217,119,6,0.12)',
                      borderLeft: '3px solid #D97706',
                      zIndex: 5,
                      pointerEvents: 'none',
                    }}
                  >
                    <p className="text-[9px] font-bold px-1 pt-0.5 truncate" style={{ color: '#92400E' }}>
                      ⭐ {hh.name}
                    </p>
                    <p className="text-[8px] px-1 truncate" style={{ color: '#B45309' }}>
                      {hh.startTime}–{hh.endTime} ·{' '}
                      {hh.discountType === 'PERCENTAGE' ? `-${hh.discountValue}%` : `-${Number(hh.discountValue).toFixed(0)} zł`}
                    </p>
                  </div>
                ))}

                {/* Appointment blocks */}
                {dayApts.map((apt) => (
                  <div
                    key={apt.id}
                    style={{
                      position: 'absolute',
                      top: aptTop(apt),
                      height: aptHeight(apt),
                      left: 2,
                      right: 2,
                    }}
                    className={`rounded-md border px-1.5 py-1 text-[10px] overflow-hidden cursor-pointer z-10
                      ${apt.rescheduleStatus === 'PENDING'
                        ? 'bg-red-100 border-red-500 text-red-900 ring-1 ring-red-400'
                        : (APT_STATUS_STYLE[apt.status] ?? 'bg-muted border-border')
                      }`}
                    onClick={(e) => { e.stopPropagation(); setSelectedApt(apt); }}
                  >
                    <p className="font-bold leading-tight">{format(new Date(apt.date), 'HH:mm')}</p>
                    <p className="text-[9px] font-semibold leading-tight opacity-80">{APT_STATUS_LABEL[apt.status] ?? apt.status}</p>
                    {apt.rescheduleStatus === 'PENDING' && (
                      <p className="text-[8px] font-bold text-red-700 leading-tight">⟳ zmiana</p>
                    )}
                    <p className="truncate font-medium leading-tight">{apt.service?.name}</p>
                    {apt.service?.price && (() => {
                      const base = Number(apt.service.price);
                      const reward = apt.coupon?.reward;
                      const discounted = reward ? calcDiscountedPrice(base, reward) : base;
                      return reward && discounted < base ? (
                        <p className="truncate leading-tight font-semibold opacity-90">
                          <span className="line-through opacity-60">{base.toFixed(0)}</span>{' '}
                          {discounted.toFixed(0)} zł
                        </p>
                      ) : (
                        <p className="truncate leading-tight font-semibold opacity-90">{base.toFixed(2)} zł</p>
                      );
                    })()}
                    <p className="truncate opacity-75 leading-tight">{apt.user?.name}</p>
                    {apt.employee && <p className="truncate opacity-60 leading-tight">{apt.employee.name}</p>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {selectedSlot && (
        <AddAppointmentModal
          slot={selectedSlot}
          employees={employees}
          services={services}
          onClose={() => setSelectedSlot(null)}
        />
      )}
      {selectedApt && (
        <AppointmentDetailModal
          apt={selectedApt}
          onClose={() => setSelectedApt(null)}
        />
      )}
      {hhSlot && (
        <HappyHourSlotModal
          slot={hhSlot}
          employees={employees}
          services={services}
          onClose={() => { setHhSlot(null); qcMain.invalidateQueries({ queryKey: ['happy-hours'] }); }}
        />
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
        <CalendarView appointments={appointments} />
      )}
    </div>
  );
};
