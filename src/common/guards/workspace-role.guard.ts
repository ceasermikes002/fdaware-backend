import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Reflector } from '@nestjs/core';

@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
  constructor(private prisma: PrismaService, private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException('User not authenticated');
    console.log('BODY:', req.body);
    // Robust: check all possible sources for workspaceId
    const workspaceId =
      (req.body && req.body.workspaceId) ||
      req.params.workspaceId ||
      req.query.workspaceId ||
      req.headers['workspace-id'];
    if (!workspaceId) throw new ForbiddenException('Workspace not specified');
    // Find user's role in workspace
    const membership = await this.prisma.workspaceUser.findFirst({ where: { workspaceId, userId: user.id } });
    if (!membership) throw new ForbiddenException('Not a member of this workspace');
    req.user.role = membership.role === 'REVIEWER' ? 'member' : membership.role.toLowerCase();
    return true;
  }
} 