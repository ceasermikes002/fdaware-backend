import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './users/user.module';
import { WorkspaceModule } from './workspaces/workspace.module';
import { LabelModule } from './labels/label.module';
import { VersionModule } from './versions/version.module';
import { ViolationModule } from './violations/violation.module';
import { ScanModule } from './scan/scan.module';
import { BillingModule } from './billing/billing.module';
import { ConfigModule } from './config/config.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DemoModule } from './demo/demo.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    WorkspaceModule,
    LabelModule,
    VersionModule,
    ViolationModule,
    ScanModule,
    BillingModule,
    ConfigModule,
    ReportsModule,
    DashboardModule,
    DemoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
