import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction, AuditResource } from '../entities/audit-log.entity';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

export interface AuditLogData {
  action: AuditAction;
  resource: AuditResource;
  userId?: string;
  username?: string;
  email?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  description?: string;
  success?: boolean;
  errorMessage?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private client: ClientProxy;

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private configService: ConfigService,
  ) {
    // Configurar cliente RabbitMQ para notificações
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [
          `amqp://${this.configService.get('RABBITMQ_USER')}:${this.configService.get('RABBITMQ_PASSWORD')}@${this.configService.get('RABBITMQ_HOST')}:${this.configService.get('RABBITMQ_PORT')}`,
        ],
        queue: 'notifications_queue',
        queueOptions: {
          durable: true,
        },
      },
    });
  }

  async log(auditData: AuditLogData): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        ...auditData,
        success: auditData.success ?? true,
      });

      await this.auditLogRepository.save(auditLog);

      // Enviar notificação para o notifications-service
      await this.sendNotification(auditLog);

      this.logger.log(`Audit log created: ${auditData.action} - ${auditData.resource}`);
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
      // Não lançar erro para não quebrar o fluxo principal
    }
  }

  async findAll(query: any = {}): Promise<[AuditLog[], number]> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { ...filters } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

    // Aplicar filtros
    if (filters.userId) {
      queryBuilder.andWhere('audit.userId = :userId', { userId: filters.userId });
    }
    if (filters.action) {
      queryBuilder.andWhere('audit.action = :action', { action: filters.action });
    }
    if (filters.resource) {
      queryBuilder.andWhere('audit.resource = :resource', { resource: filters.resource });
    }
    if (filters.startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate: filters.startDate });
    }
    if (filters.endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate: filters.endDate });
    }

    queryBuilder.orderBy('audit.createdAt', 'DESC').skip(skip).take(limit);

    return queryBuilder.getManyAndCount();
  }

  async findByUserId(userId: string, page = 1, limit = 20): Promise<[AuditLog[], number]> {
    return this.auditLogRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async getAuditStats(userId?: string): Promise<any> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

    if (userId) {
      queryBuilder.where('audit.userId = :userId', { userId });
    }

    const stats = await queryBuilder
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.action')
      .getRawMany();

    return stats;
  }

  private async sendNotification(auditLog: AuditLog): Promise<void> {
    try {
      await this.client
        .emit('audit_log_created', {
          auditLogId: auditLog.id,
          action: auditLog.action,
          resource: auditLog.resource,
          userId: auditLog.userId,
          username: auditLog.username,
          email: auditLog.email,
          description: auditLog.description,
          success: auditLog.success,
          createdAt: auditLog.createdAt,
        })
        .toPromise();
    } catch (error) {
      this.logger.error('Failed to send audit notification', error);
    }
  }

  async onModuleDestroy() {
    await this.client.close();
  }
}
