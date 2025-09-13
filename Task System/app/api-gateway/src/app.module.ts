import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthProxyModule } from './auth-proxy/auth-proxy.module';
import { TasksProxyModule } from './tasks-proxy/tasks-proxy.module';
import { NotificationsProxyModule } from './notifications-proxy/notifications-proxy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthProxyModule,
    TasksProxyModule,
    NotificationsProxyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
