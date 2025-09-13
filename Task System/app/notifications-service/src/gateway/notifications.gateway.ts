import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { NotificationResponseDto } from '../dto/notification.dto';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>

  afterInit(server: Server) {
    this.server = server;
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token: string | undefined =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers.authorization as string);

      if (!token) {
        this.logger.warn(
          `Client ${client.id} attempted to connect without token`,
        );
        client.disconnect();
        return;
      }

      // Aqui você validaria o JWT token
      // Por simplicidade, vou extrair do query params por enquanto
      const userId = client.handshake.query.userId as string;
      const username = client.handshake.query.username as string;

      if (!userId) {
        this.logger.warn(
          `Client ${client.id} attempted to connect without userId`,
        );
        client.disconnect();
        return;
      }

      client.userId = userId;
      client.username = username;

      // Adicionar usuário à lista de conectados
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);

      // Entrar na sala do usuário
      await client.join(`user:${userId}`);

      this.logger.log(
        `User ${username} (${userId}) connected with socket ${client.id}`,
      );

      // Emitir evento de conexão bem-sucedida
      client.emit('connected', {
        message: 'Successfully connected to notifications',
        userId,
        username,
      });
    } catch (error) {
      this.logger.error(
        `Error during client connection: ${(error as Error).message}`,
      );
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSockets = this.connectedUsers.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(client.userId);
        }
      }

      await client.leave(`user:${client.userId}`);
      this.logger.log(
        `User ${client.username} (${client.userId}) disconnected`,
      );
    }
  }

  @SubscribeMessage('join-task-room')
  async handleJoinTaskRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { taskId: string },
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'User not authenticated' });
      return;
    }

    await client.join(`task:${data.taskId}`);
    this.logger.log(`User ${client.userId} joined task room: ${data.taskId}`);

    client.emit('joined-task-room', { taskId: data.taskId });
  }

  @SubscribeMessage('leave-task-room')
  async handleLeaveTaskRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { taskId: string },
  ) {
    await client.leave(`task:${data.taskId}`);
    this.logger.log(`User ${client.userId} left task room: ${data.taskId}`);

    client.emit('left-task-room', { taskId: data.taskId });
  }

  @SubscribeMessage('mark-notification-read')
  async handleMarkNotificationRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'User not authenticated' });
      return;
    }

    // Aqui você chamaria o service para marcar como lida
    await Promise.resolve();
    this.logger.log(
      `User ${client.userId} marked notification ${data.notificationId} as read`,
    );

    client.emit('notification-marked-read', {
      notificationId: data.notificationId,
    });
  }

  // Métodos para enviar notificações
  async sendNotificationToUser(
    userId: string,
    notification: NotificationResponseDto,
  ) {
    await Promise.resolve();
    this.server.to(`user:${userId}`).emit('notification', notification);
    this.logger.log(
      `Notification sent to user ${userId}: ${notification.title}`,
    );
  }

  async sendNotificationToTaskParticipants(
    taskId: string,
    notification: NotificationResponseDto,
    excludeUserId?: string,
  ) {
    await Promise.resolve();
    if (excludeUserId) {
      // Enviar para todos na sala da task exceto o usuário especificado
      this.server
        .to(`task:${taskId}`)
        .except(`user:${excludeUserId}`)
        .emit('task-notification', notification);
    } else {
      this.server.to(`task:${taskId}`).emit('task-notification', notification);
    }
    this.logger.log(
      `Task notification sent to task ${taskId}: ${notification.title}`,
    );
  }

  async broadcastToAllUsers(notification: NotificationResponseDto) {
    await Promise.resolve();
    this.server.emit('broadcast-notification', notification);
    this.logger.log(`Broadcast notification sent: ${notification.title}`);
  }

  // Status dos usuários conectados
  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  isUserConnected(userId: string): boolean {
    return (
      this.connectedUsers.has(userId) &&
      this.connectedUsers.get(userId)!.size > 0
    );
  }

  getUserSocketCount(userId: string): number {
    return this.connectedUsers.get(userId)?.size || 0;
  }
}
