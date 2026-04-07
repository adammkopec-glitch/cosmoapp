// filepath: apps/web/src/pages/user/Dashboard.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BellRing, ChevronDown, ChevronUp, Star, Trophy, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { appointmentsApi } from '@/api/appointments.api';
import { discountCodesApi } from '@/api/discount-codes.api';
import { loyaltyApi } from '@/api/loyalty.api';
import { DashboardSkeleton } from '@/components/skeletons';
import { PendingReviews } from '@/components/reviews/PendingReviews';
import { ReminderCards } from '@/components/reminders/ReminderCards';
import { BadgesGrid } from '@/components/achievements/BadgesGrid';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { DashboardNewsBanner } from '@/components/dashboard/DashboardNewsBanner';

const getNextTierInfo = (completedVisits: number) => {
  if (completedVisits < 30) return { name: 'Srebra', visitsLeft: 30 - completedVisits };
  if (completedVisits < 100) return { name: 'Złota', visitsLeft: 100 - completedVisits };
  return { name: null, visitsLeft: 0 };
};

export const UserDashboard = () => {
  const { user } = useAuth();
  const { permission, isSubscribed, isSupported, subscribe } = usePushSubscription();
  const [ambassadorOpen, setAmbassadorOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);

  const { data: appointments = [], isLoading } = useQuery<any[]>({
    queryKey: ['appointments', 'me'],
    queryFn: appointmentsApi.getMy,
  });

  const { data: welcomeCoupon } = useQuery<any | null>({
    queryKey: ['discount-codes', 'welcome'],
    queryFn: discountCodesApi.getWelcomeCoupon,
    staleTime: 60_000,
  });

  const { data: stats } = useQuery<{ completedVisits: number }>({
    queryKey: ['loyalty', 'stats'],
    queryFn: loyaltyApi.getStats,
  });

  const upcoming = appointments.filter(
    (appointment: any) => appointment.status === 'PENDING' || appointment.status === 'CONFIRMED',
  );

  const nextAppointment = upcoming[0];

  const nextTierInfo = getNextTierInfo(stats?.completedVisits ?? 0);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-4 animate-enter">
      {/* Section 1: Hero strip */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'rgba(184,145,58,0.05)',
          border: '1px solid rgba(184,145,58,0.15)',
        }}
      >
        <h1 className="text-3xl font-heading font-bold" style={{ color: '#1A1208' }}>
          Cześć, {user?.name}!
        </h1>
        {nextAppointment ? (
          <div className="mt-2 flex items-center gap-2">
            <Calendar size={14} style={{ color: '#B8913A' }} />
            <span className="text-sm font-medium" style={{ color: 'rgba(26,18,8,0.7)' }}>
              Następna wizyta:{' '}
              <span className="font-semibold" style={{ color: '#1A1208' }}>
                {nextAppointment.service?.name}
              </span>{' '}
              —{' '}
              <span style={{ color: '#B8913A' }}>
                {new Date(nextAppointment.date).toLocaleDateString('pl-PL', {
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </span>
          </div>
        ) : (
          <div className="mt-3">
            <Link
              to="/rezerwacja"
              className="inline-flex items-center gap-1 px-5 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: '#1A1208', color: '#fff' }}
            >
              Umów wizytę →
            </Link>
          </div>
        )}
      </div>

      <DashboardNewsBanner />

      {/* Welcome coupon (shown above quick chips if present) */}
      {welcomeCoupon && (
        <div
          className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
          style={{
            border: '1px solid rgba(184,145,58,0.25)',
            background: 'rgba(184,145,58,0.05)',
          }}
        >
          <div className="flex-1">
            <p className="font-semibold mb-1" style={{ color: '#1A1208' }}>
              Masz powitalny kod rabatowy
            </p>
            <p
              className="font-mono text-2xl font-bold tracking-widest mb-1"
              style={{ color: '#B8913A' }}
            >
              {welcomeCoupon.code}
            </p>
            <p className="text-sm" style={{ color: 'rgba(26,18,8,0.6)' }}>
              Zniżka:{' '}
              <strong>
                {welcomeCoupon.discountType === 'PERCENTAGE'
                  ? `${welcomeCoupon.discountValue}%`
                  : `${Number(welcomeCoupon.discountValue).toFixed(2)} zł`}
              </strong>{' '}
              — wpisz ją w ostatnim kroku rezerwacji.
            </p>
          </div>
          <Link
            to="/rezerwacja"
            className="py-2.5 px-5 rounded-full text-sm font-semibold shrink-0 transition-opacity hover:opacity-80"
            style={{ background: '#1A1208', color: '#fff' }}
          >
            Umów wizytę
          </Link>
        </div>
      )}

      {/* Section 2: Quick-action chips */}
      <div className="overflow-x-auto flex gap-3 pb-2" style={{ scrollbarWidth: 'none' }}>
        <Link
          to="/rezerwacja"
          className="shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: '#1A1208', color: '#fff' }}
        >
          Zarezerwuj wizytę
        </Link>
        <Link
          to="/user/lojalnosc"
          className="shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
          style={{
            border: '1px solid #B8913A',
            color: '#B8913A',
            background: 'transparent',
          }}
        >
          ✦ {user?.loyaltyPoints ?? 0} pkt
        </Link>
        <Link
          to="/user/wizyty"
          className="shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
          style={{
            border: '1px solid rgba(26,18,8,0.2)',
            color: '#1A1208',
            background: 'transparent',
          }}
        >
          Moje wizyty
        </Link>
      </div>

      {/* Section 3: Active treatment series */}
      <ReminderCards />

      {/* Section 4: Pending reviews */}
      <PendingReviews />

      {/* Section 5: Loyalty mini-card */}
      <div
        className="rounded-[20px] p-5"
        style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
      >
        {nextTierInfo.name && nextTierInfo.visitsLeft === 1 && (
          <div
            className="rounded-xl p-3 text-sm font-semibold mb-4"
            style={{ background: 'rgba(184,145,58,0.12)', color: '#92400E' }}
          >
            ⭐ Jeszcze 1 wizyta do {nextTierInfo.name}!
          </div>
        )}
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(184,145,58,0.15)' }}
          >
            <Trophy size={20} style={{ color: '#B8913A' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold" style={{ color: '#B8913A' }}>
                {user?.loyaltyPoints ?? 0}
              </span>
              <span className="text-sm" style={{ color: 'rgba(26,18,8,0.55)' }}>
                punktów
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(184,145,58,0.15)', color: '#B8913A' }}
              >
                {user?.loyaltyTier ?? 'BRONZE'}
              </span>
              {nextTierInfo.name && (
                <span className="text-xs" style={{ color: 'rgba(26,18,8,0.5)' }}>
                  {nextTierInfo.visitsLeft} wizyt do {nextTierInfo.name}
                </span>
              )}
            </div>
          </div>
          <Link
            to="/user/lojalnosc"
            className="shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-opacity hover:opacity-80"
            style={{ borderColor: 'rgba(0,0,0,0.15)', color: '#1A1208' }}
          >
            Szczegóły
          </Link>
        </div>
      </div>

      {/* Section 6: Ambassador code (collapsible) */}
      <div
        className="rounded-[20px] overflow-hidden"
        style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
      >
        <button
          onClick={() => setAmbassadorOpen((v) => !v)}
          className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-gray-50"
        >
          <span className="font-heading font-bold text-base" style={{ color: '#1A1208' }}>
            Twój kod ambasadorski
          </span>
          {ambassadorOpen ? (
            <ChevronUp size={18} style={{ color: 'rgba(26,18,8,0.4)' }} />
          ) : (
            <ChevronDown size={18} style={{ color: 'rgba(26,18,8,0.4)' }} />
          )}
        </button>
        {ambassadorOpen && (
          <div className="px-5 pb-5 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <p
              className="font-mono text-2xl font-bold tracking-widest mt-4 mb-2"
              style={{ color: '#B8913A' }}
            >
              {user?.ambassadorCode ?? '-'}
            </p>
            <p className="text-sm mb-2" style={{ color: 'rgba(26,18,8,0.55)' }}>
              Udostępnij go znajomym — przy rejestracji otrzymają kod rabatowy.
            </p>
            <p className="text-sm" style={{ color: 'rgba(26,18,8,0.7)' }}>
              Rejestracje z Twojego kodu:{' '}
              <span className="font-bold" style={{ color: '#1A1208' }}>
                {user?.referralCount ?? 0}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Section 7: Push notification prompt */}
      {isSupported && !isSubscribed && permission !== 'denied' && (
        <div
          className="rounded-[20px] p-5 flex flex-col sm:flex-row sm:items-center gap-4"
          style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
        >
          <div
            className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0"
            style={{ background: 'rgba(184,145,58,0.1)' }}
          >
            <BellRing size={22} style={{ color: '#B8913A' }} />
          </div>
          <div className="flex-1">
            <p className="font-semibold" style={{ color: '#1A1208' }}>
              Włącz przypomnienia push o kolejnych etapach
            </p>
            <p className="text-sm mt-1" style={{ color: 'rgba(26,18,8,0.55)' }}>
              Otrzymasz sygnał 3 dni przed terminem, w dniu terminu i co 7 dni po terminie.
            </p>
          </div>
          <button
            onClick={() => void subscribe()}
            className="px-4 py-2 rounded-full text-sm font-semibold shrink-0"
            style={{ background: '#1A1208', color: '#fff' }}
          >
            Włącz push
          </button>
        </div>
      )}

      {/* Section 8: Badges (collapsed on mobile, always shown on md+) */}
      <div>
        {/* Mobile toggle */}
        <div className="md:hidden">
          <button
            onClick={() => setBadgesOpen((v) => !v)}
            className="w-full flex items-center justify-between p-4 rounded-2xl transition-colors"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
          >
            <span className="font-heading font-bold text-base flex items-center gap-2" style={{ color: '#1A1208' }}>
              <Star size={16} style={{ color: '#B8913A' }} />
              Pokaż osiągnięcia
            </span>
            {badgesOpen ? (
              <ChevronUp size={18} style={{ color: 'rgba(26,18,8,0.4)' }} />
            ) : (
              <ChevronDown size={18} style={{ color: 'rgba(26,18,8,0.4)' }} />
            )}
          </button>
          {badgesOpen && (
            <div className="mt-3">
              <BadgesGrid />
            </div>
          )}
        </div>

        {/* Desktop: always visible */}
        <div className="hidden md:block">
          <BadgesGrid />
        </div>
      </div>
    </div>
  );
};
