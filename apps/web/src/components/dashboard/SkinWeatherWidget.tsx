import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Cloud, ArrowRight, Loader2 } from 'lucide-react';
import { skinWeatherApi } from '@/api/skin-weather.api';
import { useSkinWeatherLocation } from '@/hooks/useSkinWeatherLocation';

export const SkinWeatherWidget = () => {
  // Silently update stored location each time user visits the dashboard
  useSkinWeatherLocation(true);

  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ['skin-weather', 'profile'],
    queryFn: skinWeatherApi.getProfile,
    retry: false,
  });

  const { data: report, isLoading: reportLoading } = useQuery<any>({
    queryKey: ['skin-weather', 'today'],
    queryFn: skinWeatherApi.getTodayReport,
    retry: false,
    enabled: !!profile,
  });

  const isLoading = profileLoading || reportLoading;

  // No profile → CTA
  if (!isLoading && !profile) {
    return (
      <div className="rounded-2xl border border-sky-200 dark:border-sky-800/50 bg-sky-50/60 dark:bg-sky-900/10 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Cloud className="h-4 w-4 text-sky-500" />
          <span className="text-sm font-semibold">Twoja Skóra</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Ustaw profil skóry i lokalizację, aby codziennie rano otrzymywać spersonalizowane wskazówki pielęgnacyjne.
        </p>
        <Link
          to="/user/pogoda-skory"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
        >
          Ustaw profil
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  const sections: any[] = (report?.reportData as any)?.sections ?? [];
  const topSections = sections.slice(0, 2);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-sky-500" />
          <span className="text-sm font-semibold">Twoja Skóra</span>
        </div>
        <Link
          to="/user/pogoda-skory"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          Zobacz więcej
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="text-xs">Ładowanie...</span>
        </div>
      ) : !report || sections.length === 0 ? (
        <div className="flex items-start gap-2.5 py-1">
          <Cloud className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Raport zostanie wygenerowany o 6:00. Jeśli to Twoja pierwsza wizyta, wróć jutro.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {topSections.map((s: any, i: number) => (
            <div key={i} className="flex gap-2.5 p-3 bg-muted/30 rounded-xl">
              <div className="mt-0.5 shrink-0"><Cloud className="h-3.5 w-3.5 text-sky-500" /></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-snug">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{s.recommendation}</p>
              </div>
            </div>
          ))}
          {sections.length > 2 && (
            <p className="text-xs text-muted-foreground pl-1">+{sections.length - 2} więcej wskazówek</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SkinWeatherWidget;
