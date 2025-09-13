import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from '../services/notifications.service';
import {
  CreateNotificationDto,
  NotificationResponseDto,
} from '../dto/notification.dto';
@ApiTags('notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications with pagination' })
  @ApiQuery({ name: 'userId', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of notifications',
    type: [NotificationResponseDto],
  })
  async getUserNotifications(
    @Query('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.notificationsService.getUserNotifications(userId, page, limit);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread notifications' })
  @ApiQuery({ name: 'userId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'List of unread notifications',
    type: [NotificationResponseDto],
  })
  async getUnreadNotifications(@Query('userId') userId: string) {
    return this.notificationsService.getUnreadNotifications(userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiQuery({ name: 'userId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Notification statistics',
  })
  async getNotificationStats(@Query('userId') userId: string) {
    return this.notificationsService.getNotificationStats(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a notification (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Notification created',
    type: NotificationResponseDto,
  })
  async createNotification(
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    const notification = await this.notificationsService.createNotification(
      createNotificationDto,
    );
    return notification;
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiQuery({ name: 'userId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
  })
  async markAsRead(
    @Param('id') notificationId: string,
    @Query('userId') userId: string,
  ) {
    const success = await this.notificationsService.markAsRead(
      notificationId,
      userId,
    );

    return {
      success,
      message: success
        ? 'Notification marked as read'
        : 'Notification not found or already read',
    };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiQuery({ name: 'userId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
  })
  async markAllAsRead(@Query('userId') userId: string) {
    const count = await this.notificationsService.markAllAsRead(userId);

    return {
      success: true,
      message: `${count} notifications marked as read`,
      count,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiQuery({ name: 'userId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted',
  })
  async deleteNotification(
    @Param('id') notificationId: string,
    @Query('userId') userId: string,
  ) {
    const success = await this.notificationsService.deleteNotification(
      notificationId,
      userId,
    );

    return {
      success,
      message: success ? 'Notification deleted' : 'Notification not found',
    };
  }
}

@ApiTags('notifications-admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/notifications')
export class NotificationsAdminController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple notifications (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Notifications created',
  })
  async createBulkNotifications(
    @Body() notifications: CreateNotificationDto[],
  ) {
    const createdNotifications =
      await this.notificationsService.createMultipleNotifications(
        notifications,
      );

    return {
      success: true,
      message: `${createdNotifications.length} notifications created`,
      count: createdNotifications.length,
    };
  }
}
