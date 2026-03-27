import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Calendar, MessageSquare, Star, CheckCheck, Send } from 'lucide-react';
import { notificationsApi, type Notification } from '@/api/notifications.api';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/useSocket';

const CHIP_MAP: Record<string, { label: string; fallbackUrl: string }> = {
  NEW_APPOINTMENT:         { label: 'Wizyta',       fallbackUrl: '/admin/wizyty' },
  NEW_CONSULTATION:        { label: 'Konsultacja',  fallbackUrl: '/admin/konsultacje' },
  NEW_REVIEW:              { label: 'Recenzja',     fallbackUrl: '/admin/recenzje' },
  CHAT_MESSAGE:            { label: 'Chat',         fallbackUrl: '/admin/chat' },
  APPOINTMENT_CONFIRMED:   { label: 'Wizyta',       fallbackUrl: '/admin/wizyty' },
  APPOINTMENT_CANCELLED:   { label: 'Wizyta',       fallbackUrl: '/admin/wizyty' },
  APPOINTMENT_RESCHEDULED: { label: 'Wizyta',       fallbackUrl: '/admin/wizyty' },
  BROADCAST:               { label: 'Wysłano',      fallbackUrl: '/admin/powiadomienia' },
  GENERIC:                 { label: 'Info',         fallbackUrl: '/admin' },
};

function getIconConfig(type: Notification['type']): React.ReactNode {
  switch (type) {
    case 'NEW_APPOINTMENT':
    case 'APPOINTMENT_CONFIRMED':
      return <Calendar size={18} className="text-green-500" />;
    case 'APPOINTMENT_CANCELLED':
      return <Calendar size={18} className="text-red-500" />;
    case 'APPOINTMENT_RESCHEDULED':
      return <Calendar size={18} className="text-yellow-500" />;
    case 'NEW_CONSULTATION':
      return <Star size={18} className="text-blue-500" />;
    case 'NEW_REVIEW':
      return <Star size={18} style={{ color: '#B8913A' }} />;
    case 'CHAT_MESSAGE':
      return <MessageSquare size={18} className="text-purple-500" />;
    default:
      return <Bell size={18} className="text-gray-400" />;
  }
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
      <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-1/4" />
      </div>
    </div>
  );
}

export const AdminNotifications = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { socket } = useSocket();

  // Broadcast form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');

  // Notifications list
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'notifications', { limit: 50 }],
    queryFn: () => notificationsApi.getAll(1, 50), // TODO: add load-more pagination
  });

  const broadcastMutation = useMutation({
    mutationFn: (payload: { title: string; body: string; url?: string }) =>
      notificationsApi.broadcast(payload),
    onSuccess: (res: { data: { sent: number } }) => {
      const sent = res.data.sent;
      toast.success(`Wysłano do ${sent} użytkowników`);
      setTitle('');
      setBody('');
      setUrl('');
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      qc.invalidateQueries({ queryKey: ['admin', 'notifications', 'unread-count'] });
    },
    onError: () => {
      toast.error('Nie udało się wysłać powiadomienia');
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      qc.invalidateQueries({ queryKey: ['admin', 'notifications', 'unread-count'] });
    },
    onError: () => {
      toast.error('Nie udało się oznaczyć powiadomienia jako przeczytane');
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      qc.invalidateQueries({ queryKey: ['admin', 'notifications', 'unread-count'] });
      toast.success('Wszystkie powiadomienia oznaczone jako przeczytane');
    },
    onError: () => {
      toast.error('Nie udało się oznaczyć wszystkich powiadomień');
    },
  });

  const handleClick = (n: Notification) => {
    const target = n.url ?? CHIP_MAP[n.type]?.fallbackUrl ?? '/admin';
    if (!n.readAt) markReadMutation.mutate(n.id);
    navigate(target);
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    broadcastMutation.mutate({ title: title.trim(), body: body.trim(), url: url.trim() || undefined });
  };

  useEffect(() => {
    if (!socket) return;
    const onNotificationNew = () => {
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      qc.invalidateQueries({ queryKey: ['admin', 'notifications', 'unread-count'] });
    };
    socket.on('notification:new', onNotificationNew);
    return () => { socket.off('notification:new', onNotificationNew); };
  }, [socket, qc]);

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Bell size={24} className="text-primary" />
        <h1 className="font-heading text-2xl font-semibold">Powiadomienia</h1>
      </div>

      {/* Section 1: Broadcast form */}
      <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold">Wyślij powiadomienie do wszystkich użytkowników</h2>
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tytuł <span className="text-destructive">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Tytuł powiadomienia"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Treść <span className="text-destructive">*</span></label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Treść powiadomienia"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">URL (opcjonalnie)</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="https:// lub /sciezka (opcjonalnie)"
            />
          </div>
          <button
            type="submit"
            disabled={!title.trim() || !body.trim() || broadcastMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={15} />
            Wyślij do wszystkich
          </button>
        </form>
      </div>

      {/* Section 2: Notification list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Lista powiadomień</h2>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors bg-card border hover:bg-accent"
            >
              <CheckCheck size={16} />
              Oznacz wszystkie jako przeczytane
            </button>
          )}
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm">
          {isLoading ? (
            <div className="space-y-1">
              <SkeletonItem />
              <SkeletonItem />
              <SkeletonItem />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-muted">
                <Bell size={28} className="text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">Brak powiadomień</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => {
                const isUnread = !notification.readAt;
                const icon = getIconConfig(notification.type);

                return (
                  <div
                    key={notification.id}
                    onClick={() => handleClick(notification)}
                    className="flex gap-3 p-4 rounded-xl cursor-pointer transition-colors hover:bg-accent relative"
                    style={isUnread ? { background: 'rgba(184,145,58,0.04)' } : undefined}
                  >
                    {/* Unread indicator bar */}
                    {isUnread && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2/3 rounded-r-full"
                        style={{ background: '#B8913A' }}
                      />
                    )}

                    {/* Icon */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-muted">
                      {icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${isUnread ? 'font-semibold' : 'font-normal'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {notification.body}
                      </p>
                      <p className="text-xs mt-1 text-primary">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>

                    {/* Type chip */}
                    <span
                      className="shrink-0 whitespace-nowrap self-start mt-1 text-xs font-bold rounded-full px-2.5 py-0.5"
                      style={{
                        background: notification.readAt ? 'rgba(0,0,0,0.06)' : '#B8913A',
                        color: notification.readAt ? '#888' : '#000',
                      }}
                    >
                      {CHIP_MAP[notification.type]?.label ?? 'Info'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
