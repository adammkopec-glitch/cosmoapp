// filepath: apps/server/src/socket.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import { env } from './config/env';
import { verifyToken } from './utils/jwt';
import { ClientToServerEvents, ServerToClientEvents } from '@cosmo/shared';
import { prisma } from './config/prisma';
import { saveMessage, markMessagesAsRead, getStaffUnreadTotal } from './modules/chat/chat.service';
import { createAndEmitNotification } from './modules/notifications/notifications.service';
import { sendPushToUser, sendPushToAdmins } from './modules/push/push.service';

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

export const initializeSocket = (server: Server) => {
  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true
    }
  });

  // Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      const decoded = verifyToken(token, env.JWT_SECRET) as { id: string; role: string };
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.data.user;
    console.log(`User connected: ${user.id} (${user.role})`);

    // Verify user actually exists in DB before proceeding
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } }).catch(() => null);
    if (!dbUser) {
      console.warn(`Socket connection rejected: user ${user.id} not found in DB`);
      socket.disconnect(true);
      return;
    }

    socket.join(`user:${user.id}`);

    try {
      if (user.role === 'ADMIN') {
        socket.join('admin:global');
        const total = await getStaffUnreadTotal();
        socket.emit('admin:unread_count', total);
      } else if (user.role === 'EMPLOYEE') {
        socket.join('employee:global');
        const total = await getStaffUnreadTotal();
        socket.emit('staff:unread_count', total);
      } else {
        // USER: auto-join their chat room and broadcast notifications room
        socket.join('broadcast:notifications');
        let room = await prisma.chatRoom.findUnique({ where: { userId: user.id } });
        if (!room) {
          room = await prisma.chatRoom.create({ data: { userId: user.id } });
        }
        socket.join(`room:${room.id}`);
      }
    } catch (err) {
      console.error(`Socket connection setup error for user ${user.id}:`, err);
      socket.disconnect(true);
    }

    socket.on('chat:join_room', (roomId) => {
      if (user.role === 'ADMIN' || user.role === 'EMPLOYEE') {
        socket.join(`room:${roomId}`);
      }
    });

    socket.on('chat:typing', ({ roomId, isTyping }) => {
      socket.to(`room:${roomId}`).emit('chat:typing', { roomId, isTyping });
    });

    socket.on('chat:send', async ({ roomId, content }) => {
      try {
        const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
        if (!room) return;

        let receiverId: string;
        if (user.role === 'USER') {
          if (room.adminId) {
            receiverId = room.adminId;
          } else {
            const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
            receiverId = admin?.id || user.id;
          }
        } else {
          receiverId = room.userId;
        }

        const message = await saveMessage(roomId, user.id, receiverId, content);
        io.to(`room:${roomId}`).emit('chat:message', message as any);

        if (user.role === 'USER') {
          const total = await getStaffUnreadTotal();
          io.to('admin:global').emit('admin:unread_count', total);
          io.to('employee:global').emit('staff:unread_count', total);
        }

        try {
          if (user.role === 'USER') {
            const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
            for (const admin of admins) {
              await createAndEmitNotification(io, {
                userId: admin.id,
                type: 'CHAT_MESSAGE',
                title: 'Nowa wiadomość',
                body: `${dbUser.name ?? 'Klient'}: ${content.substring(0, 80)}`,
                url: '/admin/chat',
                emitToAdminGlobal: true,
              });
            }
            await sendPushToAdmins({ title: 'Nowa wiadomość od klienta', body: `${dbUser.name ?? 'Klient'} napisał/a w chacie`, url: '/admin/chat' });
          } else {
            await createAndEmitNotification(io, {
              userId: room.userId,
              type: 'CHAT_MESSAGE',
              title: 'Nowa wiadomość od kosmetologa',
              body: content.substring(0, 80),
              url: '/user/chat',
            });
            await sendPushToUser(room.userId, { title: 'Nowa wiadomość', body: 'Kosmetolog odpowiedział/a w chacie', url: '/user/chat' });
          }
        } catch (err) {
          console.error('Notification delivery failed (chat:send):', err);
        }
      } catch (err) {
        console.error('chat:send error:', err);
      }
    });

    socket.on('chat:mark_read', async (roomId) => {
      try {
        const readAt = await markMessagesAsRead(roomId, user.id);
        io.to(`room:${roomId}`).emit('chat:read_receipt', { roomId, readAt: readAt.toISOString() });

        if (user.role !== 'USER') {
          const total = await getStaffUnreadTotal();
          io.to('admin:global').emit('admin:unread_count', total);
          io.to('employee:global').emit('staff:unread_count', total);
        }
      } catch (err) {
        console.error('chat:mark_read error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${user.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
