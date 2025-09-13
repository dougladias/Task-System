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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from '../services/comments.service';
import { CreateCommentDto, UpdateCommentDto, CommentResponseDto, CommentQueryDto } from '../dto/comment.dto';

// Guard simples para JWT - será implementado depois
// @UseGuards(JwtAuthGuard)
@ApiTags('comments')
@ApiBearerAuth('JWT-auth')
@Controller('tasks/:taskId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a comment on a task' })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
    type: CommentResponseDto,
  })
  async createComment(
    @Param('taskId') taskId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Request() req: any,
  ): Promise<CommentResponseDto> {
    const userId = req.headers['x-user-id'] || 'mock-user-id';
    const username = req.headers['x-username'] || 'Mock User';

    return this.commentsService.createComment(taskId, createCommentDto, userId, username);
  }

  @Get()
  @ApiOperation({ summary: 'Get comments for a task' })
  @ApiResponse({
    status: 200,
    description: 'List of comments',
  })
  async getCommentsByTask(
    @Param('taskId') taskId: string,
    @Query() query: CommentQueryDto,
  ) {
    return this.commentsService.getCommentsByTask(taskId, query);
  }
}

@ApiTags('comments')
@ApiBearerAuth('JWT-auth')
@Controller('comments')
export class SingleCommentController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get comment statistics' })
  @ApiResponse({
    status: 200,
    description: 'Comment statistics',
  })
  async getCommentStats(@Query('taskId') taskId?: string) {
    return this.commentsService.getCommentStats(taskId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get comment by ID' })
  @ApiResponse({
    status: 200,
    description: 'Comment details',
    type: CommentResponseDto,
  })
  async getCommentById(@Param('id') commentId: string): Promise<CommentResponseDto> {
    return this.commentsService.getCommentById(commentId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a comment' })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
    type: CommentResponseDto,
  })
  async updateComment(
    @Param('id') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req: any,
  ): Promise<CommentResponseDto> {
    const userId = req.headers['x-user-id'] || 'mock-user-id';
    const username = req.headers['x-username'] || 'Mock User';

    return this.commentsService.updateComment(commentId, updateCommentDto, userId, username);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({
    status: 200,
    description: 'Comment deleted successfully',
  })
  async deleteComment(@Param('id') commentId: string, @Request() req: any): Promise<{ message: string }> {
    const userId = req.headers['x-user-id'] || 'mock-user-id';
    const username = req.headers['x-username'] || 'Mock User';

    await this.commentsService.deleteComment(commentId, userId, username);
    return { message: 'Comment deleted successfully' };
  }
}