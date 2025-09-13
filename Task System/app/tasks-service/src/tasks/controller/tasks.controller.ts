import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  ValidationPipe,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TasksService } from '../service/tasks.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { TaskQueryDto } from '../dto/task-query.dto';
import { CommentQueryDto } from '../dto/comment-query.dto';
import {
  PaginatedTaskResponseDto,
  TaskResponseDto,
} from '../dto/task-response.dto';
import {
  PaginatedCommentResponseDto,
  CommentResponseDto,
} from '../dto/comment-response.dto';
import { Audit } from '../entities/audit.entity';

@Controller('tasks')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTaskDto): Promise<TaskResponseDto> {
    return this.tasksService.create(dto);
  }

  @Get()
  async findAll(
    @Query() query: TaskQueryDto,
  ): Promise<PaginatedTaskResponseDto> {
    return this.tasksService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<TaskResponseDto> {
    return this.tasksService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.tasksService.remove(id);
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Param('id') taskId: string,
    @Body() dto: Omit<CreateCommentDto, 'taskId'>,
  ): Promise<CommentResponseDto> {
    const createCommentDto: CreateCommentDto = { ...dto, taskId };
    return this.tasksService.addComment(createCommentDto);
  }

  @Get(':id/comments')
  async getComments(
    @Param('id') taskId: string,
    @Query() query: CommentQueryDto,
  ): Promise<PaginatedCommentResponseDto> {
    return this.tasksService.getComments(taskId, query);
  }

  @Get(':id/audit')
  async getAuditLogs(@Param('id') id: string): Promise<Audit[]> {
    return this.tasksService.getAuditLogs(id);
  }
}
