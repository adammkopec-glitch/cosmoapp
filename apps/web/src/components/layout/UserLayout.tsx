// filepath: apps/web/src/components/layout/UserLayout.tsx
import { useEffect, useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/axios';
import { discountCodesApi } from '@/api/discount-codes.api';
import { skinJournalApi } from '@/api/skin-journal.api';
import { notificationsApi } from '@/api/notifications.api';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useChatStore } from '@/store/chat.store';
import { useSocket } from '@/hooks/useSocket';
import { useAchievementNotifications } from '@/components/achievements/AchievementToast';
import { useReviewPrompt } from '@/hooks/useReviewPrompt';
import { ReviewPromptModal } from '@/components/reviews/ReviewPromptModal';
import type { ElementType } from 'react';
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
  Menu,
  X,
  MessageCircle,
} from 'lucide-react';

const ALL_MENU_ITEMS = [
  { to: '/user',               label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/user/wizyty',        label: 'Moje Wizyty',     icon: Calendar },
  { to: '/user/lojalnosc',     label: 'Punkty',          icon: Star },
  { to: '/user/historia',      label: 'Moja Historia',   icon: Clock },
  { to: '/user/dziennik',      label: 'Dziennik',        icon: BookOpen },
  { to: '/user/produkty',      label: 'Moje Produkty',   icon: ShoppingBag },
  { to: '/user/polecenia',     label: 'Program Poleceń', icon: Users },
  { to: '/user/chat',          label: 'Czat',            icon: MessageCircle },
  { to: '/user/powiadomienia', label: 'Powiadomienia',   icon: Bell },
  { to: '/user/profil',        label: 'Mój Profil',      icon: UserIcon },
];

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

type BottomTab =
  | { isMenu: true; label: string; icon: ElementType }
  | { isMenu?: never; to: string; label: string; icon: ElementType };

const BOTTOM_TABS: BottomTab[] = [
  { isMenu: true,              label: 'Menu',          icon: Menu },
  { to: '/user/wizyty',        label: 'Wizyty',        icon: Calendar },
  { to: '/user/dziennik',      label: 'Dziennik',      icon: BookOpen },
  { to: '/user/powiadomienia', label: 'Powiadomienia', icon: Bell },
  { to: '/user/profil',        label: 'Profil',        icon: UserIcon },
];

export const UserLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
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
    socket.on('journal:new-comment' as any, onJournalComment);
    socket.on('notification:new', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    });
    return () => {
      socket.off('journal:new-comment' as any, onJournalComment);
      socket.off('notification:new');
    };
  }, [isConnected, socket, queryClient]);

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

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t"
        style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-stretch h-16">
          {BOTTOM_TABS.map((tab) => {
            const { label, icon: Icon } = tab;
            if (tab.isMenu) {
              return (
                <button
                  key="menu"
                  onClick={() => setMenuOpen(true)}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium"
                  style={{ color: menuOpen ? '#B8913A' : '#6B6560' }}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </button>
              );
            }
            const { to } = tab;
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
                  {to === '/user/dziennik' && journalUnread > 0 && (
                    <span
                      className="absolute -top-1 -right-1 text-[9px] rounded-full px-1 font-bold leading-4 min-w-[14px] text-center"
                      style={{ background: '#B8913A', color: '#fff' }}
                    >
                      {journalUnread > 9 ? '9+' : journalUnread}
                    </span>
                  )}
                  {to === '/user/powiadomienia' && notifUnread > 0 && (
                    <span
                      className="absolute -top-1 -right-1 text-[9px] rounded-full px-1 font-bold leading-4 min-w-[14px] text-center"
                      style={{ background: '#B8913A', color: '#fff' }}
                    >
                      {notifUnread > 9 ? '9+' : notifUnread}
                    </span>
                  )}
                </div>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      {/* Mobile Menu Sheet */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-[59] md:hidden"
            onClick={() => setMenuOpen(false)}
          />

          {/* Sheet */}
          <div
            className="fixed inset-x-0 bottom-0 z-[60] md:hidden bg-white rounded-t-3xl"
            style={{ maxHeight: '82vh', overflowY: 'auto' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-base font-semibold" style={{ color: '#1A1208' }}>Menu</span>
              <button onClick={() => setMenuOpen(false)} style={{ color: 'rgba(26,18,8,0.5)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Tiles grid */}
            <div className="grid grid-cols-2 gap-3 px-4 pb-4">
              {ALL_MENU_ITEMS.map(({ to, label, icon: Icon }) => {
                const active = isActive(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium transition-all relative"
                    style={
                      active
                        ? { background: 'rgba(184,145,58,0.08)', borderColor: 'rgba(184,145,58,0.3)', color: '#B8913A' }
                        : { background: '#FAFAF9', borderColor: 'rgba(0,0,0,0.07)', color: '#1A1208' }
                    }
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                    {to === '/user/dziennik' && journalUnread > 0 && (
                      <span className="absolute top-2 right-2 text-[9px] rounded-full px-1 font-bold leading-4 min-w-[14px] text-center"
                        style={{ background: '#B8913A', color: '#fff' }}>
                        {journalUnread > 9 ? '9+' : journalUnread}
                      </span>
                    )}
                    {to === '/user/chat' && unreadCount > 0 && (
                      <span className="absolute top-2 right-2 text-[9px] rounded-full px-1 font-bold leading-4 min-w-[14px] text-center"
                        style={{ background: '#B8913A', color: '#fff' }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                    {to === '/user/powiadomienia' && notifUnread > 0 && (
                      <span className="absolute top-2 right-2 text-[9px] rounded-full px-1 font-bold leading-4 min-w-[14px] text-center"
                        style={{ background: '#B8913A', color: '#fff' }}>
                        {notifUnread > 9 ? '9+' : notifUnread}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* CTA */}
            <div className="px-4 pb-6">
              <Link
                to="/rezerwacja"
                onClick={() => setMenuOpen(false)}
                className="block w-full text-center py-3 px-4 rounded-full text-sm font-semibold"
                style={{ background: '#1A1208', color: '#fff' }}
              >
                + Umów wizytę
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
