export class CommentResponseDto {
  id: string;
  taskId: string;
  authorId?: string;
  content: string;
  createdAt: Date;
}

export class PaginatedCommentResponseDto {
  data: CommentResponseDto[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}
