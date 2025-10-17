import { IsEmail, IsOptional, IsString, MinLength, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class SignUpDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @Transform(({ value }) => {
    // Accept 'true'/'false' strings or boolean
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  agreeToTerms: boolean;

  @IsOptional()
  @IsString()
  workspaceId?: string;
}