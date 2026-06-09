import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ClientClassification, ClientStatus } from '@prisma/client';

export class CreateClientDto {
  @ApiProperty()
  @IsString()
  companyName: string;

  @ApiProperty()
  @IsString()
  ownerName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string | Record<string, string>>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  onboardingDate?: string;

  @ApiPropertyOptional({ enum: ClientStatus })
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @ApiPropertyOptional({ enum: ClientClassification })
  @IsOptional()
  @IsEnum(ClientClassification)
  classification?: ClientClassification;

  @ApiPropertyOptional({ description: 'User id of assigned marketing manager' })
  @IsOptional()
  @IsString()
  marketingManagerId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Client portal login email (username)' })
  @IsOptional()
  @IsEmail()
  portalEmail?: string;

  @ApiPropertyOptional({ description: 'Client portal password (required when creating portal account)' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  portalPassword?: string;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

export class CreatePackageDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  packageType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  subscribedServices?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  reelsQuota?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  designQuota?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  visitsQuota?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  developmentHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hostingType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  hostingDetails?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  contractStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  contractEnd?: string;
}

export class UpdatePackageDto extends PartialType(CreatePackageDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateSubscriptionDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsString()
  interval: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextDue?: string;
}

export class CreateClientAssetDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Built-in AssetType or custom section key' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Client file tab key (built-in or custom_*)' })
  @IsOptional()
  @IsString()
  categoryKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
