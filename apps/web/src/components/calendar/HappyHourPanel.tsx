import { useState, useEffect } from 'react';
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
  prefill: { date: Date; hour: number; minute: number } | null;
  employees: any[];
  services: any[];
}

const defaultForm = () => ({
  name: '',
  type: 'ONE_TIME' as 'ONE_TIME' | 'RECURRING',
  startTime: '09:00',
  endTime: '09:30',
  discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'AMOUNT',
  discountValue: '20',
  isAllEmployees: true,
  isAllServices: true,
  employeeIds: [] as string[],
  serviceIds: [] as string[],
  dayOfWeek: new Date().getDay(),
  effectiveDate: new Date(),
});

export function HappyHourPanel({ open, onClose, prefill, employees, services }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState(defaultForm());

  // Sync form when prefill changes
  useEffect(() => {
    if (!prefill) return;
    const { date, hour, minute } = prefill;
    const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const endHour = minute === 30 ? hour + 1 : hour;
    const endMin = minute === 30 ? 0 : 30;
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
    setForm((f) => ({
      ...f,
      startTime,
      endTime,
      dayOfWeek: date.getDay(),
      effectiveDate: date,
    }));
  }, [prefill]);

  // Reset form when panel closes
  useEffect(() => {
    if (!open) {
      setForm(defaultForm());
    }
  }, [open]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const toggleId = (field: 'employeeIds' | 'serviceIds', id: string) =>
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter((x) => x !== id)
        : [...prev[field], id],
    }));

  const effectiveDate = prefill?.date ?? form.effectiveDate;

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

  const inputCls = 'w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-amber-400';

  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-[51] flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: '#fffbeb' }}>
        <h2 className="font-heading font-bold text-base" style={{ color: '#92400e' }}>✦ Nowy Happy Hour</h2>
        <button onClick={onClose} className="p-1 rounded hover:bg-amber-100"><X size={16} /></button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {!prefill ? (
          /* Hint state */
          <div
            className="rounded-lg px-3 py-4 text-sm text-center"
            style={{ background: '#fffbeb', border: '1px dashed #d97706', color: '#92400e' }}
          >
            <div className="text-lg mb-1">👆</div>
            <div className="font-medium">Kliknij na slot kalendarza</div>
            <div className="text-xs mt-1 text-amber-700">aby wybrać datę i godzinę</div>
          </div>
        ) : (
          /* Form state */
          <>
            {/* Date info */}
            <div className="rounded-lg px-3 py-2 text-sm font-medium" style={{ background: '#fffbeb', border: '1px solid #d97706', color: '#92400e' }}>
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
                  {t === 'ONE_TIME' ? 'Jednorazowy' : `Co ${DAY_NAMES_PL[form.dayOfWeek]}`}
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
            <div className="grid grid-cols-2 gap-2">
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
            <div className="grid grid-cols-2 gap-2">
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
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t bg-white">
        <Button
          className="w-full"
          disabled={!prefill || isPending || !form.discountValue || parseFloat(form.discountValue) <= 0}
          onClick={() => mutate()}
          style={{ background: '#D97706', color: '#fff' }}
        >
          {isPending ? 'Zapisuję...' : '⭐ Zapisz Happy Hour'}
        </Button>
      </div>
    </div>
  );
}
