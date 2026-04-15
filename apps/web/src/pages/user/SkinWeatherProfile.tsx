import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import {
  Cloud, Sun, MapPin, Bell, BellOff,
  ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import { skinWeatherApi } from '@/api/skin-weather.api';
import { useSkinWeatherLocation } from '@/hooks/useSkinWeatherLocation';

// ─── Constants ────────────────────────────────────────────────────────────────

const SKIN_TYPES = [
  { value: 'SUCHA',    label: 'Sucha',    desc: 'Łuszczy się, ciągnie, potrzebuje nawilżenia' },
  { value: 'TLUSTA',   label: 'Tłusta',   desc: 'Połysk, rozszerzone pory, przetłuszczanie' },
  { value: 'MIESZANA', label: 'Mieszana', desc: 'Strefa T tłusta, reszta normalna lub sucha' },
  { value: 'NORMALNA', label: 'Normalna', desc: 'Zrównoważona, bez problemów' },
  { value: 'WRAZLIWA', label: 'Wrażliwa', desc: 'Reaktywna, łatwo się czerwieni, podrażniona' },
];

const SKIN_CONCERNS = [
  { value: 'NAWODNIENIE',     label: 'Nawodnienie' },
  { value: 'PRZEBARWIENIA',   label: 'Przebarwienia' },
  { value: 'TRADZIK',         label: 'Trądzik' },
  { value: 'STARZENIE',       label: 'Starzenie' },
  { value: 'WRAZLIWOSC',      label: 'Wrażliwość' },
  { value: 'PRZETLUSZCZANIE', label: 'Przetłuszczanie' },
  { value: 'ZACZERWIENIENIA', label: 'Zaczerwienienia' },
];


function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ section }: { section: any }) {
  return (
    <div className="flex gap-3 p-4 bg-muted/30 rounded-xl border border-border/50">
      <div className="mt-0.5 shrink-0">
        <Cloud className="h-4 w-4 text-sky-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground leading-snug">{section.label}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{section.recommendation}</p>
      </div>
    </div>
  );
}

// ─── Today's Report ───────────────────────────────────────────────────────────

function TodayReport({ hasProfile }: { hasProfile: boolean }) {
  const qc = useQueryClient();
  const { data: report, isLoading, isError } = useQuery<any>({
    queryKey: ['skin-weather', 'today'],
    queryFn: skinWeatherApi.getTodayReport,
    retry: false,
    enabled: hasProfile,
  });

  const generateMutation = useMutation({
    mutationFn: skinWeatherApi.generateMyReport,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skin-weather', 'today'] });
      qc.invalidateQueries({ queryKey: ['skin-weather', 'history'] });
      toast.success('Raport wygenerowany');
    },
    onError: (err) => {
      const msg = isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg ?? 'Błąd generowania raportu');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Ładowanie raportu...</span>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-indigo-900/40 bg-gradient-to-br from-indigo-950/80 to-slate-800/80 p-6 text-center">
          <div className="text-5xl mb-3 leading-none">🌥️</div>
          <p className="text-sm font-semibold text-foreground mb-1">Brak raportu na dziś</p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-5">
            Raport generowany automatycznie o 6:00.<br />Możesz też wygenerować go teraz.
          </p>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {generateMutation.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" />Generowanie raportu...</>
              : <><span>✨</span>Wygeneruj raport teraz</>}
          </button>
          {!generateMutation.isPending && (
            <p className="text-[11px] text-muted-foreground mt-2">Zajmuje kilka sekund</p>
          )}
        </div>
      </div>
    );
  }

  const sections: any[] = (report.reportData as any)?.sections ?? [];

  return (
    <div className="space-y-3">
      {sections.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          Brak aktywnych reguł pasujących do dzisiejszych warunków pogodowych.
        </p>
      ) : (
        sections.map((s: any, i: number) => <SectionCard key={i} section={s} />)
      )}
    </div>
  );
}

// ─── Report History ───────────────────────────────────────────────────────────

function ReportHistory() {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ['skin-weather', 'history', page],
    queryFn: () => skinWeatherApi.getReportHistory(page, 5),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Ładowanie historii...</span>
      </div>
    );
  }

  const reports: any[] = data?.data ?? [];
  const totalPages: number = data?.totalPages ?? 1;

  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">Brak poprzednich raportów.</p>;
  }

  return (
    <div className="space-y-2">
      {reports.map((r: any) => {
        const sections: any[] = (r.reportData as any)?.sections ?? [];
        const isOpen = expandedId === r.id;
        return (
          <div key={r.id} className="border border-border/50 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedId(isOpen ? null : r.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-sky-500" />
                <span className="text-sm font-medium">{formatDate(r.reportDate)}</span>
                <span className="text-xs text-muted-foreground">({sections.length} wskazówek)</span>
              </div>
              {isOpen
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {isOpen && (
              <div className="px-4 pb-4 space-y-2 border-t border-border/30 pt-3">
                {sections.length === 0
                  ? <p className="text-xs text-muted-foreground">Brak wskazówek.</p>
                  : sections.map((s: any, i: number) => <SectionCard key={i} section={s} />)
                }
              </div>
            )}
          </div>
        );
      })}

      {totalPages > 1 && (
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded-lg border border-border disabled:opacity-40 hover:bg-muted/40 transition-colors"
          >
            Poprzednia
          </button>
          <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs rounded-lg border border-border disabled:opacity-40 hover:bg-muted/40 transition-colors"
          >
            Następna
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Profile Form ─────────────────────────────────────────────────────────────

function ProfileForm({ initialProfile }: { initialProfile: any }) {
  const qc = useQueryClient();
  const [skinType, setSkinType] = useState<string>(initialProfile?.skinType ?? '');
  const [skinConcerns, setSkinConcerns] = useState<string[]>(initialProfile?.skinConcerns ?? []);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    initialProfile?.notificationsEnabled ?? false,
  );

  const mutation = useMutation({
    mutationFn: () =>
      skinWeatherApi.upsertProfile({
        skinType,
        skinConcerns,
        // Location will be auto-detected and saved separately via useSkinWeatherLocation
        // For first-time creation we send 0,0 — location update follows automatically
        locationLat: Number(initialProfile?.locationLat) || 0,
        locationLng: Number(initialProfile?.locationLng) || 0,
        cityName: initialProfile?.cityName || 'Wykrywanie...',
        notificationsEnabled,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skin-weather'] });
      toast.success('Profil zapisany');
    },
    onError: () => toast.error('Błąd zapisu profilu'),
  });

  const toggleConcern = (val: string) => {
    setSkinConcerns(prev =>
      prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val],
    );
  };

  return (
    <div className="space-y-6">
      {/* Skin Type */}
      <div>
        <p className="text-sm font-semibold mb-3">Typ skóry</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SKIN_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setSkinType(t.value)}
              className={`text-left p-3 rounded-xl border transition-all ${
                skinType === t.value
                  ? 'border-foreground bg-foreground/5 ring-1 ring-foreground/20'
                  : 'border-border/50 hover:border-border hover:bg-muted/20'
              }`}
            >
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Skin Concerns */}
      <div>
        <p className="text-sm font-semibold mb-3">
          Problemy skórne{' '}
          <span className="text-muted-foreground font-normal">(opcjonalnie)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {SKIN_CONCERNS.map(c => (
            <button
              key={c.value}
              onClick={() => toggleConcern(c.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                skinConcerns.includes(c.value)
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Location info — auto-detected */}
      <div className="flex items-center gap-3 p-3 bg-sky-50/60 dark:bg-sky-900/10 rounded-xl border border-sky-200/60 dark:border-sky-800/40">
        <MapPin className="h-4 w-4 text-sky-500 shrink-0" />
        <div>
          <p className="text-xs font-medium text-foreground">Lokalizacja wykrywana automatycznie</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {initialProfile?.cityName && initialProfile.cityName !== 'Wykrywanie...'
              ? `Aktualna: ${initialProfile.cityName}`
              : 'Zostanie pobrana z GPS przy każdym wejściu na stronę.'}
          </p>
        </div>
      </div>

      {/* Notifications toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/40">
        <div className="flex items-center gap-3">
          {notificationsEnabled
            ? <Bell className="h-4 w-4" />
            : <BellOff className="h-4 w-4 text-muted-foreground" />}
          <div>
            <p className="text-sm font-medium">Powiadomienia push</p>
            <p className="text-xs text-muted-foreground">Codzienny raport o 6:00</p>
          </div>
        </div>
        <button
          onClick={() => setNotificationsEnabled(v => !v)}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            notificationsEnabled ? 'bg-foreground' : 'bg-border'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-background rounded-full shadow transition-transform ${
              notificationsEnabled ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={!skinType || mutation.isPending}
        className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Zapisz profil
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export const SkinWeatherProfile = () => {
  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ['skin-weather', 'profile'],
    queryFn: skinWeatherApi.getProfile,
    retry: false,
  });

  // Auto-detect location on every visit and silently update stored location
  useSkinWeatherLocation(true);

  const hasProfile = !isLoading && !!profile;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-sky-100 dark:bg-sky-900/30 rounded-2xl">
          <Cloud className="h-6 w-6 text-sky-600 dark:text-sky-400" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-semibold">Pogoda dla skóry</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Codzienne wskazówki pielęgnacyjne dopasowane do warunków atmosferycznych w Twojej lokalizacji.
          </p>
        </div>
      </div>

      {/* Section A — Profile Form */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-heading text-base font-semibold mb-5">Twój profil skórny</h2>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Ładowanie...</span>
          </div>
        ) : (
          <ProfileForm initialProfile={profile} />
        )}
      </section>

      {/* Section B — Today's Report */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Sun className="h-4 w-4 text-amber-500" />
          <h2 className="font-heading text-base font-semibold">Raport na dziś</h2>
        </div>
        {!hasProfile ? (
          <p className="text-sm text-muted-foreground">Uzupełnij profil powyżej, aby zobaczyć raport.</p>
        ) : (
          <TodayReport hasProfile={hasProfile} />
        )}
      </section>

      {/* Section C — History */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Cloud className="h-4 w-4 text-slate-400" />
          <h2 className="font-heading text-base font-semibold">Historia raportów</h2>
        </div>
        {!hasProfile ? (
          <p className="text-sm text-muted-foreground">Uzupełnij profil, aby zobaczyć historię.</p>
        ) : (
          <ReportHistory />
        )}
      </section>
    </div>
  );
};

export default SkinWeatherProfile;
