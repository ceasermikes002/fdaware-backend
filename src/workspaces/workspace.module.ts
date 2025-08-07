import { Module, forwardRef } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/utils/email.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, forwardRef(() => NotificationsModule)],
  controllers: [WorkspaceController],
  providers: [WorkspaceService, PrismaService, EmailService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}