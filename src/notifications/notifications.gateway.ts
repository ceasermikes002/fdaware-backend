import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { WebSocketNotification } from './entities/notification.entity';

interface ConnectedClient {
  id: string;
  userId: string;
  workspaceIds: string[];
  send: (data: any) => void;
  close: () => void;
}

@Injectable()
export class NotificationsGateway implements OnModuleInit {
  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedClients = new Map<string, ConnectedClient>();
  private userConnections = new Map<string, Set<string>>(); // userId -> Set of clientIds

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.logger.log('NotificationsGateway initialized');
  }

  // Simulate WebSocket connection handling
  async handleConnection(clientId: string, token: string): Promise<boolean> {
    try {
      if (!token) {
        this.logger.warn(`Client ${clientId} connected without token`);
        return false;
      }

      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub || payload.id;

      if (!userId) {
        this.logger.warn(`Client ${clientId} connected with invalid token`);
        return false;
      }

      // Verify user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          workspaces: {
            select: {
              workspaceId: true,
            },
          },
        },
      });

      if (!user) {
        this.logger.warn(`Client ${clientId} connected with non-existent user ${userId}`);
        return false;
      }

      const workspaceIds = user.workspaces.map(w => w.workspaceId);

      // Create mock client
      const client: ConnectedClient = {
        id: clientId,
        userId,
        workspaceIds,
        send: (data: any) => {
          this.logger.debug(`Sending to client ${clientId}:`, data);
          // In a real implementation, this would send via WebSocket
        },
        close: () => {
          this.handleDisconnection(clientId);
        },
      };

      // Track connection
      this.connectedClients.set(clientId, client);
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(clientId);

      this.logger.log(`User ${userId} connected with client ${clientId}`);

      // Send unread notification count
      const unreadCount = await this.prisma.notification.count({
        where: {
          userId,
          read: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
      });

      client.send({ type: 'unread_count', count: unreadCount });
      return true;

    } catch (error) {
      this.logger.error(`Error handling connection for ${clientId}:`, error);
      return false;
    }
  }

  handleDisconnection(clientId: string) {
    const client = this.connectedClients.get(clientId);
    if (client) {
      const userConnections = this.userConnections.get(client.userId);
      if (userConnections) {
        userConnections.delete(clientId);
        if (userConnections.size === 0) {
          this.userConnections.delete(client.userId);
        }
      }
      this.connectedClients.delete(clientId);
      this.logger.log(`User ${client.userId} disconnected client ${clientId}`);
    }
  }

  // Public methods for sending notifications
  sendToUser(userId: string, notification: WebSocketNotification) {
    const clientIds = this.userConnections.get(userId);
    if (clientIds) {
      clientIds.forEach(clientId => {
        const client = this.connectedClients.get(clientId);
        if (client) {
          client.send({ type: 'notification', data: notification });
        }
      });
      this.logger.debug(`Sent notification to user ${userId}:`, notification.type);
    } else {
      this.logger.debug(`User ${userId} not connected, notification queued`);
    }
  }

  sendToWorkspace(workspaceId: string, notification: WebSocketNotification) {
    let sentCount = 0;
    this.connectedClients.forEach(client => {
      if (client.workspaceIds.includes(workspaceId)) {
        client.send({ type: 'notification', data: notification });
        sentCount++;
      }
    });
    this.logger.debug(`Sent notification to workspace ${workspaceId} (${sentCount} clients):`, notification.type);
  }

  sendUnreadCountUpdate(userId: string, count: number) {
    const clientIds = this.userConnections.get(userId);
    if (clientIds) {
      clientIds.forEach(clientId => {
        const client = this.connectedClients.get(clientId);
        if (client) {
          client.send({ type: 'unread_count', count });
        }
      });
    }
  }

  broadcastSystemNotification(notification: Omit<WebSocketNotification, 'userId'>) {
    this.connectedClients.forEach(client => {
      client.send({ type: 'system_notification', data: notification });
    });
    this.logger.log('Broadcasted system notification:', notification.type);
  }

  // Utility methods
  getConnectedUsers(): string[] {
    return Array.from(this.userConnections.keys());
  }

  isUserConnected(userId: string): boolean {
    return this.userConnections.has(userId) && this.userConnections.get(userId)!.size > 0;
  }

  getUserConnectionCount(userId: string): number {
    return this.userConnections.get(userId)?.size || 0;
  }

  // Method to simulate real-time connection for testing
  async simulateConnection(userId: string, token: string): Promise<string> {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const connected = await this.handleConnection(clientId, token);
    if (connected) {
      return clientId;
    }
    throw new Error('Failed to connect');
  }

  // Method to get connection status
  getConnectionStatus() {
    return {
      totalClients: this.connectedClients.size,
      totalUsers: this.userConnections.size,
      connectedUsers: this.getConnectedUsers(),
    };
  }
}