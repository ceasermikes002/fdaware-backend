import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from '../common/guards/auth.guard';
import { AuthService } from './auth.service';
import { UserService } from '../users/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth.controller';
import { EmailService } from '../common/utils/email.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'changeme',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthGuard, AuthService, UserService, PrismaService, EmailService],
  exports: [AuthGuard, AuthService, JwtModule],
})
export class AuthModule {} 