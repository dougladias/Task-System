import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { Comment } from '../entities/comment.entity';
import { Audit } from '../entities/audit.entity';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { TaskQueryDto } from '../dto/task-query.dto';
import { CommentQueryDto } from '../dto/comment-query.dto';
import { PaginatedTaskResponseDto } from '../dto/task-response.dto';
import { PaginatedCommentResponseDto } from '../dto/comment-response.dto';
import { EventsService } from '../../events/events.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(Audit)
    private readonly auditRepo: Repository<Audit>,
    @Inject(EventsService)
    private readonly eventsService: EventsService,
  ) {}

  async create(dto: CreateTaskDto, userId?: string): Promise<Task> {
    const task = this.taskRepo.create({
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });

    const savedTask = await this.taskRepo.save(task);

    await this.createAuditLog('Task', savedTask.id, 'CREATE', {
      task: savedTask,
      createdBy: userId,
    });

    // Publish event
    await this.eventsService.publishTaskCreated(savedTask, userId);

    return savedTask;
  }

  async findAll(query: TaskQueryDto): Promise<PaginatedTaskResponseDto> {
    const {
      page = 1,
      size = 10,
      status,
      priority,
      search,
      assignee,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.taskRepo.createQueryBuilder('task');

    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    if (priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority });
    }

    if (search) {
      queryBuilder.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (assignee) {
      queryBuilder.andWhere(':assignee = ANY(task.assignees)', { assignee });
    }

    queryBuilder
      .orderBy(`task.${sortBy}`, sortOrder)
      .skip((page - 1) * size)
      .take(size);

    const [tasks, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / size);

    return {
      data: tasks,
      total,
      page,
      size,
      totalPages,
    };
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepo.findOneBy({ id });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, userId?: string): Promise<Task> {
    const task = await this.findOne(id);
    const previousState = { ...task };

    const updateData: Partial<Task> = {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    };

    const updated = Object.assign(task, updateData);

    const savedTask = await this.taskRepo.save(updated);

    await this.createAuditLog('Task', savedTask.id, 'UPDATE', {
      previous: previousState,
      current: savedTask,
      updatedBy: userId,
    });

    // Publish event
    await this.eventsService.publishTaskUpdated(
      savedTask,
      previousState,
      userId,
    );

    return savedTask;
  }

  async remove(id: string, userId?: string): Promise<void> {
    const task = await this.findOne(id);

    await this.createAuditLog('Task', task.id, 'DELETE', {
      task,
      deletedBy: userId,
    });

    // Publish event
    await this.eventsService.publishTaskDeleted(task, userId);

    await this.taskRepo.delete(id);
  }

  async addComment(dto: CreateCommentDto, userId?: string): Promise<Comment> {
    await this.findOne(dto.taskId);

    const comment = this.commentRepo.create({
      ...dto,
      authorId: dto.authorId || userId,
    });

    const savedComment = await this.commentRepo.save(comment);

    await this.createAuditLog('Comment', savedComment.id, 'CREATE', {
      comment: savedComment,
      createdBy: userId,
    });

    // Publish event
    await this.eventsService.publishCommentCreated(savedComment, userId);

    return savedComment;
  }

  async getComments(
    taskId: string,
    query: CommentQueryDto,
  ): Promise<PaginatedCommentResponseDto> {
    await this.findOne(taskId);

    const { page = 1, size = 10, authorId } = query;

    const queryBuilder = this.commentRepo
      .createQueryBuilder('comment')
      .where('comment.taskId = :taskId', { taskId });

    if (authorId) {
      queryBuilder.andWhere('comment.authorId = :authorId', { authorId });
    }

    queryBuilder
      .orderBy('comment.createdAt', 'ASC')
      .skip((page - 1) * size)
      .take(size);

    const [comments, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / size);

    return {
      data: comments,
      total,
      page,
      size,
      totalPages,
    };
  }

  private async createAuditLog(
    entity: string,
    entityId: string,
    action: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const audit = this.auditRepo.create({
      entity,
      entityId,
      action,
      payload,
    });

    await this.auditRepo.save(audit);
  }

  async getAuditLogs(entityId: string): Promise<Audit[]> {
    return this.auditRepo.find({
      where: { entityId },
      order: { createdAt: 'DESC' },
    });
  }
}
