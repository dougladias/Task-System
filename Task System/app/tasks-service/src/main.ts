import { webcrypto } from 'crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

declare global {
  var crypto: Crypto;
}

if (!global.crypto) {
  global.crypto = webcrypto as Crypto;
}

async function bootstrap() {
  // Create HTTP application
  const app = await NestFactory.create(AppModule);

  // Get config service
  const configService = app.get(ConfigService);

  // CORS removed - API Gateway will handle this
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Tasks Service API')
    .setDescription('Task management service with full CRUD operations')
    .setVersion('1.0')
    .addTag('tasks')
    .addTag('comments')
    .addTag('health')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Configure microservice like auth-service
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [
        `amqp://${configService.get('rabbitmq.user')}:${configService.get('rabbitmq.password')}@${configService.get('rabbitmq.host')}:${configService.get('rabbitmq.port')}`,
      ],
      queue: configService.get<string>('rabbitmq.queue') || 'tasks_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  // Start both HTTP and microservice
  await app.startAllMicroservices();

  const port = process.env.PORT ?? 3003;
  await app.listen(port);

  console.log(`🚀 Tasks service HTTP listening on ${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
  console.log(`🐰 Tasks service Microservice connected to RabbitMQ`);
}

void bootstrap();
