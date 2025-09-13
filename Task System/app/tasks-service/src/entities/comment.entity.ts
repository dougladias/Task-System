import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TaskEntity } from './task.entity';

@Entity('comments')
export class CommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column({ type: 'uuid' })
  authorId: string;

  @Column()
  authorUsername: string;

  @Column({ type: 'uuid' })
  taskId: string;

  @ManyToOne(() => TaskEntity, (task) => task.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'taskId' })
  task: TaskEntity;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @Column({ nullable: true })
  updatedByUsername: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}