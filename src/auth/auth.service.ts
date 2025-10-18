import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../users/user.service';
import { EmailService } from '../common/utils/email.service';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';


@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, plainPassword: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) return null;
    const isMatch = await bcrypt.compare(plainPassword, user.password);
    if (!isMatch) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async generateToken(user: any) {
    const payload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }

  async createUser(data: any) {
    const existing = await this.userService.findByEmail(data.email);
    if (existing) {
      throw new BadRequestException('A user with this email already exists.');
    }
    // Only pick allowed fields
    const {
      email,
      password,
      name,
      profileImage,
      firstName,
      lastName,
      company,
      agreeToTerms,
      workspaceId,
    } = data;
    const hashedPassword = await bcrypt.hash(password, 10);
    const agreeToTermsBool =
      typeof agreeToTerms === 'string'
        ? agreeToTerms === 'true'
        : !!agreeToTerms;
    const user = await this.userService.createUser({
      email,
      password: hashedPassword,
      name,
      profileImage,
      firstName,
      lastName,
      company,
      agreeToTerms: agreeToTermsBool,
      workspaceId,
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...result } = user;
    return result;
  }

  async forgotPassword(dto: { email: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    await this.emailService.sendTemplateMail({
      to: user.email,
      subject: 'Reset your FDAware password',
      templateName: 'reset-password',
      context: {
        name: user.firstName || user.email,
        resetUrl,
        year: new Date().getFullYear(),
      },
    });
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: { token: string; newPassword: string }) {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { token: dto.token }, include: { user: true } });
    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: record.userId }, data: { password: hashed } });
    await this.prisma.passwordResetToken.update({ where: { token: dto.token }, data: { used: true } });
    // Optionally send confirmation email
    await this.emailService.sendTemplateMail({
      to: record.user.email,
      subject: 'Your FDAware password was reset',
      templateName: 'password-changed',
      context: {
        name: record.user.firstName || record.user.email,
        year: new Date().getFullYear(),
      },
    });
    return { message: 'Password has been reset.' };
  }


}