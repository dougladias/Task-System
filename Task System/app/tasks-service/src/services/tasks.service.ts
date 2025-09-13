import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, In } from 'typeorm';
import { TaskEntity, TaskStatus, TaskPriority } from '../entities/task.entity';
import { CreateTaskDto, UpdateTaskDto, TaskResponseDto, TaskQueryDto } from '../dto/task.dto';
import { KafkaProducerService } from '../kafka/kafka.producer';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  async createTask(
    createTaskDto: CreateTaskDto,
    userId: string,
    username: string,
  ): Promise<TaskResponseDto> {
    this.logger.log(`Creating task: ${createTaskDto.title} by user ${username}`);

    const { dueDate, ...restTaskData } = createTaskDto;

    const taskData: Partial<TaskEntity> = {
      ...restTaskData,
      createdBy: userId,
      createdByUsername: username,
      assignedUserIds: createTaskDto.assignedUserIds || [],
      assignedUsernames: [], // TODO: Buscar usernames baseado nos IDs
    };

    if (dueDate) {
      taskData.dueDate = new Date(dueDate);
    }

    const task = this.taskRepository.create(taskData);

    const savedTask = await this.taskRepository.save(task);
    const taskEntity = Array.isArray(savedTask) ? savedTask[0] : savedTask;

    // Publicar evento Kafka
    try {
      await this.kafkaProducer.publishTaskCreated({
        taskId: taskEntity.id,
        title: taskEntity.title,
        description: taskEntity.description,
        assignedUsers: taskEntity.assignedUserIds,
        createdBy: userId,
        createdByUsername: username,
        priority: taskEntity.priority,
        status: taskEntity.status,
        dueDate: taskEntity.dueDate,
        createdAt: taskEntity.createdAt,
      });
    } catch (kafkaError) {
      this.logger.warn(`Failed to publish task created event: ${kafkaError.message}`);
    }

    return this.toResponseDto(taskEntity);
  }

  async getTasks(query: TaskQueryDto): Promise<{
    tasks: TaskResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Garantir que page e limit sejam números válidos
    const page = Math.max(1, Number(Array.isArray(query.page) ? query.page[0] : query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(Array.isArray(query.limit) ? query.limit[0] : query.limit) || 10));

    const { status, priority, assignedTo, createdBy, search } = query;

    this.logger.log(`Getting tasks with page=${page}, limit=${limit}`);

    const whereConditions: FindOptionsWhere<TaskEntity> = {};

    if (status) {
      whereConditions.status = status;
    }

    if (priority) {
      whereConditions.priority = priority;
    }

    if (createdBy) {
      whereConditions.createdBy = createdBy;
    }

    if (search) {
      // Para busca, vamos usar query builder para buscar em título e descrição
      const queryBuilder = this.taskRepository.createQueryBuilder('task');

      Object.entries(whereConditions).forEach(([key, value]) => {
        queryBuilder.andWhere(`task.${key} = :${key}`, { [key]: value });
      });

      queryBuilder
        .where('(task.title ILIKE :search OR task.description ILIKE :search)', { search: `%${search}%` })
        .skip((page - 1) * limit)
        .take(limit)
        .orderBy('task.createdAt', 'DESC');

      if (assignedTo) {
        queryBuilder.andWhere(':assignedTo = ANY(task.assignedUserIds)', { assignedTo });
      }

      const [tasks, total] = await queryBuilder.getManyAndCount();

      return {
        tasks: tasks.map(this.toResponseDto),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }

    // Busca simples sem search
    const [tasks, total] = await this.taskRepository.findAndCount({
      where: assignedTo
        ? { ...whereConditions, assignedUserIds: Like(`%${assignedTo}%`) }
        : whereConditions,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      tasks: tasks.map(this.toResponseDto),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTaskById(taskId: string): Promise<TaskResponseDto> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['comments'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    const responseDto = this.toResponseDto(task);
    responseDto.commentsCount = task.comments?.length || 0;

    return responseDto;
  }

  async updateTask(
    taskId: string,
    updateTaskDto: UpdateTaskDto,
    userId: string,
    username: string,
  ): Promise<TaskResponseDto> {
    this.logger.log(`Updating task ${taskId} with data:`, JSON.stringify(updateTaskDto));

    const task = await this.taskRepository.findOne({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    this.logger.log(`Task before update:`, JSON.stringify({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
    }));

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    // Capturar mudanças para o evento
    const changes: Record<string, { from: any; to: any }> = {};
    const oldValues = { ...task };

    // Aplicar atualizações
    Object.assign(task, updateTaskDto);
    task.updatedBy = userId;
    task.updatedByUsername = username;

    this.logger.log(`Task after assign:`, JSON.stringify({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
    }));

    if (updateTaskDto.dueDate) {
      task.dueDate = new Date(updateTaskDto.dueDate);
    }

    // TODO: Atualizar assignedUsernames baseado em assignedUserIds
    if (updateTaskDto.assignedUserIds) {
      task.assignedUserIds = updateTaskDto.assignedUserIds;
    }

    const savedTask = await this.taskRepository.save(task);
    const updatedTaskEntity = Array.isArray(savedTask) ? savedTask[0] : savedTask;

    // Detectar mudanças
    if (oldValues.status !== updatedTaskEntity.status) {
      changes.status = { from: oldValues.status, to: updatedTaskEntity.status };
    }
    if (oldValues.priority !== updatedTaskEntity.priority) {
      changes.priority = { from: oldValues.priority, to: updatedTaskEntity.priority };
    }
    if (oldValues.title !== updatedTaskEntity.title) {
      changes.title = { from: oldValues.title, to: updatedTaskEntity.title };
    }

    // Publicar eventos Kafka
    try {
      await this.kafkaProducer.publishTaskUpdated({
        taskId: updatedTaskEntity.id,
        title: updatedTaskEntity.title,
        description: updatedTaskEntity.description,
        status: updatedTaskEntity.status,
        priority: updatedTaskEntity.priority,
        assignedUsers: updatedTaskEntity.assignedUserIds,
        updatedBy: userId,
        updatedByUsername: username,
        changes,
        updatedAt: updatedTaskEntity.updatedAt,
      });

      // Evento específico para mudança de status
      if (changes.status) {
        await this.kafkaProducer.publishTaskStatusChanged({
          taskId: updatedTaskEntity.id,
          title: updatedTaskEntity.title,
          oldStatus: changes.status.from,
          newStatus: changes.status.to,
          assignedUsers: updatedTaskEntity.assignedUserIds,
          updatedBy: userId,
          updatedByUsername: username,
          updatedAt: updatedTaskEntity.updatedAt,
        });
      }
    } catch (kafkaError) {
      this.logger.warn(`Failed to publish task updated event: ${kafkaError.message}`);
    }

    return this.toResponseDto(updatedTaskEntity);
  }

  async deleteTask(taskId: string, userId: string, username: string): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    // Verificar permissão (apenas o criador pode deletar)
    if (task.createdBy !== userId) {
      throw new ForbiddenException('Only the task creator can delete this task');
    }

    await this.taskRepository.remove(task);

    // Publicar evento Kafka
    try {
      await this.kafkaProducer.publishTaskDeleted({
        taskId: task.id,
        title: task.title,
        assignedUsers: task.assignedUserIds,
        deletedBy: userId,
        deletedByUsername: username,
        deletedAt: new Date(),
      });
    } catch (kafkaError) {
      this.logger.warn(`Failed to publish task deleted event: ${kafkaError.message}`);
    }

    this.logger.log(`Task ${taskId} deleted by user ${username}`);
  }

  async assignUserToTask(taskId: string, userIdToAssign: string, assignedByUserId: string, assignedByUsername: string): Promise<TaskResponseDto> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    if (!task.assignedUserIds.includes(userIdToAssign)) {
      task.addAssignedUser(userIdToAssign, 'Unknown User'); // TODO: Buscar username
      await this.taskRepository.save(task);

      // Publicar evento Kafka
      try {
        await this.kafkaProducer.publishTaskAssigned({
          taskId: task.id,
          title: task.title,
          assignedTo: userIdToAssign,
          assignedBy: assignedByUserId,
          assignedByUsername: assignedByUsername,
          assignedAt: new Date(),
        });
      } catch (kafkaError) {
        this.logger.warn(`Failed to publish task assigned event: ${kafkaError.message}`);
      }
    }

    return this.toResponseDto(task);
  }

  async getTaskStats(): Promise<{
    total: number;
    byStatus: Record<TaskStatus, number>;
    byPriority: Record<TaskPriority, number>;
  }> {
    const total = await this.taskRepository.count();

    const byStatus = {
      [TaskStatus.TODO]: await this.taskRepository.count({ where: { status: TaskStatus.TODO } }),
      [TaskStatus.IN_PROGRESS]: await this.taskRepository.count({ where: { status: TaskStatus.IN_PROGRESS } }),
      [TaskStatus.REVIEW]: await this.taskRepository.count({ where: { status: TaskStatus.REVIEW } }),
      [TaskStatus.DONE]: await this.taskRepository.count({ where: { status: TaskStatus.DONE } }),
    };

    const byPriority = {
      [TaskPriority.LOW]: await this.taskRepository.count({ where: { priority: TaskPriority.LOW } }),
      [TaskPriority.MEDIUM]: await this.taskRepository.count({ where: { priority: TaskPriority.MEDIUM } }),
      [TaskPriority.HIGH]: await this.taskRepository.count({ where: { priority: TaskPriority.HIGH } }),
      [TaskPriority.URGENT]: await this.taskRepository.count({ where: { priority: TaskPriority.URGENT } }),
    };

    return { total, byStatus, byPriority };
  }

  private toResponseDto(task: TaskEntity): TaskResponseDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      createdBy: task.createdBy,
      createdByUsername: task.createdByUsername,
      updatedBy: task.updatedBy,
      updatedByUsername: task.updatedByUsername,
      assignedUserIds: task.assignedUserIds,
      assignedUsernames: task.assignedUsernames,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}