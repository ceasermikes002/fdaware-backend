import { Module, forwardRef } from '@nestjs/common';
import { LabelService } from './label.service';
import { LabelController } from './label.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Service } from './s3.service';
import { ScanModule } from '../scan/scan.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, ScanModule, AuthModule, forwardRef(() => NotificationsModule)],
  providers: [LabelService, S3Service],
  controllers: [LabelController],
  exports: [LabelService],
})
export class LabelModule {}