import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { Roles } from '../common/decorators';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  async getReportsOverview(@Query('workspaceId') workspaceId: string, @Req() req: any) {
    return this.reportsService.getReportsOverview(workspaceId, req.user.id);
  }

  @Get()
  async getReports(
    @Query('workspaceId') workspaceId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Req() req?: any,
  ) {
    return this.reportsService.getReports(
      workspaceId,
      req?.user?.id,
      limit ? parseInt(limit) : 10,
      offset ? parseInt(offset) : 0,
    );
  }

  @Post('generate')
  @Roles('admin', 'member')
  async generateReport(@Body() generateDto: GenerateReportDto, @Req() req: any) {
    return this.reportsService.generateReport(generateDto, req.user.id);
  }

  @Get(':reportId')
  async getReportById(@Param('reportId') reportId: string) {
    return this.reportsService.getReportById(reportId);
  }

  @Get(':reportId/download')
  async downloadReport(
    @Param('reportId') reportId: string,
    @Query('format') format: string = 'pdf',
    @Req() req: any
  ) {
    return this.reportsService.getReportDownloadUrl(reportId, format, req.user.id);
  }

  @Delete(':reportId')
  async deleteReport(@Param('reportId') reportId: string) {
    return this.reportsService.deleteReport(reportId);
  }
}