import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScanService } from '../scan/scan.service';
import { S3Service } from './s3.service';
import { LabelStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { BillingService } from '../billing/billing.service';

const DEMO_WORKSPACE_ID = process.env.DEMO_WORKSPACE_ID; // Loaded via dotenv in main
if (!DEMO_WORKSPACE_ID) {
  throw new Error('DEMO_WORKSPACE_ID environment variable is not set.');
}

@Injectable()
export class LabelService {
  constructor(
    private prisma: PrismaService,
    private scanService: ScanService,
    private s3Service: S3Service,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly billingService: BillingService,
  ) {}

  async createLabelWithFile(name: string, fileUrl: string, workspaceId: string, presignedUrl?: string) {
    await this.billingService.assertCanScan(workspaceId);
    // 1. Create the Label
    const label = await this.prisma.label.create({
      data: { name, fileUrl, workspaceId },
    });

    // 2. Call ML scan service with the presignedUrl if provided, else fileUrl
    let scanResult;
    try {
      scanResult = await this.scanService.analyzeLabel({ file_url: presignedUrl || fileUrl });
    } catch (error) {
      // If scan fails, delete the created label and rethrow
      console.error('[LabelService] Scan failed, deleting label:', label.id);
      await this.prisma.label.delete({ where: { id: label.id } });
      throw error;
    }

    // 3. Create LabelVersion with extraction (if any)
    const version = await this.prisma.labelVersion.create({
      data: {
        labelId: label.id,
        status: LabelStatus.SCANNED,
        extraction: scanResult?.ocr || {},
        overallScore: scanResult?.analysis?.overallScore || 0,
        compliantItems: scanResult?.analysis?.compliantItems || [],
        nextSteps: scanResult?.analysis?.nextSteps || [],
      },
    });

    // 4. Store violations (if any)
    const violations = [];
    if (Array.isArray(scanResult?.violations)) {
      for (const v of scanResult.violations) {
        const violation = await this.prisma.violation.create({
          data: {
            labelVersion: {
              connect: { id: version.id }
            },
            type: v.type,
            message: v.message,
            suggestion: v.suggestion,
            citation: v.citation,
            severity: v.severity || 'medium',
            category: v.category || 'General',
            location: v.location || null,
          },
        });
        violations.push(violation);
      }
    }

    // Send notification to workspace members about label analysis completion
    try {
      const workspaceMembers = await this.prisma.workspaceUser.findMany({
        where: { workspaceId },
        include: { user: true },
      });
      
      // Create notifications for all workspace members
      for (const member of workspaceMembers) {
        await this.notificationsService.createLabelAnalyzedNotification(
          member.userId,
          workspaceId,
          label.name,
          label.id
        );
      }
    } catch (error) {
      console.error('Failed to send label analysis notifications:', error);
    }

    return {
      label,
      version,
      analysis: {
        overallScore: scanResult?.analysis?.overallScore || 0,
        compliantItems: scanResult?.analysis?.compliantItems || [],
        analyzedAt: scanResult?.analysis?.analyzedAt || new Date().toISOString(),
        nextSteps: scanResult?.analysis?.nextSteps || [],
      },
      ocr: scanResult?.ocr || {},
      violations,
    };
  }

  async getAllLabels(workspaceId?: string) {
    const where = workspaceId ? { workspaceId } : {};
    const labels = await this.prisma.label.findMany({
      where,
      include: {
        workspace: true,
        versions: {
          include: {
            violations: true,
          },
          orderBy: { analyzedAt: 'desc' },
        },
      },
    });

    // Format response to always return the latest analysis
    return labels.map(label => {
      // Find the latest version by analyzedAt
      const latestVersion = label.versions?.length
        ? label.versions.reduce((a, b) => (a.analyzedAt > b.analyzedAt ? a : b))
        : null;
      return {
        label: {
          id: label.id,
          name: label.name,
          fileUrl: label.fileUrl,
          workspaceId: label.workspaceId,
        },
        version: latestVersion
          ? {
              id: latestVersion.id,
              labelId: latestVersion.labelId,
              status: latestVersion.status,
              extraction: latestVersion.extraction,
              analyzedAt: latestVersion.analyzedAt,
            }
          : null,
        analysis: latestVersion
          ? {
              overallScore: latestVersion.overallScore,
              compliantItems: latestVersion.compliantItems,
              analyzedAt: latestVersion.analyzedAt,
              nextSteps: latestVersion.nextSteps,
            }
          : null,
        violations: latestVersion?.violations || [],
      };
    });
  }

  async getLabelById(id: string) {
    const label = await this.prisma.label.findUnique({
      where: { id },
      include: {
        workspace: true,
        versions: {
          include: {
            violations: true,
          },
          orderBy: { analyzedAt: 'desc' },
        },
      },
    });

    if (!label) return null;

    // Find the latest version by analyzedAt
    const latestVersion = label.versions?.length
      ? label.versions.reduce((a, b) => (a.analyzedAt > b.analyzedAt ? a : b))
      : null;

    return {
      label: {
        id: label.id,
        name: label.name,
        fileUrl: label.fileUrl,
        workspaceId: label.workspaceId,
      },
      version: latestVersion
        ? {
            id: latestVersion.id,
            labelId: latestVersion.labelId,
            status: latestVersion.status,
            extraction: latestVersion.extraction,
            analyzedAt: latestVersion.analyzedAt,
          }
        : null,
      analysis: latestVersion
        ? {
            overallScore: latestVersion.overallScore,
            compliantItems: latestVersion.compliantItems,
            analyzedAt: latestVersion.analyzedAt,
            nextSteps: latestVersion.nextSteps,
          }
        : null,
      violations: latestVersion?.violations || [],
    };
  }

  async updateLabel(id: string, updateDto: any) {
    return this.prisma.label.update({
      where: { id },
      data: updateDto,
    });
  }

  async deleteLabel(id: string) {
    // Delete related records first
    await this.prisma.violation.deleteMany({
      where: {
        labelVersion: {
          labelId: id,
        },
      },
    });
    await this.prisma.labelVersion.deleteMany({
      where: { labelId: id },
    });
    return this.prisma.label.delete({
      where: { id },
    });
  }

  async getLabelVersions(labelId: string) {
    const versions = await this.prisma.labelVersion.findMany({
      where: { labelId },
      include: {
        violations: true,
      },
      orderBy: { analyzedAt: 'desc' },
    });
    return versions.map(version => ({
      version: {
        id: version.id,
        labelId: version.labelId,
        status: version.status,
        extraction: version.extraction,
        analyzedAt: version.analyzedAt,
      },
      analysis: {
        overallScore: version.overallScore,
        compliantItems: version.compliantItems,
        analyzedAt: version.analyzedAt,
        nextSteps: version.nextSteps,
      },
      violations: version.violations,
    }));
  }

  async getLabelVersion(labelId: string, versionId: string) {
    const version = await this.prisma.labelVersion.findFirst({
      where: {
        id: versionId,
        labelId,
      },
      include: {
        violations: true,
      },
    });
    if (!version) return null;
    return {
      version: {
        id: version.id,
        labelId: version.labelId,
        status: version.status,
        extraction: version.extraction,
        analyzedAt: version.analyzedAt,
      },
      analysis: {
        overallScore: version.overallScore,
        compliantItems: version.compliantItems,
        analyzedAt: version.analyzedAt,
        nextSteps: version.nextSteps,
      },
      violations: version.violations,
    };
  }

  async getLabelDownloadUrl(labelId: string) {
    const label = await this.prisma.label.findUnique({
      where: { id: labelId },
    });
    if (!label) {
      throw new Error('Label not found');
    }

    // Extract filename from S3 URL
    const urlParts = label.fileUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];

    // Generate presigned download URL (longer expiry for downloads)
    const downloadUrl = await this.s3Service.getPresignedUrl(fileName, 3600); // 1 hour

    return {
      labelId,
      fileName,
      downloadUrl,
      expiresIn: 3600,
    };
  }

  async getLabelPreviewUrl(labelId: string) {
    const label = await this.prisma.label.findUnique({
      where: { id: labelId },
    });
    if (!label) {
      throw new Error('Label not found');
    }

    // Extract filename from S3 URL
    const urlParts = label.fileUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];

    // Generate presigned preview URL (shorter expiry for previews)
    const previewUrl = await this.s3Service.getPresignedUrl(fileName, 900); // 15 minutes

    return {
      labelId,
      fileName,
      previewUrl,
      expiresIn: 900,
    };
  }

  async createVersionForLabel(labelId: string, fileUrl: string, presignedUrl?: string) {
    // 1. Get the existing label
    const label = await this.prisma.label.findUnique({
      where: { id: labelId },
    });
    if (!label) {
      throw new Error('Label not found');
    }

    await this.billingService.assertCanScan(label.workspaceId);
    // 2. Call ML scan service with the presignedUrl if provided, else fileUrl
    const scanResult = await this.scanService.analyzeLabel({ file_url: presignedUrl || fileUrl });

    // 3. Create new version for the existing label
    const version = await this.prisma.labelVersion.create({
      data: {
        labelId: label.id,
        status: LabelStatus.SCANNED,
        extraction: scanResult?.ocr || {},
        overallScore: scanResult?.analysis?.overallScore || 0,
        compliantItems: scanResult?.analysis?.compliantItems || [],
        nextSteps: scanResult?.analysis?.nextSteps || [],
      },
    });

    // 4. Store violations (if any)
    const violations = [];
    if (Array.isArray(scanResult?.violations)) {
      for (const v of scanResult.violations) {
        const violation = await this.prisma.violation.create({
          data: {
            labelVersion: {
              connect: { id: version.id }
            },
            type: v.type,
            message: v.message,
            suggestion: v.suggestion,
            citation: v.citation,
            severity: v.severity || 'medium',
            category: v.category || 'General',
            location: v.location || null,
          },
        });
        violations.push(violation);
      }
    }

    return {
      label,
      version,
      analysis: {
        overallScore: scanResult?.analysis?.overallScore || 0,
        compliantItems: scanResult?.analysis?.compliantItems || [],
        analyzedAt: scanResult?.analysis?.analyzedAt || new Date().toISOString(),
        nextSteps: scanResult?.analysis?.nextSteps || [],
      },
      ocr: scanResult?.ocr || {},
      violations,
    };
  }

  async createDemoLabel(file: Express.Multer.File) {
    // Use your existing S3 upload logic
    const s3Url = await this.s3Service.uploadFile(file.buffer, file.originalname, file.mimetype);
    // Generate a presigned URL for ML service access
    const presignedUrl = await this.s3Service.getPresignedUrl(file.originalname);
    // Ensure demo workspace id is set at runtime
    const demoWorkspaceId = process.env.DEMO_WORKSPACE_ID;
    if (!demoWorkspaceId) {
      throw new Error('DEMO_WORKSPACE_ID environment variable is not set.');
    }
    // Ensure demo workspace exists to satisfy FK
    const existingDemoWs = await this.prisma.workspace.findUnique({ where: { id: demoWorkspaceId } });
    if (!existingDemoWs) {
      await this.prisma.workspace.create({
        data: {
          id: demoWorkspaceId,
          name: 'FDAware Demo Workspace',
        },
      });
    }
    // Save label with isDemo: true and dummy name
    const label = await this.prisma.label.create({
      data: {
        name: file.originalname,
        fileUrl: s3Url,
        workspaceId: demoWorkspaceId,
        isDemo: true, 
      } 
    });
    // Run scan pipeline with presigned URL
    try {
      const scanResult = await this.scanService.analyzeLabel({ file_url: presignedUrl });
      return { label, scanResult };
    } catch (error) {
      console.error('[LabelService] Demo scan failed, deleting label:', label.id);
      await this.prisma.label.delete({ where: { id: label.id } });
      throw error;
    }
  }

  async updateLabelVersionStatus(labelId: string, versionId: string, status: 'APPROVED' | 'REJECTED', reviewComment?: string, userId?: string) {
    const data: any = { status, reviewComment };
    
    if (status === 'APPROVED') {
      data.approvedBy = userId;
      data.approvedAt = new Date();
    } else if (status === 'REJECTED') {
      data.rejectedBy = userId;
      data.rejectedAt = new Date();
    }
    
    const version = await this.prisma.labelVersion.update({
      where: { id: versionId },
      data,
      include: { violations: true, label: true },
    });
    
    // Send notification to workspace members about label status change
    try {
      const workspaceMembers = await this.prisma.workspaceUser.findMany({
        where: { workspaceId: version.label.workspaceId },
        include: { user: true },
      });
      
      const reviewer = userId ? await this.prisma.user.findUnique({ where: { id: userId } }) : null;
      const reviewerName = reviewer ? (reviewer.firstName && reviewer.lastName ? `${reviewer.firstName} ${reviewer.lastName}` : reviewer.email) : 'A reviewer';
      
      // Create notifications for all workspace members
      for (const member of workspaceMembers) {
        if (status === 'APPROVED') {
          await this.notificationsService.createNotification({
            userId: member.userId,
            workspaceId: version.label.workspaceId,
            type: 'LABEL_APPROVED' as any,
            title: 'Label Approved',
            message: `"${version.label.name}" has been approved by ${reviewerName}`,
            data: { labelId: version.labelId, versionId: version.id, reviewerName },
          });
        } else if (status === 'REJECTED') {
          await this.notificationsService.createNotification({
            userId: member.userId,
            workspaceId: version.label.workspaceId,
            type: 'LABEL_REJECTED' as any,
            title: 'Label Rejected',
            message: `"${version.label.name}" has been rejected by ${reviewerName}`,
            data: { labelId: version.labelId, versionId: version.id, reviewerName, reviewComment },
          });
        }
      }
    } catch (error) {
      console.error('Failed to send label status notifications:', error);
    }
    
    return {
      version: {
        id: version.id,
        labelId: version.labelId,
        status: version.status,
        extraction: version.extraction,
        analyzedAt: version.analyzedAt,
      },
      analysis: {
        overallScore: version.overallScore,
        compliantItems: version.compliantItems,
        analyzedAt: version.analyzedAt,
        nextSteps: version.nextSteps,
      },
      violations: version.violations,
      reviewComment: version.reviewComment,
      approvedBy: version.approvedBy,
      rejectedBy: version.rejectedBy,
      approvedAt: version.approvedAt,
      rejectedAt: version.rejectedAt,
    };
  }
}
