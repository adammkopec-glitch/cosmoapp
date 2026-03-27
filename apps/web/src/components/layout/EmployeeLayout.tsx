import { useEffect } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useSocket } from '@/hooks/useSocket';
import { useChatStore } from '@/store/chat.store';

export const EmployeeLayout = () => {
  const { isAuthenticated, isEmployee, isLoading } = useAuth();
  const location = useLocation();
  const { socket, isConnected } = useSocket();
  const { staffUnreadTotal, setStaffUnreadTotal } = useChatStore();

  useEffect(() => {
    if (!isConnected || !socket) return;
    const onStaffUnread = (count: number) => setStaffUnreadTotal(count);
    socket.on('staff:unread_count', onStaffUnread);
    return () => { socket.off('staff:unread_count', onStaffUnread); };
  }, [isConnected, socket, setStaffUnreadTotal]);

  if (isLoading) return <div className="p-8 text-center">Ładowanie...</div>;
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (!isEmployee) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container flex-1 flex py-8 gap-8">
        <aside className="w-64 border-r pr-4 hidden md:block">
          <div className="mb-4 px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Panel Pracownika
          </div>
          <nav className="flex flex-col gap-1">
            <NavLink to="/employee/terminarz" label="Mój Terminarz" current={location.pathname} />
            <NavLink to="/employee/wizyty" label="Moje Wizyty" current={location.pathname} />
            <NavLink to="/employee/asortyment" label="Asortyment" current={location.pathname} />
            <NavLinkBadge to="/employee/chat" label="Wiadomości" badge={staffUnreadTotal} current={location.pathname} />
            <div className="my-2 border-t" />
            <NavLink to="/user" label="Panel Klienta" current={location.pathname} />
          </nav>
        </aside>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
};

function NavLink({ to, label, current }: { to: string; label: string; current: string }) {
  const isActive = current === to || current.startsWith(to + '/');
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-accent'
      }`}
    >
      {label}
    </Link>
  );
}

function NavLinkBadge({ to, label, badge, current }: { to: string; label: string; badge: number; current: string }) {
  const isActive = current === to || current.startsWith(to + '/');
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-between ${
        isActive ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-accent'
      }`}
    >
      <span>{label}</span>
      {badge > 0 && (
        <span className="bg-primary text-white text-xs rounded-full px-1.5 animate-pulse">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}
