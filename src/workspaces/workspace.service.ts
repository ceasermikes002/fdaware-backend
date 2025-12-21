import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/utils/email.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { BASE_URL } from '../config/email.config';
import { randomBytes } from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { PLAN_LIMITS } from '../billing/plan.config';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}
  // TODO: Implement workspace CRUD and role management

  async createWorkspace(name: string, userId: string) {
    const memberships = await this.prisma.workspaceUser.findMany({ where: { userId }, include: { workspace: true } });
    const now = new Date();
    const activePlans = memberships.map(m => m.workspace).filter(w => w && w.planExpiresAt && w.planExpiresAt > now) as any[];
    const highestPlanOrder = (plan: 'LITE' | 'TEAM' | 'SCALE') => (plan === 'LITE' ? 1 : plan === 'TEAM' ? 2 : 3);
    const bestPlan = activePlans.length
      ? activePlans.reduce((a, b) => (highestPlanOrder((a as any).plan) >= highestPlanOrder((b as any).plan) ? a : b))
      : null;
    const maxWorkspaces = bestPlan ? PLAN_LIMITS[(bestPlan as any).plan].workspacesPerAccount : PLAN_LIMITS.LITE.workspacesPerAccount;
    const currentWorkspaceCount = new Set(memberships.map(m => m.workspaceId)).size;
    if (currentWorkspaceCount >= maxWorkspaces) {
      throw new BadRequestException('Workspace limit reached for current plan');
    }
    // 1. Create the workspace
    const workspace = await this.prisma.workspace.create({ data: { name } });
    // 2. Add the creator as ADMIN
    await this.prisma.workspaceUser.create({
      data: {
        userId,
        workspaceId: workspace.id,
        role: 'ADMIN',
      },
    });
    return workspace;
  }

  async getAllWorkspaces() {
    return this.prisma.workspace.findMany();
  }

  async inviteMember(
    workspaceId: string,
    dto: InviteMemberDto,
    inviter: {
      id: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    },
  ) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new BadRequestException('Workspace not found');
    const demoWorkspaceId = process.env.DEMO_WORKSPACE_ID;
    if (!(demoWorkspaceId && workspaceId === demoWorkspaceId)) {
      const limit = PLAN_LIMITS[(workspace as any).plan].usersPerWorkspace;
      const memberCount = await this.prisma.workspaceUser.count({ where: { workspaceId } });
      const pendingInvites = await this.prisma.invitation.count({ where: { workspaceId, status: 'invited' } });
      if (memberCount + pendingInvites >= limit) {
        throw new BadRequestException('User limit reached for current plan');
      }
      const now = new Date();
      if (!workspace.planExpiresAt || workspace.planExpiresAt <= now) {
        throw new BadRequestException('Active subscription required');
      }
    }
    // 1. Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    // 2. Check if user is already a member
    if (existingUser) {
      const existingMembership = await this.prisma.workspaceUser.findFirst({
        where: { workspaceId, userId: existingUser.id },
      });
      if (existingMembership)
        throw new Error('User is already a member of this workspace');
      // Add user to workspace and send notification email
      let role: 'ADMIN' | 'REVIEWER' | 'VIEWER';
      if (dto.role === 'admin') role = 'ADMIN';
      else if (dto.role === 'reviewer') role = 'REVIEWER';
      else if (dto.role === 'viewer') role = 'VIEWER';
      else
        throw new BadRequestException(
          'Invalid role. Only admin, reviewer, or viewer are allowed.',
        );
      const membership = await this.prisma.workspaceUser.create({
        data: {
          userId: existingUser.id,
          workspaceId,
          role,
        },
      });
      // Send notification email (like invite)
      const workspaceName = workspace?.name || workspaceId;
      const frontendUrl = `${
        process.env.FRONTEND_URL || 'http://localhost:3000'
      }/dashboard?workspaceId=${workspaceId}`; // Robust inviterName fallback
      const inviterName =
        inviter.name ||
        (inviter.firstName && inviter.lastName
          ? `${inviter.firstName} ${inviter.lastName}`
          : inviter.email) ||
        'an FDAware user';
      try {
        await this.emailService.sendTemplateMail({
          to: dto.email,
          subject: `You've been added to ${workspaceName} (by ${inviterName}) on FDAware!`,
          templateName: 'invite',
          context: {
            inviterName,
            workspaceName,
            acceptUrl: frontendUrl,
            frontendAcceptUrl: frontendUrl,
            year: new Date().getFullYear(),
          },
        });
      } catch {
        await this.prisma.workspaceUser.delete({ where: { id: membership.id } });
        throw new BadRequestException('Failed to send invite email');
      }

      // Create notification for the added user
      await this.notificationsService.createWorkspaceInviteNotification(
        existingUser.id,
        workspaceId,
        inviterName,
        workspaceName,
      );
      return {
        userId: existingUser.id,
        email: existingUser.email,
        role: role.toLowerCase(),
        status: 'active',
        invitedAt: null,
        message: 'User added to workspace and notified',
      };
    }
    // 3. If user does not exist, check for existing invite
    const existingInvite = await this.prisma.invitation.findFirst({
      where: { email: dto.email, workspaceId, status: 'invited' },
    });
    if (existingInvite) throw new Error('User already invited');
    // 4. Generate secure token
    const token = randomBytes(32).toString('hex');
    // 5. Create invitation in DB
    let role: 'ADMIN' | 'REVIEWER' | 'VIEWER';
    if (dto.role === 'admin') role = 'ADMIN';
    else if (dto.role === 'reviewer') role = 'REVIEWER';
    else if (dto.role === 'viewer') role = 'VIEWER';
    else
      throw new BadRequestException(
        'Invalid role. Only admin, reviewer, or viewer are allowed.',
      );
    const invite = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        workspaceId,
        role,
        invitedById: inviter.id,
        token,
      },
    });
    // 6. Send invitation email
    const workspaceName = workspace?.name || workspaceId;
    const acceptUrl = `${BASE_URL}/workspaces/${workspaceId}/invites/${invite.id}/accept?token=${token}`;
    const frontendAcceptUrl = `${
      process.env.FRONTEND_URL || 'http://localhost:3000'
    }/accept-invite?workspaceId=${workspaceId}&inviteId=${
      invite.id
    }&token=${token}`;
    // Robust inviterName fallback
    const inviterName =
      inviter.name ||
      (inviter.firstName && inviter.lastName
        ? `${inviter.firstName} ${inviter.lastName}`
        : inviter.email) ||
      'an FDAware user';
    try {
      await this.emailService.sendTemplateMail({
        to: dto.email,
        subject: `You're invited to join ${workspaceName} (invited by ${inviterName}) on FDAware!`,
        templateName: 'invite',
        context: {
          inviterName,
          workspaceName,
          acceptUrl,
          frontendAcceptUrl,
          year: new Date().getFullYear(),
        },
      });
    } catch {
      await this.prisma.invitation.delete({ where: { id: invite.id } });
      throw new BadRequestException('Failed to send invitation email');
    }

    // Note: For new invitations, we'll create the notification when they accept the invite
    // since they don't have a user account yet
    return {
      inviteId: invite.id,
      email: invite.email,
      role: invite.role.toLowerCase(),
      status: invite.status,
      invitedAt: invite.invitedAt,
    };
  }

  async listMembers(workspaceId: string) {
    // Get all active members
    const workspaceUsers = await this.prisma.workspaceUser.findMany({
      where: { workspaceId },
      include: { user: true },
    });
    // Get all pending invitations
    const invites = await this.prisma.invitation.findMany({
      where: { workspaceId, status: 'invited' },
    });
    // Format members
    const members = workspaceUsers.map((wu) => ({
      user: {
        id: wu.user.id,
        email: wu.user.email,
        name:
          wu.user.firstName && wu.user.lastName
            ? `${wu.user.firstName} ${wu.user.lastName}`
            : wu.user.email,
        profileImage: wu.user.profileImage,
      },
      role: wu.role.toLowerCase(),
      status: 'active',
      invitedAt: null,
    }));
    // Format invites
    const pending = invites.map((invite) => ({
      user: {
        id: null,
        email: invite.email,
        name: invite.email,
      },
      role: invite.role.toLowerCase(),
      status: 'invited',
      invitedAt: invite.invitedAt,
      inviteId: invite.id,
    }));
    return [...members, ...pending];
  }

  async resendInvite(workspaceId: string, inviteId: string, user: any) {
    // Find the invitation
    const invite = await this.prisma.invitation.findUnique({
      where: { id: inviteId },
    });
    if (!invite || invite.workspaceId !== workspaceId)
      throw new Error('Invite not found');
    if (invite.status !== 'invited')
      throw new Error('Cannot resend: invite is not pending');
    // Get inviter info
    const inviter = await this.prisma.user.findUnique({
      where: { id: user.id },
    });
    // Get workspace name
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    const workspaceName = workspace?.name || workspaceId;
    // Resend email
    const { BASE_URL } = await import('../config/email.config');
    const acceptUrl = `${BASE_URL}/workspaces/${workspaceId}/invites/${invite.id}/accept?token=${invite.token}`;
    const frontendAcceptUrl = `${
      process.env.FRONTEND_URL || 'http://localhost:3000'
    }/accept-invite?workspaceId=${workspaceId}&inviteId=${invite.id}&token=${
      invite.token
    }`;
    // Robust inviterName fallback
    const inviterName =
      inviter?.firstName && inviter?.lastName
        ? `${inviter.firstName} ${inviter.lastName}`
        : inviter?.email || 'an FDAware user';
    try {
      await this.emailService.sendTemplateMail({
        to: invite.email,
        subject: `You're invited to join ${workspaceName} (invited by ${inviterName}) on FDAware!`,
        templateName: 'invite',
        context: {
          inviterName,
          workspaceName,
          acceptUrl,
          frontendAcceptUrl,
          year: new Date().getFullYear(),
        },
      });
      await this.prisma.invitation.update({
        where: { id: inviteId },
        data: { invitedAt: new Date() },
      });
    } catch {
      throw new BadRequestException('Failed to resend invitation');
    }
    return {
      inviteId: invite.id,
      email: invite.email,
      role: invite.role.toLowerCase(),
      status: invite.status,
      invitedAt: new Date(),
      resent: true,
    };
  }

  async cancelInvite(workspaceId: string, inviteId: string) {
    const invite = await this.prisma.invitation.findUnique({
      where: { id: inviteId },
    });
    if (!invite || invite.workspaceId !== workspaceId)
      throw new Error('Invite not found');
    if (invite.status !== 'invited')
      throw new Error('Cannot cancel: invite is not pending');
    const updated = await this.prisma.invitation.update({
      where: { id: inviteId },
      data: { status: 'cancelled' },
    });
    return {
      inviteId: updated.id,
      email: updated.email,
      role: updated.role.toLowerCase(),
      status: updated.status,
      invitedAt: updated.invitedAt,
      cancelled: true,
    };
  }

  async acceptInvite(
    workspaceId: string,
    inviteId: string,
    token: string,
    user: any,
  ) {
    const invite = await this.prisma.invitation.findUnique({
      where: { id: inviteId },
    });
    if (!invite || invite.workspaceId !== workspaceId)
      throw new NotFoundException('Invite not found');
    if (invite.status !== 'invited')
      throw new BadRequestException('Invite is not pending');
    if (invite.token !== token)
      throw new BadRequestException('Invalid invite token');

    // Verify the user's email matches the invite
    if (user.email !== invite.email) {
      throw new BadRequestException(
        'You can only accept invitations sent to your email address',
      );
    }

    // Check if user is already a member
    const existing = await this.prisma.workspaceUser.findFirst({
      where: { workspaceId, userId: user.id },
    });
    if (existing) throw new BadRequestException('User is already a member');

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException('Workspace not found');
    const demoWorkspaceId = process.env.DEMO_WORKSPACE_ID;
    if (!(demoWorkspaceId && workspaceId === demoWorkspaceId)) {
      const limit = PLAN_LIMITS[(workspace as any).plan].usersPerWorkspace;
      const memberCount = await this.prisma.workspaceUser.count({ where: { workspaceId } });
      if (memberCount >= limit) throw new BadRequestException('User limit reached for current plan');
      const now = new Date();
      if (!workspace.planExpiresAt || workspace.planExpiresAt <= now) {
        throw new BadRequestException('Active subscription required');
      }
    }
    // Accept invite
    await this.prisma.invitation.update({
      where: { id: inviteId },
      data: { status: 'accepted', acceptedAt: new Date() },
    });

    // Map role
    let role: 'ADMIN' | 'REVIEWER' | 'VIEWER';
    if (invite.role === 'ADMIN') role = 'ADMIN';
    else if (invite.role === 'REVIEWER') role = 'REVIEWER';
    else role = 'VIEWER';

    // Add to workspace
    await this.prisma.workspaceUser.create({
      data: {
        workspaceId,
        userId: user.id,
        role,
      },
    });

    return {
      message: 'Invitation accepted',
      workspaceId,
      userId: user.id,
      role: role.toLowerCase(),
    };
  }

  async validateInvite(workspaceId: string, inviteId: string, token: string) {
    const invite = await this.prisma.invitation.findUnique({
      where: { id: inviteId },
    });
    if (!invite || invite.workspaceId !== workspaceId)
      throw new NotFoundException('Invite not found');
    if (invite.status !== 'invited')
      throw new BadRequestException('Invite is not pending');
    if (invite.token !== token)
      throw new BadRequestException('Invalid invite token');

    // Get workspace info
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    return {
      valid: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role.toLowerCase(),
        invitedAt: invite.invitedAt,
        expiresAt: invite.expiresAt,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
      },
    };
  }

  // Debug method to help troubleshoot token issues
  // async debugInvite(workspaceId: string, inviteId: string) {
  //   const invite = await this.prisma.invitation.findUnique({ where: { id: inviteId } });
  //   if (!invite) {
  //     return { error: 'Invite not found' };
  //   }

  //   return {
  //     invite: {
  //       id: invite.id,
  //       email: invite.email,
  //       workspaceId: invite.workspaceId,
  //       status: invite.status,
  //       token: invite.token, // This will show the actual token in DB
  //       invitedAt: invite.invitedAt,
  //       expiresAt: invite.expiresAt,
  //     },
  //     matchesWorkspace: invite.workspaceId === workspaceId,
  //     isPending: invite.status === 'invited',
  //   };
  // }

  async removeMember(workspaceId: string, userId: string, user: any) {
    if (user.id === userId)
      throw new BadRequestException('Use leave workspace to remove yourself');
    // Check if user is an admin
    const acting = await this.prisma.workspaceUser.findFirst({
      where: { workspaceId, userId: user.id },
    });
    if (!acting || acting.role !== 'ADMIN')
      throw new BadRequestException('Only admins can remove members');
    // Check if target is last admin
    const target = await this.prisma.workspaceUser.findFirst({
      where: { workspaceId, userId },
    });
    if (!target) throw new BadRequestException('User is not a member');
    if (target.role === 'ADMIN') {
      const adminCount = await this.prisma.workspaceUser.count({
        where: { workspaceId, role: 'ADMIN' },
      });
      if (adminCount <= 1)
        throw new BadRequestException(
          'Cannot remove the last admin from the workspace',
        );
    }
    await this.prisma.workspaceUser.delete({ where: { id: target.id } });
    return { message: 'Member removed', userId };
  }

  async changeRole(
    workspaceId: string,
    userId: string,
    role: 'admin' | 'reviewer' | 'viewer',
    user: any,
  ) {
    if (user.id === userId)
      throw new BadRequestException('Cannot change your own role');
    // Check if user is an admin
    const acting = await this.prisma.workspaceUser.findFirst({
      where: { workspaceId, userId: user.id },
    });
    if (!acting || acting.role !== 'ADMIN')
      throw new BadRequestException('Only admins can change roles');
    // Check if target is last admin and being demoted
    const target = await this.prisma.workspaceUser.findFirst({
      where: { workspaceId, userId },
    });
    if (!target) throw new BadRequestException('User is not a member');
    let newRole: 'ADMIN' | 'REVIEWER' | 'VIEWER';
    if (role === 'admin') newRole = 'ADMIN';
    else if (role === 'reviewer') newRole = 'REVIEWER';
    else if (role === 'viewer') newRole = 'VIEWER';
    else
      throw new BadRequestException(
        'Invalid role. Only admin, reviewer, or viewer are allowed.',
      );
    if (target.role === 'ADMIN' && newRole !== 'ADMIN') {
      const adminCount = await this.prisma.workspaceUser.count({
        where: { workspaceId, role: 'ADMIN' },
      });
      if (adminCount <= 1)
        throw new BadRequestException(
          'Cannot demote the last admin in the workspace',
        );
    }
    await this.prisma.workspaceUser.update({
      where: { id: target.id },
      data: { role: newRole },
    });
    return { message: 'Role updated', userId, role };
  }

  async leaveWorkspace(workspaceId: string, user: any) {
    // Check if user is a member
    const member = await this.prisma.workspaceUser.findFirst({
      where: { workspaceId, userId: user.id },
    });
    if (!member)
      throw new BadRequestException('You are not a member of this workspace');
    if (member.role === 'ADMIN') {
      const adminCount = await this.prisma.workspaceUser.count({
        where: { workspaceId, role: 'ADMIN' },
      });
      if (adminCount <= 1)
        throw new BadRequestException(
          'Cannot leave as the last admin in the workspace',
        );
    }
    await this.prisma.workspaceUser.delete({ where: { id: member.id } });
    return { message: 'You have left the workspace', userId: user.id };
  }

  async getUserWorkspaces(userId: string, email: string) {
    // Workspaces where user is a member
    const memberships = await this.prisma.workspaceUser.findMany({
      where: { userId },
      include: { workspace: true },
    });
    // Workspaces where user has accepted an invite (but not yet a member)
    const acceptedInvites = await this.prisma.invitation.findMany({
      where: {
        email,
        status: 'accepted',
      },
      include: { workspace: true },
    });
    // Collect unique workspaces
    const workspaceMap = new Map();
    memberships.forEach((m) => {
      if (m.workspace) workspaceMap.set(m.workspace.id, m.workspace);
    });
    acceptedInvites.forEach((i) => {
      if (i.workspace) workspaceMap.set(i.workspace.id, i.workspace);
    });
    return Array.from(workspaceMap.values());
  }
}
