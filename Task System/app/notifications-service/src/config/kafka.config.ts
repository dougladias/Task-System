import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KafkaConfig {
  constructor(private configService: ConfigService) {}

  getKafkaConfig() {
    return {
      clientId: 'notifications-service',
      brokers: [
        this.configService.get<string>('KAFKA_BROKER') || 'kafka:29092',
      ],
      retry: {
        initialRetryTime: 300,
        retries: 5,
      },
      connectionTimeout: 3000,
      requestTimeout: 25000,
    };
  }

  getConsumerConfig(groupId: string) {
    return {
      groupId,
      heartbeatInterval: 3000,
      sessionTimeout: 10000,
      allowAutoTopicCreation: true,
    };
  }

  getProducerConfig() {
    return {
      allowAutoTopicCreation: true,
      idempotent: true,
      transactionTimeout: 30000,
    };
  }
}

export const KAFKA_TOPICS = {
  TASK_EVENTS: 'task-events',
  COMMENT_EVENTS: 'comment-events',
  USER_EVENTS: 'user-events',
  NOTIFICATION_EVENTS: 'notification-events',
} as const;

export const EVENT_TYPES = {
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_ASSIGNED: 'task.assigned',
  TASK_STATUS_CHANGED: 'task.status_changed',
  COMMENT_ADDED: 'comment.added',
  USER_ASSIGNED: 'user.assigned',
  USER_UNASSIGNED: 'user.unassigned',
} as const;
