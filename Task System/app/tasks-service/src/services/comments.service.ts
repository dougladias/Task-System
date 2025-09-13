import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentEntity } from '../entities/comment.entity';
import { TaskEntity } from '../entities/task.entity';
import { CreateCommentDto, UpdateCommentDto, CommentResponseDto, CommentQueryDto } from '../dto/comment.dto';
import { KafkaProducerService } from '../kafka/kafka.producer';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  async createComment(
    taskId: string,
    createCommentDto: CreateCommentDto,
    userId: string,
    username: string,
  ): Promise<CommentResponseDto> {
    this.logger.log(`Creating comment on task ${taskId} by user ${username}`);

    // Verificar se a tarefa existe
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    const comment = this.commentRepository.create({
      ...createCommentDto,
      taskId,
      authorId: userId,
      authorUsername: username,
    });

    const savedComment = await this.commentRepository.save(comment);

    // Publicar evento Kafka
    try {
      await this.kafkaProducer.publishCommentAdded({
        taskId: task.id,
        taskTitle: task.title,
        commentId: savedComment.id,
        content: savedComment.content,
        authorId: userId,
        authorUsername: username,
        participantUsers: task.getAllParticipantIds(),
        createdAt: savedComment.createdAt,
      });
    } catch (kafkaError) {
      this.logger.warn(`Failed to publish comment added event: ${kafkaError.message}`);
    }

    return this.toResponseDto(savedComment);
  }

  async getCommentsByTask(
    taskId: string,
    query: CommentQueryDto,
  ): Promise<{
    comments: CommentResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = query;

    // Verificar se a tarefa existe
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    const [comments, total] = await this.commentRepository.findAndCount({
      where: { taskId },
      order: { createdAt: 'ASC' }, // Comentários em ordem cronológica
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      comments: comments.map(this.toResponseDto),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCommentById(commentId: string): Promise<CommentResponseDto> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['task'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    return this.toResponseDto(comment);
  }

  async updateComment(
    commentId: string,
    updateCommentDto: UpdateCommentDto,
    userId: string,
    username: string,
  ): Promise<CommentResponseDto> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['task'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // Verificar permissão (apenas o autor pode editar)
    if (comment.authorId !== userId) {
      throw new ForbiddenException('Only the comment author can edit this comment');
    }

    Object.assign(comment, updateCommentDto);
    comment.updatedBy = userId;
    comment.updatedByUsername = username;

    const savedComment = await this.commentRepository.save(comment);

    // Publicar evento Kafka
    try {
      await this.kafkaProducer.publishCommentUpdated({
        taskId: comment.task.id,
        taskTitle: comment.task.title,
        commentId: savedComment.id,
        content: savedComment.content,
        authorId: savedComment.authorId,
        authorUsername: savedComment.authorUsername,
        participantUsers: comment.task.getAllParticipantIds(),
        updatedAt: savedComment.updatedAt,
      });
    } catch (kafkaError) {
      this.logger.warn(`Failed to publish comment updated event: ${kafkaError.message}`);
    }

    return this.toResponseDto(savedComment);
  }

  async deleteComment(commentId: string, userId: string, username: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['task'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    // Verificar permissão (apenas o autor ou criador da tarefa pode deletar)
    if (comment.authorId !== userId && comment.task.createdBy !== userId) {
      throw new ForbiddenException('Only the comment author or task creator can delete this comment');
    }

    await this.commentRepository.remove(comment);

    // Publicar evento Kafka
    try {
      await this.kafkaProducer.publishCommentDeleted({
        taskId: comment.task.id,
        taskTitle: comment.task.title,
        commentId: comment.id,
        authorId: comment.authorId,
        authorUsername: comment.authorUsername,
        participantUsers: comment.task.getAllParticipantIds(),
        deletedAt: new Date(),
      });
    } catch (kafkaError) {
      this.logger.warn(`Failed to publish comment deleted event: ${kafkaError.message}`);
    }

    this.logger.log(`Comment ${commentId} deleted by user ${username}`);
  }

  async getCommentStats(taskId?: string): Promise<{
    total: number;
    byTask?: Record<string, number>;
  }> {
    if (taskId) {
      const total = await this.commentRepository.count({ where: { taskId } });
      return { total };
    }

    const total = await this.commentRepository.count();

    // Estatísticas por tarefa (top 10)
    const byTaskQuery = await this.commentRepository
      .createQueryBuilder('comment')
      .select('comment.taskId', 'taskId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('comment.taskId')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const byTask: Record<string, number> = {};
    byTaskQuery.forEach((result) => {
      byTask[result.taskId] = parseInt(result.count);
    });

    return { total, byTask };
  }

  private toResponseDto(comment: CommentEntity): CommentResponseDto {
    return {
      id: comment.id,
      content: comment.content,
      authorId: comment.authorId,
      authorUsername: comment.authorUsername,
      taskId: comment.taskId,
      updatedBy: comment.updatedBy,
      updatedByUsername: comment.updatedByUsername,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}