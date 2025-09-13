import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { NotificationsGateway } from '../gateway/notifications.gateway';

@ApiTags('health')
@Controller('health')
export class NotificationsHealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Notifications service health check' })
  @ApiResponse({ status: 200, description: 'Health status' })
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.websocketHealthIndicator('websocket'),
    ]);
  }

  @Get('websocket')
  @ApiOperation({ summary: 'WebSocket health check' })
  @ApiResponse({ status: 200, description: 'WebSocket status' })
  checkWebSocket() {
    try {
      const connectedUsers = this.notificationsGateway.getConnectedUsers();
      const totalConnections = connectedUsers.reduce(
        (total, userId) =>
          total + this.notificationsGateway.getUserSocketCount(userId),
        0,
      );

      return {
        websocket: {
          status: 'up',
          connectedUsers: connectedUsers.length,
          totalConnections,
          message: 'WebSocket Gateway is operational',
        },
      };
    } catch (error) {
      return {
        websocket: {
          status: 'down',
          message: (error as Error).message,
        },
      };
    }
  }

  @Get('notifications/stats')
  @ApiOperation({ summary: 'Notifications service statistics' })
  @ApiResponse({ status: 200, description: 'Service statistics' })
  async getStats() {
    await Promise.resolve();
    const connectedUsers = this.notificationsGateway.getConnectedUsers();
    const totalConnections = connectedUsers.reduce(
      (total, userId) =>
        total + this.notificationsGateway.getUserSocketCount(userId),
      0,
    );

    return {
      service: 'notifications-service',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      websocket: {
        connectedUsers: connectedUsers.length,
        totalConnections,
        users: connectedUsers,
      },
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV,
    };
  }

  private async websocketHealthIndicator(
    key: string,
  ): Promise<HealthIndicatorResult> {
    try {
      await Promise.resolve();
      const connectedUsers = this.notificationsGateway.getConnectedUsers();
      return {
        [key]: {
          status: 'up',
          connectedUsers: connectedUsers.length,
          message: 'WebSocket Gateway is operational',
        },
      };
    } catch (error) {
      return {
        [key]: {
          status: 'down',
          message: (error as Error).message,
        },
      };
    }
  }
}
