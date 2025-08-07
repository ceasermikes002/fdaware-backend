import { IsOptional, IsEnum, IsBoolean, IsString, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { NotificationType } from '@prisma/client';

export class QueryNotificationsDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  read?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'readAt' = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class MarkNotificationDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  read?: boolean = true;
}

export class BulkMarkNotificationsDto {
  @IsString({ each: true })
  notificationIds: string[];

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  read?: boolean = true;
}