import { Get, Put, Post, Body, UseGuards, Request, Controller } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { UserService } from './user.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('onboarding')
  @UseGuards(AuthGuard)
  async onboarding(@Request() req, @Body() data: any) {
    // req.user.id from JWT (should be set by AuthGuard)
    return this.userService.updateOnboarding(req.user.id, data);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@Request() req) {
    return this.userService.getProfile(req.user.id);
  }

  @Put('me')
  @UseGuards(AuthGuard)
  async updateMe(@Request() req, @Body() dto: UpdateUserProfileDto) {
    return this.userService.updateProfile(req.user.id, dto);
  }

  @Post('me/change-password')
  @UseGuards(AuthGuard)
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(req.user.id, dto);
  }
}