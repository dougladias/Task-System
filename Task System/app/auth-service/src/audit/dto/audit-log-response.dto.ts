import { Expose } from 'class-transformer';

export class AuditLogResponseDto {
  @Expose()
  id: string;

  @Expose()
  action: string;

  @Expose()
  resource: string;

  @Expose()
  userId?: string;

  @Expose()
  username?: string;

  @Expose()
  email?: string;

  @Expose()
  ipAddress?: string;

  @Expose()
  userAgent?: string;

  @Expose()
  description?: string;

  @Expose()
  success: boolean;

  @Expose()
  errorMessage?: string;

  @Expose()
  createdAt: Date;
}
