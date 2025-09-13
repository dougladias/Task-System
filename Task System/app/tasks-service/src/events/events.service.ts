import { Injectable } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Task } from '../tasks/entities/task.entity';
import { Comment } from '../tasks/entities/comment.entity';

@Injectable()
export class EventsService {
  private client: ClientProxy;

  constructor(private configService: ConfigService) {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [
          this.configService.get(
            'RABBITMQ_URL',
            'amqp://admin:admin@localhost:5672',
          ),
        ],
        queue: 'events_queue',
        queueOptions: {
          durable: true,
        },
      },
    } as any);
  }

  async publishTaskCreated(task: Task, userId?: string) {
    const event = {
      type: 'task.created',
      data: {
        task,
        createdBy: userId,
        timestamp: new Date(),
      },
    };

    return this.client.emit('task.created', event);
  }

  async publishTaskUpdated(task: Task, previousState: Task, userId?: string) {
    const event = {
      type: 'task.updated',
      data: {
        task,
        previousState,
        updatedBy: userId,
        timestamp: new Date(),
      },
    };

    return this.client.emit('task.updated', event);
  }

  async publishTaskDeleted(task: Task, userId?: string) {
    const event = {
      type: 'task.deleted',
      data: {
        task,
        deletedBy: userId,
        timestamp: new Date(),
      },
    };

    return this.client.emit('task.deleted', event);
  }

  async publishCommentCreated(comment: Comment, userId?: string) {
    const event = {
      type: 'task.comment.created',
      data: {
        comment,
        createdBy: userId,
        timestamp: new Date(),
      },
    };

    return this.client.emit('task.comment.created', event);
  }

  onModuleDestroy() {
    this.client.close();
  }
}
