import { IsString, IsOptional } from 'class-validator';

export class UpdateLabelDto {
  @IsString()
  @IsOptional()
  name?: string;
  fileUrl?: string;
} 