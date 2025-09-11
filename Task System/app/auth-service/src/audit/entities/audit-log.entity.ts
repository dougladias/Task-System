import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AuditAction {
  USER_REGISTER = 'USER_REGISTER',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_VALIDATE = 'TOKEN_VALIDATE',
}

export enum AuditResource {
  USER = 'USER',
  AUTH = 'AUTH',
  TOKEN = 'TOKEN',
}

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'enum', enum: AuditResource })
  resource: AuditResource;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ type: 'json', nullable: true })
  oldValues?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  newValues?: Record<string, any>;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  sessionId?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;
}
