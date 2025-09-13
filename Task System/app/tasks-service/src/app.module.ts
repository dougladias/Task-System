import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TasksModule } from './tasks/controller/tasks.module';
import { Task } from './tasks/entities/task.entity';
import { Comment } from './tasks/entities/comment.entity';
import { Audit } from './tasks/entities/audit.entity';
import { HealthController } from './health/health.controller';
import { environmentConfig } from './config/environment';
import { getLoggerConfig } from './config/logger.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [environmentConfig],
    }),
    // Logging com Pino
    getLoggerConfig(),
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
        entities: [Task, Comment, Audit],
        // keep simple for dev; migrations can be added later
      }),
    }),
    TerminusModule,
    TasksModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
