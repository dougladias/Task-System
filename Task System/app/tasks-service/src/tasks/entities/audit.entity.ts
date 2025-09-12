import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'audit_logs' })
export class Audit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  entity: string;

  @Column({ type: 'uuid', nullable: true })
  entityId?: string;

  @Column({ type: 'jsonb', nullable: true })
  payload?: any;

  @Column({ type: 'varchar', length: 255, nullable: true })
  action?: string;

  @CreateDateColumn()
  createdAt: Date;
}
