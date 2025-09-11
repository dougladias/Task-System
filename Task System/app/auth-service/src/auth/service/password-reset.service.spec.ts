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
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';

// Mock @nestjs/typeorm to prevent TypeORM initialization
jest.mock('@nestjs/typeorm', () => ({
  ...jest.requireActual('@nestjs/typeorm'),
  getRepositoryToken: jest.fn((entity: any) => `Repository<${entity.name}>`),
}));

// Mock TypeORM Repository to prevent initialization
jest.mock('typeorm', () => ({
  ...jest.requireActual('typeorm'),
  Repository: jest.fn().mockImplementation(() => ({
    findOne: jest.fn(),
    save: jest.fn(),
  })),
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(),
  })),
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

// Mock fs
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

// Mock handlebars
jest.mock('handlebars', () => ({
  compile: jest.fn(),
}));

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let userRepository: Repository<User>;
  let usersService: UsersService;
  let auditService: AuditService;
  let configService: ConfigService;

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashedpassword',
    isActive: true,
    resetPasswordToken: undefined,
    resetPasswordExpires: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransporter = {
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            hashPassword: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(() => {}),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    usersService = module.get<UsersService>(UsersService);
    auditService = module.get<AuditService>(AuditService);
    configService = module.get<ConfigService>(ConfigService);

    // Mock SendGrid transporter
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Mock config
    const mockConfigGet = jest.fn().mockImplementation((key: string) => {
      const config = {
        SENDGRID_API_KEY: 'test-key',
        FRONTEND_URL: 'http://localhost:3000',
      };
      return config[key];
    });
    configService.get = mockConfigGet;

    // Mock crypto
    const mockRandomBytes = jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue('mockedtoken12345678901234567890123456789012'),
    });
    (global as any).crypto = { randomBytes: mockRandomBytes };

    // Mock fs
    const mockReadFileSync = jest.fn().mockReturnValue('<html>{{username}}</html>');
    (fs.readFileSync as jest.Mock) = mockReadFileSync;

    // Mock handlebars
    const mockCompile = jest
      .fn()
      .mockReturnValue(jest.fn().mockReturnValue('<html>testuser</html>'));
    (handlebars.compile as jest.Mock) = mockCompile;

    // Mock bcrypt
    (bcrypt.hash as any).mockResolvedValue('hashednewpassword');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestPasswordReset', () => {
    it('should request password reset successfully', async () => {
      const dto: RequestPasswordResetDto = { email: 'test@example.com' };

      const mockFindByEmail = jest.fn().mockResolvedValue(mockUser as User);
      const mockSave = jest.fn().mockResolvedValue(mockUser as User);
      const mockLog = jest.fn().mockResolvedValue(undefined);

      usersService.findByEmail = mockFindByEmail;
      userRepository.save = mockSave;
      auditService.log = mockLog;

      const result = await service.requestPasswordReset(dto, '127.0.0.1', 'Chrome');

      expect(result).toEqual({
        message: 'Se o email existir, você receberá instruções para redefinir sua senha.',
      });
      expect(mockTransporter.sendMail).toHaveBeenCalled();
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PASSWORD_CHANGE,
          userId: mockUser.id,
          success: true,
        }),
      );
    });

    it('should handle non-existent user gracefully', async () => {
      const dto: RequestPasswordResetDto = { email: 'nonexistent@example.com' };

      const mockFindByEmail = jest.fn().mockResolvedValue(null);

      usersService.findByEmail = mockFindByEmail;

      const result = await service.requestPasswordReset(dto);

      expect(result).toEqual({
        message: 'Se o email existir, você receberá instruções para redefinir sua senha.',
      });
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should throw error for inactive user', async () => {
      const dto: RequestPasswordResetDto = { email: 'inactive@example.com' };
      const inactiveUser = { ...mockUser, isActive: false };

      const mockFindByEmail = jest.fn().mockResolvedValue(inactiveUser as User);

      usersService.findByEmail = mockFindByEmail;

      await expect(service.requestPasswordReset(dto)).rejects.toThrow(BadRequestException);
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should handle email sending failure', async () => {
      const dto: RequestPasswordResetDto = { email: 'test@example.com' };

      const mockFindByEmail = jest.fn().mockResolvedValue(mockUser as User);
      const mockSave = jest.fn().mockResolvedValue(mockUser as User);
      const mockLog = jest.fn().mockResolvedValue(undefined);

      usersService.findByEmail = mockFindByEmail;
      userRepository.save = mockSave;
      auditService.log = mockLog;
      mockTransporter.sendMail.mockRejectedValue(new Error('Email failed'));

      await expect(service.requestPasswordReset(dto)).rejects.toThrow('Email failed');
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: 'Email failed',
        }),
      );
    });

    it('should log audit with IP and user agent', async () => {
      const dto: RequestPasswordResetDto = { email: 'test@example.com' };

      const mockFindByEmail = jest.fn().mockResolvedValue(mockUser as User);
      const mockSave = jest.fn().mockResolvedValue(mockUser as User);
      const mockLog = jest.fn().mockResolvedValue(undefined);

      usersService.findByEmail = mockFindByEmail;
      userRepository.save = mockSave;
      auditService.log = mockLog;

      await service.requestPasswordReset(dto, '192.168.1.1', 'Mozilla/5.0');

      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        }),
      );
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const dto: ResetPasswordDto = { token: 'validtoken', newPassword: 'newpassword123' };
      const userWithToken = {
        ...mockUser,
        resetPasswordToken: 'validtoken',
        resetPasswordExpires: new Date(Date.now() + 3600000), // 1 hour from now
      };

      const mockFindOne = jest.fn().mockResolvedValue(userWithToken as User);
      const mockSave = jest.fn().mockResolvedValue(userWithToken as User);
      const mockLog = jest.fn().mockResolvedValue(undefined);

      userRepository.findOne = mockFindOne;
      userRepository.save = mockSave;
      auditService.log = mockLog;

      const result = await service.resetPassword(dto, '127.0.0.1', 'Chrome');

      expect(result).toEqual({ message: 'Senha alterada com sucesso!' });
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'hashednewpassword',
          resetPasswordToken: undefined,
          resetPasswordExpires: undefined,
        }),
      );
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2); // Reset + confirmation
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.PASSWORD_CHANGE,
          success: true,
        }),
      );
    });

    it('should throw error for invalid token', async () => {
      const dto: ResetPasswordDto = { token: 'invalidtoken', newPassword: 'newpassword123' };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('should throw error for expired token', async () => {
      const dto: ResetPasswordDto = { token: 'expiredtoken', newPassword: 'newpassword123' };
      const userWithExpiredToken = {
        ...mockUser,
        resetPasswordToken: 'expiredtoken',
        resetPasswordExpires: new Date(Date.now() - 3600000), // 1 hour ago
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithExpiredToken as User);

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error for inactive user', async () => {
      const dto: ResetPasswordDto = { token: 'validtoken', newPassword: 'newpassword123' };
      const inactiveUser = {
        ...mockUser,
        isActive: false,
        resetPasswordToken: 'validtoken',
        resetPasswordExpires: new Date(Date.now() + 3600000),
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(inactiveUser as User);

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
    });

    it('should handle password hashing failure', async () => {
      const dto: ResetPasswordDto = { token: 'validtoken', newPassword: 'newpassword123' };
      const userWithToken = {
        ...mockUser,
        resetPasswordToken: 'validtoken',
        resetPasswordExpires: new Date(Date.now() + 3600000),
      };

      const mockFindOne = jest.fn().mockResolvedValue(userWithToken as User);
      const mockLog = jest.fn().mockResolvedValue(undefined);

      userRepository.findOne = mockFindOne;
      auditService.log = mockLog;
      (bcrypt.hash as any).mockRejectedValueOnce(new Error('Hash failed'));

      await expect(service.resetPassword(dto)).rejects.toThrow('Hash failed');
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: 'Hash failed',
        }),
      );
    });

    it('should handle confirmation email failure gracefully', async () => {
      const dto: ResetPasswordDto = { token: 'validtoken', newPassword: 'newpassword123' };
      const userWithToken = {
        ...mockUser,
        resetPasswordToken: 'validtoken',
        resetPasswordExpires: new Date(Date.now() + 3600000),
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithToken as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue(userWithToken as User);
      jest.spyOn(auditService, 'log').mockResolvedValue(undefined);

      // First call succeeds (reset email), second fails (confirmation email)
      mockTransporter.sendMail
        .mockResolvedValueOnce({ messageId: 'reset-id' })
        .mockRejectedValueOnce(new Error('Confirmation email failed'));

      const result = await service.resetPassword(dto);

      expect(result).toEqual({ message: 'Senha alterada com sucesso!' });
      // Should not throw error even if confirmation email fails
    });
  });

  describe('generateResetToken', () => {
    it('should generate a 64 character hex token', () => {
      const token = (service as any).generateResetToken();
      expect(token).toBe('mockedtoken12345678901234567890123456789012');
      expect(token.length).toBe(64);
      expect((global as any).crypto.randomBytes).toHaveBeenCalledWith(32);
    });
  });

  describe('sendResetEmail', () => {
    it('should send reset email successfully', async () => {
      const user = mockUser as User;
      const token = 'testtoken';

      const mockGet = jest.fn().mockReturnValue('http://localhost:3000');

      configService.get = mockGet;

      await (service as any).sendResetEmail(user, token);

      expect(mockGet).toHaveBeenCalledWith('FRONTEND_URL', 'http://localhost:3000');
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(handlebars.compile).toHaveBeenCalled();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@task-system.com',
        to: user.email,
        subject: 'Redefinição de Senha - Task System',
        html: '<html>testuser</html>',
      });
    });

    it('should handle email sending failure', async () => {
      const user = mockUser as User;
      const token = 'testtoken';

      mockTransporter.sendMail.mockRejectedValue(new Error('Send failed'));

      await expect((service as any).sendResetEmail(user, token)).rejects.toThrow('Send failed');
    });
  });

  describe('sendPasswordChangedEmail', () => {
    it('should send password changed email successfully', async () => {
      const user = mockUser as User;

      await (service as any).sendPasswordChangedEmail(user);

      expect(fs.readFileSync).toHaveBeenCalled();
      expect(handlebars.compile).toHaveBeenCalled();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@task-system.com',
        to: user.email,
        subject: 'Senha Alterada - Task System',
        html: '<html>testuser</html>',
      });
    });

    it('should not throw error if confirmation email fails', async () => {
      const user = mockUser as User;

      mockTransporter.sendMail.mockRejectedValue(new Error('Send failed'));

      await expect((service as any).sendPasswordChangedEmail(user)).resolves.not.toThrow();
    });
  });

  describe('renderTemplate', () => {
    it('should render template successfully', () => {
      const template = 'password_reset';
      const data = { username: 'testuser' };

      const result = (service as any).renderTemplate(template, data);

      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('templates/password_reset.hbs'),
        'utf8',
      );
      expect(handlebars.compile).toHaveBeenCalledWith('<html>{{username}}</html>');
      expect(result).toBe('<html>testuser</html>');
    });
  });
});
