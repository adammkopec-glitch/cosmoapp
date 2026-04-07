import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isBefore,
  startOfToday,
  isSameDay,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Clock, Upload, X, CheckCircle2 } from 'lucide-react';

import ServiceQuiz from '@/components/ServiceQuiz';
import type { ApiQuizResult } from '@/api/quiz.api';
import { servicesApi } from '@/api/services.api';
import { employeesApi } from '@/api/employees.api';
import { appointmentsApi } from '@/api/appointments.api';
import { loyaltyApi } from '@/api/loyalty.api';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import type { ValidatedVoucher } from '@cosmo/shared';
import { Button } from '@/components/ui/button';
import { ServiceRating } from '@/components/reviews/ServiceRating';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardState {
  service: any | null;
  seriesId: string | null;
  employeeId: string | null;
  date: Date | null;
  time: string | null;
  notes: string;
  allergies: string;
  problemDescription: string;
  photo: File | null;
  couponId: string | null;
  otherRewardId: string | null;
  discountCodeId: string | null;
  voucherData: ValidatedVoucher | null;
}

const STEPS = ['Usługa', 'Pracownik', 'Termin', 'Uwagi', 'Potwierdzenie'];

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({
  selected,
  onSelect,
  serviceId,
  employeeId,
}: {
  selected: Date | null;
  onSelect: (d: Date) => void;
  serviceId: string | null;
  employeeId: string | null;
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const today = startOfToday();

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth() + 1;

  const { data: monthAvailability = {} } = useQuery<
    Record<string, 'off' | 'none' | 'partial' | 'available'>
  >({
    queryKey: ['month-availability', year, month, serviceId, employeeId],
    queryFn: () => employeesApi.getMonthAvailability(year, month, serviceId!, employeeId),
    enabled: !!serviceId,
  });

  const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
  const firstDayOffset = (getDay(days[0]) + 6) % 7;
  const DAY_NAMES = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          className="p-1 rounded-lg hover:opacity-60 transition-opacity"
          style={{ color: '#1A1208' }}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold capitalize" style={{ color: '#1A1208' }}>
          {format(viewMonth, 'LLLL yyyy', { locale: pl })}
        </span>
        <button
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="p-1 rounded-lg hover:opacity-60 transition-opacity"
          style={{ color: '#1A1208' }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs font-medium py-1" style={{ color: 'rgba(26,18,8,0.4)' }}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const isPast = isBefore(day, today);
          const isSelected = selected ? isSameDay(day, selected) : false;
          const isToday = isSameDay(day, today);
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayStatus = isPast ? null : (monthAvailability[dateKey] ?? null);
          const isGreen = dayStatus === 'available' || dayStatus === 'partial';
          const isRed = dayStatus === 'none' || dayStatus === 'off';
          return (
            <button
              key={day.toISOString()}
              disabled={isPast || isRed}
              onClick={() => onSelect(day)}
              className="text-sm rounded-full w-8 h-8 mx-auto flex items-center justify-center transition-colors"
              style={
                isSelected
                  ? { background: '#1A1208', color: '#fff' }
                  : isToday
                  ? { border: '1.5px solid #B8913A', color: '#B8913A', fontWeight: 700 }
                  : isPast
                  ? { color: 'rgba(26,18,8,0.25)', cursor: 'not-allowed' }
                  : isRed
                  ? { background: 'rgba(239,68,68,0.08)', color: '#DC2626', cursor: 'not-allowed' }
                  : isGreen
                  ? { background: 'rgba(34,197,94,0.1)', color: '#15803d', cursor: 'pointer' }
                  : { color: '#1A1208', cursor: 'pointer' }
              }
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 1: Wybór usługi ─────────────────────────────────────────────────────

function StepService({
  selected,
  onSelect,
  onAdvanceStep,
  preselectedServiceId,
}: {
  selected: any | null;
  onSelect: (s: any) => void;
  onAdvanceStep: () => void;
  preselectedServiceId?: string | null;
}) {
  const { data: services = [], isLoading } = useQuery<any[]>({
    queryKey: ['services'],
    queryFn: servicesApi.getAll,
  });
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [quizOpen, setQuizOpen] = useState(false);
  const [recommendation, setRecommendation] = useState<ApiQuizResult | null>(null);

  useEffect(() => {
    if (!preselectedServiceId || selected || services.length === 0) return;
    const match = services.find((service: any) => service.id === preselectedServiceId);
    if (!match) return;
    onSelect(match);
    onAdvanceStep();
  }, [preselectedServiceId, selected, services, onSelect, onAdvanceStep]);

  const categories: string[] = Array.from(new Set(services.map((s: any) => s.category))).sort() as string[];
  const filtered = filterCategory ? services.filter((s: any) => s.category === filterCategory) : services;

  const handleQuizAccept = (result: ApiQuizResult) => {
    setRecommendation(result);
    setQuizOpen(false);
    if (result.mainService) {
      // Find matching service in loaded list and pre-select it
      const match = services.find((s: any) => s.id === result.mainService!.id);
      if (match) {
        // Use onSelect() — the existing helper that also clears stale date/time state
        onSelect(match);
        onAdvanceStep(); // advance to Pracownik (employee) step
      }
    }
    // If no mainService: stay on service step (step 0), all services shown, banner visible
  };

  if (isLoading)
    return (
      <div className="text-center py-12 animate-pulse" style={{ color: 'rgba(26,18,8,0.4)' }}>
        Ładowanie usług...
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Quiz trigger */}
      <button
        onClick={() => setQuizOpen(true)}
        className="w-full border border-dashed rounded-xl p-3 text-sm text-center transition-colors hover:bg-amber-50"
        style={{ borderColor: 'rgba(184,145,58,0.4)', color: 'rgba(26,18,8,0.6)' }}
      >
        Nie wiesz, jaki zabieg wybrać?{' '}
        <span className="font-semibold" style={{ color: '#B8913A' }}>
          Odpowiedz na 6 pytań →
        </span>
      </button>

      {/* Recommendation banner */}
      {recommendation && (
        <div
          className="rounded-xl p-4 flex items-start justify-between gap-3"
          style={{ background: 'rgba(184,145,58,0.08)', border: '1px solid rgba(184,145,58,0.3)' }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#B8913A' }}>
              Rekomendacja dla Ciebie
            </p>
            <p className="font-semibold mt-0.5" style={{ color: '#1A1208' }}>{recommendation.title}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(26,18,8,0.6)' }}>{recommendation.subtitle}</p>
          </div>
          <button onClick={() => setRecommendation(null)} style={{ color: 'rgba(26,18,8,0.4)' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Quiz modal */}
      {/* Tour anchor — always in DOM so tour can target it */}
      <div data-tour="service-quiz">
        {quizOpen && <ServiceQuiz onClose={() => setQuizOpen(false)} onAccept={handleQuizAccept} />}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {(['', ...categories] as string[]).map((cat) => (
          <button
            key={cat || '__all__'}
            onClick={() => setFilterCategory(cat)}
            className="px-4 py-1.5 rounded-full text-sm font-medium border transition-colors"
            style={
              filterCategory === cat
                ? { background: '#1A1208', color: '#fff', borderColor: '#1A1208' }
                : { borderColor: 'rgba(0,0,0,0.15)', color: 'rgba(26,18,8,0.7)' }
            }
          >
            {cat || 'Wszystkie'}
          </button>
        ))}
      </div>

      {/* Service cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((service: any) => {
          const isSelected = selected?.id === service.id;
          return (
            <div
              key={service.id}
              onClick={() => onSelect(service)}
              className="rounded-2xl cursor-pointer overflow-hidden transition-all"
              style={{
                background: '#fff',
                border: isSelected
                  ? '1.5px solid #B8913A'
                  : '1px solid rgba(0,0,0,0.08)',
                boxShadow: isSelected
                  ? '0 0 0 3px rgba(184,145,58,0.12)'
                  : '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              {service.imagePath && (
                <div className="h-36 overflow-hidden">
                  <img
                    src={service.imagePath}
                    alt={service.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight" style={{ color: '#1A1208' }}>
                    {service.name}
                  </h3>
                  {isSelected && <CheckCircle2 size={18} style={{ color: '#B8913A', flexShrink: 0, marginTop: 2 }} />}
                </div>
                <p className="text-xs line-clamp-2" style={{ color: 'rgba(26,18,8,0.5)' }}>
                  {service.description}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(184,145,58,0.1)', color: '#B8913A' }}
                    >
                      <Clock size={11} />
                      {service.durationMinutes} min
                    </span>
                    <ServiceRating avgRating={service.avgRating} reviewCount={service.reviewCount} />
                  </div>
                  <span className="font-bold" style={{ color: '#1A1208' }}>
                    {Number(service.price).toFixed(2)} zł
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2: Wybór pracownika ─────────────────────────────────────────────────

function StepEmployee({
  selected,
  onSelect,
  service,
}: {
  selected: string | null;
  onSelect: (id: string | null) => void;
  service: any;
}) {
  const { data: employees = [], isLoading } = useQuery<any[]>({
    queryKey: ['employees'],
    queryFn: employeesApi.getAll,
  });

  const filteredEmployees =
    service?.employees?.length > 0
      ? employees.filter((e: any) => service.employees.some((se: any) => se.id === e.id))
      : employees;

  if (isLoading)
    return (
      <div className="text-center py-12 animate-pulse" style={{ color: 'rgba(26,18,8,0.4)' }}>
        Ładowanie pracowników...
      </div>
    );

  const cardStyle = (isSelected: boolean) => ({
    background: '#fff',
    border: isSelected ? '1.5px solid #B8913A' : '1px solid rgba(0,0,0,0.08)',
    boxShadow: isSelected ? '0 0 0 3px rgba(184,145,58,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
    borderRadius: 16,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <div className="space-y-4">
      {filteredEmployees.length === 0 && !isLoading && (
        <div className="text-center py-12 text-sm" style={{ color: 'rgba(26,18,8,0.45)' }}>
          Brak dostępnych pracowników dla tej usługi.
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        {filteredEmployees.map((emp: any) => {
          const isSelected = selected === emp.id;
          return (
            <div
              key={emp.id}
              onClick={() => onSelect(emp.id)}
              className="p-4 flex gap-4 items-start"
              style={cardStyle(isSelected)}
            >
              <div className="w-14 h-14 rounded-full overflow-hidden shrink-0" style={{ background: 'rgba(184,145,58,0.1)' }}>
                {emp.avatarPath ? (
                  <img src={emp.avatarPath} alt={emp.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-bold" style={{ color: '#B8913A' }}>
                    {emp.name?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold" style={{ color: '#1A1208' }}>{emp.name}</p>
                  {isSelected && <CheckCircle2 size={16} style={{ color: '#B8913A', flexShrink: 0 }} />}
                </div>
                {emp.bio && (
                  <p className="text-sm mt-1 line-clamp-2" style={{ color: 'rgba(26,18,8,0.5)' }}>{emp.bio}</p>
                )}
                {emp.specialties?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {emp.specialties.map((s: string) => (
                      <span
                        key={s}
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(184,145,58,0.1)', color: '#B8913A' }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 3: Wybór terminu ────────────────────────────────────────────────────

function StepDate({
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  service,
  employeeId,
}: {
  selectedDate: Date | null;
  selectedTime: string | null;
  onSelectDate: (d: Date) => void;
  onSelectTime: (t: string) => void;
  service: any;
  employeeId: string | null;
}) {
  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;

  const { data: slots = [], isFetching } = useQuery<{ time: string; available: boolean }[]>({
    queryKey: ['availability', dateStr, service?.id, employeeId],
    queryFn: () => employeesApi.getAvailability(dateStr!, service.id, employeeId),
    enabled: !!dateStr && !!service?.id,
  });

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Calendar */}
      <div
        className="rounded-xl p-5"
        style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}
      >
        <MiniCalendar
          selected={selectedDate}
          onSelect={onSelectDate}
          serviceId={service?.id ?? null}
          employeeId={employeeId}
        />
      </div>

      {/* Time slots */}
      <div>
        {!selectedDate ? (
          <div
            className="flex items-center justify-center h-full text-sm"
            style={{ color: 'rgba(26,18,8,0.45)' }}
          >
            Wybierz dzień, aby zobaczyć dostępne godziny
          </div>
        ) : isFetching ? (
          <div className="text-center animate-pulse py-8" style={{ color: 'rgba(26,18,8,0.45)' }}>
            Sprawdzanie dostępności...
          </div>
        ) : slots.length === 0 ? (
          <div
            className="text-center py-8 rounded-xl"
            style={{ border: '2px dashed rgba(0,0,0,0.1)', color: 'rgba(26,18,8,0.45)' }}
          >
            Brak wolnych terminów w tym dniu.<br />
            <span className="text-sm">Wybierz inny dzień.</span>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: 'rgba(26,18,8,0.55)' }}>
              Dostępne godziny — {format(selectedDate, 'EEEE, d MMMM', { locale: pl })}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  disabled={!slot.available}
                  onClick={() => slot.available && onSelectTime(slot.time)}
                  className="py-2 rounded-lg text-sm font-medium border transition-all"
                  style={
                    !slot.available
                      ? { background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)', color: '#DC2626', cursor: 'not-allowed' }
                      : selectedTime === slot.time
                      ? { background: '#1A1208', color: '#fff', borderColor: '#1A1208' }
                      : { borderColor: 'rgba(0,0,0,0.15)', color: '#1A1208' }
                  }
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 4: Uwagi i zdjęcie ──────────────────────────────────────────────────

function StepNotes({
  notes,
  allergies,
  problemDescription,
  photo,
  onChange,
}: {
  notes: string;
  allergies: string;
  problemDescription: string;
  photo: File | null;
  onChange: (field: string, value: any) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Plik jest za duży (max 5 MB)');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Dozwolone formaty: JPG, PNG, WebP');
      return;
    }
    onChange('photo', file);
  };

  const textareaStyle = {
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: 12,
    background: '#FDFAF6',
    outline: 'none',
    width: '100%',
    padding: '8px 12px',
    fontSize: 14,
    resize: 'none' as const,
    fontFamily: 'inherit',
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {[
        { label: 'Dodatkowe uwagi', value: notes, field: 'notes', rows: 3, placeholder: 'Np. preferowana pora dnia, specjalne życzenia...' },
        { label: 'Alergie i przeciwwskazania', value: allergies, field: 'allergies', rows: 2, placeholder: 'Np. alergia na lateks, nikiel, składniki kosmetyczne...' },
        { label: 'Opis problemu / oczekiwania', value: problemDescription, field: 'problemDescription', rows: 3, placeholder: 'Opisz co chcesz osiągnąć lub co Cię niepokoi...' },
      ].map(({ label, value, field, rows, placeholder }) => (
        <div key={field} className="space-y-1">
          <label className="text-sm font-medium" style={{ color: '#1A1208' }}>{label}</label>
          <textarea
            value={value}
            onChange={(e) => onChange(field, e.target.value)}
            rows={rows}
            placeholder={placeholder}
            style={textareaStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#B8913A'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
          />
        </div>
      ))}

      {/* Photo upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: '#1A1208' }}>Zdjęcie (opcjonalnie)</label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => !photo && fileRef.current?.click()}
          className="rounded-xl p-6 text-center transition-colors"
          style={{
            border: `2px dashed ${dragOver ? '#B8913A' : 'rgba(184,145,58,0.3)'}`,
            background: dragOver ? 'rgba(184,145,58,0.05)' : 'transparent',
            cursor: photo ? 'default' : 'pointer',
          }}
        >
          {photo ? (
            <div className="flex items-center gap-4">
              <img
                src={URL.createObjectURL(photo)}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg"
                style={{ border: '1px solid rgba(0,0,0,0.1)' }}
              />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium" style={{ color: '#1A1208' }}>{photo.name}</p>
                <p className="text-xs" style={{ color: 'rgba(26,18,8,0.5)' }}>{(photo.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onChange('photo', null); }}
                className="p-1 rounded transition-opacity hover:opacity-70"
                style={{ color: '#DC2626' }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload size={24} className="mx-auto" style={{ color: 'rgba(26,18,8,0.35)' }} />
              <p className="text-sm" style={{ color: 'rgba(26,18,8,0.5)' }}>
                Przeciągnij zdjęcie lub{' '}
                <span style={{ color: '#B8913A', textDecoration: 'underline' }}>kliknij tutaj</span>
              </p>
              <p className="text-xs" style={{ color: 'rgba(26,18,8,0.4)' }}>JPG, PNG, WebP — max 5 MB</p>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>
    </div>
  );
}

// ─── Price helpers ────────────────────────────────────────────────────────────

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

// ─── Step 5: Podsumowanie + Lojalność ────────────────────────────────────────

function StepConfirm({
  state,
  onCouponSelect,
  onOtherRewardSelect,
  onVoucherChange,
  user,
}: {
  state: WizardState;
  onCouponSelect: (id: string | null) => void;
  onOtherRewardSelect: (id: string | null) => void;
  onVoucherChange: (v: ValidatedVoucher | null) => void;
  user: any;
}) {
  const [codeInput, setCodeInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const { data: rewards = [] } = useQuery<any[]>({
    queryKey: ['loyalty', 'rewards'],
    queryFn: loyaltyApi.getRewards,
  });

  const basePrice = state.service ? Number(state.service.price) : 0;

  function tierOrder(tier?: string) {
    return tier === 'GOLD' ? 3 : tier === 'SILVER' ? 2 : 1;
  }

  let discountedPrice = basePrice;
  if (state.voucherData) {
    discountedPrice = calcDiscountedPrice(basePrice, state.voucherData);
  }

  const hasDiscount = discountedPrice < basePrice;
  const earnedPoints = Math.floor(discountedPrice);

  const handleValidateVoucher = async () => {
    if (!codeInput.trim()) return;
    setValidating(true);
    try {
      const data = await loyaltyApi.validateVoucher(codeInput.trim());
      onVoucherChange(data);
      setShowInput(false);
      toast.success(`${data.type === 'COUPON' ? 'Kupon' : 'Kod'} ${data.code} zastosowany!`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Nieprawidłowy kod');
    } finally {
      setValidating(false);
    }
  };

  const otherRewards = rewards.filter(
    (r: any) =>
      r.isActive &&
      r.discountType === 'OTHER' &&
      Number(r.pointsCost) <= (user?.loyaltyPoints ?? 0) &&
      (!r.requiredTier || tierOrder(user?.loyaltyTier) >= tierOrder(r.requiredTier))
  );

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Summary card */}
      <div
        className="rounded-[20px] overflow-hidden"
        style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
      >
        <div className="p-6">
          <h3 className="font-heading font-semibold text-lg mb-4" style={{ color: '#1A1208' }}>
            Podsumowanie rezerwacji
          </h3>
          <div className="text-sm" style={{ borderTop: '1px solid rgba(184,145,58,0.15)' }}>
            {[
              { label: 'Usługa', value: state.service?.name },
              { label: 'Czas trwania', value: state.service?.durationMinutes ? `${state.service.durationMinutes} min` : undefined },
              {
                label: 'Cena',
                valueNode: hasDiscount ? (
                  <>
                    <span className="line-through text-xs mr-2" style={{ color: 'rgba(26,18,8,0.4)' }}>
                      {basePrice.toFixed(2)} zł
                    </span>
                    <span className="font-bold" style={{ color: '#15803D' }}>{discountedPrice.toFixed(2)} zł</span>
                  </>
                ) : (
                  <span className="font-bold" style={{ color: '#1A1208' }}>{basePrice.toFixed(2)} zł</span>
                ),
              },
              { label: 'Pracownik', value: state.employeeId ? '(wybrany)' : 'Bez preferencji' },
              {
                label: 'Termin',
                value: state.date
                  ? `${format(state.date, 'dd.MM.yyyy', { locale: pl })} o ${state.time}`
                  : '—',
              },
              ...(state.notes ? [{ label: 'Uwagi', value: state.notes }] : []),
              ...(state.photo ? [{ label: 'Zdjęcie', valueNode: <span style={{ color: '#B8913A' }}>✓ Dodano</span> }] : []),
            ].map(({ label, value, valueNode }) => (
              <div
                key={label}
                className="py-2.5 flex justify-between items-center"
                style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}
              >
                <span style={{ color: 'rgba(26,18,8,0.5)' }}>{label}</span>
                {valueNode ?? <span style={{ color: '#1A1208' }}>{value}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Voucher section */}
      <div>
        {state.voucherData ? (
          <div
            className="flex items-center justify-between p-3 rounded-lg text-sm"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <span>
              <strong className="font-mono tracking-wider" style={{ color: '#1A1208' }}>
                {state.voucherData.code}
              </strong>
              {' — '}
              <span style={{ color: '#15803D' }}>
                {state.voucherData.discountType === 'PERCENTAGE'
                  ? `-${state.voucherData.discountValue}%`
                  : `-${Number(state.voucherData.discountValue).toFixed(2)} zł`}
              </span>
              {' '}
              <span className="text-xs" style={{ color: 'rgba(26,18,8,0.5)' }}>
                ({state.voucherData.type === 'COUPON' ? 'kupon lojalnościowy' : 'kod rabatowy'})
              </span>
            </span>
            <button
              onClick={() => { onVoucherChange(null); onCouponSelect(null); setCodeInput(''); setShowInput(false); }}
              className="text-xs ml-4 hover:underline"
              style={{ color: '#DC2626' }}
            >
              Usuń
            </button>
          </div>
        ) : showInput ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Wpisz kod kuponu lub kod rabatowy"
                value={codeInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCodeInput(e.target.value.toUpperCase())
                }
                className="uppercase flex-1"
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                  e.key === 'Enter' && handleValidateVoucher()
                }
                autoFocus
              />
              <Button variant="outline" onClick={handleValidateVoucher} disabled={validating || !codeInput.trim()}>
                {validating ? 'Sprawdzam...' : 'Zastosuj'}
              </Button>
            </div>
            <button
              onClick={() => setShowInput(false)}
              className="text-xs hover:underline"
              style={{ color: 'rgba(26,18,8,0.5)' }}
            >
              Anuluj
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="text-sm hover:underline flex items-center gap-1"
            style={{ color: '#B8913A' }}
          >
            🎟️ Masz kupon z punktów lojalnościowych lub kod rabatowy? Kliknij tutaj
          </button>
        )}
      </div>

      {/* Loyalty section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: '#1A1208' }}>Program lojalnościowy</h3>
          <span className="text-sm" style={{ color: 'rgba(26,18,8,0.5)' }}>
            Twoje punkty:{' '}
            <strong style={{ color: '#B8913A' }}>{user?.loyaltyPoints ?? 0}</strong>
          </span>
        </div>

        <div
          className="p-3 rounded-lg text-sm"
          style={{ background: 'rgba(184,145,58,0.08)', border: '1px solid rgba(184,145,58,0.2)' }}
        >
          Po zakończeniu wizyty otrzymasz:{' '}
          <strong style={{ color: '#B8913A' }}>+{earnedPoints} pkt</strong>
        </div>

        {otherRewards.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium" style={{ color: '#1A1208' }}>
              Nagrody specjalne (aktywowane przy rezerwacji):
            </p>
            {otherRewards.map((reward: any) => {
              const isChosen = state.otherRewardId === reward.id;
              return (
                <button
                  key={reward.id}
                  onClick={() => onOtherRewardSelect(isChosen ? null : reward.id)}
                  className="w-full text-left p-3 rounded-lg border transition-all text-sm"
                  style={
                    isChosen
                      ? { border: '1.5px solid #B8913A', background: 'rgba(184,145,58,0.05)', boxShadow: '0 0 0 3px rgba(184,145,58,0.1)' }
                      : { borderColor: 'rgba(0,0,0,0.12)' }
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium" style={{ color: '#1A1208' }}>{reward.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(26,18,8,0.5)' }}>{reward.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold" style={{ color: '#B8913A' }}>{reward.pointsCost} pkt</p>
                      {isChosen && (
                        <p className="text-[10px]" style={{ color: '#B8913A' }}>✓ Wybrano</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export const BookingWizard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const preselectedServiceId = searchParams.get('serviceId');
  const preselectedSeriesId = searchParams.get('seriesId');

  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>({
    service: null,
    seriesId: preselectedSeriesId,
    employeeId: null,
    date: null,
    time: null,
    notes: '',
    allergies: '',
    problemDescription: '',
    photo: null,
    couponId: null,
    otherRewardId: null,
    discountCodeId: null,
    voucherData: null,
  });

  const update = useCallback((field: string, value: any) => {
    setState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const selectService = (service: any) => {
    setState((prev) => ({
      ...prev,
      service,
      seriesId: service?.id === preselectedServiceId ? preselectedSeriesId : null,
      date: null,
      time: null,
    }));
  };

  const selectDate = (date: Date) => {
    setState((prev) => ({ ...prev, date, time: null }));
  };

  const { mutateAsync: createAppointment, isPending } = useMutation<any, Error, any>({
    mutationFn: appointmentsApi.create,
  });
  const { mutateAsync: activateReward } = useMutation<any, Error, string>({
    mutationFn: (rewardId: string) => loyaltyApi.redeem(rewardId),
  });
  const { mutateAsync: uploadPhoto } = useMutation<any, Error, { id: string; file: File }>({
    mutationFn: ({ id, file }: { id: string; file: File }) => appointmentsApi.uploadPhoto(id, file),
  });

  const canProceed = () => {
    if (step === 1) return !!state.service;
    if (step === 2) return !!state.employeeId;
    if (step === 3) return !!state.date && !!state.time;
    return true;
  };

  const handleConfirm = async () => {
    if (!state.service || !state.date || !state.time) return;

    const [hours, minutes] = state.time.split(':').map(Number);
    const dateTime = new Date(state.date);
    dateTime.setHours(hours, minutes, 0, 0);

    try {
      let finalCouponId = state.couponId;
      if (state.otherRewardId) {
        const coupon = await activateReward(state.otherRewardId);
        finalCouponId = coupon.id;
      }

      const appointment = await createAppointment({
        serviceId: state.service.id,
        treatmentSeriesId: state.seriesId || undefined,
        employeeId: state.employeeId,
        date: dateTime.toISOString(),
        notes: state.notes || undefined,
        allergies: state.allergies || undefined,
        problemDescription: state.problemDescription || undefined,
        couponId: finalCouponId || undefined,
        discountCodeId: state.discountCodeId || undefined,
      });

      if (state.photo) {
        await uploadPhoto({ id: appointment.id, file: state.photo }).catch(() =>
          toast.warning('Wizyta zapisana, ale zdjęcie nie zostało wgrane')
        );
      }

      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'coupons'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['discount-codes', 'welcome'] });
      queryClient.invalidateQueries({ queryKey: ['reminders', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      toast.success('Wizyta została zarezerwowana!');
      navigate('/user/wizyty');
    } catch {
      toast.error('Nie udało się zarezerwować wizyty. Spróbuj ponownie.');
    }
  };

  return (
    <div data-tour="booking-wizard" className="max-w-4xl mx-auto space-y-8 animate-enter">
      <div>
        <h1 className="text-3xl font-heading font-bold" style={{ color: '#1A1208' }}>
          Umów wizytę
        </h1>
        <p className="mt-1" style={{ color: 'rgba(26,18,8,0.5)' }}>Wypełnij formularz krok po kroku</p>
      </div>

      {/* Editorial step progress bar */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((stepLabel, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === step;
          const isDone = stepNum < step;
          return (
            <React.Fragment key={stepNum}>
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className="w-6 h-6 flex items-center justify-center text-[10px] font-medium transition-colors"
                  style={{
                    background: isActive || isDone ? '#1C1510' : 'transparent',
                    color: isActive || isDone ? '#FAF7F2' : '#6B5A4E',
                    border: isActive || isDone ? 'none' : '1px solid #C4A882',
                    borderRadius: '50%',
                  }}
                >
                  {isDone ? '✓' : stepNum}
                </div>
                <span
                  className="text-[10px] tracking-[0.2em] uppercase hidden sm:block"
                  style={{ color: isActive ? '#1C1510' : '#6B5A4E' }}
                >
                  {stepLabel}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="flex-1 h-px mx-3 transition-colors"
                  style={{ background: stepNum < step ? '#C4A882' : '#E0D8CC' }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">
        {step === 1 && (
          <StepService
            selected={state.service}
            onSelect={selectService}
            onAdvanceStep={() => setStep(2)}
            preselectedServiceId={preselectedServiceId}
          />
        )}
        {step === 2 && (
          <StepEmployee
            selected={state.employeeId}
            onSelect={(id) => update('employeeId', id)}
            service={state.service}
          />
        )}
        {step === 3 && (
          <StepDate
            selectedDate={state.date}
            selectedTime={state.time}
            onSelectDate={selectDate}
            onSelectTime={(t) => update('time', t)}
            service={state.service}
            employeeId={state.employeeId}
          />
        )}
        {step === 4 && (
          <StepNotes
            notes={state.notes}
            allergies={state.allergies}
            problemDescription={state.problemDescription}
            photo={state.photo}
            onChange={update}
          />
        )}
        {step === 5 && (
          <StepConfirm
            state={state}
            onCouponSelect={(id) => update('couponId', id)}
            onOtherRewardSelect={(id) => update('otherRewardId', id)}
            onVoucherChange={(voucher) => setState(prev => ({
              ...prev,
              couponId: voucher?.type === 'COUPON' ? voucher.id : null,
              discountCodeId: voucher?.type === 'DISCOUNT_CODE' ? voucher.id : null,
              voucherData: voucher,
            }))}
            user={user}
          />
        )}
      </div>

      {/* Navigation buttons */}
      <div
        className="flex justify-between pt-6"
        style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}
      >
        <button
          onClick={() => (step === 1 ? navigate('/uslugi') : setStep((s) => s - 1))}
          className="px-8 py-3 border border-espresso text-espresso text-[10px] tracking-[0.25em] uppercase hover:bg-espresso hover:text-ivory transition-colors"
        >
          {step === 1 ? 'Anuluj' : 'Wróć'}
        </button>

        {step < STEPS.length ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            className="px-8 py-3 bg-espresso text-ivory text-[10px] tracking-[0.25em] uppercase hover:bg-espresso/90 transition-colors disabled:opacity-40"
          >
            Dalej
          </button>
        ) : (
          <button
            onClick={handleConfirm}
            disabled={isPending || !canProceed()}
            className="px-8 py-3 bg-espresso text-ivory text-[10px] tracking-[0.25em] uppercase hover:bg-espresso/90 transition-colors disabled:opacity-40"
          >
            {isPending ? 'Rezerwowanie...' : 'Potwierdź rezerwację'}
          </button>
        )}
      </div>
    </div>
  );
};
