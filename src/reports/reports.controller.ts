import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { Roles } from '../common/decorators';

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  async getReportsOverview(@Query('workspaceId') workspaceId: string) {
    return this.reportsService.getReportsOverview(workspaceId);
  }

  @Get()
  async getReports(
    @Query('workspaceId') workspaceId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.reportsService.getReports(
      workspaceId,
      limit ? parseInt(limit) : 10,
      offset ? parseInt(offset) : 0,
    );
  }

  @Post('generate')
  @Roles('admin', 'member')
  async generateReport(@Body() generateDto: GenerateReportDto) {
    return this.reportsService.generateReport(generateDto);
  }

  @Get(':reportId')
  async getReportById(@Param('reportId') reportId: string) {
    return this.reportsService.getReportById(reportId);
  }

  @Delete(':reportId')
  async deleteReport(@Param('reportId') reportId: string) {
    return this.reportsService.deleteReport(reportId);
  }
} 