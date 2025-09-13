import { Module } from '@nestjs/common';
import { NotificationsProxyController } from './notifications-proxy.controller';
import { NotificationsProxyService } from './notifications-proxy.service';

@Module({
  controllers: [NotificationsProxyController],
  providers: [NotificationsProxyService],
  exports: [NotificationsProxyService],
})
export class NotificationsProxyModule {}
