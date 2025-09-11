import { IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { AuditAction, AuditResource } from '../entities/audit-log.entity';

export class AuditLogQueryDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsEnum(AuditResource)
  resource?: AuditResource;

  @IsOptional()
  @Type(() => Date)
  @IsDateString()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDateString()
  endDate?: Date;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 20;
}
