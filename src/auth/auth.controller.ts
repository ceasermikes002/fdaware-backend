import { Controller, Post, Body, UploadedFile, UseInterceptors, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body(new ValidationPipe({ whitelist: true, transform: true })) dto: SignInDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = await this.authService.generateToken(user);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName || ''}${user.lastName ? ' ' + user.lastName : ''}`.trim(),
      profileImage: user.profileImage,
      onboardingComplete: !!(user as any).onboardingComplete,
      token,
    };
  }

  @Post('signup')
  @UseInterceptors(FileInterceptor('profileImage'))
  async signup(
    @UploadedFile() file: Express.Multer.File,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: SignUpDto
  ) {
    const user = await this.authService.createUser({
      ...dto,
      profileImage: file ? file.filename : null,
    });
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }


}