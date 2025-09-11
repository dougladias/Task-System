import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/service/users.service';
import { AuditService } from '../../audit/service/audit.service';
import { ConfigService } from '@nestjs/config';
import { RequestPasswordResetDto, ResetPasswordDto } from '../dto/reset-password.dto';
import { AuditAction, AuditResource } from '../../audit/entities/audit-log.entity';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private usersService: UsersService,
    private auditService: AuditService,
    private configService: ConfigService,
  ) {
    // Configurar SendGrid
    this.transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: this.configService.get('SENDGRID_API_KEY'),
      },
    });
  }

  async requestPasswordReset(
    requestDto: RequestPasswordResetDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const { email } = requestDto;

    try {
      // Buscar usuário pelo email
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        // Por segurança, não informar se o email existe ou não
        this.logger.warn(`Tentativa de reset para email inexistente: ${email}`);
        return {
          message: 'Se o email existir, você receberá instruções para redefinir sua senha.',
        };
      }

      if (!user.isActive) {
        throw new BadRequestException('Conta desativada');
      }

      // Gerar token de reset único
      const resetToken = this.generateResetToken();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      // Salvar token no usuário
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetTokenExpiry;
      await this.userRepository.save(user);

      // Enviar email via RabbitMQ
      await this.sendResetEmail(user, resetToken);

      // Log de auditoria
      await this.auditService.log({
        action: AuditAction.PASSWORD_CHANGE,
        resource: AuditResource.USER,
        userId: user.id,
        username: user.username,
        email: user.email,
        ipAddress,
        userAgent,
        description: `Solicitação de reset de senha: ${user.email}`,
        success: true,
      });

      this.logger.log(`Reset password requested for user: ${user.id}`);
      return { message: 'Se o email existir, você receberá instruções para redefinir sua senha.' };
    } catch (error) {
      this.logger.error('Failed to request password reset', error);

      // Log de erro
      await this.auditService.log({
        action: AuditAction.PASSWORD_CHANGE,
        resource: AuditResource.USER,
        email,
        ipAddress,
        userAgent,
        description: `Falha na solicitação de reset: ${error.message}`,
        success: false,
        errorMessage: error.message,
      });

      throw error;
    }
  }

  async resetPassword(
    resetDto: ResetPasswordDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const { token, newPassword } = resetDto;

    try {
      // Buscar usuário pelo token
      const user = await this.userRepository.findOne({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: new Date(), // TypeORM vai comparar com > current_date
        },
      });

      if (!user) {
        throw new BadRequestException('Token inválido ou expirado');
      }

      if (!user.isActive) {
        throw new BadRequestException('Conta desativada');
      }

      // Verificar se o token não expirou
      if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
        throw new BadRequestException('Token expirado');
      }

      // Hash da nova senha
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Atualizar senha e limpar tokens
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await this.userRepository.save(user);

      // Enviar notificação de senha alterada
      await this.sendPasswordChangedEmail(user);

      // Log de auditoria
      await this.auditService.log({
        action: AuditAction.PASSWORD_CHANGE,
        resource: AuditResource.USER,
        userId: user.id,
        username: user.username,
        email: user.email,
        ipAddress,
        userAgent,
        description: `Senha alterada via reset: ${user.email}`,
        success: true,
      });

      this.logger.log(`Password reset successful for user: ${user.id}`);
      return { message: 'Senha alterada com sucesso!' };
    } catch (error) {
      this.logger.error('Failed to reset password', error);

      // Log de erro
      await this.auditService.log({
        action: AuditAction.PASSWORD_CHANGE,
        resource: AuditResource.USER,
        ipAddress,
        userAgent,
        description: `Falha no reset de senha: ${error.message}`,
        success: false,
        errorMessage: error.message,
      });

      throw error;
    }
  }

  private generateResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  private async sendResetEmail(user: User, token: string): Promise<void> {
    try {
      const resetUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${token}`;

      const html = this.renderTemplate('password_reset', {
        username: user.username,
        resetUrl,
        expiryHours: 1,
      });

      await this.transporter.sendMail({
        from: 'noreply@task-system.com',
        to: user.email,
        subject: 'Redefinição de Senha - Task System',
        html,
      });

      this.logger.log(`Email de reset enviado para ${user.email}`);
    } catch (error) {
      this.logger.error('Failed to send reset email', error);
      throw error;
    }
  }

  private async sendPasswordChangedEmail(user: User): Promise<void> {
    try {
      const html = this.renderTemplate('password_changed', {
        username: user.username,
      });

      await this.transporter.sendMail({
        from: 'noreply@task-system.com',
        to: user.email,
        subject: 'Senha Alterada - Task System',
        html,
      });

      this.logger.log(`Email de confirmação enviado para ${user.email}`);
    } catch (error) {
      this.logger.error('Failed to send password changed email', error);
      // Não lançar erro para não quebrar o fluxo
    }
  }

  private renderTemplate(template: string, data: any): string {
    const templatePath = path.join(__dirname, '../../templates', `${template}.hbs`);
    const source = fs.readFileSync(templatePath, 'utf8');
    const compiled = handlebars.compile(source);
    return compiled(data);
  }
}
