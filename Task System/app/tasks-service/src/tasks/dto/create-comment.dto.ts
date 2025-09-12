import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsUUID()
  taskId: string;

  @IsOptional()
  @IsUUID()
  authorId?: string;

  @IsString()
  content: string;
}
