import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { MembershipLevel } from '../../membership/enums/membership.enums';
import { MovieFormat } from '../../movies/enums/movie.enums';
import { DiscountKind, PromotionType } from '../enums/promotion.enums';

/**
 * Body de `POST /api/admin/promotions` (HU-026).
 */
export class CreatePromotionDto {
  @ApiPropertyOptional({
    example: 'MULTICINE10',
    description: 'Código de cupón; omitir o null para promo automática',
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @MaxLength(40)
  code?: string | null;

  @ApiProperty({ example: 'Descuento Multicine $10.000' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiProperty({ enum: PromotionType })
  @IsEnum(PromotionType)
  type!: PromotionType;

  @ApiProperty({ enum: DiscountKind })
  @IsEnum(DiscountKind)
  discountKind!: DiscountKind;

  @ApiProperty({
    example: 10000,
    description: 'Porcentaje (0–100), monto COP o 0 si TWO_FOR_ONE',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountValue!: number;

  @ApiPropertyOptional({
    default: false,
    description: 'RN-105: acumulable con otras promos',
  })
  @IsOptional()
  @IsBoolean()
  stackable?: boolean;

  @ApiProperty({ description: 'Inicio de vigencia (RN-106)' })
  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @ApiProperty({ description: 'Fin de vigencia (RN-106)' })
  @Type(() => Date)
  @IsDate()
  endsAt!: Date;

  @ApiPropertyOptional({
    description: 'Tope por usuario (RN-107); null = ilimitado',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUsesPerUser?: number | null;

  @ApiPropertyOptional({ description: 'Tope global; null = ilimitado' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxTotalUses?: number | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    default: true,
    description: 'Si true, solo vía apply-promo con código',
  })
  @IsOptional()
  @IsBoolean()
  requiresCode?: boolean;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  cityId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  cinemaId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  roomId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  movieId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  genreId?: string | null;

  @ApiPropertyOptional({ enum: MovieFormat })
  @IsOptional()
  @IsEnum(MovieFormat)
  format?: MovieFormat | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  appliesToTickets?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  appliesToSnacks?: boolean;

  @ApiPropertyOptional({ enum: MembershipLevel })
  @IsOptional()
  @IsEnum(MembershipLevel)
  minMembershipLevel?: MembershipLevel | null;

  @ApiPropertyOptional({
    default: 0,
    description: 'Ventana ±días para tipo BIRTHDAY',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  birthdayWindowDays?: number;

  @ApiPropertyOptional({
    default: false,
    description: 'RN-100: no acumula ni admite puntos (HU-023)',
  })
  @IsOptional()
  @IsBoolean()
  incompatibleWithPoints?: boolean;
}

/**
 * Body de `PUT /api/admin/promotions/:id` — todos los campos opcionales.
 */
export class UpdatePromotionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @MaxLength(40)
  code?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({ enum: PromotionType })
  @IsOptional()
  @IsEnum(PromotionType)
  type?: PromotionType;

  @ApiPropertyOptional({ enum: DiscountKind })
  @IsOptional()
  @IsEnum(DiscountKind)
  discountKind?: DiscountKind;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  stackable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUsesPerUser?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxTotalUses?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresCode?: boolean;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  cityId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  cinemaId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  roomId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  movieId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  genreId?: string | null;

  @ApiPropertyOptional({ enum: MovieFormat })
  @IsOptional()
  @IsEnum(MovieFormat)
  format?: MovieFormat | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  appliesToTickets?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  appliesToSnacks?: boolean;

  @ApiPropertyOptional({ enum: MembershipLevel })
  @IsOptional()
  @IsEnum(MembershipLevel)
  minMembershipLevel?: MembershipLevel | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  birthdayWindowDays?: number;

  @ApiPropertyOptional({
    description: 'RN-100: no acumula ni admite puntos (HU-023)',
  })
  @IsOptional()
  @IsBoolean()
  incompatibleWithPoints?: boolean;
}
