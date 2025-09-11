import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { CacheModule } from '@nestjs/cache-manager';

describe('UsersService', () => {
  let service: UsersService;
  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.register()],
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should be a function', () => {
      expect(typeof service.create).toBe('function');
    });
  });

  describe('findAll', () => {
    it('should be a function', () => {
      expect(typeof service.findAll).toBe('function');
    });
  });

  describe('findOne', () => {
    it('should be a function', () => {
      expect(typeof service.findOne).toBe('function');
    });
  });

  describe('findByEmail', () => {
    it('should be a function', () => {
      expect(typeof service.findByEmail).toBe('function');
    });
  });

  describe('findByUsername', () => {
    it('should be a function', () => {
      expect(typeof service.findByUsername).toBe('function');
    });
  });
});
