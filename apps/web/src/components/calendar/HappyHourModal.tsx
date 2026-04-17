import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import happyHoursApi from '@/api/happy-hours.api';
import { Button } from '@/components/ui/button';

const DAY_NAMES_PL = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

interface Props {
  open: boolean;
  onClose: () => void;
  prefillDate?: Date;
  prefillHour?: number;
  prefillMinute?: number;
  employees: any[];
  services: any[];
}

export function HappyHourModal({
  open,
  onClose,
  prefillDate,
  prefillHour,
  prefillMinute,
  employees,
  services,
}: Props) {
  if (!open) return null;

  const qc = useQueryClient();
  const effectiveDate = prefillDate ?? new Date();

  // Derive startDefault from prefill values or default to 09:00
  const startDefault = prefillHour !== undefined
    ? `${String(prefillHour).padStart(2, '0')}:${String(prefillMinute ?? 0).padStart(2, '0')}`
    : '09:00';

  // Derive endDefault: add 30 minutes to startDefault
  const [startHour, startMin] = startDefault.split(':').map(Number);
  const endHour = startMin === 30 ? startHour + 1 : startHour;
  const endMin = startMin === 30 ? 0 : 30;
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
    dayOfWeek: effectiveDate.getDay(),
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
        name: form.name || `Happy Hours ${format(effectiveDate, 'dd.MM HH:mm', { locale: pl })}`,
        type: form.type,
        date: form.type === 'ONE_TIME' ? format(effectiveDate, 'yyyy-MM-dd') : null,
        dayOfWeek: form.type === 'RECURRING' ? form.dayOfWeek : null,
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
      qc.invalidateQueries({ queryKey: ['happyHours'] });
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
          {format(effectiveDate, 'EEEE, d MMMM yyyy', { locale: pl })}
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
              {t === 'ONE_TIME' ? `Jednorazowy` : `Co ${DAY_NAMES_PL[form.dayOfWeek]}`}
            </button>
          ))}
        </div>

        {/* Nazwa */}
        <div>
          <label className="text-xs text-muted-foreground">Nazwa (opcjonalna)</label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder={`Happy Hours ${format(effectiveDate, 'dd.MM HH:mm', { locale: pl })}`}
            className={inputCls}
          />
        </div>

        {/* Dzień tygodnia — tylko dla RECURRING */}
        {form.type === 'RECURRING' && (
          <div>
            <label className="text-xs text-muted-foreground">Dzień tygodnia</label>
            <select
              value={form.dayOfWeek}
              onChange={(e) => set('dayOfWeek', Number(e.target.value))}
              className={inputCls}
            >
              {DAY_NAMES_PL.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
          </div>
        )}

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
