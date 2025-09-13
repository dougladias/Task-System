import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ description: 'Comment content' })
  @IsString()
  content: string;
}

export class UpdateCommentDto {
  @ApiPropertyOptional({ description: 'Comment content' })
  @IsOptional()
  @IsString()
  content?: string;
}

export class CommentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  authorId: string;

  @ApiProperty()
  authorUsername: string;

  @ApiProperty()
  taskId: string;

  @ApiProperty({ required: false })
  updatedBy?: string;

  @ApiProperty({ required: false })
  updatedByUsername?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CommentQueryDto {
  @ApiPropertyOptional({ description: 'Page number for pagination' })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  limit?: number = 20;
}