import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationsService } from './services/notifications.service';
import {
  NotificationsController,
  NotificationsAdminController,
} from './controllers/notifications.controller';
import { NotificationsGateway } from './gateway/notifications.gateway';
import { KafkaConsumerService } from './consumers/kafka.consumer';
import { KafkaConfig } from './config/kafka.config';
import { NotificationEntity } from './entities/notification.entity';
import { getDatabaseConfig } from './config/database.config';
import { NotificationsHealthController } from './health/notifications-health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    TypeOrmModule.forFeature([NotificationEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'jwt-secret-key-change-in-production',
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRE') || '15m',
        },
      }),
    }),
    TerminusModule,
  ],
  controllers: [
    AppController,
    NotificationsController,
    NotificationsAdminController,
    NotificationsHealthController,
  ],
  providers: [
    AppService,
    NotificationsService,
    NotificationsGateway,
    KafkaConsumerService,
    KafkaConfig,
  ],
})
export class AppModule {}
