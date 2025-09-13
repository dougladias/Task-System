import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TasksService } from '../services/tasks.service';
import { CreateTaskDto, UpdateTaskDto, TaskResponseDto, TaskQueryDto } from '../dto/task.dto';

// Guard simples para JWT - será implementado depois
// @UseGuards(JwtAuthGuard)
@ApiTags('tasks')
@ApiBearerAuth('JWT-auth')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    type: TaskResponseDto,
  })
  async createTask(
    @Body() createTaskDto: CreateTaskDto,
    @Request() req: any,
  ): Promise<TaskResponseDto> {
    // Por enquanto, vou usar headers mockados
    // Em produção, você extrairia do JWT: const { userId, username } = req.user;
    const userId = req.headers['x-user-id'] || 'mock-user-id';
    const username = req.headers['x-username'] || 'Mock User';

    return this.tasksService.createTask(createTaskDto, userId, username);
  }

  @Get()
  @ApiOperation({ summary: 'Get tasks with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'List of tasks',
  })
  async getTasks(@Query() query: TaskQueryDto) {
    return this.tasksService.getTasks(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get task statistics' })
  @ApiResponse({
    status: 200,
    description: 'Task statistics',
  })
  async getTaskStats() {
    return this.tasksService.getTaskStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({
    status: 200,
    description: 'Task details',
    type: TaskResponseDto,
  })
  async getTaskById(@Param('id') taskId: string): Promise<TaskResponseDto> {
    return this.tasksService.getTaskById(taskId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: TaskResponseDto,
  })
  async updateTask(
    @Param('id') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: any,
  ): Promise<TaskResponseDto> {
    const userId = req.headers['x-user-id'] || 'mock-user-id';
    const username = req.headers['x-username'] || 'Mock User';

    return this.tasksService.updateTask(taskId, updateTaskDto, userId, username);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({
    status: 200,
    description: 'Task deleted successfully',
  })
  async deleteTask(@Param('id') taskId: string, @Request() req: any): Promise<{ message: string }> {
    const userId = req.headers['x-user-id'] || 'mock-user-id';
    const username = req.headers['x-username'] || 'Mock User';

    await this.tasksService.deleteTask(taskId, userId, username);
    return { message: 'Task deleted successfully' };
  }

  @Post(':id/assign/:userId')
  @ApiOperation({ summary: 'Assign user to task' })
  @ApiResponse({
    status: 200,
    description: 'User assigned to task successfully',
    type: TaskResponseDto,
  })
  async assignUserToTask(
    @Param('id') taskId: string,
    @Param('userId') userIdToAssign: string,
    @Request() req: any,
  ): Promise<TaskResponseDto> {
    const userId = req.headers['x-user-id'] || 'mock-user-id';
    const username = req.headers['x-username'] || 'Mock User';

    return this.tasksService.assignUserToTask(taskId, userIdToAssign, userId, username);
  }
}