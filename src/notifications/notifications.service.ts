import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import {
  CreateNotificationDto,
  BulkCreateNotificationDto,
} from './dto/create-notification.dto';
import {
  QueryNotificationsDto,
  MarkNotificationDto,
  BulkMarkNotificationsDto,
} from './dto/query-notifications.dto';
import {
  NotificationEntity,
  NotificationSummary,
  WebSocketNotification,
} from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';
import { RedisCacheService } from '../common/utils/redis.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
    private redisCache: RedisCacheService,
  ) {}

  async createNotification(dto: CreateNotificationDto): Promise<NotificationEntity> {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify workspace exists if provided
    if (dto.workspaceId) {
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: dto.workspaceId },
      });
      if (!workspace) {
        throw new NotFoundException('Workspace not found');
      }

      // Verify user is member of workspace
      const membership = await this.prisma.workspaceUser.findUnique({
        where: {
          userId_workspaceId: {
            userId: dto.userId,
            workspaceId: dto.workspaceId,
          },
        },
      });
      if (!membership) {
        throw new ForbiddenException('User is not a member of this workspace');
      }
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        workspaceId: dto.workspaceId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });

    // Send real-time notification
    const wsNotification: WebSocketNotification = {
      type: 'notification',
      action: 'created',
      data: notification,
      userId: dto.userId,
      workspaceId: dto.workspaceId,
    };
    this.notificationsGateway.sendToUser(dto.userId, wsNotification);

    await this.invalidateCache(dto.userId, dto.workspaceId);
    return notification;
  }

  async createBulkNotifications(dto: BulkCreateNotificationDto): Promise<NotificationEntity[]> {
    // Verify all users exist
    const users = await this.prisma.user.findMany({
      where: { id: { in: dto.userIds } },
    });
    if (users.length !== dto.userIds.length) {
      throw new NotFoundException('One or more users not found');
    }

    // Verify workspace exists if provided
    if (dto.workspaceId) {
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: dto.workspaceId },
      });
      if (!workspace) {
        throw new NotFoundException('Workspace not found');
      }

      // Verify all users are members of workspace
      const memberships = await this.prisma.workspaceUser.findMany({
        where: {
          userId: { in: dto.userIds },
          workspaceId: dto.workspaceId,
        },
      });
      if (memberships.length !== dto.userIds.length) {
        throw new ForbiddenException('One or more users are not members of this workspace');
      }
    }

    const notifications = await this.prisma.$transaction(
      dto.userIds.map(userId =>
        this.prisma.notification.create({
          data: {
            userId,
            workspaceId: dto.workspaceId,
            type: dto.type,
            title: dto.title,
            message: dto.message,
            data: dto.data,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          },
        })
      )
    );

    // Send real-time notifications to all users
    notifications.forEach(notification => {
      const wsNotification: WebSocketNotification = {
        type: 'notification',
        action: 'created',
        data: notification,
        userId: notification.userId,
        workspaceId: dto.workspaceId,
      };
      this.notificationsGateway.sendToUser(notification.userId, wsNotification);
    });

    for (const userId of dto.userIds) {
      await this.invalidateCache(userId, dto.workspaceId);
    }
    return notifications;
  }

  async getUserNotifications(
    userId: string,
    query: QueryNotificationsDto
  ): Promise<{ notifications: NotificationEntity[]; total: number }> {
    const cacheKey = this.cacheKeyForList(userId, query);
    const cached = await this.redisCache.getJson<{ notifications: NotificationEntity[]; total: number }>(cacheKey);
    if (cached) return cached;
    const where: any = {
      userId,
      AND: [
        query.workspaceId ? { workspaceId: query.workspaceId } : {},
        query.type ? { type: query.type } : {},
        query.read !== undefined ? { read: query.read } : {},
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      ]
    };

    const take = typeof (query.limit as any) === 'string'
      ? parseInt(query.limit as any, 10)
      : (query.limit ?? 20);
    const skip = typeof (query.offset as any) === 'string'
      ? parseInt(query.offset as any, 10)
      : (query.offset ?? 0);

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { [(query.sortBy || 'createdAt')]: (query.sortOrder || 'desc') },
        take,
        skip,
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    const result = { notifications, total };
    await this.redisCache.setJson(cacheKey, result, 30);
    return result;
  }

  async getNotificationSummary(userId: string, workspaceId?: string): Promise<NotificationSummary> {
    const cacheKey = this.cacheKeyForSummary(userId, workspaceId);
    const cached = await this.redisCache.getJson<NotificationSummary>(cacheKey);
    if (cached) return cached;
    const where: any = {
      userId,
      AND: [
        workspaceId ? { workspaceId } : {},
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      ]
    };

    const [total, unread, byTypeData, recent] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, read: false } }),
      this.prisma.notification.groupBy({
        by: ['type'],
        where,
        _count: { type: true },
      }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const byType = byTypeData.reduce((acc, item) => {
      acc[item.type] = item._count.type;
      return acc;
    }, {} as Record<NotificationType, number>);

    const result = { total, unread, byType, recent };
    await this.redisCache.setJson(cacheKey, result, 30);
    return result;
  }

  async markNotification(
    notificationId: string,
    userId: string,
    dto: MarkNotificationDto
  ): Promise<NotificationEntity> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: dto.read,
        readAt: dto.read ? new Date() : null,
      },
    });

    // Send real-time update
    const wsNotification: WebSocketNotification = {
      type: 'notification',
      action: 'updated',
      data: updated,
      userId,
      workspaceId: updated.workspaceId,
    };
    this.notificationsGateway.sendToUser(userId, wsNotification);

    await this.invalidateCache(userId, updated.workspaceId || undefined);
    return updated;
  }

  async markAllNotifications(
    userId: string,
    workspaceId?: string,
    dto: MarkNotificationDto = { read: true }
  ): Promise<{ count: number }> {
    const where: any = {
      userId,
      read: !dto.read, // Only update notifications that are in opposite state
      AND: [
        workspaceId ? { workspaceId } : {},
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      ]
    };

    const result = await this.prisma.notification.updateMany({
      where,
      data: {
        read: dto.read,
        readAt: dto.read ? new Date() : null,
      },
    });

    // Send real-time update for summary
    this.notificationsGateway.sendToUser(userId, {
      type: 'notification',
      action: 'updated',
      data: { bulkUpdate: true, count: result.count },
      userId,
      workspaceId,
    } as any);

    await this.invalidateCache(userId, workspaceId);
    return { count: result.count };
  }

  async bulkMarkNotifications(
    dto: BulkMarkNotificationsDto,
    userId: string
  ): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: dto.notificationIds },
        userId, // Ensure user can only update their own notifications
      },
      data: {
        read: dto.read,
        readAt: dto.read ? new Date() : null,
      },
    });

    // Send real-time update
    this.notificationsGateway.sendToUser(userId, {
      type: 'notification',
      action: 'updated',
      data: { bulkUpdate: true, count: result.count },
      userId,
    } as any);

    await this.invalidateCache(userId);
    return { count: result.count };
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    // Send real-time update
    const wsNotification: WebSocketNotification = {
      type: 'notification',
      action: 'deleted',
      data: notification,
      userId,
      workspaceId: notification.workspaceId,
    };
    this.notificationsGateway.sendToUser(userId, wsNotification);
    await this.invalidateCache(userId, notification.workspaceId || undefined);
  }

  async cleanupExpiredNotifications(): Promise<{ count: number }> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    await this.redisCache.deleteByPrefix('notifications:user:');
    return { count: result.count };
  }

  // Helper methods for creating specific notification types
  async createLabelAnalyzedNotification(userId: string, workspaceId: string, labelName: string, labelId: string) {
    return this.createNotification({
      userId,
      workspaceId,
      type: NotificationType.LABEL_ANALYZED,
      title: 'Label Analysis Complete',
      message: `Analysis completed for "${labelName}"`,
      data: { labelId, labelName },
    });
  }

  async createComplianceIssueNotification(userId: string, workspaceId: string, labelName: string, issueCount: number, labelId: string) {
    return this.createNotification({
      userId,
      workspaceId,
      type: NotificationType.COMPLIANCE_ISSUE,
      title: 'Compliance Issues Found',
      message: `${issueCount} compliance issue(s) found in "${labelName}"`,
      data: { labelId, labelName, issueCount },
    });
  }

  async createWorkspaceInviteNotification(userId: string, workspaceId: string, workspaceName: string, inviterName: string) {
    return this.createNotification({
      userId,
      workspaceId,
      type: NotificationType.WORKSPACE_INVITE,
      title: 'Workspace Invitation',
      message: `${inviterName} invited you to join "${workspaceName}"`,
      data: { workspaceId, workspaceName, inviterName },
    });
  }

  async createReportGeneratedNotification(userId: string, workspaceId: string, reportName: string, reportId: string) {
    return this.createNotification({
      userId,
      workspaceId,
      type: NotificationType.REPORT_GENERATED,
      title: 'Report Generated',
      message: `Report "${reportName}" has been generated and is ready for download`,
      data: { reportId, reportName },
    });
  }

  private cacheKeyForList(userId: string, query: QueryNotificationsDto): string {
    const parts = [
      userId,
      query.workspaceId || '-',
      query.type || '-',
      String(query.read ?? '-'),
      String(query.limit ?? 20),
      String(query.offset ?? 0),
      String(query.sortBy || 'createdAt'),
      String(query.sortOrder || 'desc'),
    ];
    return `notifications:user:${parts.join(':')}:list`;
  }

  private cacheKeyForSummary(userId: string, workspaceId?: string): string {
    return `notifications:user:${userId}:${workspaceId || '-'}:summary`;
  }

  private async invalidateCache(userId: string, workspaceId?: string) {
    await this.redisCache.deleteByPrefix(`notifications:user:${userId}:`);
    if (workspaceId) await this.redisCache.deleteByPrefix(`notifications:user:${userId}:${workspaceId}:`);
  }
}
