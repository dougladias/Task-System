import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UsersService } from '../../users/service/users.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { JwtPayload } from '../strategies/jwt.strategy';
import { AuditService } from '../../audit/service/audit.service';
import { AuditAction, AuditResource } from '../../audit/entities/audit-log.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: any,
    private readonly auditService: AuditService,
  ) {}

  async register(
    registerDto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    this.logger.log(`Attempting to register user with email: ${registerDto.email}`);
    try {
      const user = await this.usersService.create(registerDto);
      const userResponse = new UserResponseDto(user);
      this.logger.log(`User registered successfully: ${user.id}`);

      // Log de auditoria
      await this.auditService.log({
        action: AuditAction.USER_REGISTER,
        resource: AuditResource.USER,
        userId: user.id,
        username: user.username,
        email: user.email,
        ipAddress,
        userAgent,
        description: `Novo usuário registrado: ${user.username}`,
        success: true,
      });

      return this.generateTokens(userResponse);
    } catch (error) {
      this.logger.error(
        `Failed to register user: ${registerDto.email}`,
        error instanceof Error ? error.stack : error,
      );

      // Log de erro
      await this.auditService.log({
        action: AuditAction.USER_REGISTER,
        resource: AuditResource.USER,
        username: registerDto.username,
        email: registerDto.email,
        ipAddress,
        userAgent,
        description: `Falha no registro: ${error.message}`,
        success: false,
        errorMessage: error.message,
      });

      if (error instanceof ConflictException) {
        throw error;
      }
      throw new ConflictException('Error creating user');
    }
  }

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const { emailOrUsername, password } = loginDto;

    try {
      // Find user by email or username
      let user = await this.usersService.findByEmail(emailOrUsername);
      if (!user) {
        user = await this.usersService.findByUsername(emailOrUsername);
      }

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // Validate password
      const isPasswordValid = await this.usersService.validatePassword(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const userResponse = new UserResponseDto(user);

      // Log de auditoria
      await this.auditService.log({
        action: AuditAction.USER_LOGIN,
        resource: AuditResource.AUTH,
        userId: user.id,
        username: user.username,
        email: user.email,
        ipAddress,
        userAgent,
        description: `Login realizado: ${user.username}`,
        success: true,
      });

      return this.generateTokens(userResponse);
    } catch (error) {
      // Log de erro
      await this.auditService.log({
        action: AuditAction.USER_LOGIN,
        resource: AuditResource.AUTH,
        username: loginDto.emailOrUsername,
        ipAddress,
        userAgent,
        description: `Falha no login: ${error.message}`,
        success: false,
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async refresh(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    this.logger.log('Processing refresh token request');
    try {
      // Verificar se o token já foi usado recentemente (cache check)
      const tokenCacheKey = `refresh:${refreshToken}`;
      try {
        const cachedResult = (await this.cacheManager.get(tokenCacheKey)) as AuthResponseDto;
        if (cachedResult) {
          this.logger.log('Returning cached refresh result');
          return cachedResult;
        }
      } catch (error) {
        this.logger.warn('Cache error in refresh:', error);
      }

      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const user = await this.usersService.findOne(payload.sub as string);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const userResponse = new UserResponseDto(user);
      const result = this.generateTokens(userResponse);

      // Cache por 5 minutos para evitar múltiplas renovações do mesmo token
      try {
        await this.cacheManager.set(tokenCacheKey, result, 5 * 60 * 1000);
      } catch (error) {
        this.logger.warn('Cache error in refresh set:', error);
      }

      // Log de auditoria
      await this.auditService.log({
        action: AuditAction.TOKEN_REFRESH,
        resource: AuditResource.TOKEN,
        userId: user.id,
        username: user.username,
        email: user.email,
        ipAddress,
        userAgent,
        description: `Token renovado: ${user.username}`,
        success: true,
      });

      return result;
    } catch (error) {
      // Log de erro
      await this.auditService.log({
        action: AuditAction.TOKEN_REFRESH,
        resource: AuditResource.TOKEN,
        ipAddress,
        userAgent,
        description: `Falha na renovação de token: ${error.message}`,
        success: false,
        errorMessage: error.message,
      });
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateTokens(user: UserResponseDto): AuthResponseDto {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    // Generate access token (15 minutes)
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.accessExpire'),
    });

    // Generate refresh token (7 days)
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpire'),
    });

    // Calculate expiration time in seconds
    const expiresIn = this.parseExpireTime(
      this.configService.get<string>('jwt.accessExpire') || '15m',
    );

    return new AuthResponseDto(user, accessToken, refreshToken, expiresIn);
  }

  /**
   * Valida JWT token
   */
  validateJwtToken(token: string): JwtPayload | null {
    try {
      const decoded = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });

      // Verificar se o token decodificado tem as propriedades necessárias
      if (decoded && typeof decoded === 'object' && 'sub' in decoded) {
        return decoded;
      }

      return null;
    } catch {
      return null;
    }
  }

  private parseExpireTime(timeString: string): number {
    const match = timeString.match(/^(\d+)([smhd])$/);
    if (!match) return 15 * 60; // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 15 * 60;
    }
  }

  decodeToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode(token);
    } catch {
      return null;
    }
  }

  async validateUser(payload: JwtPayload): Promise<any> {
    const user = await this.usersService.findOne(payload.sub);
    if (!user || !user.isActive) {
      return null;
    }
    return user;
  }
}
