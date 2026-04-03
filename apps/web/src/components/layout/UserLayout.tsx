// filepath: apps/web/src/components/layout/UserLayout.tsx
import { useEffect } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/axios';
import { discountCodesApi } from '@/api/discount-codes.api';
import { skinJournalApi } from '@/api/skin-journal.api';
import { notificationsApi } from '@/api/notifications.api';
import { homecareApi } from '@/api/homecare.api';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';
import { useChatStore } from '@/store/chat.store';
import { useSocket } from '@/hooks/useSocket';
import { useAchievementNotifications } from '@/components/achievements/AchievementToast';
import { useReviewPrompt } from '@/hooks/useReviewPrompt';
import { useTour } from '@/hooks/useTour';
import { ReviewPromptModal } from '@/components/reviews/ReviewPromptModal';
import {
  LayoutDashboard,
  Calendar,
  Star,
  Clock,
  BookOpen,
  ShoppingBag,
  Users,
  Bell,
  User as UserIcon,
  Sparkles,
} from 'lucide-react';

const NAV_LINKS = [
  { to: '/user', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/user/wizyty', label: 'Moje Wizyty', icon: Calendar },
  { to: '/user/lojalnosc', label: 'Punkty', icon: Star },
  { to: '/user/historia', label: 'Moja Historia', icon: Clock },
  { to: '/user/dziennik', label: 'Dziennik', icon: BookOpen },
  { to: '/user/rutyna', label: 'Moja Rutyna', icon: Sparkles },
  { to: '/user/produkty', label: 'Moje Produkty', icon: ShoppingBag },
  { to: '/user/polecenia', label: 'Program Poleceń', icon: Users },
  { to: '/user/powiadomienia', label: 'Powiadomienia', icon: Bell },
  { to: '/user/profil', label: 'Mój Profil', icon: UserIcon },
];

export const UserLayout = () => {
  const { isAuthenticated, isLoading, user: storeUser, setUser } = useAuth();
  const { unreadCount, incrementUnread } = useChatStore();
  const queryClient = useQueryClient();

  const { data: journalUnread = 0 } = useQuery<number>({
    queryKey: ['journal', 'unread'],
    queryFn: skinJournalApi.getUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    staleTime: 0,
  });

  const { data: notifUnread = 0 } = useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });

  const { data: routineUnread = 0 } = useQuery<number>({
    queryKey: ['homecare-unread'],
    queryFn: async () => {
      const res = await homecareApi.getUnreadCount();
      return res.data.data.count;
    },
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });
  const { socket, isConnected } = useSocket();
  const location = useLocation();
  useAchievementNotifications();
  useReviewPrompt();

  const { data: welcomeCoupon } = useQuery({
    queryKey: ['discount-codes', 'welcome'],
    queryFn: discountCodesApi.getWelcomeCoupon,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const { data: freshUser } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data.data.user;
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (freshUser && storeUser) {
      setUser({ ...storeUser, ...freshUser });
    }
  }, [freshUser]);

  const { startTour } = useTour();

  useEffect(() => {
    if (freshUser !== undefined && freshUser.onboardingCompleted === false) {
      startTour();
    }
  }, [freshUser, startTour]);

  useEffect(() => {
    if (!isConnected || !socket) return;
    const onMessage = () => {
      if (!location.pathname.startsWith('/user/chat')) {
        incrementUnread();
      }
    };
    socket.on('chat:message', onMessage);
    return () => { socket.off('chat:message', onMessage); };
  }, [isConnected, socket, location.pathname, incrementUnread]);

  useEffect(() => {
    if (!isConnected || !socket) return;
    const onJournalComment = ({ authorName }: { entryId: string; authorName: string }) => {
      queryClient.invalidateQueries({ queryKey: ['journal', 'unread'] });
      toast('💬 Nowy komentarz kosmetologa', {
        description: `${authorName} dodał(a) komentarz do Twojego dziennika`,
        duration: 5000,
        action: {
          label: 'Zobacz',
          onClick: () => { window.location.href = '/user/dziennik'; },
        },
      });
    };
    const onNotificationNew = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['homecare-unread'] });
    };
    socket.on('journal:new-comment', onJournalComment);
    socket.on('notification:new', onNotificationNew);
    return () => {
      socket.off('journal:new-comment', onJournalComment);
      socket.off('notification:new', onNotificationNew);
    };
  }, [isConnected, socket, queryClient]);

  if (isLoading) return <div className="p-8 text-center">Ładowanie...</div>;
  if (!isAuthenticated) return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;

  const isActive = (path: string) =>
    path === '/user' ? location.pathname === '/user' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {welcomeCoupon && (
        <div
          className="text-center py-2.5 px-4 text-sm border-b"
          style={{
            background: 'rgba(184,145,58,0.08)',
            borderColor: 'rgba(184,145,58,0.2)',
            color: 'rgba(26,18,8,0.7)',
          }}
        >
          Masz kod rabatowy dla nowego użytkownika:{' '}
          <strong className="font-mono tracking-wider" style={{ color: '#B8913A' }}>
            {welcomeCoupon.code}
          </strong>
          {' — '}
          {welcomeCoupon.discountType === 'PERCENTAGE'
            ? `${welcomeCoupon.discountValue}% zniżki`
            : `${Number(welcomeCoupon.discountValue).toFixed(2)} zł zniżki`}
          {' '}· Użyj go przy rezerwacji wizyty!
        </div>
      )}

      <div className="container flex-1 flex py-8 gap-8">
        <aside
          className="w-64 hidden md:flex flex-col gap-1 pr-6"
          style={{ borderRight: '1px solid rgba(0,0,0,0.08)' }}
        >
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-3 justify-between"
                style={
                  isActive(to)
                    ? { color: '#B8913A', background: 'rgba(184,145,58,0.08)', fontWeight: 600 }
                    : { color: 'rgba(26,18,8,0.6)' }
                }
              >
                <span className="flex items-center gap-3">
                  <Icon size={18} />
                  <span>{label}</span>
                </span>
                {to === '/user/dziennik' && journalUnread > 0 && (
                  <span className="text-xs rounded-full px-1.5 py-0.5 font-bold" style={{ background: '#B8913A', color: '#fff' }}>
                    {journalUnread > 9 ? '9+' : journalUnread}
                  </span>
                )}
                {to === '/user/rutyna' && routineUnread > 0 && (
                  <span className="text-xs rounded-full px-1.5 py-0.5 font-bold" style={{ background: '#B8913A', color: '#fff' }}>
                    {routineUnread > 9 ? '9+' : routineUnread}
                  </span>
                )}
                {to === '/user/powiadomienia' && notifUnread > 0 && (
                  <span className="text-xs rounded-full px-1.5 py-0.5 font-bold" style={{ background: '#B8913A', color: '#fff' }}>
                    {notifUnread > 9 ? '9+' : notifUnread}
                  </span>
                )}
              </Link>
            ))}

            <Link
              to="/user/chat"
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between"
              style={
                isActive('/user/chat')
                  ? {
                      color: '#B8913A',
                      background: 'rgba(184,145,58,0.08)',
                      fontWeight: 600,
                    }
                  : {
                      color: 'rgba(26,18,8,0.6)',
                    }
              }
            >
              <span>Czat</span>
              {unreadCount > 0 && (
                <span
                  className="text-xs rounded-full px-1.5 py-0.5 font-bold animate-pulse"
                  style={{ background: '#B8913A', color: '#fff' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </nav>

          <div className="mt-4">
            <Link
              to="/rezerwacja"
              className="block w-full text-center py-2.5 px-4 rounded-full text-sm font-semibold transition-all"
              style={{ background: '#1A1208', color: '#fff' }}
            >
              + Umów wizytę
            </Link>
          </div>
        </aside>

        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>

      <Footer />
      <ReviewPromptModal />
      <MobileBottomNav />
    </div>
  );
};
