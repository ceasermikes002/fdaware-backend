import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '../common/guards/auth.guard';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(@Query('workspaceId') workspaceId: string) {
    return this.dashboardService.getSummary(workspaceId);
  }

  @Get('trends')
  async getTrends(@Query('workspaceId') workspaceId: string) {
    return this.dashboardService.getTrends(workspaceId);
  }

  @Get('activity')
  async getActivity(@Query('workspaceId') workspaceId: string) {
    return this.dashboardService.getActivity(workspaceId);
  }
} 