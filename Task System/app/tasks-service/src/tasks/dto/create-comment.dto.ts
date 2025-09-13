import {
  IsString,
  IsUUID,
  IsOptional,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty()
  @IsUUID('4')
  taskId: string;

  @IsOptional()
  @IsUUID('4')
  authorId?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  content: string;
}
