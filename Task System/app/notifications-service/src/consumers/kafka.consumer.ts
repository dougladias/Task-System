import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { KafkaConfig, KAFKA_TOPICS, EVENT_TYPES } from '../config/kafka.config';
import { NotificationsService } from '../services/notifications.service';
import {
  TaskCreatedEvent,
  TaskUpdatedEvent,
  TaskAssignedEvent,
  CommentAddedEvent,
  UserAssignedEvent,
  UserUnassignedEvent,
} from '../dto/notification.dto';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;

  constructor(
    private readonly kafkaConfig: KafkaConfig,
    private readonly notificationsService: NotificationsService,
  ) {
    this.kafka = new Kafka(this.kafkaConfig.getKafkaConfig());
    this.consumer = this.kafka.consumer(
      this.kafkaConfig.getConsumerConfig('notifications-service-group'),
    );
  }

  async onModuleInit() {
    try {
      await this.consumer.connect();
      this.logger.log('Kafka consumer connected successfully');

      await this.consumer.subscribe({
        topics: [
          KAFKA_TOPICS.TASK_EVENTS,
          KAFKA_TOPICS.COMMENT_EVENTS,
          KAFKA_TOPICS.USER_EVENTS,
        ],
        fromBeginning: false,
      });

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });

      this.logger.log('Kafka consumer started and listening to topics');
    } catch (error) {
      this.logger.error('Failed to initialize Kafka consumer:', error);
    }
  }

  async onModuleDestroy() {
    try {
      await this.consumer.disconnect();
      this.logger.log('Kafka consumer disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting Kafka consumer:', error);
    }
  }

  private async handleMessage(payload: EachMessagePayload) {
    const { topic, partition, message } = payload;

    try {
      if (!message.value) {
        this.logger.warn('Received message with no value');
        return;
      }

      const eventData: Record<string, any> = JSON.parse(
        message.value.toString(),
      ) as Record<string, any>;
      const eventType: string =
        message.headers?.eventType?.toString() ||
        (eventData.type as string) ||
        'unknown';

      this.logger.log(
        `Processing message: topic=${topic}, partition=${partition}, eventType=${eventType}`,
      );

      switch (topic) {
        case KAFKA_TOPICS.TASK_EVENTS:
          await this.handleTaskEvent(eventType, eventData);
          break;
        case KAFKA_TOPICS.COMMENT_EVENTS:
          await this.handleCommentEvent(eventType, eventData);
          break;
        case KAFKA_TOPICS.USER_EVENTS:
          await this.handleUserEvent(eventType, eventData);
          break;
        default:
          this.logger.warn(`Unknown topic: ${topic}`);
      }
    } catch (error) {
      this.logger.error(`Error processing message from topic ${topic}:`, error);
      // Aqui você poderia implementar dead letter queue ou retry logic
    }
  }

  private async handleTaskEvent(eventType: string, eventData: any) {
    switch (eventType) {
      case EVENT_TYPES.TASK_CREATED:
        await this.handleTaskCreated(eventData as TaskCreatedEvent);
        break;
      case EVENT_TYPES.TASK_UPDATED:
        await this.handleTaskUpdated(eventData as TaskUpdatedEvent);
        break;
      case EVENT_TYPES.TASK_ASSIGNED:
        await this.handleTaskAssigned(eventData as TaskAssignedEvent);
        break;
      case EVENT_TYPES.TASK_STATUS_CHANGED:
        await this.handleTaskStatusChanged(eventData as TaskUpdatedEvent);
        break;
      default:
        this.logger.warn(`Unknown task event type: ${eventType}`);
    }
  }

  private async handleCommentEvent(eventType: string, eventData: any) {
    switch (eventType) {
      case EVENT_TYPES.COMMENT_ADDED:
        await this.handleCommentAdded(eventData as CommentAddedEvent);
        break;
      default:
        this.logger.warn(`Unknown comment event type: ${eventType}`);
    }
  }

  private async handleUserEvent(eventType: string, eventData: any) {
    switch (eventType) {
      case EVENT_TYPES.USER_ASSIGNED:
        await this.handleUserAssigned(eventData as UserAssignedEvent);
        break;
      case EVENT_TYPES.USER_UNASSIGNED:
        await this.handleUserUnassigned(eventData as UserUnassignedEvent);
        break;
      default:
        this.logger.warn(`Unknown user event type: ${eventType}`);
    }
  }

  // Handlers específicos para cada tipo de evento
  private async handleTaskCreated(event: TaskCreatedEvent) {
    this.logger.log(`Handling task created: ${event.taskId}`);

    try {
      await this.notificationsService.notifyTaskCreated(
        event.taskId,
        event.title,
        event.assignedUsers,
        event.createdBy,
        event.createdByUsername,
      );
    } catch (error) {
      this.logger.error(
        `Error handling task created event: ${(error as Error).message}`,
      );
    }
  }

  private async handleTaskUpdated(event: TaskUpdatedEvent) {
    this.logger.log(`Handling task updated: ${event.taskId}`);

    try {
      await this.notificationsService.notifyTaskUpdated(
        event.taskId,
        event.title,
        event.assignedUsers,
        event.updatedBy,
        event.updatedByUsername,
        event.changes,
      );
    } catch (error) {
      this.logger.error(
        `Error handling task updated event: ${(error as Error).message}`,
      );
    }
  }

  private async handleTaskAssigned(event: TaskAssignedEvent) {
    this.logger.log(
      `Handling task assigned: ${event.taskId} to ${event.assignedTo}`,
    );

    try {
      await this.notificationsService.notifyTaskCreated(
        event.taskId,
        event.title,
        [event.assignedTo],
        event.assignedBy,
        event.assignedByUsername,
      );
    } catch (error) {
      this.logger.error(
        `Error handling task assigned event: ${(error as Error).message}`,
      );
    }
  }

  private async handleTaskStatusChanged(event: TaskUpdatedEvent) {
    this.logger.log(`Handling task status changed: ${event.taskId}`);

    try {
      // Verificar se realmente houve mudança de status
      if (event.changes.status) {
        await this.notificationsService.notifyTaskUpdated(
          event.taskId,
          event.title,
          event.assignedUsers,
          event.updatedBy,
          event.updatedByUsername,
          { statusChange: event.changes.status },
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling task status changed event: ${(error as Error).message}`,
      );
    }
  }

  private async handleCommentAdded(event: CommentAddedEvent) {
    this.logger.log(
      `Handling comment added: ${event.commentId} on task ${event.taskId}`,
    );

    try {
      await this.notificationsService.notifyCommentAdded(
        event.taskId,
        event.taskTitle,
        event.participantUsers,
        event.authorId,
        event.authorUsername,
        event.content,
      );
    } catch (error) {
      this.logger.error(
        `Error handling comment added event: ${(error as Error).message}`,
      );
    }
  }

  private async handleUserAssigned(eventData: UserAssignedEvent) {
    const userId: string = eventData.userId;
    const taskId: string = eventData.taskId;
    this.logger.log(`Handling user assigned: ${userId} to task ${taskId}`);
    // Implementar lógica específica para atribuição de usuário
    await Promise.resolve(); // Placeholder for future implementation
  }

  private async handleUserUnassigned(eventData: UserUnassignedEvent) {
    const userId: string = eventData.userId;
    const taskId: string = eventData.taskId;
    this.logger.log(`Handling user unassigned: ${userId} from task ${taskId}`);
    // Implementar lógica específica para desatribuição de usuário
    await Promise.resolve(); // Placeholder for future implementation
  }
}
