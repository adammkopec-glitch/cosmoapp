import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Calendar, Star, Clock, CheckCheck } from 'lucide-react';
import { notificationsApi, type Notification } from '@/api/notifications.api';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/useSocket';

const CHIP_MAP: Record<string, { label: string; fallbackUrl: string }> = {
  APPOINTMENT_CONFIRMED:   { label: 'Wizyta',       fallbackUrl: '/user/wizyty' },
  APPOINTMENT_CANCELLED:   { label: 'Wizyta',       fallbackUrl: '/user/wizyty' },
  APPOINTMENT_RESCHEDULED: { label: 'Wizyta',       fallbackUrl: '/user/wizyty' },
  CHAT_MESSAGE:            { label: 'Chat',         fallbackUrl: '/user/chat' },
  ACHIEVEMENT_UNLOCKED:    { label: 'Osiągnięcie',  fallbackUrl: '/user/wizyty' },
  LOYALTY_POINTS:          { label: 'Punkty',       fallbackUrl: '/user/lojalnosc' },
  LOYALTY_TIER_UP:         { label: 'Lojalność',    fallbackUrl: '/user/lojalnosc' },
  JOURNAL_COMMENT:         { label: 'Dziennik',     fallbackUrl: '/user/dziennik' },
  RECOMMENDATION_ADDED:    { label: 'Produkty',     fallbackUrl: '/user/produkty' },
  SERIES_REMINDER:         { label: 'Seria',        fallbackUrl: '/user/wizyty' },
  BROADCAST:               { label: 'Promocja',     fallbackUrl: '/' },
  GENERIC:                 { label: 'Info',         fallbackUrl: '/' },
};

function getIconConfig(type: Notification['type']): { icon: React.ReactNode; dot: string } {
  switch (type) {
    case 'APPOINTMENT_CONFIRMED':
      return {
        icon: <Calendar size={18} className="text-green-500" />,
        dot: 'bg-green-500',
      };
    case 'APPOINTMENT_CANCELLED':
      return {
        icon: <Calendar size={18} className="text-red-500" />,
        dot: 'bg-red-500',
      };
    case 'APPOINTMENT_RESCHEDULED':
      return {
        icon: <Calendar size={18} className="text-yellow-500" />,
        dot: 'bg-yellow-500',
      };
    case 'LOYALTY_POINTS':
    case 'LOYALTY_TIER_UP':
      return {
        icon: <Star size={18} style={{ color: '#B8913A' }} />,
        dot: 'bg-yellow-600',
      };
    case 'SERIES_REMINDER':
      return {
        icon: <Clock size={18} className="text-blue-500" />,
        dot: 'bg-blue-500',
      };
    default:
      return {
        icon: <Bell size={18} className="text-gray-400" />,
        dot: 'bg-gray-400',
      };
  }
}

function groupByDate(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayStr = today.toDateString();
  const yesterdayStr = yesterday.toDateString();

  const groups: Record<string, Notification[]> = {};
  for (const n of notifications) {
    const d = new Date(n.createdAt).toDateString();
    const label = d === todayStr ? 'Dziś' : d === yesterdayStr ? 'Wczoraj' : 'Starsze';
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }

  const order = ['Dziś', 'Wczoraj', 'Starsze'];
  return order.filter((l) => groups[l]).map((label) => ({ label, items: groups[label] }));
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMin < 60) {
    return `${diffMin} min. temu`;
  }
  if (diffHours < 24) {
    return `${diffHours} godz. temu`;
  }
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function SkeletonItem() {
  return (
    <div className="flex gap-3 p-4 rounded-xl animate-pulse">
      <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-1/4" />
      </div>
    </div>
  );
}

export const UserNotifications = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { socket } = useSocket();

  const [initiallyUnreadIds, setInitiallyUnreadIds] = useState<Set<string>>(new Set());
  const hasMarkedRef = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll(1, 20),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
    onError: () => {
      toast.error('Nie udało się oznaczyć wszystkich powiadomień');
    },
  });

  useEffect(() => {
    if (!data || hasMarkedRef.current) return;
    hasMarkedRef.current = true;
    const unreadIds = new Set(
      data.notifications.filter(n => !n.readAt).map(n => n.id)
    );
    setInitiallyUnreadIds(unreadIds);
    if (unreadIds.size > 0) {
      markAllReadMutation.mutate();
    }
  }, [data]);

  const handleClick = (n: Notification) => {
    let target = n.url ?? CHIP_MAP[n.type]?.fallbackUrl ?? '/';
    try {
      const parsed = new URL(target);
      target = parsed.pathname + parsed.search + parsed.hash;
    } catch {
      // already a relative path, use as-is
    }
    navigate(target);
  };

  useEffect(() => {
    if (!socket) return;
    const onNotificationNew = () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    };
    socket.on('notification:new', onNotificationNew);
    return () => { socket.off('notification:new', onNotificationNew); };
  }, [socket, qc]);

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="space-y-6 animate-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell size={24} style={{ color: '#B8913A' }} />
          <h1
            className="font-heading text-2xl font-semibold"
            style={{ color: '#1A1208' }}
          >
            Powiadomienia
          </h1>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: 'rgba(184,145,58,0.08)',
              color: '#B8913A',
              border: '1px solid rgba(184,145,58,0.2)',
            }}
          >
            <CheckCheck size={16} />
            Oznacz wszystkie jako przeczytane
          </button>
        )}
      </div>

      {/* Notifications card */}
      <div
        className="rounded-[20px] p-6"
        style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
      >
        {isLoading ? (
          <div className="space-y-1">
            <SkeletonItem />
            <SkeletonItem />
            <SkeletonItem />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(184,145,58,0.08)' }}
            >
              <Bell size={28} style={{ color: '#B8913A' }} />
            </div>
            <p className="text-gray-500 text-sm">
              Nie masz jeszcze żadnych powiadomień
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupByDate(notifications).map(({ label, items }) => (
              <div key={label}>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2 px-1" style={{ color: 'rgba(26,18,8,0.4)' }}>
                  {label}
                </p>
                <div className="space-y-1">
                  {items.map((notification) => {
                    const isUnread = initiallyUnreadIds.has(notification.id);
                    const { icon } = getIconConfig(notification.type);

                    return (
                      <div
                        key={notification.id}
                        onClick={() => handleClick(notification)}
                        className="flex gap-3 p-4 rounded-xl cursor-pointer transition-colors hover:bg-gray-50 relative min-h-[64px]"
                        style={
                          isUnread
                            ? { background: 'rgba(184,145,58,0.04)' }
                            : { background: '#fff' }
                        }
                      >
                        {/* Unread gold bar */}
                        {isUnread && (
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2/3 rounded-r-full"
                            style={{ background: '#B8913A' }}
                          />
                        )}

                        {/* Icon */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(0,0,0,0.04)' }}
                        >
                          {icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[14px] leading-snug ${isUnread ? 'font-semibold' : 'font-normal'}`}
                            style={{ color: '#1A1208' }}
                          >
                            {notification.title}
                          </p>
                          <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: '#6B5A4E' }}>
                            {notification.body}
                          </p>
                          <p className="text-[11px] mt-1" style={{ color: '#B8913A' }}>
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>

                        {/* Chip */}
                        <span
                          className="shrink-0 whitespace-nowrap self-start mt-1 text-xs font-bold rounded-full px-2.5 py-0.5"
                          style={{
                            background: isUnread ? '#B8913A' : 'rgba(0,0,0,0.06)',
                            color: isUnread ? '#000' : '#888',
                          }}
                        >
                          {CHIP_MAP[notification.type]?.label ?? 'Info'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
