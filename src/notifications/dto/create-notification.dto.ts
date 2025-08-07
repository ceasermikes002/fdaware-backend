import { IsString, IsOptional, IsEnum, IsObject, IsDateString } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  data?: any;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class BulkCreateNotificationDto {
  @IsString({ each: true })
  userIds: string[];

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  data?: any;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}