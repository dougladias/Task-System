import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TasksController } from './controllers/tasks.controller';
import { CommentsController, SingleCommentController } from './controllers/comments.controller';
import { TasksService } from './services/tasks.service';
import { CommentsService } from './services/comments.service';
import { KafkaProducerService } from './kafka/kafka.producer';
import { TaskEntity } from './entities/task.entity';
import { CommentEntity } from './entities/comment.entity';
import { HealthController } from './health/health.controller';
import { environmentConfig } from './config/environment';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [environmentConfig],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
        transport:
          process.env.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                },
              }
            : undefined,
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST', 'localhost'),
        port: parseInt(config.get('DATABASE_PORT', '5432'), 10),
        username: config.get('DATABASE_USER', 'postgres'),
        password: config.get('DATABASE_PASSWORD', 'password'),
        database: config.get('DATABASE_NAME', 'challenge_db'),
        synchronize: config.get('NODE_ENV') === 'development',
        logging: config.get('NODE_ENV') === 'development',
        entities: [TaskEntity, CommentEntity],
      }),
    }),
    TypeOrmModule.forFeature([TaskEntity, CommentEntity]),
    TerminusModule,
  ],
  controllers: [
    AppController,
    HealthController,
    TasksController,
    CommentsController,
    SingleCommentController,
  ],
  providers: [
    AppService,
    TasksService,
    CommentsService,
    KafkaProducerService,
  ],
})
export class AppModule {}
