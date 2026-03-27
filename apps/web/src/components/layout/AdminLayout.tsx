// filepath: apps/web/src/components/layout/AdminLayout.tsx
import { useEffect, useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { ChevronDown, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from './Navbar';
import { useSocket } from '@/hooks/useSocket';
import { useChatStore } from '@/store/chat.store';
import { useNotificationStore } from '@/store/notification.store';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { consultationsApi } from '@/api/consultations.api';
import { notificationsApi } from '@/api/notifications.api';

export const AdminLayout = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [pagesOpen, setPagesOpen] = useState(
    () =>
      location.pathname.startsWith('/admin/hero') ||
      location.pathname.startsWith('/admin/o-nas') ||
      location.pathname.startsWith('/admin/uslugi') ||
      location.pathname.startsWith('/admin/blog') ||
      location.pathname.startsWith('/admin/metamorfozy')
  );
  const [discountsOpen, setDiscountsOpen] = useState(
    () => location.pathname.startsWith('/admin/kody-rabatowe') || location.pathname.startsWith('/admin/lojalnosc')
  );
  const [staffOpen, setStaffOpen] = useState(
    () =>
      location.pathname.startsWith('/admin/wizyty') ||
      location.pathname.startsWith('/admin/konsultacje') ||
      location.pathname.startsWith('/admin/praca') ||
      location.pathname.startsWith('/admin/pracownicy')
  );
  const { socket, isConnected } = useSocket();
  const { staffUnreadTotal, setStaffUnreadTotal } = useChatStore();
  const { addNotification, unreadCount, markAllRead } = useNotificationStore();
  const { isSupported, isSubscribed, permission, subscribe } = usePushSubscription();

  const { data: newLeads = [] } = useQuery({
    queryKey: ['admin', 'consultations', 'active'],
    queryFn: consultationsApi.getActive,
    refetchInterval: 60_000,
    enabled: isAuthenticated && isAdmin,
  });
  const newLeadsCount = newLeads.length;

  const { data: adminNotifUnread = 0 } = useQuery<number>({
    queryKey: ['admin', 'notifications', 'unread-count'],
    queryFn: notificationsApi.getUnreadCount,
    enabled: isAuthenticated && isAdmin,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!isConnected || !socket) return;

    const onAdminUnread = (count: number) => setStaffUnreadTotal(count);

    const onCreated = (appt: any) => {
      addNotification({
        type: 'created',
        message: `Nowa wizyta: ${appt.user?.name ?? ''} — ${appt.service?.name ?? ''}`,
        appointmentId: appt.id,
        clientName: appt.user?.name,
        serviceName: appt.service?.name,
        timestamp: Date.now(),
      });
      toast.info(`Nowa wizyta: ${appt.user?.name ?? ''}`, {
        description: appt.service?.name,
      });
    };

    const onUpdated = (appt: any) => {
      addNotification({
        type: 'updated',
        message: `Zaktualizowana wizyta: ${appt.user?.name ?? ''} — ${appt.service?.name ?? ''}`,
        appointmentId: appt.id,
        clientName: appt.user?.name,
        serviceName: appt.service?.name,
        timestamp: Date.now(),
      });
      toast.info(`Zmiana wizyty: ${appt.user?.name ?? ''}`, {
        description: appt.service?.name,
      });
    };

    const onDeleted = (id: string) => {
      addNotification({
        type: 'deleted',
        message: `Wizyta usunięta (ID: ${String(id).slice(0, 8)})`,
        timestamp: Date.now(),
      });
    };

    const onNotificationNew = () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'unread-count'] });
    };

    socket.on('admin:unread_count', onAdminUnread);
    socket.on('appointment:created', onCreated);
    socket.on('appointment:updated', onUpdated);
    socket.on('appointment:deleted', onDeleted);
    socket.on('notification:new', onNotificationNew);

    return () => {
      socket.off('admin:unread_count', onAdminUnread);
      socket.off('appointment:created', onCreated);
      socket.off('appointment:updated', onUpdated);
      socket.off('appointment:deleted', onDeleted);
      socket.off('notification:new', onNotificationNew);
    };
  }, [isConnected, socket, setStaffUnreadTotal, addNotification, queryClient]);

  const totalStaffBadge = unreadCount + newLeadsCount;

  if (isLoading) return <div className="p-8 text-center">Ładowanie...</div>;
  if (!isAuthenticated || !isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 bg-card border-r flex flex-col hidden md:flex">
          <div className="p-6 font-heading font-semibold text-lg border-b">Administracja</div>
          <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
            <Link to="/admin" className="px-4 py-2 hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium">Dashboard</Link>
            <Link
              to="/admin/powiadomienia"
              className="px-4 py-2 hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium flex items-center gap-2"
            >
              <Bell className="h-4 w-4" />
              <span>Powiadomienia</span>
              {adminNotifUnread > 0 && (
                <span className="ml-auto bg-destructive text-white text-xs rounded-full px-1.5 min-w-[1.25rem] text-center animate-pulse">
                  {adminNotifUnread > 9 ? '9+' : adminNotifUnread}
                </span>
              )}
            </Link>
            <div>
              <button
                onClick={() => setStaffOpen(o => !o)}
                className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
              >
                <span>Pracownik</span>
                <div className="flex items-center gap-1.5">
                  {!staffOpen && totalStaffBadge > 0 && (
                    <span className="bg-destructive text-white text-xs rounded-full px-1.5 min-w-[1.25rem] text-center animate-pulse">
                      {totalStaffBadge > 9 ? '9+' : totalStaffBadge}
                    </span>
                  )}
                  <ChevronDown size={14} className={staffOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </div>
              </button>
              {staffOpen && (
                <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
                  <Link
                    to="/admin/wizyty"
                    onClick={markAllRead}
                    className={`px-3 py-1.5 text-sm rounded-md flex items-center justify-between ${
                      unreadCount > 0
                        ? 'bg-destructive/10 text-destructive animate-pulse font-semibold'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <span>Wizyty</span>
                    {unreadCount > 0 && (
                      <span className="bg-destructive text-white text-xs rounded-full px-1.5 min-w-[1.25rem] text-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/admin/konsultacje"
                    className="px-3 py-1.5 text-sm rounded-md flex items-center justify-between hover:bg-accent hover:text-accent-foreground"
                  >
                    <span>Konsultacje</span>
                    {newLeadsCount > 0 && (
                      <span className="bg-primary text-white text-xs rounded-full px-1.5 min-w-[1.25rem] text-center">
                        {newLeadsCount > 9 ? '9+' : newLeadsCount}
                      </span>
                    )}
                  </Link>
                  <Link to="/admin/praca" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Praca
                  </Link>
                  <Link to="/admin/pracownicy" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Pracownicy
                  </Link>
                </div>
              )}
            </div>
            <Link to="/admin/uzytkownicy" className="px-4 py-2 hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium">Użytkownicy</Link>
            <div>
              <button
                onClick={() => setPagesOpen(o => !o)}
                className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
              >
                <span>Edycja stron</span>
                <ChevronDown size={14} className={pagesOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {pagesOpen && (
                <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
                  <Link to="/admin/hero" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Slider strony głównej
                  </Link>
                  <Link to="/admin/o-nas" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Strona „O nas"
                  </Link>
                  <Link to="/admin/uslugi" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Zarządzaj Usługami
                  </Link>
                  <Link to="/admin/blog" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Wpisy na Blogu
                  </Link>
                  <Link to="/admin/metamorfozy" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Metamorfozy
                  </Link>
                </div>
              )}
            </div>
            <div>
              <button
                onClick={() => setDiscountsOpen(o => !o)}
                className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
              >
                <span>Zniżki</span>
                <ChevronDown size={14} className={discountsOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {discountsOpen && (
                <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
                  <Link to="/admin/kody-rabatowe" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Kody Rabatowe
                  </Link>
                  <Link to="/admin/lojalnosc" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Program Lojalnościowy
                  </Link>
                </div>
              )}
            </div>
            <Link to="/admin/regulamin" className="px-4 py-2 hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium">Regulamin</Link>
            <Link to="/admin/quizy" className="px-4 py-2 hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium">Quizy</Link>
            <Link to="/admin/recenzje" className="px-4 py-2 hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium">Recenzje</Link>
            <Link to="/admin/chat" className="px-4 py-2 hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium flex items-center justify-between">
              <span>Wiadomości (Chat)</span>
              {staffUnreadTotal > 0 && (
                <span className="bg-destructive text-white text-xs rounded-full px-1.5 animate-pulse">
                  {staffUnreadTotal > 9 ? '9+' : staffUnreadTotal}
                </span>
              )}
            </Link>
          </nav>
          {isSupported && !isSubscribed && permission !== 'denied' && (
            <div className="p-4 border-t">
              <button
                onClick={subscribe}
                className="w-full text-xs px-3 py-2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
              >
                🔔 Włącz powiadomienia push
              </button>
            </div>
          )}
        </aside>
        <main className="flex-1 p-8 overflow-y-auto bg-background/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
