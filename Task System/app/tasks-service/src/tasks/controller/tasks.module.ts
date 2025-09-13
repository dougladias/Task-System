import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from '../service/tasks.service';
import { TasksController } from './tasks.controller';
import { TasksMicroserviceController } from './tasks-microservice.controller';
import { Task } from '../entities/task.entity';
import { Comment } from '../entities/comment.entity';
import { Audit } from '../entities/audit.entity';
import { EventsService } from '../../events/events.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Comment, Audit])],
  providers: [TasksService, EventsService],
  controllers: [TasksController, TasksMicroserviceController],
  exports: [TasksService, EventsService],
})
export class TasksModule {}
