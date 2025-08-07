import { Module, forwardRef } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { FileGenerationService } from './file-generation.service';
import { S3StorageService } from './s3-storage.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LabelModule } from '../labels/label.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, LabelModule, AuthModule, forwardRef(() => NotificationsModule)],
  controllers: [ReportsController],
  providers: [ReportsService, FileGenerationService, S3StorageService],
  exports: [ReportsService],
})
export class ReportsModule {}