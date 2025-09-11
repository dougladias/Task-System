import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../service/auth.service';
import { PasswordResetService } from '../service/password-reset.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
  };

  const mockPasswordResetService = {
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
  };

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    isActive: true,
    createdAt: new Date(),
  };

  const mockAuthResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: PasswordResetService,
          useValue: mockPasswordResetService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    controller = module.get<AuthController>(AuthController);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw error when registration fails', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      mockAuthService.register.mockRejectedValue(new Error('Registration failed'));

      await expect(controller.register(registerDto)).rejects.toThrow('Registration failed');
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginDto: LoginDto = {
        emailOrUsername: 'test@example.com',
        password: 'password123',
      };

      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw error when login fails', async () => {
      const loginDto: LoginDto = {
        emailOrUsername: 'test@example.com',
        password: 'wrongpassword',
      };

      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(controller.login(loginDto)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refresh', () => {
    it('should refresh token successfully', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      const refreshResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: mockUser,
      };

      mockAuthService.refresh.mockResolvedValue(refreshResponse);

      const result = await controller.refresh(refreshTokenDto);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
      expect(result).toEqual(refreshResponse);
    });

    it('should throw error when refresh fails', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'invalid-refresh-token',
      };

      mockAuthService.refresh.mockRejectedValue(new Error('Invalid refresh token'));

      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow('Invalid refresh token');
    });
  });
});
