import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordResetService } from './password-reset.service';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/service/users.service';
import { AuditService } from '../../audit/service/audit.service';
import { ConfigService } from '@nestjs/config';
import { RequestPasswordResetDto, ResetPasswordDto } from '../dto/reset-password.dto';
import { BadRequestException } from '@nestjs/common';
import { AuditAction } from '../../audit/entities/audit-log.entity';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let userRepository: Repository<User>;
  let usersService: UsersService;
  let auditService: AuditService;
  let configService: ConfigService;

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashedpassword',
    isActive: true,
    resetPasswordToken: undefined,
    resetPasswordExpires: undefined,
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
      const config = {
        SENDGRID_API_KEY: 'test-api-key',
        FRONTEND_URL: 'http://localhost:3000',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    usersService = module.get<UsersService>(UsersService);
    auditService = module.get<AuditService>(AuditService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestPasswordReset', () => {
    const requestDto: RequestPasswordResetDto = { email: 'test@example.com' };

    it('should handle non-existent user gracefully', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.requestPasswordReset(requestDto);

      expect(result).toEqual({
        message: 'Se o email existir, você receberá instruções para redefinir sua senha.',
      });
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUsersService.findByEmail.mockResolvedValue(inactiveUser);

      await expect(service.requestPasswordReset(requestDto)).rejects.toThrow(BadRequestException);
    });

    it('should process password reset request successfully', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      // Mock transporter sendMail method
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
      (service as any).transporter = { sendMail: mockSendMail };

      // Mock file system and handlebars
      const mockReadFileSync = jest
        .spyOn(require('fs'), 'readFileSync')
        .mockReturnValue('<html>{{username}}</html>');
      const mockCompile = jest
        .spyOn(require('handlebars'), 'compile')
        .mockReturnValue(() => '<html>testuser</html>');

      const result = await service.requestPasswordReset(requestDto, '127.0.0.1', 'Chrome');

      expect(result).toEqual({
        message: 'Se o email existir, você receberá instruções para redefinir sua senha.',
      });
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PASSWORD_CHANGE,
          success: true,
        }),
      );

      mockReadFileSync.mockRestore();
      mockCompile.mockRestore();
    });

    it('should handle email sending failure', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      // Mock transporter sendMail to fail
      const mockSendMail = jest.fn().mockRejectedValue(new Error('Email failed'));
      (service as any).transporter = { sendMail: mockSendMail };

      // Mock file system
      const mockReadFileSync = jest
        .spyOn(require('fs'), 'readFileSync')
        .mockReturnValue('<html>{{username}}</html>');
      const mockCompile = jest
        .spyOn(require('handlebars'), 'compile')
        .mockReturnValue(() => '<html>testuser</html>');

      await expect(service.requestPasswordReset(requestDto)).rejects.toThrow('Email failed');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: 'Email failed',
        }),
      );

      mockReadFileSync.mockRestore();
      mockCompile.mockRestore();
    });
  });

  describe('resetPassword', () => {
    const resetDto: ResetPasswordDto = { token: 'valid-token', newPassword: 'newpassword123' };

    it('should reset password successfully', async () => {
      const userWithToken = {
        ...mockUser,
        resetPasswordToken: 'valid-token',
        resetPasswordExpires: new Date(Date.now() + 3600000), // 1 hour from now
      };

      mockUserRepository.findOne.mockResolvedValue(userWithToken);
      mockUserRepository.save.mockResolvedValue(userWithToken);

      // Mock bcrypt
      const mockHash = jest.spyOn(require('bcrypt'), 'hash').mockResolvedValue('hashedNewPassword');

      // Mock transporter and file system
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
      (service as any).transporter = { sendMail: mockSendMail };
      const mockReadFileSync = jest
        .spyOn(require('fs'), 'readFileSync')
        .mockReturnValue('<html>{{username}}</html>');
      const mockCompile = jest
        .spyOn(require('handlebars'), 'compile')
        .mockReturnValue(() => '<html>testuser</html>');

      const result = await service.resetPassword(resetDto, '127.0.0.1', 'Chrome');

      expect(result).toEqual({ message: 'Senha alterada com sucesso!' });
      expect(mockHash).toHaveBeenCalledWith('newpassword123', 10);
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'hashedNewPassword',
          resetPasswordToken: undefined,
          resetPasswordExpires: undefined,
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PASSWORD_CHANGE,
          success: true,
        }),
      );

      mockHash.mockRestore();
      mockReadFileSync.mockRestore();
      mockCompile.mockRestore();
    });

    it('should throw error for invalid token', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.resetPassword(resetDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error for expired token', async () => {
      const userWithExpiredToken = {
        ...mockUser,
        resetPasswordToken: 'expired-token',
        resetPasswordExpires: new Date(Date.now() - 3600000), // 1 hour ago
      };

      mockUserRepository.findOne.mockResolvedValue(userWithExpiredToken);

      await expect(service.resetPassword(resetDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error for inactive user', async () => {
      const inactiveUser = {
        ...mockUser,
        isActive: false,
        resetPasswordToken: 'valid-token',
        resetPasswordExpires: new Date(Date.now() + 3600000),
      };

      mockUserRepository.findOne.mockResolvedValue(inactiveUser);

      await expect(service.resetPassword(resetDto)).rejects.toThrow(BadRequestException);
    });

    it('should handle confirmation email failure gracefully', async () => {
      const userWithToken = {
        ...mockUser,
        resetPasswordToken: 'valid-token',
        resetPasswordExpires: new Date(Date.now() + 3600000),
      };

      mockUserRepository.findOne.mockResolvedValue(userWithToken);
      mockUserRepository.save.mockResolvedValue(userWithToken);

      // Mock bcrypt
      const mockHash = jest.spyOn(require('bcrypt'), 'hash').mockResolvedValue('hashedNewPassword');

      // Mock transporter to fail on confirmation email
      const mockSendMail = jest.fn().mockRejectedValue(new Error('Confirmation email failed'));
      (service as any).transporter = { sendMail: mockSendMail };
      const mockReadFileSync = jest
        .spyOn(require('fs'), 'readFileSync')
        .mockReturnValue('<html>{{username}}</html>');
      const mockCompile = jest
        .spyOn(require('handlebars'), 'compile')
        .mockReturnValue(() => '<html>testuser</html>');

      const result = await service.resetPassword(resetDto);

      expect(result).toEqual({ message: 'Senha alterada com sucesso!' });
      // Should not throw error even if confirmation email fails

      mockHash.mockRestore();
      mockReadFileSync.mockRestore();
      mockCompile.mockRestore();
    });
  });

  describe('generateResetToken', () => {
    it('should generate a 64 character hex token', () => {
      const token = (service as any).generateResetToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });
  });

  describe('sendResetEmail', () => {
    it('should send reset email successfully', async () => {
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
      (service as any).transporter = { sendMail: mockSendMail };

      const mockReadFileSync = jest
        .spyOn(require('fs'), 'readFileSync')
        .mockReturnValue('<html>{{username}}</html>');
      const mockCompile = jest
        .spyOn(require('handlebars'), 'compile')
        .mockReturnValue(() => '<html>testuser</html>');

      await (service as any).sendResetEmail(mockUser, 'test-token');

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@task-system.com',
        to: mockUser.email,
        subject: 'Redefinição de Senha - Task System',
        html: '<html>testuser</html>',
      });

      mockReadFileSync.mockRestore();
      mockCompile.mockRestore();
    });

    it('should handle email sending failure', async () => {
      const mockSendMail = jest.fn().mockRejectedValue(new Error('Send failed'));
      (service as any).transporter = { sendMail: mockSendMail };

      const mockReadFileSync = jest
        .spyOn(require('fs'), 'readFileSync')
        .mockReturnValue('<html>{{username}}</html>');
      const mockCompile = jest
        .spyOn(require('handlebars'), 'compile')
        .mockReturnValue(() => '<html>testuser</html>');

      await expect((service as any).sendResetEmail(mockUser, 'test-token')).rejects.toThrow(
        'Send failed',
      );

      mockReadFileSync.mockRestore();
      mockCompile.mockRestore();
    });
  });

  describe('sendPasswordChangedEmail', () => {
    it('should send password changed email successfully', async () => {
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
      (service as any).transporter = { sendMail: mockSendMail };

      const mockReadFileSync = jest
        .spyOn(require('fs'), 'readFileSync')
        .mockReturnValue('<html>{{username}}</html>');
      const mockCompile = jest
        .spyOn(require('handlebars'), 'compile')
        .mockReturnValue(() => '<html>testuser</html>');

      await (service as any).sendPasswordChangedEmail(mockUser);

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@task-system.com',
        to: mockUser.email,
        subject: 'Senha Alterada - Task System',
        html: '<html>testuser</html>',
      });

      mockReadFileSync.mockRestore();
      mockCompile.mockRestore();
    });

    it('should not throw error if confirmation email fails', async () => {
      const mockSendMail = jest.fn().mockRejectedValue(new Error('Send failed'));
      (service as any).transporter = { sendMail: mockSendMail };

      const mockReadFileSync = jest
        .spyOn(require('fs'), 'readFileSync')
        .mockReturnValue('<html>{{username}}</html>');
      const mockCompile = jest
        .spyOn(require('handlebars'), 'compile')
        .mockReturnValue(() => '<html>testuser</html>');

      await expect((service as any).sendPasswordChangedEmail(mockUser)).resolves.not.toThrow();

      mockReadFileSync.mockRestore();
      mockCompile.mockRestore();
    });
  });

  describe('renderTemplate', () => {
    it('should render template successfully', () => {
      const mockReadFileSync = jest
        .spyOn(require('fs'), 'readFileSync')
        .mockReturnValue('<html>{{username}}</html>');
      const mockCompile = jest
        .spyOn(require('handlebars'), 'compile')
        .mockReturnValue((data) => `<html>${data.username}</html>`);

      const result = (service as any).renderTemplate('test_template', { username: 'testuser' });

      expect(result).toBe('<html>testuser</html>');
      expect(mockReadFileSync).toHaveBeenCalled();
      expect(mockCompile).toHaveBeenCalledWith('<html>{{username}}</html>');

      mockReadFileSync.mockRestore();
      mockCompile.mockRestore();
    });
  });
});
