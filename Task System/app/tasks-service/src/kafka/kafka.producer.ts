import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor(private readonly configService: ConfigService) {
    this.kafka = new Kafka({
      clientId: 'tasks-service',
      brokers: [this.configService.get<string>('KAFKA_BROKER') || 'kafka:29092'],
      retry: {
        initialRetryTime: 1000,
        retries: 20,
        maxRetryTime: 3000,
      },
      connectionTimeout: 3000,
      requestTimeout: 25000,
    });
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      idempotent: true,
      transactionTimeout: 30000,
    });
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.logger.log('Kafka producer connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect Kafka producer:', error);
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      this.logger.log('Kafka producer disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting Kafka producer:', error);
    }
  }

  async publishEvent(topic: string, eventType: string, data: any): Promise<void> {
    try {
      const message = {
        key: data.taskId || data.id,
        value: JSON.stringify(data),
        headers: {
          eventType,
          timestamp: new Date().toISOString(),
          source: 'tasks-service',
        },
      };

      await this.producer.send({
        topic,
        messages: [message],
      });

      this.logger.log(`Event published: ${eventType} to topic ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to publish event ${eventType}:`, error);
      throw error;
    }
  }

  // Eventos específicos do tasks-service
  async publishTaskCreated(taskData: {
    taskId: string;
    title: string;
    description: string;
    assignedUsers: string[];
    createdBy: string;
    createdByUsername: string;
    priority: string;
    status: string;
    dueDate?: Date;
    createdAt: Date;
  }): Promise<void> {
    await this.publishEvent('task-events', 'task.created', {
      ...taskData,
      type: 'task.created',
    });
  }

  async publishTaskUpdated(taskData: {
    taskId: string;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assignedUsers: string[];
    updatedBy: string;
    updatedByUsername: string;
    changes: Record<string, { from: any; to: any }>;
    updatedAt: Date;
  }): Promise<void> {
    await this.publishEvent('task-events', 'task.updated', {
      ...taskData,
      type: 'task.updated',
    });
  }

  async publishTaskAssigned(taskData: {
    taskId: string;
    title: string;
    assignedTo: string;
    assignedBy: string;
    assignedByUsername: string;
    assignedAt: Date;
  }): Promise<void> {
    await this.publishEvent('task-events', 'task.assigned', {
      ...taskData,
      type: 'task.assigned',
    });
  }

  async publishTaskStatusChanged(taskData: {
    taskId: string;
    title: string;
    oldStatus: string;
    newStatus: string;
    assignedUsers: string[];
    updatedBy: string;
    updatedByUsername: string;
    updatedAt: Date;
  }): Promise<void> {
    await this.publishEvent('task-events', 'task.status_changed', {
      ...taskData,
      type: 'task.status_changed',
      changes: {
        status: {
          from: taskData.oldStatus,
          to: taskData.newStatus,
        },
      },
    });
  }

  async publishTaskDeleted(taskData: {
    taskId: string;
    title: string;
    assignedUsers: string[];
    deletedBy: string;
    deletedByUsername: string;
    deletedAt: Date;
  }): Promise<void> {
    await this.publishEvent('task-events', 'task.deleted', {
      ...taskData,
      type: 'task.deleted',
    });
  }

  async publishCommentAdded(commentData: {
    taskId: string;
    taskTitle: string;
    commentId: string;
    content: string;
    authorId: string;
    authorUsername: string;
    participantUsers: string[];
    createdAt: Date;
  }): Promise<void> {
    await this.publishEvent('comment-events', 'comment.added', {
      ...commentData,
      type: 'comment.added',
    });
  }

  async publishCommentUpdated(commentData: {
    taskId: string;
    taskTitle: string;
    commentId: string;
    content: string;
    authorId: string;
    authorUsername: string;
    participantUsers: string[];
    updatedAt: Date;
  }): Promise<void> {
    await this.publishEvent('comment-events', 'comment.updated', {
      ...commentData,
      type: 'comment.updated',
    });
  }

  async publishCommentDeleted(commentData: {
    taskId: string;
    taskTitle: string;
    commentId: string;
    authorId: string;
    authorUsername: string;
    participantUsers: string[];
    deletedAt: Date;
  }): Promise<void> {
    await this.publishEvent('comment-events', 'comment.deleted', {
      ...commentData,
      type: 'comment.deleted',
    });
  }
}