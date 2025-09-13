import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { CommentEntity } from './comment.entity';

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

@Entity('tasks')
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ type: 'uuid' })
  createdBy: string;

  @Column()
  createdByUsername: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @Column({ nullable: true })
  updatedByUsername: string;

  // Usuários atribuídos à tarefa (muitos para muitos)
  @Column('simple-array', { default: '' })
  assignedUserIds: string[];

  @Column('simple-array', { default: '' })
  assignedUsernames: string[];

  @OneToMany(() => CommentEntity, (comment) => comment.task, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  comments: CommentEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Campos para auditoria
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Métodos úteis
  addAssignedUser(userId: string, username: string): void {
    if (!this.assignedUserIds.includes(userId)) {
      this.assignedUserIds.push(userId);
      this.assignedUsernames.push(username);
    }
  }

  removeAssignedUser(userId: string): void {
    const index = this.assignedUserIds.indexOf(userId);
    if (index > -1) {
      this.assignedUserIds.splice(index, 1);
      this.assignedUsernames.splice(index, 1);
    }
  }

  isAssignedTo(userId: string): boolean {
    return this.assignedUserIds.includes(userId);
  }

  getAllParticipantIds(): string[] {
    const participants = new Set([this.createdBy, ...this.assignedUserIds]);
    if (this.updatedBy) {
      participants.add(this.updatedBy);
    }
    return Array.from(participants);
  }
}