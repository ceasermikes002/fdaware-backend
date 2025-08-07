import { NotificationType } from '@prisma/client';

export interface NotificationEntity {
  id: string;
  userId: string;
  workspaceId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

export interface NotificationWithUser extends NotificationEntity {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface NotificationWithWorkspace extends NotificationEntity {
  workspace?: {
    id: string;
    name: string;
  };
}

export interface NotificationSummary {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  recent: NotificationEntity[];
}

export interface WebSocketNotification {
  type: 'notification';
  action: 'created' | 'updated' | 'deleted';
  data: NotificationEntity;
  userId: string;
  workspaceId?: string;
}