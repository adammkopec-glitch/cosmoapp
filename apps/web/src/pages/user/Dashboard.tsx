// filepath: apps/web/src/pages/user/Dashboard.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays } from 'date-fns';
import { BellRing, ChevronDown, ChevronUp, Star, Trophy, Calendar, MessageCircle, Bell, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { appointmentsApi } from '@/api/appointments.api';
import { discountCodesApi } from '@/api/discount-codes.api';
import { loyaltyApi } from '@/api/loyalty.api';
import { notificationsApi } from '@/api/notifications.api';
import { reviewsApi } from '@/api/reviews.api';
import { useChatStore } from '@/store/chat.store';
import { DashboardSkeleton } from '@/components/skeletons';
import { RecommendedSlider } from '@/components/dashboard/RecommendedSlider';
import { PendingReviews } from '@/components/reviews/PendingReviews';
import { ReminderCards } from '@/components/reminders/ReminderCards';
import { BadgesGrid } from '@/components/achievements/BadgesGrid';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { DashboardNewsBanner } from '@/components/dashboard/DashboardNewsBanner';
import { DecoLine } from '@/components/shared/DecoElements';

const getNextTierInfo = (completedVisits: number) => {
  if (completedVisits < 30) return { name: 'Srebra', threshold: 30, visitsLeft: 30 - completedVisits };
  if (completedVisits < 100) return { name: 'Złota', threshold: 100, visitsLeft: 100 - completedVisits };
  return { name: null, threshold: completedVisits, visitsLeft: 0 };
};

export const UserDashboard = () => {
  const { user } = useAuth();
  const { permission, isSubscribed, isSupported, subscribe } = usePushSubscription();
  const [ambassadorOpen, setAmbassadorOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [dismissedCompleted, setDismissedCompleted] = useState(false);

  const { unreadCount: chatUnread } = useChatStore();

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

  const { data: notifUnread = 0 } = useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 30_000,
  });

  const { data: pendingReviews = [] } = useQuery({
    queryKey: ['reviews-pending'],
    queryFn: reviewsApi.getPending,
    staleTime: 60_000,
  });

  const upcoming = appointments.filter(
    (appointment: any) => appointment.status === 'PENDING' || appointment.status === 'CONFIRMED',
  );

  const completedVisits = stats?.completedVisits ?? 0;
  const nextTierInfo = getNextTierInfo(completedVisits);

  // Contextual marketing conditions
  const recentCompleted = appointments.find(
    (a: any) =>
      a.status === 'COMPLETED' &&
      differenceInDays(new Date(), new Date(a.date)) < 2,
  );

  const nearTier =
    nextTierInfo.name !== null &&
    completedVisits >= nextTierInfo.threshold * 0.8 &&
    completedVisits < nextTierInfo.threshold;

  const lastVisitDate = appointments.find((a: any) => a.status === 'COMPLETED')?.date;
  const daysSinceLastVisit = lastVisitDate
    ? differenceInDays(new Date(), new Date(lastVisitDate))
    : 999;
  const showReEngagement = !recentCompleted && !nearTier && daysSinceLastVisit > 30;
  const recentCompletedReviewed = recentCompleted
    ? !pendingReviews.some((p) => p.id === recentCompleted.id)
    : false;

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-4 animate-enter">
      {/* Header */}
      <div>
        <DecoLine width={40} className="mb-3" />
        <h1 className="text-2xl font-heading font-bold" style={{ color: '#1A1208' }}>
          Cześć, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'rgba(26,18,8,0.5)' }}>
          {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Status tiles 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/user/wizyty"
          className="rounded-2xl p-4 flex flex-col gap-1.5"
          style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
        >
          <Calendar size={20} style={{ color: '#B8913A' }} />
          <span className="text-[22px] font-bold leading-none" style={{ color: '#1A1208' }}>
            {upcoming.length}
          </span>
          <span className="text-[12px]" style={{ color: 'rgba(26,18,8,0.5)' }}>
            {upcoming.length === 1 ? 'nadchodząca wizyta' : 'nadchodzące wizyty'}
          </span>
        </Link>

        <Link
          to="/user/lojalnosc"
          className="rounded-2xl p-4 flex flex-col gap-1.5"
          style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
        >
          <Trophy size={20} style={{ color: '#B8913A' }} />
          <span className="text-[22px] font-bold leading-none" style={{ color: '#1A1208' }}>
            {user?.loyaltyPoints ?? 0}
          </span>
          <span className="text-[12px]" style={{ color: 'rgba(26,18,8,0.5)' }}>
            pkt · {user?.loyaltyTier ?? 'BRONZE'}
          </span>
          {(() => {
            const TIERS = [
              { label: 'Brąz', segMin: 0, segMax: 499 },
              { label: 'Srebro', segMin: 499, segMax: 1499 },
              { label: 'Złoto', segMin: 1499, segMax: 1500 },
            ];
            const points = user?.loyaltyPoints ?? 0;
            return (
              <div className="space-y-1.5 mt-2">
                <div className="flex rounded-full overflow-hidden h-1.5 gap-0.5">
                  {TIERS.map((tier) => {
                    const fill = Math.min(Math.max(points - tier.segMin, 0), tier.segMax - tier.segMin) / (tier.segMax - tier.segMin);
                    return (
                      <div key={tier.label} className="flex-1 rounded-full bg-caramel/15 overflow-hidden">
                        <div className="h-full bg-caramel rounded-full transition-all duration-700" style={{ width: `${Math.round(fill * 100)}%` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] tracking-[0.15em] uppercase text-muted-foreground">
                  {TIERS.map((t) => <span key={t.label}>{t.label}</span>)}
                </div>
              </div>
            );
          })()}
        </Link>

        <Link
          to="/user/chat"
          className="rounded-2xl p-4 flex flex-col gap-1.5 relative"
          style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
        >
          <MessageCircle size={20} style={{ color: '#B8913A' }} />
          <span className="text-[22px] font-bold leading-none" style={{ color: '#1A1208' }}>
            {chatUnread}
          </span>
          <span className="text-[12px]" style={{ color: 'rgba(26,18,8,0.5)' }}>
            {chatUnread === 0 ? 'brak nowych' : chatUnread === 1 ? 'nowa wiadomość' : 'nowe wiadomości'}
          </span>
        </Link>

        <Link
          to="/user/powiadomienia"
          className="rounded-2xl p-4 flex flex-col gap-1.5"
          style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
        >
          <Bell size={20} style={{ color: '#B8913A' }} />
          <span className="text-[22px] font-bold leading-none" style={{ color: '#1A1208' }}>
            {notifUnread}
          </span>
          <span className="text-[12px]" style={{ color: 'rgba(26,18,8,0.5)' }}>
            {notifUnread === 0 ? 'brak nowych' : 'nowe powiadomienia'}
          </span>
        </Link>
      </div>

      {/* Recommended treatments slider */}
      <RecommendedSlider />

      {/* Primary CTA */}
      <Link
        to="/rezerwacja"
        className="block w-full text-center py-3 rounded-full text-[15px] font-semibold transition-opacity hover:opacity-80"
        style={{ background: '#1A1208', color: '#fff' }}
      >
        + Umów wizytę
      </Link>

      {/* Contextual marketing */}
      {recentCompleted && !dismissedCompleted && (
        <div
          className="rounded-2xl p-4 relative"
          style={{ background: 'rgba(184,145,58,0.06)', border: '1px solid rgba(184,145,58,0.2)' }}
        >
          <button
            onClick={() => setDismissedCompleted(true)}
            className="absolute top-3 right-3 p-0.5 rounded-full hover:opacity-60 transition-opacity"
            style={{ color: 'rgba(26,18,8,0.4)' }}
          >
            <X size={15} />
          </button>
          <p className="text-[13px] font-semibold mb-1" style={{ color: '#1A1208' }}>
            ✓ Wizyta zakończona
          </p>
          <p className="text-[12px] mb-3" style={{ color: 'rgba(26,18,8,0.6)' }}>
            {recentCompleted.service?.name} — jak minęło?
          </p>
          <div className="flex gap-2 items-stretch">
            {recentCompletedReviewed ? (
              <Link
                to="/user/chat"
                className="flex-1 flex items-center justify-center text-center py-2.5 rounded-full text-[12px] font-semibold border"
                style={{ borderColor: '#B8913A', color: '#B8913A' }}
              >
                💬 Napisz na czacie
              </Link>
            ) : (
              <Link
                to="/user/wizyty"
                className="flex-1 flex items-center justify-center text-center py-2.5 rounded-full text-[13px] font-semibold border"
                style={{ borderColor: '#B8913A', color: '#B8913A' }}
              >
                ★ Oceń wizytę
              </Link>
            )}
            <Link
              to="/rezerwacja"
              className="flex-1 flex items-center justify-center text-center py-2.5 rounded-full text-[13px] font-semibold"
              style={{ background: '#1A1208', color: '#fff' }}
            >
              Rezerwuj znowu
            </Link>
          </div>
        </div>
      )}

      {nearTier && (
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(184,145,58,0.08)', border: '1px solid rgba(184,145,58,0.25)' }}
        >
          <p className="text-[13px] font-semibold" style={{ color: '#92400E' }}>
            🎯 Blisko {nextTierInfo.name}! Zostały Ci {nextTierInfo.visitsLeft}{' '}
            {nextTierInfo.visitsLeft === 1 ? 'wizyta' : nextTierInfo.visitsLeft < 5 ? 'wizyty' : 'wizyt'}
          </p>
        </div>
      )}

      {showReEngagement && (
        <div
          className="rounded-2xl p-4 flex items-center justify-between gap-3"
          style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.07)' }}
        >
          <p className="text-[13px]" style={{ color: 'rgba(26,18,8,0.7)' }}>
            Minęło trochę czasu — zadbaj o siebie 💆‍♀️
          </p>
          <Link
            to="/rezerwacja"
            className="shrink-0 py-2 px-4 rounded-full text-[12px] font-semibold"
            style={{ background: '#1A1208', color: '#fff' }}
          >
            Umów
          </Link>
        </div>
      )}

      <DashboardNewsBanner />

      {/* Welcome coupon */}
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

      {/* Active treatment series */}
      <ReminderCards />

      {/* Pending reviews */}
      <PendingReviews />

      {/* Push notification prompt */}
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

      {/* Ambassador code (collapsible) */}
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

      {/* Badges (collapsed on mobile) */}
      <div>
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
        <div className="hidden md:block">
          <BadgesGrid />
        </div>
      </div>
    </div>
  );
};
