import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useChatStore } from '@/store/chat.store';
import { skinJournalApi } from '@/api/skin-journal.api';
import { notificationsApi } from '@/api/notifications.api';
import { homecareApi } from '@/api/homecare.api';
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
  Sparkles,
} from 'lucide-react';

const ALL_MENU_ITEMS = [
  { to: '/user',               label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/user/wizyty',        label: 'Moje Wizyty',     icon: Calendar },
  { to: '/user/lojalnosc',     label: 'Punkty',          icon: Star },
  { to: '/user/historia',      label: 'Moja Historia',   icon: Clock },
  { to: '/user/dziennik',      label: 'Dziennik',        icon: BookOpen },
  { to: '/user/rutyna',        label: 'Moja Rutyna',     icon: Sparkles },
  { to: '/user/produkty',      label: 'Moje Produkty',   icon: ShoppingBag },
  { to: '/user/polecenia',     label: 'Program Poleceń', icon: Users },
  { to: '/user/chat',          label: 'Czat',            icon: MessageCircle },
  { to: '/user/powiadomienia', label: 'Powiadomienia',   icon: Bell },
  { to: '/user/profil',        label: 'Mój Profil',      icon: UserIcon },
];

type BottomTab =
  | { isMenu: true; label: string; icon: ElementType }
  | { isMenu?: never; to: string; label: string; icon: ElementType };

const BOTTOM_TABS: BottomTab[] = [
  { to: '/user',             label: 'Dashboard', icon: LayoutDashboard },
  { to: '/user/wizyty',      label: 'Wizyty',    icon: Calendar },
  { to: '/user/lojalnosc',   label: 'Lojalność', icon: Star },
  { to: '/user/chat',        label: 'Chat',      icon: MessageCircle },
  { isMenu: true,            label: 'Więcej',    icon: Menu },
];

export const MobileBottomNav = () => {
  const { isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { unreadCount } = useChatStore();
  const location = useLocation();

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

  if (!isAuthenticated) return null;

  const isActive = (path: string) =>
    path === '/user' ? location.pathname === '/user' : location.pathname.startsWith(path);

  return (
    <>
      {/* Mobile bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t backdrop-blur-md bg-gradient-to-t from-ivory to-ivory/90"
        style={{ borderColor: 'rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-stretch h-16">
          {BOTTOM_TABS.map((tab) => {
            const { label, icon: Icon } = tab;
            if (tab.isMenu) {
              return (
                <button
                  key="menu"
                  onClick={() => setMenuOpen(true)}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium min-h-[44px]"
                  style={{ color: menuOpen ? '#B8913A' : '#6B6560' }}
                >
                  <span className={cn('block h-0.5 rounded-full mx-auto mb-0.5 transition-all duration-200', menuOpen ? 'w-4 bg-caramel' : 'w-0 bg-transparent')} />
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
                className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium relative min-h-[44px]"
                style={{ color }}
              >
                <span className={cn('block h-0.5 rounded-full mx-auto mb-0.5 transition-all duration-200', active ? 'w-4 bg-caramel' : 'w-0 bg-transparent')} />
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
                  {to === '/user/chat' && unreadCount > 0 && (
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
                    <Icon size={20} />
                    <span>{label}</span>
                    {to === '/user/dziennik' && journalUnread > 0 && (
                      <span className="absolute top-2 right-2 text-[9px] rounded-full px-1 font-bold leading-4 min-w-[14px] text-center"
                        style={{ background: '#B8913A', color: '#fff' }}>
                        {journalUnread > 9 ? '9+' : journalUnread}
                      </span>
                    )}
                    {to === '/user/rutyna' && routineUnread > 0 && (
                      <span className="absolute top-2 right-2 text-[9px] rounded-full px-1 font-bold leading-4 min-w-[14px] text-center"
                        style={{ background: '#B8913A', color: '#fff' }}>
                        {routineUnread > 9 ? '9+' : routineUnread}
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
    </>
  );
};
