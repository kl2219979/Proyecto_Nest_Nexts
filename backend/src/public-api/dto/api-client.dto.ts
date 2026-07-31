import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiClientScope } from '../enums/public-api.enums';

/**
 * Alta de un consumidor externo (ADMIN · HU-029).
 */
export class CreateApiClientDto {
  @ApiProperty({ example: 'App iOS Multicine' })
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: 'Cliente oficial iOS' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    enum: ApiClientScope,
    isArray: true,
    example: [ApiClientScope.CATALOG_READ, ApiClientScope.AUTH_WRITE],
  })
  @IsArray()
  @ArrayUnique()
  @IsEnum(ApiClientScope, { each: true })
  scopes!: ApiClientScope[];

  @ApiPropertyOptional({
    description: 'Límite de req/min (RN-114). Default 60.',
    default: 60,
    minimum: 1,
    maximum: 10_000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  rateLimitPerMinute?: number;
}

/**
 * Actualización parcial de un cliente API.
 */
export class UpdateApiClientDto extends PartialType(CreateApiClientDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Body OAuth 2.0 Client Credentials (RN-113 / seguridad HU-029).
 *
 * `grant_type` debe ser `client_credentials`.
 */
export class OAuthTokenDto {
  @ApiProperty({ example: 'client_credentials' })
  @IsString()
  grant_type!: string;

  @ApiProperty({ example: 'mcc_demo_mobile' })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  client_id!: string;

  @ApiProperty({ description: 'Secreto emitido al crear el cliente' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  client_secret!: string;
}
