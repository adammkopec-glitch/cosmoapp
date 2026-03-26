// filepath: apps/web/src/components/layout/UserLayout.tsx
import { useEffect } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/axios';
import { discountCodesApi } from '@/api/discount-codes.api';
import { skinJournalApi } from '@/api/skin-journal.api';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useChatStore } from '@/store/chat.store';
import { useSocket } from '@/hooks/useSocket';
import { useAchievementNotifications } from '@/components/achievements/AchievementToast';
import { useReviewPrompt } from '@/hooks/useReviewPrompt';
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
} from 'lucide-react';

const NAV_LINKS = [
  { to: '/user', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/user/wizyty', label: 'Moje Wizyty', icon: Calendar },
  { to: '/user/lojalnosc', label: 'Punkty', icon: Star },
  { to: '/user/historia', label: 'Moja Historia', icon: Clock },
  { to: '/user/dziennik', label: 'Dziennik', icon: BookOpen },
  { to: '/user/produkty', label: 'Moje Produkty', icon: ShoppingBag },
  { to: '/user/polecenia', label: 'Program Poleceń', icon: Users },
  { to: '/user/powiadomienia', label: 'Powiadomienia', icon: Bell },
  { to: '/user/profil', label: 'Mój Profil', icon: UserIcon },
];

const BOTTOM_TABS = [
  { to: '/user', label: 'Dashboard', icon: LayoutDashboard, showBadge: false },
  { to: '/user/wizyty', label: 'Wizyty', icon: Calendar, showBadge: false },
  { to: '/user/historia', label: 'Historia', icon: Clock, showBadge: false },
  { to: '/user/powiadomienia', label: 'Powiadomienia', icon: Bell, showBadge: true },
  { to: '/user/profil', label: 'Profil', icon: UserIcon, showBadge: false },
];

export const UserLayout = () => {
  const { isAuthenticated, isLoading, user: storeUser, setUser } = useAuth();
  const { unreadCount, incrementUnread } = useChatStore();

  const { data: journalUnread = 0 } = useQuery<number>({
    queryKey: ['journal', 'unread'],
    queryFn: skinJournalApi.getUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    staleTime: 15_000,
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

  if (isLoading) return <div className="p-8 text-center">Ładowanie...</div>;
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;

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
                  <Icon size={16} />
                  <span>{label}</span>
                </span>
                {to === '/user/dziennik' && journalUnread > 0 && (
                  <span className="text-xs rounded-full px-1.5 py-0.5 font-bold" style={{ background: '#B8913A', color: '#fff' }}>
                    {journalUnread > 9 ? '9+' : journalUnread}
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

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t"
        style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-stretch h-16">
          {BOTTOM_TABS.map(({ to, label, icon: Icon, showBadge }) => {
            const active = isActive(to);
            const color = active ? '#B8913A' : '#6B6560';
            return (
              <Link
                key={to}
                to={to}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium relative"
                style={{ color }}
              >
                <div className="relative">
                  <Icon size={20} />
                  {showBadge && unreadCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 text-[9px] rounded-full px-1 font-bold leading-4 min-w-[14px] text-center"
                      style={{ background: '#B8913A', color: '#fff' }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
