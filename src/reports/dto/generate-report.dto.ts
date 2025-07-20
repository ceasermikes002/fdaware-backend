import { IsString, IsOptional, IsArray, IsBoolean, IsDateString, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class DateRangeDto {
  @IsDateString()
  start: string;

  @IsDateString()
  end: string;
}

class FiltersDto {
  @IsArray()
  @IsOptional()
  productLines?: string[];

  @IsBoolean()
  @IsOptional()
  includeViolations?: boolean;

  @IsBoolean()
  @IsOptional()
  includeCompliantItems?: boolean;

  @IsBoolean()
  @IsOptional()
  includeRecommendations?: boolean;

  @IsBoolean()
  @IsOptional()
  includeTrends?: boolean;

  @IsArray()
  @IsOptional()
  severityLevels?: string[];
}

export class GenerateReportDto {
  @IsString()
  workspaceId: string;

  @IsString()
  name: string;

  @IsEnum(['monthly', 'quarterly', 'custom'])
  type: 'monthly' | 'quarterly' | 'custom';

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FiltersDto)
  filters?: FiltersDto;

  @IsString()
  @IsOptional()
  format?: 'pdf' | 'csv';
} 