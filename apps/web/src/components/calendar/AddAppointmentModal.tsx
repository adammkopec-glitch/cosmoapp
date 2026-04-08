import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { appointmentsApi } from '@/api/appointments.api';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onClose: () => void;
  prefillDate?: string;       // ISO date string, e.g. "2026-04-08T00:00:00.000Z"
  prefillTime?: string;       // "HH:MM" e.g. "14:30"
  prefillEmployeeId?: string;
  employees: any[];
  services: any[];
}

export function AddAppointmentModal({
  open,
  onClose,
  prefillDate,
  prefillTime,
  prefillEmployeeId,
  employees,
  services,
}: Props) {
  if (!open) return null;

  // Initialize form state with defaults
  const defaultTime = prefillTime ?? '09:00';
  const defaultDate = prefillDate ? format(new Date(prefillDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  const [form, setForm] = useState({
    date: defaultDate,
    time: defaultTime,
    employeeId: prefillEmployeeId ?? '',
    serviceId: services[0]?.id ?? '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    notes: '',
  });

  const qc = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      // Build the appointment date from form.date (or prefillDate) and form.time
      const [h, m] = form.time.split(':');
      const dateToUse = prefillDate ? new Date(prefillDate) : new Date(form.date);
      dateToUse.setHours(Number(h), Number(m), 0, 0);

      return appointmentsApi.createAdmin({
        clientName: form.clientName,
        clientPhone: form.clientPhone,
        clientEmail: form.clientEmail || undefined,
        serviceId: form.serviceId,
        employeeId: form.employeeId || undefined,
        date: dateToUse.toISOString(),
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

  // Display date: if prefillDate provided, show formatted version; otherwise show the form input value
  const displayDate = prefillDate
    ? format(new Date(prefillDate), 'dd.MM.yyyy', { locale: pl })
    : form.date;

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
            {prefillDate ? (
              <input
                readOnly
                value={displayDate}
                className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-muted"
              />
            ) : (
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            )}
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
