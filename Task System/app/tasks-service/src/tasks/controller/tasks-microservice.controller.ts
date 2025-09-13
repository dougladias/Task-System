import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import { TasksService } from '../service/tasks.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { TaskQueryDto } from '../dto/task-query.dto';
import { CommentQueryDto } from '../dto/comment-query.dto';

@Controller()
export class TasksMicroserviceController {
  constructor(private readonly tasksService: TasksService) {}

  @MessagePattern({ cmd: 'create_task' })
  async createTask(@Payload() data: { dto: CreateTaskDto; userId?: string }) {
    return this.tasksService.create(data.dto, data.userId);
  }

  @MessagePattern({ cmd: 'get_tasks' })
  async getTasks(@Payload() data: { query: TaskQueryDto }) {
    return this.tasksService.findAll(data.query);
  }

  @MessagePattern({ cmd: 'get_task' })
  async getTask(@Payload() data: { id: string }) {
    return this.tasksService.findOne(data.id);
  }

  @MessagePattern({ cmd: 'update_task' })
  async updateTask(
    @Payload() data: { id: string; dto: UpdateTaskDto; userId?: string },
  ) {
    return this.tasksService.update(data.id, data.dto, data.userId);
  }

  @MessagePattern({ cmd: 'delete_task' })
  async deleteTask(@Payload() data: { id: string; userId?: string }) {
    return this.tasksService.remove(data.id, data.userId);
  }

  @MessagePattern({ cmd: 'add_comment' })
  async addComment(
    @Payload() data: { dto: CreateCommentDto; userId?: string },
  ) {
    return this.tasksService.addComment(data.dto, data.userId);
  }

  @MessagePattern({ cmd: 'get_comments' })
  async getComments(
    @Payload() data: { taskId: string; query: CommentQueryDto },
  ) {
    return this.tasksService.getComments(data.taskId, data.query);
  }

  @MessagePattern({ cmd: 'get_audit_logs' })
  async getAuditLogs(@Payload() data: { entityId: string }) {
    return this.tasksService.getAuditLogs(data.entityId);
  }

  @EventPattern('user.deleted')
  handleUserDeleted(@Payload() data: { userId: string }) {
    console.log(`Handling user deletion for user: ${data.userId}`);
  }
}
