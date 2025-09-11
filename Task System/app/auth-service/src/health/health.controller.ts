import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import {
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheck,
  HealthCheckResult,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private dataSource: DataSource,
  ) {}

  // Health check customizado para banco de dados
  private async databaseCheck(): Promise<HealthIndicatorResult> {
    try {
      const result: unknown[] = await this.dataSource.query('SELECT 1');
      if (result) {
        return { database: { status: 'up' } };
      }
      throw new HealthCheckError('Database check failed', { database: { status: 'down' } });
    } catch (error) {
      throw new HealthCheckError('Database check failed', {
        database: {
          status: 'down',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Verificar saúde do serviço' })
  @ApiResponse({ status: 200, description: 'Serviço saudável' })
  @ApiResponse({ status: 503, description: 'Serviço com problemas' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Verificar se o banco de dados está respondendo
      () => this.databaseCheck(),
      // Verificar se o RabbitMQ está acessível (via HTTP management)
      () =>
        this.http.pingCheck('rabbitmq', 'http://localhost:15672/api/overview', {
          headers: {
            Authorization: 'Basic ' + Buffer.from('admin:admin').toString('base64'),
          },
        }),
    ]);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Verificar se o serviço está pronto' })
  @ApiResponse({ status: 200, description: 'Serviço pronto' })
  readiness(): { status: string; timestamp: string; uptime: number } {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Verificar se o serviço está vivo' })
  @ApiResponse({ status: 200, description: 'Serviço vivo' })
  liveness(): { status: string; pid: number; memory: NodeJS.MemoryUsage } {
    return {
      status: 'alive',
      pid: process.pid,
      memory: process.memoryUsage(),
    };
  }
}
