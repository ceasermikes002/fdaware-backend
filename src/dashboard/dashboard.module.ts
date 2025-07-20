import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { PrismaService } from '../prisma/prisma.service';
import { LabelModule } from '../labels/label.module';
import { ReportsModule } from '../reports/reports.module';
import { ViolationModule } from '../violations/violation.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    LabelModule,
    ReportsModule,
    ViolationModule,
    AuthModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService, PrismaService],
  exports: [DashboardService],
})
export class DashboardModule {} 