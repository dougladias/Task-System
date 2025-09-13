import {
  IsEnum,
  IsString,
  IsUUID,
  IsOptional,
  IsObject,
} from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsUUID()
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsUUID()
  taskId?: string;

  @IsOptional()
  @IsString()
  taskTitle?: string;

  @IsOptional()
  @IsUUID()
  triggeredBy?: string;

  @IsOptional()
  @IsString()
  triggeredByUsername?: string;
}

export class NotificationResponseDto {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  status: string;
  taskId?: string;
  taskTitle?: string;
  triggeredBy?: string;
  triggeredByUsername?: string;
  createdAt: Date;
  readAt?: Date;
  sentAt?: Date;
}

// Eventos Kafka
export interface TaskCreatedEvent {
  taskId: string;
  title: string;
  description: string;
  assignedUsers: string[];
  createdBy: string;
  createdByUsername: string;
  createdAt: Date;
}

export interface UserAssignedEvent {
  userId: string;
  taskId: string;
  assignedBy: string;
  assignedAt: Date;
}

export interface UserUnassignedEvent {
  userId: string;
  taskId: string;
  unassignedBy: string;
  unassignedAt: Date;
}

export interface TaskUpdatedEvent {
  taskId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedUsers: string[];
  updatedBy: string;
  updatedByUsername: string;
  changes: Record<string, { from: any; to: any }>;
  updatedAt: Date;
}

export interface TaskAssignedEvent {
  taskId: string;
  title: string;
  assignedTo: string;
  assignedBy: string;
  assignedByUsername: string;
  assignedAt: Date;
}

export interface CommentAddedEvent {
  taskId: string;
  taskTitle: string;
  commentId: string;
  content: string;
  authorId: string;
  authorUsername: string;
  participantUsers: string[];
  createdAt: Date;
}
