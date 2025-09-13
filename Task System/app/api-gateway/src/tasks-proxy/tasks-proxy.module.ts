import { Module } from '@nestjs/common';
import { TasksProxyController } from './tasks-proxy.controller';
import { TasksProxyService } from './tasks-proxy.service';

@Module({
  controllers: [TasksProxyController],
  providers: [TasksProxyService],
  exports: [TasksProxyService],
})
export class TasksProxyModule {}
