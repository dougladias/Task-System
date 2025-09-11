import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from '../service/auth.service';
import { UsersService } from '../../users/service/users.service';

@Controller()
export class AuthMicroserviceController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @MessagePattern({ cmd: 'validate_token' })
  async validateToken(@Payload() data: { token: string }) {
    try {
      // Decodificar token
      const decoded = this.authService.decodeToken(data.token);
      if (!decoded?.sub) {
        return { isValid: false, error: 'Invalid token format' };
      }

      // Buscar usuário no banco
      const user = await this.usersService.findOne(decoded.sub);
      if (!user?.isActive) {
        return { isValid: false, error: 'User not found or inactive' };
      }

      return {
        isValid: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isActive: user.isActive,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Token verification failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @MessagePattern({ cmd: 'get_user_by_id' })
  async getUserById(@Payload() data: { userId: string }) {
    try {
      const user = await this.usersService.findOne(data.userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch user',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @MessagePattern({ cmd: 'get_users_by_ids' })
  async getUsersByIds(@Payload() data: { userIds: string[] }) {
    try {
      const users = await this.usersService.findByIds(data.userIds);
      return {
        success: true,
        users: users.map((user) => ({
          id: user.id,
          email: user.email,
          username: user.username,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @MessagePattern({ cmd: 'health_check' })
  healthCheck() {
    return {
      status: 'ok',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
    };
  }
}
