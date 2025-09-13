import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './controller/auth.controller';
import { AuthMicroserviceController } from './controller/auth-microservice.controller';
import { AuthService } from './service/auth.service';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { PasswordResetService } from './service/password-reset.service';
import { AuditModule } from 'src/audit/audit.module';
import { User } from '../users/entities/user.entity';
import { KafkaProducerService } from '../kafka/kafka.producer';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessExpire'),
        },
      }),
    }),
    UsersModule,
    AuditModule,
  ],
  controllers: [AuthController, AuthMicroserviceController],
  providers: [AuthService, PasswordResetService, JwtStrategy, JwtRefreshStrategy, KafkaProducerService],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
