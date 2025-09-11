import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './service/auth.service';
import { UsersService } from '../users/service/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AuditService } from './../audit/service/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from './../users/dto/user-response.dto';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuditAction } from './../audit/entities/audit-log.entity';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let cacheManager: any;
  let auditService: AuditService;

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashedpassword',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserResponse = new UserResponseDto(mockUser);

  const mockAuthResponse = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: mockUserResponse,
    expiresIn: 900,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByEmail: jest.fn(),
            findByUsername: jest.fn(),
            findOne: jest.fn(),
            validatePassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
            decode: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    cacheManager = module.get(CACHE_MANAGER);
    auditService = module.get<AuditService>(AuditService);

    // Mock config
    jest.spyOn(configService, 'get').mockImplementation((key: string) => {
      const config = {
        'jwt.secret': 'test-secret',
        'jwt.accessExpire': '15m',
        'jwt.refreshSecret': 'test-refresh-secret',
        'jwt.refreshExpire': '7d',
        JWT_ACCESS_SECRET: 'test-secret',
      };
      return config[key];
    });

    // Mock JWT sign
    jest.spyOn(jwtService, 'sign').mockImplementation((payload, options) => {
      if (options?.secret?.includes('refresh')) {
        return 'refresh-token';
      }
      return 'access-token';
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      const mockCreate = jest.fn().mockResolvedValue(mockUser);
      const mockLog = jest.fn().mockResolvedValue(undefined);

      usersService.create = mockCreate;
      auditService.log = mockLog;

      const result = await service.register(registerDto, '127.0.0.1', 'Chrome');

      expect(mockCreate).toHaveBeenCalledWith(registerDto);
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.USER_REGISTER,
          userId: mockUser.id,
          success: true,
        }),
      );
      expect(result).toEqual(mockAuthResponse);
    });

    it('should handle registration failure', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };
      const error = new Error('Registration failed');
      const mockCreate = jest.fn().mockRejectedValue(error);
      const mockLog = jest.fn().mockResolvedValue(undefined);

      usersService.create = mockCreate;
      auditService.log = mockLog;

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.USER_REGISTER,
          success: false,
        }),
      );
    });

    it('should handle generic registration error', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      const error = new Error('Database error');
      jest.spyOn(usersService, 'create').mockRejectedValue(error);
      const mockLog = jest.spyOn(auditService, 'log').mockResolvedValue(undefined);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: 'Database error',
        }),
      );
    });

    it('should log with IP and user agent', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      jest.spyOn(usersService, 'create').mockResolvedValue(mockUser);
      const mockLog = jest.spyOn(auditService, 'log').mockResolvedValue(undefined);

      await service.register(registerDto, '192.168.1.1', 'Mozilla/5.0');

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        }),
      );
    });
  });

  describe('login', () => {
    it('should login user by email successfully', async () => {
      const loginDto: LoginDto = {
        emailOrUsername: 'test@example.com',
        password: 'password123',
      };

      const mockFindByEmail = jest.fn().mockResolvedValue(mockUser);
      const mockValidatePassword = jest.fn().mockResolvedValue(true);
      const mockLog = jest.fn().mockResolvedValue(undefined);

      usersService.findByEmail = mockFindByEmail;
      usersService.validatePassword = mockValidatePassword;
      auditService.log = mockLog;

      const result = await service.login(loginDto, '127.0.0.1', 'Chrome');

      expect(mockFindByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockValidatePassword).toHaveBeenCalledWith('password123', mockUser.password);
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.USER_LOGIN,
          success: true,
        }),
      );
      expect(result).toEqual(mockAuthResponse);
    });

    it('should login user by username successfully', async () => {
      const loginDto: LoginDto = {
        emailOrUsername: 'testuser',
        password: 'password123',
      };

      const mockFindByEmail = jest.fn().mockResolvedValue(null);
      const mockFindByUsername = jest.fn().mockResolvedValue(mockUser);
      const mockValidatePassword = jest.fn().mockResolvedValue(true);
      const mockLog = jest.fn().mockResolvedValue(undefined);

      usersService.findByEmail = mockFindByEmail;
      usersService.findByUsername = mockFindByUsername;
      usersService.validatePassword = mockValidatePassword;
      auditService.log = mockLog;

      const result = await service.login(loginDto);

      expect(mockFindByUsername).toHaveBeenCalledWith('testuser');
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw error for non-existent user', async () => {
      const loginDto: LoginDto = {
        emailOrUsername: 'nonexistent@example.com',
        password: 'password123',
      };

      const mockFindByEmail = jest.fn().mockResolvedValue(null);
      const mockFindByUsername = jest.fn().mockResolvedValue(null);
      const mockLog = jest.fn().mockResolvedValue(undefined);

      usersService.findByEmail = mockFindByEmail;
      usersService.findByUsername = mockFindByUsername;
      auditService.log = mockLog;

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it('should throw error for inactive user', async () => {
      const loginDto: LoginDto = {
        emailOrUsername: 'test@example.com',
        password: 'password123',
      };
      const inactiveUser = { ...mockUser, isActive: false };

      const mockFindByEmail = jest.fn().mockResolvedValue(inactiveUser);
      const mockLog = jest.fn().mockResolvedValue(undefined);

      usersService.findByEmail = mockFindByEmail;
      auditService.log = mockLog;

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw error for invalid password', async () => {
      const loginDto: LoginDto = {
        emailOrUsername: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockFindByEmail = jest.fn().mockResolvedValue(mockUser);
      const mockValidatePassword = jest.fn().mockResolvedValue(false);
      const mockLog = jest.fn().mockResolvedValue(undefined);

      usersService.findByEmail = mockFindByEmail;
      usersService.validatePassword = mockValidatePassword;
      auditService.log = mockLog;

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it('should handle password validation error', async () => {
      const loginDto: LoginDto = {
        emailOrUsername: 'test@example.com',
        password: 'password123',
      };

      const mockFindByEmail = jest.fn().mockResolvedValue(mockUser);
      const mockValidatePassword = jest
        .fn()
        .mockRejectedValue(new UnauthorizedException('Invalid credentials'));
      const mockLog = jest.fn().mockResolvedValue(undefined);

      usersService.findByEmail = mockFindByEmail;
      usersService.validatePassword = mockValidatePassword;
      auditService.log = mockLog;

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: 'user-id', email: 'test@example.com', username: 'testuser' };

      const mockCacheGet = jest.fn().mockResolvedValue(null);
      const mockJwtVerify = jest.fn().mockReturnValue(payload);
      const mockFindOne = jest.fn().mockResolvedValue(mockUser);
      const mockCacheSet = jest.fn().mockResolvedValue(undefined);
      const mockLog = jest.fn().mockResolvedValue(undefined);

      cacheManager.get = mockCacheGet;
      jwtService.verify = mockJwtVerify;
      usersService.findOne = mockFindOne;
      cacheManager.set = mockCacheSet;
      auditService.log = mockLog;

      const result = await service.refresh(refreshToken, '127.0.0.1', 'Chrome');

      expect(mockJwtVerify).toHaveBeenCalledWith(refreshToken, {
        secret: 'test-refresh-secret',
      });
      expect(mockFindOne).toHaveBeenCalledWith('user-id');
      expect(mockCacheSet).toHaveBeenCalledWith(
        `refresh:${refreshToken}`,
        mockAuthResponse,
        300000,
      );
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.TOKEN_REFRESH,
          success: true,
        }),
      );
      expect(result).toEqual(mockAuthResponse);
    });

    it('should return cached result if available', async () => {
      const refreshToken = 'cached-refresh-token';
      const cachedResult = { ...mockAuthResponse };

      const mockCacheGet = jest.fn().mockResolvedValue(cachedResult);
      const mockJwtVerify = jest.fn();

      cacheManager.get = mockCacheGet;
      jwtService.verify = mockJwtVerify;

      const result = await service.refresh(refreshToken);

      expect(mockJwtVerify).not.toHaveBeenCalled();
      expect(result).toEqual(cachedResult);
    });

    it('should handle cache error gracefully', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: 'user-id', email: 'test@example.com', username: 'testuser' };

      const mockCacheGet = jest.fn().mockRejectedValue(new Error('Cache error'));
      const mockJwtVerify = jest.fn().mockReturnValue(payload);
      const mockFindOne = jest.fn().mockResolvedValue(mockUser);
      const mockCacheSet = jest.fn().mockResolvedValue(undefined);
      const mockLog = jest.fn().mockResolvedValue(undefined);

      cacheManager.get = mockCacheGet;
      jwtService.verify = mockJwtVerify;
      usersService.findOne = mockFindOne;
      cacheManager.set = mockCacheSet;
      auditService.log = mockLog;

      const result = await service.refresh(refreshToken);

      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw error for invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';

      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });
      const mockLog = jest.spyOn(auditService, 'log').mockResolvedValue(undefined);

      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it('should throw error for non-existent user', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: 'user-id', email: 'test@example.com', username: 'testuser' };

      const mockCacheGet = jest.fn().mockResolvedValue(null);
      const mockJwtVerify = jest.fn().mockReturnValue(payload);
      const mockFindOne = jest.fn().mockResolvedValue(null);
      const mockLog = jest.fn().mockResolvedValue(undefined);

      cacheManager.get = mockCacheGet;
      jwtService.verify = mockJwtVerify;
      usersService.findOne = mockFindOne;
      auditService.log = mockLog;

      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw error for inactive user', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: 'user-id', email: 'test@example.com', username: 'testuser' };
      const inactiveUser = { ...mockUser, isActive: false };

      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(jwtService, 'verify').mockReturnValue(payload);
      jest.spyOn(usersService, 'findOne').mockResolvedValue(inactiveUser);
      jest.spyOn(auditService, 'log').mockResolvedValue(undefined);

      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle cache set error gracefully', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: 'user-id', email: 'test@example.com', username: 'testuser' };

      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(jwtService, 'verify').mockReturnValue(payload);
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(cacheManager, 'set').mockRejectedValue(new Error('Cache set error'));
      jest.spyOn(auditService, 'log').mockResolvedValue(undefined);

      const result = await service.refresh(refreshToken);

      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const mockJwtSign = jest
        .fn()
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      jwtService.sign = mockJwtSign;

      const result = (service as any).generateTokens(mockUserResponse);

      expect(mockJwtSign).toHaveBeenCalledTimes(2);
      expect(mockJwtSign).toHaveBeenCalledWith(
        {
          sub: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
        },
        {
          secret: 'test-secret',
          expiresIn: '15m',
        },
      );
      expect(mockJwtSign).toHaveBeenCalledWith(
        {
          sub: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
        },
        {
          secret: 'test-refresh-secret',
          expiresIn: '7d',
        },
      );
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('validateJwtToken', () => {
    it('should validate valid JWT token', () => {
      const token = 'valid-token';
      const payload = { sub: 'user-id', email: 'test@example.com', username: 'testuser' };

      const mockJwtVerify = jest.fn().mockReturnValue(payload);

      jwtService.verify = mockJwtVerify;

      const result = service.validateJwtToken(token);

      expect(mockJwtVerify).toHaveBeenCalledWith(token, {
        secret: 'test-secret',
      });
      expect(result).toEqual(payload);
    });

    it('should return null for invalid token', () => {
      const token = 'invalid-token';

      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = service.validateJwtToken(token);

      expect(result).toBeNull();
    });

    it('should return null for token without sub', () => {
      const token = 'token-without-sub';
      const payload = { email: 'test@example.com', username: 'testuser' };

      const mockJwtVerify = jest.fn().mockReturnValue(payload);

      jwtService.verify = mockJwtVerify;

      const result = service.validateJwtToken(token);

      expect(result).toBeNull();
    });
  });

  describe('parseExpireTime', () => {
    it('should parse seconds', () => {
      const result = (service as any).parseExpireTime('30s');
      expect(result).toBe(30);
    });

    it('should parse minutes', () => {
      const result = (service as any).parseExpireTime('15m');
      expect(result).toBe(900);
    });

    it('should parse hours', () => {
      const result = (service as any).parseExpireTime('2h');
      expect(result).toBe(7200);
    });

    it('should parse days', () => {
      const result = (service as any).parseExpireTime('7d');
      expect(result).toBe(604800);
    });

    it('should return default for invalid format', () => {
      const result = (service as any).parseExpireTime('invalid');
      expect(result).toBe(900);
    });
  });

  describe('decodeToken', () => {
    it('should decode valid token', () => {
      const token = 'valid-token';
      const payload = { sub: 'user-id', email: 'test@example.com' };

      const mockJwtDecode = jest.fn().mockReturnValue(payload);

      jwtService.decode = mockJwtDecode;

      const result = service.decodeToken(token);

      expect(mockJwtDecode).toHaveBeenCalledWith(token);
      expect(result).toEqual(payload);
    });

    it('should return null for invalid token', () => {
      const token = 'invalid-token';

      jest.spyOn(jwtService, 'decode').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = service.decodeToken(token);

      expect(result).toBeNull();
    });
  });

  describe('validateUser', () => {
    it('should validate active user', async () => {
      const payload = { sub: 'user-id', email: 'test@example.com', username: 'testuser' };

      const mockFindOne = jest.fn().mockResolvedValue(mockUser);

      usersService.findOne = mockFindOne;

      const result = await service.validateUser(payload);

      expect(mockFindOne).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(mockUser);
    });

    it('should return null for inactive user', async () => {
      const payload = { sub: 'user-id', email: 'test@example.com', username: 'testuser' };
      const inactiveUser = { ...mockUser, isActive: false };

      const mockFindOne = jest.fn().mockResolvedValue(inactiveUser);

      usersService.findOne = mockFindOne;

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });
  });
});
