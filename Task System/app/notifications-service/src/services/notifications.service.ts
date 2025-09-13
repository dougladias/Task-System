import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationEntity,
  NotificationType,
  NotificationStatus,
} from '../entities/notification.entity';
import {
  CreateNotificationDto,
  NotificationResponseDto,
} from '../dto/notification.dto';
import { NotificationsGateway } from '../gateway/notifications.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async createNotification(
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationEntity> {
    const notification = this.notificationRepository.create(
      createNotificationDto,
    );
    const savedNotification =
      await this.notificationRepository.save(notification);

    this.logger.log(
      `Notification created: ${savedNotification.id} for user ${savedNotification.userId}`,
    );

    // Enviar via WebSocket se o usuário estiver conectado
    await this.sendNotificationIfUserOnline(savedNotification);

    return savedNotification;
  }

  async createMultipleNotifications(
    notifications: CreateNotificationDto[],
  ): Promise<NotificationEntity[]> {
    const notificationEntities =
      this.notificationRepository.create(notifications);
    const savedNotifications =
      await this.notificationRepository.save(notificationEntities);

    this.logger.log(`${savedNotifications.length} notifications created`);

    // Enviar via WebSocket para usuários online
    for (const notification of savedNotifications) {
      await this.sendNotificationIfUserOnline(notification);
    }

    return savedNotifications;
  }

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    notifications: NotificationResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const [notifications, total] =
      await this.notificationRepository.findAndCount({
        where: { userId },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      notifications: notifications.map(this.toResponseDto),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadNotifications(
    userId: string,
  ): Promise<NotificationResponseDto[]> {
    const notifications = await this.notificationRepository.find({
      where: {
        userId,
        status: NotificationStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    return notifications.map(this.toResponseDto);
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.notificationRepository.update(
      { id: notificationId, userId },
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(
        `Notification ${notificationId} marked as read by user ${userId}`,
      );
      return true;
    }

    return false;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationRepository.update(
      {
        userId,
        status: NotificationStatus.PENDING,
      },
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    );

    this.logger.log(
      `${result.affected || 0} notifications marked as read for user ${userId}`,
    );
    return result.affected || 0;
  }

  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<boolean> {
    const result = await this.notificationRepository.delete({
      id: notificationId,
      userId,
    });

    return result.affected ? result.affected > 0 : false;
  }

  async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    read: number;
  }> {
    const [total, unread] = await Promise.all([
      this.notificationRepository.count({ where: { userId } }),
      this.notificationRepository.count({
        where: {
          userId,
          status: NotificationStatus.PENDING,
        },
      }),
    ]);

    return {
      total,
      unread,
      read: total - unread,
    };
  }

  // Métodos específicos para diferentes tipos de notificação
  async notifyTaskCreated(
    taskId: string,
    title: string,
    assignedUsers: string[],
    createdBy: string,
    createdByUsername: string,
  ): Promise<void> {
    const notifications = assignedUsers.map((userId) => ({
      userId,
      type: NotificationType.TASK_CREATED,
      title: 'Nova tarefa atribuída',
      message: `${createdByUsername} criou a tarefa "${title}" e atribuiu a você`,
      taskId,
      taskTitle: title,
      triggeredBy: createdBy,
      triggeredByUsername: createdByUsername,
      data: { taskId, title, assignedUsers },
    }));

    await this.createMultipleNotifications(notifications);
  }

  async notifyTaskUpdated(
    taskId: string,
    title: string,
    participantUsers: string[],
    updatedBy: string,
    updatedByUsername: string,
    changes: Record<string, any>,
  ): Promise<void> {
    // Não notificar quem fez a alteração
    const usersToNotify = participantUsers.filter(
      (userId) => userId !== updatedBy,
    );

    if (usersToNotify.length === 0) return;

    const notifications = usersToNotify.map((userId) => ({
      userId,
      type: NotificationType.TASK_UPDATED,
      title: 'Tarefa atualizada',
      message: `${updatedByUsername} atualizou a tarefa "${title}"`,
      taskId,
      taskTitle: title,
      triggeredBy: updatedBy,
      triggeredByUsername: updatedByUsername,
      data: { taskId, title, changes },
    }));

    await this.createMultipleNotifications(notifications);
  }

  async notifyCommentAdded(
    taskId: string,
    taskTitle: string,
    participantUsers: string[],
    authorId: string,
    authorUsername: string,
    commentContent: string,
  ): Promise<void> {
    // Não notificar quem fez o comentário
    const usersToNotify = participantUsers.filter(
      (userId) => userId !== authorId,
    );

    if (usersToNotify.length === 0) return;

    const notifications = usersToNotify.map((userId) => ({
      userId,
      type: NotificationType.COMMENT_ADDED,
      title: 'Novo comentário',
      message: `${authorUsername} comentou na tarefa "${taskTitle}": "${commentContent.substring(0, 100)}${commentContent.length > 100 ? '...' : ''}"`,
      taskId,
      taskTitle,
      triggeredBy: authorId,
      triggeredByUsername: authorUsername,
      data: { taskId, taskTitle, commentContent },
    }));

    await this.createMultipleNotifications(notifications);
  }

  private async sendNotificationIfUserOnline(
    notification: NotificationEntity,
  ): Promise<void> {
    const responseDto = this.toResponseDto(notification);

    if (this.notificationsGateway.isUserConnected(notification.userId)) {
      await this.notificationsGateway.sendNotificationToUser(
        notification.userId,
        responseDto,
      );

      // Marcar como enviada
      await this.notificationRepository.update(
        { id: notification.id },
        {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        },
      );
    }
  }

  private toResponseDto(
    notification: NotificationEntity,
  ): NotificationResponseDto {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      status: notification.status,
      taskId: notification.taskId,
      taskTitle: notification.taskTitle,
      triggeredBy: notification.triggeredBy,
      triggeredByUsername: notification.triggeredByUsername,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
      sentAt: notification.sentAt,
    };
  }
}
