// filepath: packages/shared/src/types/chat.types.ts
import { User } from './user.types';

export interface ChatMessagePayload {
  id: string;
  roomId: string;
  senderId: string;
  receiverId: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  readAt?: string | null;
  createdAt: Date;
  sender?: {
    id: string;
    name: string;
    role: string;
    avatarPath?: string | null;
  };
}

export interface ChatRoom {
  id: string;
  userId: string;
  user?: User;
  adminId?: string | null;
  admin?: User | null;
  lastMessageAt: Date;
  userUnread: number;
  adminUnread: number;
  messages?: ChatMessagePayload[];
  createdAt: Date;
}

export interface ServerToClientEvents {
  'chat:message': (msg: ChatMessagePayload) => void;
  'chat:read_receipt': (data: { roomId: string; readAt: string }) => void;
  'chat:typing': (data: { roomId: string; isTyping: boolean }) => void;
  'notification:new': (data: { unreadCount?: number }) => void;
  'notification:achievement': (data: { type: string; achievement: { name: string; description: string; icon: string; pointsBonus: number } }) => void;
  'admin:unread_count': (count: number) => void;
  'staff:unread_count': (count: number) => void;
  'appointment:created': (appointment: Record<string, unknown>) => void;
  'appointment:updated': (appointment: Record<string, unknown>) => void;
  'appointment:deleted': (id: string) => void;
}

export interface ClientToServerEvents {
  'chat:send': (data: { roomId: string; content: string }) => void;
  'chat:typing': (data: { roomId: string; isTyping: boolean }) => void;
  'chat:mark_read': (roomId: string) => void;
  'chat:join_room': (roomId: string) => void;
}
