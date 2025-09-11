import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { DataSource } from 'typeorm';

describe('HealthController', () => {
  let controller: HealthController;

  const mockHealthCheckService = {
    check: jest.fn(),
  };

  const mockHttpHealthIndicator = {
    pingCheck: jest.fn(),
  };

  const mockDataSource = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: HttpHealthIndicator,
          useValue: mockHttpHealthIndicator,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('check', () => {
    it('should return health check result when all services are healthy', async () => {
      const expectedResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          rabbitmq: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          rabbitmq: { status: 'up' },
        },
      };

      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      mockHttpHealthIndicator.pingCheck.mockResolvedValue({ rabbitmq: { status: 'up' } });
      mockHealthCheckService.check.mockResolvedValue(expectedResult);

      const result = await controller.check();

      expect(mockHealthCheckService.check).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });

    it('should return error status when services are down', async () => {
      const expectedResult = {
        status: 'error',
        info: {},
        error: {
          database: { status: 'down', message: 'Connection failed' },
        },
        details: {
          database: { status: 'down', message: 'Connection failed' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(expectedResult);

      const result = await controller.check();

      expect(result).toEqual(expectedResult);
    });
  });

  describe('readiness', () => {
    it('should return readiness status', () => {
      const result = controller.readiness();

      expect(result).toHaveProperty('status', 'ready');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(typeof result.uptime).toBe('number');
    });
  });

  describe('liveness', () => {
    it('should return liveness status', () => {
      const result = controller.liveness();

      expect(result).toHaveProperty('status', 'alive');
      expect(result).toHaveProperty('pid');
      expect(result).toHaveProperty('memory');
      expect(typeof result.pid).toBe('number');
    });
  });
});
