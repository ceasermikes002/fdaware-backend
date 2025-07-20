import { Controller, Post, Body, Get, Param, UseGuards, Req, Delete, Put, Query } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { WorkspaceRoleGuard } from '../common/guards/workspace-role.guard';
import { Roles } from '../common/decorators';

@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() dto: CreateWorkspaceDto, @Req() req: any) {
    return this.workspaceService.createWorkspace(dto.name, req.user.id);
  }

  @Get()
  @UseGuards(AuthGuard)
  async findAll(@Req() req: any) {
    return this.workspaceService.getUserWorkspaces(req.user.id, req.user.email);
  }

  @Post(':workspaceId/invite')
  @UseGuards(AuthGuard, WorkspaceRoleGuard)
  @Roles('admin')
  async inviteMember(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: InviteMemberDto,
    @Req() req: any,
  ) {
    // Provide a robust inviter name fallback
    const inviterName =
      req.user.name ||
      (req.user.firstName && req.user.lastName
        ? `${req.user.firstName} ${req.user.lastName}`
        : req.user.email);
    return this.workspaceService.inviteMember(workspaceId, dto, { id: req.user.id, name: inviterName });
  }

  @Get(':workspaceId/members')
  @UseGuards(AuthGuard, WorkspaceRoleGuard)
  async listMembers(@Param('workspaceId') workspaceId: string) {
    return this.workspaceService.listMembers(workspaceId);
  }

  @Post(':workspaceId/invites/:inviteId/resend')
  @UseGuards(AuthGuard, WorkspaceRoleGuard)
  @Roles('admin')
  async resendInvite(@Param('workspaceId') workspaceId: string, @Param('inviteId') inviteId: string, @Req() req: any) {
    return this.workspaceService.resendInvite(workspaceId, inviteId, req.user);
  }

  @Delete(':workspaceId/invites/:inviteId')
  @UseGuards(AuthGuard, WorkspaceRoleGuard)
  @Roles('admin')
  async cancelInvite(@Param('workspaceId') workspaceId: string, @Param('inviteId') inviteId: string) {
    return this.workspaceService.cancelInvite(workspaceId, inviteId);
  }

  @Get(':workspaceId/invites/:inviteId/validate')
  async validateInvite(
    @Param('workspaceId') workspaceId: string,
    @Param('inviteId') inviteId: string,
    @Query('token') token: string
  ) {
    return this.workspaceService.validateInvite(workspaceId, inviteId, token);
  }

  // Debug endpoint to troubleshoot token issues
  // @Get(':workspaceId/invites/:inviteId/debug')
  // async debugInvite(@Param('workspaceId') workspaceId: string, @Param('inviteId') inviteId: string) {
  //   return this.workspaceService.debugInvite(workspaceId, inviteId);
  // }

  @Post(':workspaceId/invites/:inviteId/accept')
  @UseGuards(AuthGuard)
  async acceptInvite(@Param('workspaceId') workspaceId: string, @Param('inviteId') inviteId: string, @Body() body: { token: string }, @Req() req: any) {
    return this.workspaceService.acceptInvite(workspaceId, inviteId, body.token, req.user);
  }

  @Delete(':workspaceId/members/:userId')
  @UseGuards(AuthGuard, WorkspaceRoleGuard)
  @Roles('admin')
  async removeMember(@Param('workspaceId') workspaceId: string, @Param('userId') userId: string, @Req() req: any) {
    return this.workspaceService.removeMember(workspaceId, userId, req.user);
  }

  @Put(':workspaceId/members/:userId/role')
  @UseGuards(AuthGuard, WorkspaceRoleGuard)
  @Roles('admin')
  async changeRole(@Param('workspaceId') workspaceId: string, @Param('userId') userId: string, @Body() body: { role: string }, @Req() req: any) {
    return this.workspaceService.changeRole(workspaceId, userId, body.role as 'admin' | 'reviewer' | 'viewer', req.user);
  }

  @Post(':workspaceId/leave')
  @UseGuards(AuthGuard, WorkspaceRoleGuard)
  async leaveWorkspace(@Param('workspaceId') workspaceId: string, @Req() req: any) {
    return this.workspaceService.leaveWorkspace(workspaceId, req.user);
  }
} 