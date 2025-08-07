import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LabelService } from '../labels/label.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { FileGenerationService } from './file-generation.service';
import { S3StorageService } from './s3-storage.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private labelService: LabelService,
    private fileGenerationService: FileGenerationService,
    private s3StorageService: S3StorageService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  async getReportsOverview(workspaceId: string, userId: string) {
    // Check if workspace exists
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    // Check if user is a member of the workspace
    const membership = await this.prisma.workspaceUser.findUnique({ where: { userId_workspaceId: { userId, workspaceId } } });
    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
    // Get all labels for the workspace
    const labels = await this.labelService.getAllLabels(workspaceId);
    
    // Calculate compliance metrics
    const totalProducts = labels.length;
    const compliantProducts = labels.filter(label => 
      label.analysis?.overallScore >= 80
    ).length;
    
    const avgComplianceScore = totalProducts > 0 
      ? Math.round(labels.reduce((sum, label) => sum + (label.analysis?.overallScore || 0), 0) / totalProducts)
      : 0;

    // Count violations by severity - only 'high', 'medium', 'low' are valid
    const allViolations = labels.flatMap(label => label.violations);
    const highViolations = allViolations.filter(v => v.severity === 'high').length;
    const mediumViolations = allViolations.filter(v => v.severity === 'medium').length;
    const lowViolations = allViolations.filter(v => v.severity === 'low').length;

    // Calculate approval/rejection metrics
    const allVersions = labels.map(label => label.version).filter(Boolean);
    const approvedVersions = allVersions.filter(v => v.status === 'APPROVED').length;
    const rejectedVersions = allVersions.filter(v => v.status === 'REJECTED').length;
    const pendingReview = allVersions.filter(v => v.status === 'SCANNED').length;
    const approvalRate = totalProducts > 0 ? Math.round((approvedVersions / totalProducts) * 100) : 0;

    // Calculate trends (comparing current month vs previous month)
    const now = new Date();
    const currentMonthLabels = labels.filter(label => {
      const analyzedAt = new Date(label.analysis?.analyzedAt || label.version?.analyzedAt || '');
      return analyzedAt.getMonth() === now.getMonth() && analyzedAt.getFullYear() === now.getFullYear();
    });

    const previousMonthLabels = labels.filter(label => {
      const analyzedAt = new Date(label.analysis?.analyzedAt || label.version?.analyzedAt || '');
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return analyzedAt.getMonth() === prevMonth.getMonth() && analyzedAt.getFullYear() === prevMonth.getFullYear();
    });

    const currentAvgScore = currentMonthLabels.length > 0 
      ? Math.round(currentMonthLabels.reduce((sum, label) => sum + (label.analysis?.overallScore || 0), 0) / currentMonthLabels.length)
      : 0;

    const previousAvgScore = previousMonthLabels.length > 0 
      ? Math.round(previousMonthLabels.reduce((sum, label) => sum + (label.analysis?.overallScore || 0), 0) / previousMonthLabels.length)
      : 0;

    const scoreChange = currentAvgScore - previousAvgScore;

    // Calculate approval rate trends
    const currentMonthApproved = currentMonthLabels.filter(label => label.version?.status === 'APPROVED').length;
    const currentMonthTotal = currentMonthLabels.length;
    const currentApprovalRate = currentMonthTotal > 0 ? Math.round((currentMonthApproved / currentMonthTotal) * 100) : 0;

    const previousMonthApproved = previousMonthLabels.filter(label => label.version?.status === 'APPROVED').length;
    const previousMonthTotal = previousMonthLabels.length;
    const previousApprovalRate = previousMonthTotal > 0 ? Math.round((previousMonthApproved / previousMonthTotal) * 100) : 0;

    const approvalRateChange = currentApprovalRate - previousApprovalRate;

    // Get recent activity
    const recentReports = await this.prisma.report.findMany({
      where: { workspaceId },
      orderBy: { generatedAt: 'desc' },
      take: 5,
    });

    return {
      complianceMetrics: {
        totalProducts,
        compliantProducts,
        avgComplianceScore,
        highViolations,
        mediumViolations,
        lowViolations,
        approvalMetrics: {
          approvedVersions,
          rejectedVersions,
          pendingReview,
          approvalRate,
        },
        trends: {
          scoreChange,
          approvalRateChange,
          labelsReviewed: approvedVersions + rejectedVersions,
          newViolations: highViolations + mediumViolations + lowViolations,
          period: 'month'
        }
      },
      recentActivity: {
        reportsGenerated: recentReports.length,
        lastReportDate: recentReports[0]?.generatedAt || null,
        nextScheduledReport: null // Could implement scheduling later
      }
    };
  }

  async getReports(workspaceId: string, userId: string, limit: number = 10, offset: number = 0) {
    // Check if workspace exists
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    // Check if user is a member of the workspace
    const membership = await this.prisma.workspaceUser.findUnique({ where: { userId_workspaceId: { userId, workspaceId } } });
    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
    const reports = await this.prisma.report.findMany({
      where: { workspaceId },
      orderBy: { generatedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.report.count({
      where: { workspaceId },
    });

    return {
      reports: reports.map(report => ({
        id: report.id,
        name: report.name,
        type: report.type,
        dateRange: report.dateRange as { start: string; end: string },
        generatedAt: report.generatedAt,
        status: report.status,
        summary: report.summary as any,
        filters: report.filters as any,
        downloadUrl: report.downloadUrl,
        expiresAt: report.expiresAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      }
    };
  }

  async generateReport(generateDto: GenerateReportDto, userId: string) {
    // Check if workspace exists
    const workspace = await this.prisma.workspace.findUnique({ where: { id: generateDto.workspaceId } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    // Check if user is a member of the workspace
    const membership = await this.prisma.workspaceUser.findUnique({ where: { userId_workspaceId: { userId, workspaceId: generateDto.workspaceId } } });
    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
    // Create the report record
    const report = await this.prisma.report.create({
      data: {
        name: generateDto.name,
        type: generateDto.type,
        workspaceId: generateDto.workspaceId,
        status: 'generating',
        progress: 0,
        dateRange: generateDto.dateRange ? JSON.parse(JSON.stringify(generateDto.dateRange)) : this.getDefaultDateRange(generateDto.type),
        filters: generateDto.filters ? JSON.parse(JSON.stringify(generateDto.filters)) : {},
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
      },
    });

    // Start async report generation
    this.generateReportAsync(report.id, generateDto);

    return {
      report: {
        id: report.id,
        name: report.name,
        type: report.type,
        status: report.status,
        progress: report.progress,
        estimatedCompletion: report.estimatedCompletion,
        downloadUrl: null,
        expiresAt: null,
      }
    };
  }

  private async generateReportAsync(reportId: string, generateDto: GenerateReportDto) {
    try {
      // Update progress
      await this.prisma.report.update({
        where: { id: reportId },
        data: { progress: 25 },
      });

      // Get labels for the workspace
      const labels = await this.labelService.getAllLabels(generateDto.workspaceId);
      
      // Filter by date range if provided
      let filteredLabels = labels;
      if (generateDto.dateRange) {
        const startDate = new Date(generateDto.dateRange.start);
        const endDate = new Date(generateDto.dateRange.end);
        
        filteredLabels = labels.filter(label => {
          const analyzedAt = new Date(label.analysis?.analyzedAt || label.version?.analyzedAt || '');
          return analyzedAt >= startDate && analyzedAt <= endDate;
        });
      }

      // Update progress
      await this.prisma.report.update({
        where: { id: reportId },
        data: { progress: 50 },
      });

      // Calculate summary metrics
      const totalProducts = filteredLabels.length;
      const avgComplianceScore = totalProducts > 0 
        ? Math.round(filteredLabels.reduce((sum, label) => sum + (label.analysis?.overallScore || 0), 0) / totalProducts)
        : 0;

      const allViolations = filteredLabels.flatMap(label => label.violations);
      const totalViolations = allViolations.length;
      const highViolations = allViolations.filter(v => v.severity === 'high').length;
      const mediumViolations = allViolations.filter(v => v.severity === 'medium').length;
      const lowViolations = allViolations.filter(v => v.severity === 'low').length;

      const compliantProducts = filteredLabels.filter(label => 
        label.analysis?.overallScore >= 80
      ).length;
      const complianceRate = totalProducts > 0 ? Math.round((compliantProducts / totalProducts) * 100) : 0;

      // Calculate approval/rejection metrics
      const allVersions = filteredLabels.map(label => label.version).filter(Boolean);
      const approvedVersions = allVersions.filter(v => v.status === 'APPROVED').length;
      const rejectedVersions = allVersions.filter(v => v.status === 'REJECTED').length;
      const pendingReview = allVersions.filter(v => v.status === 'SCANNED').length;
      const approvalRate = totalProducts > 0 ? Math.round((approvedVersions / totalProducts) * 100) : 0;

      // Get rejected versions with comments - these come from LabelVersion, not violations
      const rejectedVersionsWithComments = allVersions
        .filter(v => v.status === 'REJECTED' && (v as any).reviewComment)
        .map(v => ({
          labelId: v.labelId,
          versionId: v.id,
          comment: (v as any).reviewComment,
          analyzedAt: v.analyzedAt,
          rejectedBy: (v as any).rejectedBy,
          rejectedAt: (v as any).rejectedAt,
        }));

      // Get approved versions with user info - these come from LabelVersion, not violations
      const approvedVersionsWithUser = allVersions
        .filter(v => v.status === 'APPROVED')
        .map(v => ({
          labelId: v.labelId,
          versionId: v.id,
          approvedBy: (v as any).approvedBy,
          approvedAt: (v as any).approvedAt,
          analyzedAt: v.analyzedAt,
        }));

      // Update progress
      await this.prisma.report.update({
        where: { id: reportId },
        data: { progress: 75 },
      });

      // Generate report file based on format
      const format = generateDto.format || 'pdf';
      let filePath: string;
      
      if (format === 'csv') {
        filePath = await this.fileGenerationService.generateCSVReport({
          name: generateDto.name,
          type: generateDto.type,
          generatedAt: new Date(),
          summary: {
            totalProducts,
            avgComplianceScore,
            totalViolations,
            highViolations,
            mediumViolations,
            lowViolations,
            complianceRate,
            approvedVersions,
            rejectedVersions,
            pendingReview,
            approvalRate,
          },
          topViolations: this.getTopViolations(allViolations),
          recommendations: this.generateRecommendations(allViolations, rejectedVersionsWithComments),
          rejectedVersionsWithComments,
          approvedVersionsWithUser,
        }, reportId);
      } else {
        filePath = await this.fileGenerationService.generatePDFReport({
          name: generateDto.name,
          type: generateDto.type,
          generatedAt: new Date(),
          summary: {
            totalProducts,
            avgComplianceScore,
            totalViolations,
            highViolations,
            mediumViolations,
            lowViolations,
            complianceRate,
            approvedVersions,
            rejectedVersions,
            pendingReview,
            approvalRate,
          },
          topViolations: this.getTopViolations(allViolations),
          recommendations: this.generateRecommendations(allViolations, rejectedVersionsWithComments),
          rejectedVersionsWithComments,
          approvedVersionsWithUser,
        }, reportId);
      }

      // Upload to S3
      const s3Key = this.s3StorageService.getFileKey(reportId, format);
      const s3Url = await this.s3StorageService.uploadFile(filePath, s3Key);
      
      // Clean up local file
      await this.fileGenerationService.deleteFile(filePath);
      
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Update report with completed data
      const updatedReport = await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'completed',
          progress: 100,
          summary: {
            totalProducts,
            avgComplianceScore,
            totalViolations,
            highViolations,
            mediumViolations,
            lowViolations,
            complianceRate,
            approvedVersions,
            rejectedVersions,
            pendingReview,
            approvalRate,
          },
          downloadUrl: s3Url,
          expiresAt,
          estimatedCompletion: null,
        },
      });
      
      // Send notification to workspace members about report completion
      try {
        const workspaceMembers = await this.prisma.workspaceUser.findMany({
          where: { workspaceId: generateDto.workspaceId },
          include: { user: true },
        });
        
        // Create notifications for all workspace members
        for (const member of workspaceMembers) {
          await this.notificationsService.createReportGeneratedNotification(
            member.userId,
            generateDto.workspaceId,
            updatedReport.name,
            updatedReport.id
          );
        }
      } catch (notificationError) {
        console.error('Failed to send report completion notifications:', notificationError);
      }

    } catch (error) {
      // Update report with failed status
      const failedReport = await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'failed',
          progress: 0,
        },
      });
      
      // Send notification to workspace members about report failure
      try {
        const workspaceMembers = await this.prisma.workspaceUser.findMany({
          where: { workspaceId: generateDto.workspaceId },
          include: { user: true },
        });
        
        // Create notifications for all workspace members
        for (const member of workspaceMembers) {
          await this.notificationsService.createNotification({
            userId: member.userId,
            workspaceId: generateDto.workspaceId,
            type: 'REPORT_FAILED' as any,
            title: 'Report Generation Failed',
            message: `Report "${failedReport.name}" failed to generate`,
            data: { reportId: failedReport.id, reportName: failedReport.name },
          });
        }
      } catch (notificationError) {
        console.error('Failed to send report failure notifications:', notificationError);
      }
      
      throw error;
    }
  }

  private getDefaultDateRange(type: string) {
    const now = new Date();
    let start: Date;
    const end: Date = now;

    switch (type) {
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { start, end };
  }

  async getReportById(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // If report is completed, return detailed data
    if (report.status === 'completed') {
      const labels = await this.labelService.getAllLabels(report.workspaceId);
      
      // Calculate detailed metrics
      const allViolations = labels.flatMap(label => label.violations);
      const topViolations = this.getTopViolations(allViolations);
      
      // Get rejected versions with comments - these come from LabelVersion, not violations
      const allVersions = labels.map(label => label.version).filter(Boolean);
      const rejectedVersionsWithComments = allVersions
        .filter(v => v.status === 'REJECTED' && (v as any).reviewComment)
        .map(v => ({
          labelId: v.labelId,
          versionId: v.id,
          comment: (v as any).reviewComment,
          analyzedAt: v.analyzedAt,
          rejectedBy: (v as any).rejectedBy,
          rejectedAt: (v as any).rejectedAt,
        }));

      // Get approved versions with user info - these come from LabelVersion, not violations
      const approvedVersionsWithUser = allVersions
        .filter(v => v.status === 'APPROVED')
        .map(v => ({
          labelId: v.labelId,
          versionId: v.id,
          approvedBy: (v as any).approvedBy,
          approvedAt: (v as any).approvedAt,
          analyzedAt: v.analyzedAt,
        }));
      
      const recommendations = this.generateRecommendations(allViolations, rejectedVersionsWithComments);

      return {
        report: {
          ...report,
          dateRange: report.dateRange as any,
          filters: report.filters as any,
          summary: report.summary as any,
          topViolations,
          recommendations,
          rejectedVersionsWithComments,
          approvedVersionsWithUser,
        }
      };
    }

    return { report };
  }

  private getTopViolations(violations: any[]) {
    const violationCounts = violations.reduce((acc, violation) => {
      const key = violation.type;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(violationCounts)
      .map(([type, count]) => ({
        type,
        count,
        severity: violations.find(v => v.type === type)?.severity || 'medium',
        category: violations.find(v => v.type === type)?.category || 'General',
      }))
      .sort((a, b) => (b.count as number) - (a.count as number))
      .slice(0, 5);
  }

  private generateRecommendations(violations: any[], rejectedVersionsWithComments: any[] = []) {
    const recommendations = [];

    // Analyze violations and generate recommendations
    const highViolationsArr = violations.filter(v => v.severity === 'high');
    if (highViolationsArr.length > 0) {
      recommendations.push({
        priority: 'high',
        action: `Address ${highViolationsArr.length} high-severity violations`,
        impact: `Will resolve ${highViolationsArr.length} high-severity violations`,
        effort: 'high',
      });
    }
    const mediumViolationsArr = violations.filter(v => v.severity === 'medium');
    if (mediumViolationsArr.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: `Address ${mediumViolationsArr.length} medium-severity violations`,
        impact: `Will resolve ${mediumViolationsArr.length} medium-severity violations`,
        effort: 'medium',
      });
    }
    const lowViolationsArr = violations.filter(v => v.severity === 'low');
    if (lowViolationsArr.length > 0) {
      recommendations.push({
        priority: 'low',
        action: `Review ${lowViolationsArr.length} low-severity violations`,
        impact: `May improve compliance`,
        effort: 'low',
      });
    }

    // Add recommendations based on rejected versions
    if (rejectedVersionsWithComments.length > 0) {
      recommendations.push({
        priority: 'high',
        action: `Review and address ${rejectedVersionsWithComments.length} rejected label versions`,
        impact: 'Will improve approval rate and compliance',
        effort: 'medium',
        details: `Common rejection reasons: ${this.getCommonRejectionReasons(rejectedVersionsWithComments)}`,
      });
    }

    return recommendations;
  }

  private getCommonRejectionReasons(rejectedVersionsWithComments: any[]) {
    // Extract common themes from rejection comments
    const commentTexts = rejectedVersionsWithComments.map(v => v.comment.toLowerCase());
    const commonTerms = ['disclaimer', 'placement', 'format', 'missing', 'incorrect', 'size'];
    
    const foundTerms = commonTerms.filter(term => 
      commentTexts.some(comment => comment.includes(term))
    );

    return foundTerms.length > 0 ? foundTerms.join(', ') : 'Various compliance issues';
  }

  async deleteReport(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Delete the report from database
    await this.prisma.report.delete({
      where: { id: reportId },
    });

    // Delete files from S3 (both PDF and CSV if they exist)
    try {
      const pdfS3Key = this.s3StorageService.getFileKey(reportId, 'pdf');
      await this.s3StorageService.deleteFile(pdfS3Key);
    } catch (error) {
      // Log error but don't fail the delete operation
      console.error('Failed to delete PDF file from S3:', error);
    }
    
    try {
      const csvS3Key = this.s3StorageService.getFileKey(reportId, 'csv');
      await this.s3StorageService.deleteFile(csvS3Key);
    } catch (error) {
      // Log error but don't fail the delete operation
      console.error('Failed to delete CSV file from S3:', error);
    }

    return {
      message: 'Report deleted successfully',
      deletedReportId: reportId,
    };
  }

  async getReportDownloadUrl(reportId: string, format: string, userId: string) {
    // Fetch report
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    // Check workspace access
    const membership = await this.prisma.workspaceUser.findUnique({ where: { userId_workspaceId: { userId, workspaceId: report.workspaceId } } });
    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
    // Generate signed URL
    const key = this.s3StorageService.getFileKey(reportId, format);
    const downloadUrl = await this.s3StorageService.generatePresignedUrl(key);
    return { downloadUrl };
  }
}