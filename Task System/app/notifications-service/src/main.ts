import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Logger
  app.useLogger(app.get(Logger));

  // CORS removed - API Gateway will handle this

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Notifications Service API')
    .setDescription('Real-time notifications service with WebSocket support')
    .setVersion('1.0')
    .addTag('notifications', 'Notification management endpoints')
    .addTag('notifications-admin', 'Admin notification endpoints')
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

  const port = process.env.PORT || 3004;
  await app.listen(port);

  console.log(`🚀 Notifications Service running on port ${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
  console.log(`🔌 WebSocket Gateway listening on namespace: /notifications`);
  console.log(`🎯 Kafka consumers listening for events...`);
}

void bootstrap();
