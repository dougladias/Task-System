import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from '../service/audit.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuditLogQueryDto } from '../dto/audit-log-query.dto';
import { AuditLogResponseDto } from '../dto/audit-log-response.dto';
import { plainToClass } from 'class-transformer';

@ApiTags('Audit Logs')
@Controller('audit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Listar logs de auditoria' })
  @ApiResponse({
    status: 200,
    description: 'Logs retornados com sucesso',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/AuditLogResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async findAll(@Query() query: AuditLogQueryDto) {
    const [logs, total] = await this.auditService.findAll(query);
    const { page = 1, limit = 20 } = query;

    return {
      data: plainToClass(AuditLogResponseDto, logs, { excludeExtraneousValues: true }),
      total,
      page,
      limit,
    };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Listar logs de auditoria de um usuário específico' })
  @ApiResponse({
    status: 200,
    description: 'Logs do usuário retornados com sucesso',
  })
  async findByUserId(
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const [logs, total] = await this.auditService.findByUserId(userId, +page, +limit);

    return {
      data: plainToClass(AuditLogResponseDto, logs, { excludeExtraneousValues: true }),
      total,
      page: +page,
      limit: +limit,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas de auditoria' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
  })
  async getStats(@Query('userId') userId?: string) {
    return this.auditService.getAuditStats(userId);
  }
}
