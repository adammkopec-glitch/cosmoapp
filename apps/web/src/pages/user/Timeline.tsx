// filepath: apps/web/src/pages/user/Timeline.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { remindersApi, type Reminder, type SeriesReminder } from '@/api/reminders.api';
import { timelineApi, type TimelineItem } from '@/api/timeline.api';
import { TreatmentSeriesTrack } from '@/components/schedule/TreatmentSeriesTrack';
import { StarRating } from '@/components/reviews/StarRating';

type Filter = 'all' | 'visits' | 'achievements';

const STEP_STYLES = {
  completed: {
    background: 'rgba(34,197,94,0.12)',
    border: '1px solid rgba(34,197,94,0.25)',
    color: '#15803D',
    label: 'Zakonczony',
  },
  scheduled: {
    background: 'rgba(59,130,246,0.1)',
    border: '1px solid rgba(59,130,246,0.2)',
    color: '#2563EB',
    label: 'Umowiony',
  },
  due: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
    color: '#DC2626',
    label: 'Do umowienia',
  },
  locked: {
    background: 'rgba(107,101,96,0.08)',
    border: '1px solid rgba(107,101,96,0.15)',
    color: '#6B6560',
    label: 'Oczekuje',
  },
};

const buildSeriesBookingHref = (series: SeriesReminder) => {
  const params = new URLSearchParams({
    serviceId: series.bookingTarget.serviceId,
  });
  if (series.bookingTarget.seriesId) {
    params.set('seriesId', series.bookingTarget.seriesId);
  }
  return `/rezerwacja?${params.toString()}`;
};

export const UserTimeline = () => {
  const [filter, setFilter] = useState<Filter>('all');
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['timeline'],
    queryFn: () => timelineApi.get(),
  });
  const { data: reminders = [], isLoading: remindersLoading } = useQuery<Reminder[]>({
    queryKey: ['reminders', 'me'],
    queryFn: remindersApi.getMy,
  });

  const activeSeries = reminders.filter((reminder): reminder is SeriesReminder => reminder.kind === 'series');

  const filtered = data?.items.filter((item) => {
    if (filter === 'visits') return item.type === 'visit';
    if (filter === 'achievements') return item.type === 'achievement' || item.type === 'loyalty';
    return true;
  });

  return (
    <div className="space-y-6 animate-enter">
      <div>
        <h1 className="text-3xl font-heading font-bold" style={{ color: '#1A1208' }}>
          Twoja historia
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(26,18,8,0.55)' }}>
          Postep wizyt, serii zabiegowych i osiagniec w COSMO
        </p>
      </div>

      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard value={data.stats.totalVisits} label="wizyty" />
          <StatCard value={data.stats.uniqueServices} label="rodzajow zabiegow" />
          <StatCard value={data.stats.monthsInCosmo} label="miesiecy w COSMO" />
          <StatCard value={data.stats.tier} label="poziom" isText />
        </div>
      )}

      <div
        className="rounded-[20px] p-6"
        style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-heading font-bold text-lg" style={{ color: '#1A1208' }}>
              Aktywne serie zabiegowe
            </h2>
            <p className="text-sm mt-1" style={{ color: 'rgba(26,18,8,0.55)' }}>
              Os czasu dla zabiegow, ktore wymagaja kilku wizyt.
            </p>
          </div>
        </div>

        {remindersLoading ? (
          <div className="animate-pulse h-24 rounded-2xl mt-4" style={{ background: '#F5F0EB' }} />
        ) : activeSeries.length === 0 ? (
          <div
            className="mt-4 rounded-2xl p-6 text-center text-sm"
            style={{ border: '1px dashed rgba(0,0,0,0.1)', color: '#6B6560' }}
          >
            Brak aktywnych serii wielowizytowych.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {activeSeries.map((series) => (
              <div
                key={series.id}
                className="rounded-2xl p-5"
                style={{ border: '1px solid rgba(0,0,0,0.06)', background: '#FDFAF6' }}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold" style={{ color: '#1A1208' }}>
                        {series.serviceName}
                      </h3>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: 'rgba(184,145,58,0.12)', color: '#8C6040' }}
                      >
                        {series.completedVisits}/{series.totalVisits}
                      </span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: '#6B6560' }}>
                      {series.nextAppointment
                        ? `Kolejny etap ${series.nextAppointment.step}/${series.totalVisits} jest juz umowiony na ${new Date(
                            series.nextAppointment.date,
                          ).toLocaleString('pl-PL')}.`
                        : series.daysUntilDue === null || series.urgency === null
                        ? 'Seria jest w toku.'
                        : `Kolejny etap ${series.nextStep}/${series.totalVisits} powinien zostac umowiony ${
                            series.daysUntilDue < 0
                              ? `${Math.abs(series.daysUntilDue)} dni temu`
                              : series.daysUntilDue === 0
                              ? 'dzisiaj'
                              : `za ${series.daysUntilDue} dni`
                          }.`}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      navigate(series.nextAppointment ? '/user/wizyty' : buildSeriesBookingHref(series))
                    }
                    className="px-4 py-2 rounded-full text-sm font-semibold"
                    style={
                      series.nextAppointment
                        ? { background: 'transparent', color: '#1A1208', border: '1px solid #E8DDD2' }
                        : { background: '#1A1208', color: '#fff' }
                    }
                  >
                    {series.nextAppointment ? 'Zobacz wizyte' : 'Umow sie teraz'}
                  </button>
                </div>

                <div className="md:hidden mt-4">
                  <TreatmentSeriesTrack series={series} onBook={(href) => navigate(href)} />
                </div>

                <div className="hidden md:grid mt-4 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {series.steps.map((step) => {
                    const style = STEP_STYLES[step.status];

                    return (
                      <div
                        key={`${series.id}-${step.step}`}
                        className="rounded-xl p-4"
                        style={{ background: style.background, border: style.border }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: style.color }}>
                            Etap {step.step}
                          </span>
                          <span className="text-[11px] font-semibold" style={{ color: style.color }}>
                            {style.label}
                          </span>
                        </div>

                        <div className="mt-3 text-xs space-y-1" style={{ color: '#4B4036' }}>
                          {step.completedAt && <p>Zakonczono: {new Date(step.completedAt).toLocaleDateString('pl-PL')}</p>}
                          {step.appointmentDate && (
                            <p>Wizyta: {new Date(step.appointmentDate).toLocaleString('pl-PL')}</p>
                          )}
                          {step.dueDate && !step.appointmentDate && (
                            <p>Zalecany termin: {new Date(step.dueDate).toLocaleDateString('pl-PL')}</p>
                          )}
                          {!step.completedAt && !step.appointmentDate && !step.dueDate && <p>Oczekuje na poprzednie etapy.</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {(['all', 'visits', 'achievements'] as Filter[]).map((entry) => (
          <button
            key={entry}
            onClick={() => setFilter(entry)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            style={
              filter === entry
                ? { background: '#1A1208', color: '#fff' }
                : { background: 'transparent', border: '1px solid #E8DDD2', color: '#6B6560' }
            }
          >
            {entry === 'all' ? 'Wszystko' : entry === 'visits' ? 'Wizyty' : 'Osiagniecia'}
          </button>
        ))}
      </div>

      <div
        className="rounded-[20px] p-6"
        style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((entry) => (
              <div key={entry} className="animate-pulse flex gap-4">
                <div className="w-3 h-3 rounded-full bg-[#E8DDD2] mt-1.5" />
                <div className="flex-1">
                  <div className="h-3 w-24 rounded bg-[#E8DDD2] mb-2" />
                  <div className="h-16 rounded-xl bg-[#F5F0EB]" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative pl-8">
            <div
              className="absolute left-[11px] top-2 bottom-2 w-0.5"
              style={{ background: 'linear-gradient(to bottom, #B8913A, #E8DDD2)' }}
            />

            <div className="space-y-6">
              {filtered?.map((item, index) => (
                <TimelineEntry key={index} item={item} />
              ))}
              {filtered?.length === 0 && (
                <div className="py-12 text-center space-y-4">
                  <div
                    className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                    style={{ background: 'rgba(184,145,58,0.1)' }}
                  >
                    <Sparkles size={28} style={{ color: '#B8913A' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#1A1208' }}>
                      Zacznij dokumentować swoją drogę do piękna
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#6B6560' }}>
                      Twoje wizyty i osiągnięcia pojawią się tutaj.
                    </p>
                  </div>
                  <Link
                    to="/rezerwacja"
                    className="inline-flex items-center gap-1.5 py-2 px-5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{ background: '#1A1208', color: '#fff' }}
                  >
                    Umów pierwszą wizytę
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({
  value,
  label,
  isText,
}: {
  value: number | string;
  label: string;
  isText?: boolean;
}) => (
  <div
    className="rounded-2xl p-4 text-center min-h-[80px] flex flex-col items-center justify-center"
    style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}
  >
    <div className={`font-bold font-heading ${isText ? 'text-2xl' : 'text-3xl'}`} style={{ color: '#B8913A' }}>
      {value}
    </div>
    <div className="text-xs mt-1" style={{ color: '#6B6560' }}>
      {label}
    </div>
  </div>
);

const TimelineEntry = ({ item }: { item: TimelineItem }) => {
  const isMilestone = item.type === 'achievement' || item.type === 'loyalty';

  return (
    <div className="relative pl-5">
      <div
        className="absolute -left-5 top-1.5 rounded-full border-[3px]"
        style={
          isMilestone
            ? {
                width: 16,
                height: 16,
                left: -27,
                background: 'linear-gradient(135deg, #B8913A, #D99B68)',
                borderColor: '#FDFAF6',
                boxShadow: '0 0 0 2px #B8913A, 0 0 12px rgba(184,145,58,0.3)',
              }
            : {
                width: 12,
                height: 12,
                left: -25,
                background: '#B8913A',
                borderColor: '#FDFAF6',
                boxShadow: '0 0 0 2px #B8913A',
              }
        }
      />

      <p className="text-xs font-medium mb-1" style={{ color: '#B0A89E' }}>
        {new Date(item.date).toLocaleDateString('pl-PL', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>

      <div
        className="rounded-[14px] p-4"
        style={
          isMilestone
            ? { background: 'rgba(184,145,58,0.08)', border: '1px solid rgba(184,145,58,0.2)' }
            : { background: '#F5F0EB' }
        }
      >
        {item.type === 'visit' && (
          <>
            <h4 className="font-semibold text-sm" style={{ color: '#1A1208' }}>
              {item.data.serviceName}
            </h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {item.data.employeeName && (
                <Badge label={`Specjalista: ${item.data.employeeName}`} bg="rgba(107,101,96,0.1)" color="#6B6560" />
              )}
              {item.data.rating && (
                <span className="inline-flex items-center gap-1">
                  <StarRating value={item.data.rating} readonly size={12} />
                </span>
              )}
              {item.data.pointsEarned && (
                <Badge label={`+${item.data.pointsEarned} pkt`} bg="rgba(16,185,129,0.1)" color="#059669" />
              )}
            </div>
          </>
        )}

        {item.type === 'achievement' && (
          <>
            <h4 className="font-semibold text-sm" style={{ color: '#1A1208' }}>
              {item.data.icon} {item.data.name}
            </h4>
            <p className="text-xs mt-1" style={{ color: '#6B6560' }}>
              {item.data.description}
            </p>
            {item.data.pointsBonus && item.data.pointsBonus > 0 && (
              <Badge label={`+${item.data.pointsBonus} pkt bonusowych`} bg="rgba(184,145,58,0.2)" color="#8C6040" />
            )}
          </>
        )}

        {item.type === 'loyalty' && (
          <>
            <h4 className="font-semibold text-sm" style={{ color: '#1A1208' }}>
              {item.data.description}
            </h4>
            {item.data.points && (
              <Badge
                label={`${item.data.points > 0 ? '+' : ''}${item.data.points} pkt`}
                bg="rgba(184,145,58,0.2)"
                color="#8C6040"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

const Badge = ({ label, bg, color }: { label: string; bg: string; color: string }) => (
  <span
    className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full mt-1"
    style={{ background: bg, color }}
  >
    {label}
  </span>
);
