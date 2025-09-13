import { TaskPriority, TaskStatus } from '../entities/task.entity';

export class TaskResponseDto {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  priority: TaskPriority;
  status: TaskStatus;
  assignees: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedTaskResponseDto {
  data: TaskResponseDto[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}
