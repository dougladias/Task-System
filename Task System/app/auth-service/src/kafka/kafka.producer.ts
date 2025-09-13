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
      clientId: 'auth-service',
      brokers: [this.configService.get<string>('KAFKA_BROKER') || 'kafka:29092'],
      retry: {
        initialRetryTime: 100,
        retries: 1,
        maxRetryTime: 500,
      },
      connectionTimeout: 1000,
      requestTimeout: 2000,
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
        key: data.userId || data.id,
        value: JSON.stringify(data),
        headers: {
          eventType,
          timestamp: new Date().toISOString(),
          source: 'auth-service',
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

  // Eventos específicos do auth-service
  async publishUserRegistered(userData: {
    userId: string;
    email: string;
    username: string;
    createdAt: Date;
  }): Promise<void> {
    await this.publishEvent('user-events', 'user.registered', {
      ...userData,
      type: 'user.registered',
    });
  }

  async publishUserLoggedIn(userData: {
    userId: string;
    email: string;
    username: string;
    loginAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.publishEvent('user-events', 'user.logged_in', {
      ...userData,
      type: 'user.logged_in',
    });
  }

  async publishUserUpdated(userData: {
    userId: string;
    email: string;
    username: string;
    updatedBy: string;
    changes: Record<string, any>;
    updatedAt: Date;
  }): Promise<void> {
    await this.publishEvent('user-events', 'user.updated', {
      ...userData,
      type: 'user.updated',
    });
  }

  async publishPasswordChanged(userData: {
    userId: string;
    email: string;
    username: string;
    changedAt: Date;
    ipAddress?: string;
  }): Promise<void> {
    await this.publishEvent('user-events', 'user.password_changed', {
      ...userData,
      type: 'user.password_changed',
    });
  }
}