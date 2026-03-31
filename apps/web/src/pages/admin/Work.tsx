import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format, addMinutes, differenceInSeconds } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CheckCircle, Save, Clock } from 'lucide-react';
import { api } from '@/lib/axios';
import { appointmentsApi } from '@/api/appointments.api';
import { loyaltyApi } from '@/api/loyalty.api';
import { employeesApi } from '@/api/employees.api';
import { usersApi } from '@/api/users.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/hooks/useSocket';
import { toast } from 'sonner';
import { RecommendationPanel } from '@/components/assortment/RecommendationPanel';
import { HomecareRoutinePanel } from '@/components/homecare/HomecareRoutinePanel';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekująca',
  CONFIRMED: 'Potwierdzona',
  CANCELLED: 'Anulowana',
  COMPLETED: 'Zakończona',
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-green-100 text-green-800',
};
const TIER_LABELS: Record<string, string> = { BRONZE: 'Brąz', SILVER: 'Srebro', GOLD: 'Złoto' };
const TIER_COLORS: Record<string, string> = {
  BRONZE: 'bg-amber-100 text-amber-800',
  SILVER: 'bg-slate-200 text-slate-700',
  GOLD: 'bg-yellow-100 text-yellow-800',
};
const TX_COLORS: Record<string, string> = {
  EARN: 'text-green-600',
  REDEEM: 'text-red-500',
  MANUAL_ADJUST: 'text-blue-500',
};

function isActive(apt: any): boolean {
  const start = new Date(apt.date);
  const end = addMinutes(start, apt.service?.durationMinutes ?? 60);
  const now = new Date();
  return now >= start && now < end;
}

function defaultIndex(appointments: any[]): number {
  const activeIdx = appointments.findIndex(isActive);
  if (activeIdx !== -1) return activeIdx;
  const now = new Date();
  const futureIdx = appointments.findIndex((a) => new Date(a.date) > now);
  if (futureIdx !== -1) return futureIdx;
  return 0;
}

function getTimeUntil(date: Date, now: Date): string {
  const diff = differenceInSeconds(date, now);
  if (diff <= 0) return '';
  if (diff < 60) return 'Za chwilę';
  if (diff < 3600) return `Za ${Math.floor(diff / 60)} min`;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return m > 0 ? `Za ${h}h ${m}min` : `Za ${h}h`;
}

function isSoon(date: Date, now: Date): boolean {
  const diff = differenceInSeconds(date, now);
  return diff > 0 && diff <= 900; // 15 min
}

export const AdminWork = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const [now, setNow] = useState(() => new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const [staffNoteValue, setStaffNoteValue] = useState('');
  const [cardStaffNotesValue, setCardStaffNotesValue] = useState('');

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: employeesApi.getAll,
  });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', 'today', selectedEmployeeId],
    queryFn: () => appointmentsApi.getToday(selectedEmployeeId || undefined),
    refetchInterval: 60_000,
  });

  // Reset index when appointments list changes
  useEffect(() => {
    if (appointments.length > 0) {
      setSelectedIndex(defaultIndex(appointments));
    }
  }, [appointments.length, selectedEmployeeId]);

  const selected = appointments[selectedIndex] ?? null;

  // Sync staffNote textarea when selected appointment changes
  useEffect(() => {
    setStaffNoteValue(selected?.staffNote ?? '');
    setCardStaffNotesValue(selected?.user?.cardStaffNotes ?? '');
  }, [selected?.id]);

  // Real-time updates
  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'today'] });
    };
    socket.on('appointment:updated', handler);
    socket.on('appointment:created', handler);
    return () => {
      socket.off('appointment:updated', handler);
      socket.off('appointment:created', handler);
    };
  }, [socket, queryClient]);

  // User details (history + loyalty)
  const { data: userDetails } = useQuery({
    queryKey: ['user-details', selected?.user?.id],
    queryFn: () => api.get(`/users/${selected.user.id}`).then((r) => r.data.data.user),
    enabled: !!selected?.user?.id,
  });

  const staffNoteMutation = useMutation({
    mutationFn: (note: string) => appointmentsApi.updateStaffNote(selected!.id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'today'] });
    },
  });

  const cardStaffNotesMutation = useMutation({
    mutationFn: (notes: string) => usersApi.updateUserCard(selected!.user.id, { cardStaffNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'today'] });
      toast.success('Notatki personelu zapisane.');
    },
    onError: () => toast.error('Nie udało się zapisać notatek.'),
  });

  const completeMutation = useMutation({
    mutationFn: () => appointmentsApi.updateStatus(selected!.id, 'COMPLETED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'today'] });
      setSelectedIndex((i) => Math.min(i + 1, appointments.length - 1));
    },
  });

  const useCouponMutation = useMutation({
    mutationFn: (couponId: string) => loyaltyApi.useCoupon(couponId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'today'] });
    },
  });

  const handleSaveNote = useCallback(() => {
    if (!selected) return;
    staffNoteMutation.mutate(staffNoteValue);
  }, [selected, staffNoteValue, staffNoteMutation]);

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold text-primary">Praca — dziś</h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, d MMMM yyyy", { locale: pl })}
        </p>
      </div>

      <div className="flex gap-6 h-[calc(100vh-180px)]">
        {/* LEFT — harmonogram */}
        <div className="w-80 flex flex-col gap-3">
          {/* Selector pracownika */}
          <select
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
          >
            <option value="">Wszyscy pracownicy</option>
            {employees.map((emp: any) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>

          {/* Lista wizyt */}
          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Harmonogram dnia ({appointments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              {isLoading && (
                <div className="p-4 text-sm text-muted-foreground">Ładowanie...</div>
              )}
              {!isLoading && appointments.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground text-center">Brak wizyt na dziś</div>
              )}
              <div className="divide-y">
                {appointments.map((apt: any, idx: number) => {
                  const active = isActive(apt);
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={apt.id}
                      onClick={() => setSelectedIndex(idx)}
                      className={`w-full text-left px-4 py-3 transition-colors hover:bg-accent/50 ${
                        isSelected ? 'bg-primary/10 border-l-4 border-primary' : ''
                      } ${active && !isSelected ? 'bg-green-50 border-l-4 border-green-500' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{apt.user?.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{apt.service?.name}</p>
                        </div>
                        <div className="shrink-0 text-right space-y-1">
                          <p className="text-xs font-mono font-bold">
                            {format(new Date(apt.date), 'HH:mm')}
                          </p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[apt.status] ?? 'bg-muted'}`}>
                            {STATUS_LABELS[apt.status]}
                          </span>
                        </div>
                      </div>
                      {active && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock size={10} className="text-green-600" />
                          <span className="text-[10px] text-green-600 font-medium">Teraz</span>
                        </div>
                      )}
                      {!active && (() => {
                        const timeUntil = getTimeUntil(new Date(apt.date), now);
                        if (!timeUntil) return null;
                        const soon = isSoon(new Date(apt.date), now);
                        return (
                          <span className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            soon
                              ? 'bg-destructive/10 text-destructive animate-pulse'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {timeUntil}
                          </span>
                        );
                      })()}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Nawigacja */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={selectedIndex <= 0}
              onClick={() => setSelectedIndex((i) => i - 1)}
            >
              <ChevronLeft size={16} /> Poprzedni
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={selectedIndex >= appointments.length - 1}
              onClick={() => setSelectedIndex((i) => i + 1)}
            >
              Następny <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        {/* RIGHT — karta klienta */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Brak wizyt do wyświetlenia
            </div>
          ) : (
            <>
              {/* Sekcja 1 — bieżąca wizyta */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl font-heading">{selected.user?.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{selected.user?.email}</p>
                      {selected.user?.phone && (
                        <p className="text-sm text-muted-foreground">{selected.user?.phone}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${TIER_COLORS[selected.user?.loyaltyTier] ?? ''}`}>
                        {TIER_LABELS[selected.user?.loyaltyTier] ?? selected.user?.loyaltyTier}
                      </span>
                      <span className="text-sm font-semibold">{selected.user?.loyaltyPoints ?? 0} pkt</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Szczegóły wizyty */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Usługa</p>
                      <p className="font-medium">{selected.service?.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Godzina</p>
                      <p className="font-medium">{format(new Date(selected.date), 'HH:mm')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Czas trwania</p>
                      <p className="font-medium">{selected.service?.durationMinutes} min</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Status</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[selected.status]}`}>
                        {STATUS_LABELS[selected.status]}
                      </span>
                    </div>
                  </div>

                  {/* Notatki klienta */}
                  {(selected.notes || selected.allergies || selected.problemDescription) && (
                    <div className="space-y-1.5 p-3 border rounded-lg text-sm">
                      <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Informacje od klienta</p>
                      {selected.notes && <p><span className="text-muted-foreground">Uwagi:</span> {selected.notes}</p>}
                      {selected.allergies && <p className="text-orange-600"><span className="font-medium">⚠ Alergie:</span> {selected.allergies}</p>}
                      {selected.problemDescription && <p><span className="text-muted-foreground">Opis:</span> {selected.problemDescription}</p>}
                    </div>
                  )}

                  {/* Kupon powiązany z wizytą */}
                  {selected.coupon && (
                    <div className="flex items-center justify-between p-3 border rounded-lg text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Kupon lojalnościowy</p>
                        <p className="font-medium">{selected.coupon.reward.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {selected.coupon.status === 'ACTIVE' ? (
                          <>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Aktywny</span>
                            {selected.coupon.reward.discountType === 'OTHER' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => useCouponMutation.mutate(selected.coupon.id)}
                                disabled={useCouponMutation.isPending}
                              >
                                Oznacz jako użyty
                              </Button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Użyty</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notatki pracownika */}
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Notatki pracownika</p>
                    <textarea
                      className="w-full border rounded-md px-3 py-2 text-sm resize-none bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      rows={3}
                      placeholder="Dodaj notatkę po wizycie (widoczna dla klienta)..."
                      value={staffNoteValue}
                      onChange={(e) => setStaffNoteValue(e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSaveNote}
                      disabled={staffNoteMutation.isPending}
                    >
                      <Save size={14} className="mr-1.5" />
                      {staffNoteMutation.isPending ? 'Zapisywanie...' : 'Zapisz notatkę'}
                    </Button>
                  </div>

                  {/* Kartoteka klienta */}
                  {(selected.user?.cardAllergies || selected.user?.cardConditions || selected.user?.cardPreferences) && (
                    <div className="space-y-1.5 p-3 border rounded-lg text-sm bg-muted/10">
                      <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Kartoteka klienta</p>
                      {selected.user?.cardAllergies && (
                        <p className="text-orange-600"><span className="font-medium">⚠ Alergie:</span> {selected.user.cardAllergies}</p>
                      )}
                      {selected.user?.cardConditions && (
                        <p><span className="text-muted-foreground">Dolegliwości:</span> {selected.user.cardConditions}</p>
                      )}
                      {selected.user?.cardPreferences && (
                        <p><span className="text-muted-foreground">Upodobania:</span> {selected.user.cardPreferences}</p>
                      )}
                    </div>
                  )}

                  {/* Notatki personelu (kartoteka) */}
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Notatki personelu (kartoteka)</p>
                    <textarea
                      className="w-full border rounded-md px-3 py-2 text-sm resize-none bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      rows={3}
                      placeholder="Notatki trwałe o kliencie (widoczne tylko dla personelu)..."
                      value={cardStaffNotesValue}
                      onChange={(e) => setCardStaffNotesValue(e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cardStaffNotesMutation.mutate(cardStaffNotesValue)}
                      disabled={cardStaffNotesMutation.isPending}
                    >
                      <Save size={14} className="mr-1.5" />
                      {cardStaffNotesMutation.isPending ? 'Zapisywanie...' : 'Zapisz notatki personelu'}
                    </Button>
                  </div>

                  {/* Polecone produkty */}
                  <RecommendationPanel appointmentId={selected.id} />

                  {/* Rutyna pielęgnacyjna */}
                  {(selected.status === 'CONFIRMED' || selected.status === 'COMPLETED') && (
                    <HomecareRoutinePanel key={selected.id} appointmentId={selected.id} />
                  )}

                  {/* Zakończ wizytę */}
                  {selected.status !== 'COMPLETED' && selected.status !== 'CANCELLED' && (
                    <Button
                      className="w-full"
                      onClick={() => completeMutation.mutate()}
                      disabled={completeMutation.isPending}
                    >
                      <CheckCircle size={16} className="mr-2" />
                      {completeMutation.isPending ? 'Przetwarzanie...' : 'Zakończ wizytę i przejdź do następnego'}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Sekcja 2 — historia wizyt */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Historia wizyt klienta</CardTitle>
                </CardHeader>
                <CardContent>
                  {!userDetails ? (
                    <p className="text-sm text-muted-foreground">Ładowanie...</p>
                  ) : userDetails.allAppointments?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Brak historii wizyt</p>
                  ) : (
                    <div className="space-y-2">
                      {userDetails.allAppointments?.map((a: any) => (
                        <div key={a.id} className="flex items-start justify-between gap-3 p-2.5 rounded-lg border text-sm hover:bg-muted/30">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{a.service?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(a.date), "d MMM yyyy, HH:mm", { locale: pl })}
                            </p>
                            {a.staffNote && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                Notatka: {a.staffNote}
                              </p>
                            )}
                          </div>
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status] ?? 'bg-muted'}`}>
                            {STATUS_LABELS[a.status]}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sekcja 3 — historia lojalnościowa */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Historia lojalnościowa</CardTitle>
                </CardHeader>
                <CardContent>
                  {!userDetails ? (
                    <p className="text-sm text-muted-foreground">Ładowanie...</p>
                  ) : !userDetails.loyaltyTransactions?.length ? (
                    <p className="text-sm text-muted-foreground">Brak transakcji</p>
                  ) : (
                    <div className="space-y-2">
                      {userDetails.loyaltyTransactions.map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between gap-3 p-2 rounded-lg border text-sm">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.createdAt), "d MMM yyyy", { locale: pl })}
                            </p>
                            <p className="truncate">{tx.description}</p>
                          </div>
                          <span className={`shrink-0 font-bold ${TX_COLORS[tx.type] ?? ''}`}>
                            {tx.type === 'EARN' || tx.type === 'MANUAL_ADJUST' ? '+' : '-'}{tx.points} pkt
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
