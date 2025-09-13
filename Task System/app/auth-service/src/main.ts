import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Run migrations automatically
  const dataSource = app.get(DataSource);
  await dataSource.runMigrations();
  console.log('✅ Database migrations completed');

  // Configurar RabbitMQ microservice
  const configService = app.get(ConfigService);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [
        `amqp://${configService.get('rabbitmq.user')}:${configService.get('rabbitmq.password')}@${configService.get('rabbitmq.host')}:${configService.get('rabbitmq.port')}`,
      ],
      queue: configService.get<string>('rabbitmq.queue') || 'auth-queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global rate limiting is configured in app.module.ts

  // Swagger/OpenAPI setup
  const config = new DocumentBuilder()
    .setTitle('Auth Service API')
    .setDescription('Sistema de autenticação para o Task System')
    .setVersion('1.0')
    .addTag('auth', 'Endpoints de autenticação')
    .addTag('users', 'Endpoints de usuários')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // CORS removed - API Gateway will handle this

  const port = process.env.PORT || 3002;
  await app.startAllMicroservices();
  await app.listen(port);

  console.log(`🚀 Auth Service running on port ${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
  console.log(
    `🐰 RabbitMQ microservice connected to queue: ${configService.get('rabbitmq.queue')}`,
  );
}

void bootstrap();
