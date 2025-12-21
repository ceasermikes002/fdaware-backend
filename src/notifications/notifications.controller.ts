/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { WorkspaceRoleGuard } from '../common/guards/workspace-role.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  BulkCreateNotificationDto,
} from './dto/create-notification.dto';
import {
  QueryNotificationsDto,
  MarkNotificationDto,
  BulkMarkNotificationsDto,
} from './dto/query-notifications.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @UseGuards(WorkspaceRoleGuard, RolesGuard)
  @Roles('admin', 'reviewer')
  async createNotification(
    @Body() createNotificationDto: CreateNotificationDto,
    @Req() req: any
  ) {
    return this.notificationsService.createNotification(createNotificationDto);
  }

  @Post('bulk')
  @UseGuards(WorkspaceRoleGuard, RolesGuard)
  @Roles('admin')
  async createBulkNotifications(
    @Body() bulkCreateNotificationDto: BulkCreateNotificationDto,
    @Req() req: any
  ) {
    return this.notificationsService.createBulkNotifications(bulkCreateNotificationDto);
  }

  @Get()
  async getUserNotifications(
    @Query() query: QueryNotificationsDto,
    @Req() req: any
  ) {
    return this.notificationsService.getUserNotifications(req.user.id, query);
  }

  @Get('summary')
  async getNotificationSummary(
    @Query('workspaceId') workspaceId: string,
    @Req() req: any
  ) {
    return this.notificationsService.getNotificationSummary(req.user.id, workspaceId);
  }

  @Put(':id/mark')
  async markNotification(
    @Param('id') id: string,
    @Body() markNotificationDto: MarkNotificationDto,
    @Req() req: any
  ) {
    return this.notificationsService.markNotification(
      id,
      req.user.id,
      markNotificationDto
    );
  }

  @Put('mark-all')
  async markAllNotifications(
    @Query('workspaceId') workspaceId: string,
    @Body() markNotificationDto: MarkNotificationDto,
    @Req() req: any
  ) {
    return this.notificationsService.markAllNotifications(
      req.user.id,
      workspaceId,
      markNotificationDto
    );
  }

  @Put('bulk-mark')
  async bulkMarkNotifications(
    @Body() bulkMarkNotificationsDto: BulkMarkNotificationsDto,
    @Req() req: any
  ) {
    return this.notificationsService.bulkMarkNotifications(
      bulkMarkNotificationsDto,
      req.user.id
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @Param('id') id: string,
    @Req() req: any
  ) {
    return this.notificationsService.deleteNotification(id, req.user.id);
  }

  @Post('cleanup')
  @UseGuards(WorkspaceRoleGuard, RolesGuard)
  @Roles('admin')
  async cleanupExpiredNotifications() {
    return this.notificationsService.cleanupExpiredNotifications();
  }

  // Helper endpoints for specific notification types
  @Post('label-analyzed')
  @UseGuards(WorkspaceRoleGuard, RolesGuard)
  @Roles('admin', 'reviewer')
  async createLabelAnalyzedNotification(
    @Body() data: {
      userId: string;
      workspaceId: string;
      labelName: string;
      labelId: string;
    }
  ) {
    return this.notificationsService.createLabelAnalyzedNotification(
      data.userId,
      data.workspaceId,
      data.labelName,
      data.labelId
    );
  }

  @Post('compliance-issue')
  @UseGuards(WorkspaceRoleGuard, RolesGuard)
  @Roles('admin', 'reviewer')
  async createComplianceIssueNotification(
    @Body() data: {
      userId: string;
      workspaceId: string;
      labelName: string;
      issueCount: number;
      labelId: string;
    }
  ) {
    return this.notificationsService.createComplianceIssueNotification(
      data.userId,
      data.workspaceId,
      data.labelName,
      data.issueCount,
      data.labelId
    );
  }

  @Post('workspace-invite')
  @UseGuards(WorkspaceRoleGuard, RolesGuard)
  @Roles('admin')
  async createWorkspaceInviteNotification(
    @Body() data: {
      userId: string;
      workspaceId: string;
      workspaceName: string;
      inviterName: string;
    }
  ) {
    return this.notificationsService.createWorkspaceInviteNotification(
      data.userId,
      data.workspaceId,
      data.workspaceName,
      data.inviterName
    );
  }

  @Post('report-generated')
  @UseGuards(WorkspaceRoleGuard, RolesGuard)
  @Roles('admin', 'reviewer')
  async createReportGeneratedNotification(
    @Body() data: {
      userId: string;
      workspaceId: string;
      reportName: string;
      reportId: string;
    }
  ) {
    return this.notificationsService.createReportGeneratedNotification(
      data.userId,
      data.workspaceId,
      data.reportName,
      data.reportId
    );
  }
}
