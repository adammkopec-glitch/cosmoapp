// filepath: apps/web/src/pages/admin/Users.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { usersApi } from '@/api/users.api';
import { toast } from 'sonner';
import { Phone, Mail, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { UserJournal } from './UserJournal';

const TIER_LABELS: Record<string, string> = { BRONZE: 'Brąz', SILVER: 'Srebro', GOLD: 'Złoto' };
const TIER_COLORS: Record<string, string> = {
  BRONZE: 'bg-amber-100 text-amber-900',
  SILVER: 'bg-slate-200 text-slate-700',
  GOLD: 'bg-yellow-100 text-yellow-800',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekująca', CONFIRMED: 'Potwierdzona', CANCELLED: 'Anulowana', COMPLETED: 'Zakończona'
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function accountAge(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days} dni`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mies.`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years} l. ${rem} mies.` : `${years} l.`;
}

const UserDetailsModal = ({ userId, onClose }: { userId: string; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'user-details', userId],
    queryFn: async () => {
      const res = await api.get(`/users/${userId}`);
      return res.data.data.user;
    }
  });

  const [cardAllergies, setCardAllergies] = useState('');
  const [cardConditions, setCardConditions] = useState('');
  const [cardPreferences, setCardPreferences] = useState('');
  const [cardStaffNotes, setCardStaffNotes] = useState('');
  const [journalOpen, setJournalOpen] = useState(false);

  useEffect(() => {
    if (data) {
      setCardAllergies(data.cardAllergies ?? '');
      setCardConditions(data.cardConditions ?? '');
      setCardPreferences(data.cardPreferences ?? '');
      setCardStaffNotes(data.cardStaffNotes ?? '');
    }
  }, [data]);

  const { mutate: saveCard, isPending: savingCard } = useMutation({
    mutationFn: () => usersApi.updateUserCard(userId, { cardAllergies, cardConditions, cardPreferences, cardStaffNotes }),
    onSuccess: () => {
      toast.success('Kartoteka zapisana.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-details', userId] });
    },
    onError: () => toast.error('Nie udało się zapisać kartoteki.'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-muted/20">
          <h2 className="text-xl font-bold font-heading">Szczegóły klienta</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground font-bold text-xl p-2 leading-none">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground animate-pulse">Wczytywanie danych...</div>
          ) : data ? (
            <>
              {/* Basic info */}
              <div className="flex items-center gap-4">
                {data.avatarPath ? (
                  <img src={data.avatarPath} alt={data.name} className="w-16 h-16 rounded-full object-cover border-2 border-border" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                    {data.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-xl font-bold">{data.name}</p>
                  <p className="text-muted-foreground text-sm">{data.email}</p>
                  {data.phone && <p className="text-muted-foreground text-sm">{data.phone}</p>}
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/20 rounded-xl p-4 border border-border/50">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Konto założono</p>
                  <p className="font-bold text-foreground">{formatDate(data.createdAt)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">({accountAge(data.createdAt)} temu)</p>
                </div>

                <div className="bg-muted/20 rounded-xl p-4 border border-border/50">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Ostatnia wizyta</p>
                  {data.lastVisit ? (
                    <>
                      <p className="font-bold text-foreground">{formatDate(data.lastVisit.date)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{data.lastVisit.service?.name}</p>
                    </>
                  ) : (
                    <p className="font-bold text-muted-foreground">Brak wizyt</p>
                  )}
                </div>

                <div className="bg-muted/20 rounded-xl p-4 border border-border/50">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Program lojalnościowy</p>
                  <span className={`inline-block px-2 py-1 rounded-md text-xs font-black ${TIER_COLORS[data.loyaltyTier] || 'bg-muted'}`}>
                    {TIER_LABELS[data.loyaltyTier] || data.loyaltyTier}
                  </span>
                  <p className="text-sm font-bold mt-1">{data.loyaltyPoints} pkt</p>
                </div>

                <div className="bg-muted/20 rounded-xl p-4 border border-border/50">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Wizyty łącznie</p>
                  <p className="font-bold text-2xl text-foreground">{data.allAppointments?.length ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {data.upcoming?.length > 0 ? `${data.upcoming.length} zaplanowane` : 'Brak zaplanowanych'}
                  </p>
                </div>
              </div>

              {/* Zgody */}
              <div>
                <h3 className="font-semibold text-base border-b pb-2 mb-3">Zgody</h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between p-3 bg-muted/10 border border-border/40 rounded-lg">
                    <span className="text-sm font-medium">Regulamin zaakceptowany</span>
                    {data.termsAcceptedAt ? (
                      <span className="text-xs text-green-600 font-semibold">
                        ✓ {formatDate(data.termsAcceptedAt)}
                      </span>
                    ) : (
                      <span className="text-xs text-destructive font-semibold">✗ Nie</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/10 border border-border/40 rounded-lg">
                    <span className="text-sm font-medium">Zgoda marketingowa</span>
                    <span className={`text-xs font-semibold ${data.marketingConsent ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {data.marketingConsent ? '✓ Tak' : '✗ Nie'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/10 border border-border/40 rounded-lg">
                    <span className="text-sm font-medium">Zgoda na zdjęcia</span>
                    <span className={`text-xs font-semibold ${data.photoConsent ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {data.photoConsent ? '✓ Tak' : '✗ Nie'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Kartoteka klienta */}
              <div>
                <h3 className="font-semibold text-base border-b pb-2 mb-3">Kartoteka klienta</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Alergie / uczulenia</label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 text-sm resize-none bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      rows={2}
                      placeholder="Brak danych"
                      value={cardAllergies}
                      onChange={e => setCardAllergies(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Dolegliwości</label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 text-sm resize-none bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      rows={2}
                      placeholder="Brak danych"
                      value={cardConditions}
                      onChange={e => setCardConditions(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Upodobania</label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 text-sm resize-none bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      rows={2}
                      placeholder="Brak danych"
                      value={cardPreferences}
                      onChange={e => setCardPreferences(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Notatki personelu</label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 text-sm resize-none bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      rows={2}
                      placeholder="Notatki widoczne tylko dla personelu"
                      value={cardStaffNotes}
                      onChange={e => setCardStaffNotes(e.target.value)}
                    />
                  </div>
                  <Button size="sm" onClick={() => saveCard()} disabled={savingCard}>
                    {savingCard ? 'Zapisywanie...' : 'Zapisz kartotekę'}
                  </Button>
                </div>
              </div>

              {/* Upcoming appointments */}
              {data.upcoming?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-base border-b pb-2 mb-3">Zaplanowane wizyty</h3>
                  <div className="space-y-2">
                    {data.upcoming.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-muted/10 border border-border/40 rounded-lg">
                        <div>
                          <p className="font-semibold text-sm">{a.service?.name}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(a.date)}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_COLORS[a.status]}`}>
                          {STATUS_LABELS[a.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All appointments history */}
              {data.allAppointments?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-base border-b pb-2 mb-3">Historia wizyt</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {data.allAppointments.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-muted/10 border border-border/40 rounded-lg">
                        <div>
                          <p className="font-semibold text-sm">{a.service?.name}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(a.date)}</p>
                          {a.notes && <p className="text-xs text-muted-foreground italic mt-0.5">"{a.notes}"</p>}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_COLORS[a.status]}`}>
                          {STATUS_LABELS[a.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.allAppointments?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Ten klient nie ma jeszcze żadnych wizyt.</p>
              )}

              {/* Dziennik Kosmetologa */}
              <div>
                <button
                  onClick={() => setJournalOpen((v) => !v)}
                  className="w-full flex items-center justify-between font-semibold text-base border-b pb-2 mb-3"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen size={16} />
                    Dziennik Kosmetologa
                  </span>
                  {journalOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {journalOpen && <UserJournal userId={userId} userName={data.name} />}
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-10">Nie udało się załadować danych.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export const AdminUsers = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data.data.users;
    }
  });

  const copyPhones = () => {
    const phones = users
      .map((u: any) => u.phone)
      .filter(Boolean)
      .join(', ');
    navigator.clipboard.writeText(phones).then(() => {
      toast.success(`Skopiowano ${phones.split(', ').length} numerów`);
    });
  };

  const openGmail = () => {
    const emails = users.map((u: any) => u.email).join(',');
    window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(emails)}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading font-bold text-primary">Klienci</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={copyPhones} disabled={!users?.length}>
            <Phone size={14} />
            Kopiuj numery
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={openGmail} disabled={!users?.length}>
            <Mail size={14} />
            Email do wszystkich
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-xs font-bold border-b">
                <tr>
                  <th className="px-6 py-5">Imię i nazwisko</th>
                  <th className="px-6 py-5">Adres Email</th>
                  <th className="px-6 py-5">Telefon</th>
                  <th className="px-6 py-5">Wizyty</th>
                  <th className="px-6 py-5">Uprawnienia</th>
                  <th className="px-6 py-5 text-right">Zarządzaj</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 bg-card">
                {isLoading ? (
                  <tr><td colSpan={6} className="p-12 text-center animate-pulse text-muted-foreground">Wczytywanie listy klientów...</td></tr>
                ) : users?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-5 font-bold text-foreground">{u.name}</td>
                    <td className="px-6 py-5 text-muted-foreground font-medium">{u.email}</td>
                    <td className="px-6 py-5 font-medium">{u.phone || '-'}</td>
                    <td className="px-6 py-5 font-medium">{u._count?.appointments ?? 0}</td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1.5 rounded-md text-[11px] font-black tracking-widest uppercase ${u.role === 'ADMIN' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground shadow-sm'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="font-semibold text-primary"
                        onClick={() => setSelectedUserId(u.id)}
                      >
                        Szczegóły
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedUserId && (
        <UserDetailsModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
    </div>
  );
};
