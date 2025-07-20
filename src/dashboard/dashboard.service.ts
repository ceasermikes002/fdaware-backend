import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LabelStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper: Get all labels with their latest version for a workspace
  private async getLabelsWithLatestVersion(workspaceId: string) {
    const labels = await this.prisma.label.findMany({
      where: { workspaceId },
      include: {
        versions: {
          include: { violations: true },
          orderBy: { analyzedAt: 'desc' },
        },
      },
    });
    return labels.map(label => {
      const latestVersion = label.versions?.length
        ? label.versions.reduce((a, b) => (a.analyzedAt > b.analyzedAt ? a : b))
        : null;
      return { label, latestVersion };
    });
  }

  async getSummary(workspaceId: string) {
    const labelData = await this.getLabelsWithLatestVersion(workspaceId);
    const totalLabels = labelData.length;
    let complianceIssues = 0;
    let approvedLabels = 0;
    let pendingReview = 0;
    for (const { latestVersion } of labelData) {
      if (!latestVersion) continue;
      complianceIssues += latestVersion.violations?.length || 0;
      if (latestVersion.status === LabelStatus.APPROVED) approvedLabels++;
      if (latestVersion.status === LabelStatus.PENDING || latestVersion.status === LabelStatus.SCANNED) pendingReview++;
    }
    return {
      totalLabels,
      complianceIssues,
      approvedLabels,
      pendingReview,
    };
  }

  async getTrends(workspaceId: string) {
    const labelData = await this.getLabelsWithLatestVersion(workspaceId);
    // This month and last month pass rates
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
    let thisMonthTotal = 0, thisMonthCompliant = 0;
    let lastMonthTotal = 0, lastMonthCompliant = 0;
    for (const { latestVersion } of labelData) {
      if (!latestVersion) continue;
      const analyzedAt = new Date(latestVersion.analyzedAt);
      const compliant = (latestVersion.violations?.length || 0) === 0;
      if (analyzedAt.getFullYear() === thisYear && analyzedAt.getMonth() === thisMonth) {
        thisMonthTotal++;
        if (compliant) thisMonthCompliant++;
      } else if (analyzedAt.getFullYear() === lastMonthYear && analyzedAt.getMonth() === lastMonth) {
        lastMonthTotal++;
        if (compliant) lastMonthCompliant++;
      }
    }
    const thisMonthPassRate = thisMonthTotal > 0 ? Math.round((thisMonthCompliant / thisMonthTotal) * 100) : 0;
    const lastMonthPassRate = lastMonthTotal > 0 ? Math.round((lastMonthCompliant / lastMonthTotal) * 100) : 0;
    const improvement = thisMonthPassRate - lastMonthPassRate;
    return {
      thisMonth: {
        passRate: thisMonthPassRate,
        improvement,
      },
      lastMonth: {
        passRate: lastMonthPassRate,
      },
    };
  }

  async getActivity(workspaceId: string) {
    const labelData = await this.getLabelsWithLatestVersion(workspaceId);
    // Sort by latest analyzedAt
    const activities = labelData
      .filter(({ latestVersion }) => !!latestVersion)
      .map(({ label, latestVersion }) => {
        // Determine activity type
        let type = 'analysis';
        let status = 'info';
        if ((latestVersion.violations?.length || 0) > 0) {
          type = 'compliance_issue';
          status = 'danger';
        } else if (latestVersion.status === LabelStatus.APPROVED) {
          type = 'approved';
          status = 'success';
        }
        return {
          labelName: label.name,
          type,
          status,
          analyzedAt: latestVersion.analyzedAt,
          message:
            type === 'compliance_issue'
              ? 'Compliance Issues Found'
              : type === 'approved'
              ? 'Approved'
              : 'Analysis Complete',
        };
      })
      .sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime())
      .slice(0, 10); // Limit to 10 recent activities
    return activities;
  }
} 