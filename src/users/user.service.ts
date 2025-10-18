import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } }); 
  }


  async createUser(data: {
    email: string;
    password: string;
    name?: string;
    profileImage?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    agreeToTerms?: boolean;
    workspaceId?: string;
  }) {
    // Create the user
    const user = await this.prisma.user.create({ data });
    // If workspaceId is provided, add as ADMIN
    if (data.workspaceId) {
      await this.prisma.workspaceUser.create({
        data: {
          userId: user.id,
          workspaceId: data.workspaceId,
          role: 'ADMIN',
        },
      });
    }
    return user;
  }

  async updateOnboarding(userId: string, data: any) {
    if (!userId) {
      throw new Error('userId is required for onboarding');
    }
    const {
      companyType,
      teamSize,
      labelsPerMonth,
      goals,
      complianceProcess,
    } = data;

    if (
      !companyType ||
      !teamSize ||
      !labelsPerMonth ||
      !goals ||
      !complianceProcess
    ) {
      throw new Error('All onboarding fields are required.');
    }

    await this.prisma.userProfile.upsert({
      where: { userId },
      update: { companyType, teamSize, labelsPerMonth, goals, complianceProcess },
      create: { userId, companyType, teamSize, labelsPerMonth, goals, complianceProcess },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingComplete: true },
    });
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        profileImage: true,
        onboardingComplete: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateProfile(userId: string, dto: { firstName?: string; lastName?: string; company?: string; profileImage?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        company: dto.company,
        profileImage: dto.profileImage,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async changePassword(userId: string, dto: { oldPassword: string; newPassword: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) throw new Error('Old password is incorrect');
    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    return { message: 'Password updated' };
  }

  // TODO: Implement user CRUD methods
}