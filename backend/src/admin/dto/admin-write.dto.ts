import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  IsEnum,
  IsArray,
  ValidateNested,
  IsDateString,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType, UserRole } from '../../auth/enums/user.enums';
import {
  AudioType,
  MovieFormat,
  MovieStatus,
  RoomType,
} from '../../movies/enums/movie.enums';
import { SeatType } from '../../seats/enums/seat.enums';
import { SnackCategory } from '../../snacks/enums/snack.enums';

/** Crear país. */
export class CreateCountryDto {
  @ApiProperty({ example: 'Colombia' })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ example: 'CO' })
  @IsString()
  @Length(2, 3)
  code!: string;
}

export class UpdateCountryDto extends PartialType(CreateCountryDto) {}

/** Crear departamento. */
export class CreateDepartmentDto {
  @ApiProperty()
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty()
  @IsUUID()
  countryId!: string;
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}

/** Crear ciudad. */
export class CreateCityDto {
  @ApiProperty()
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty()
  @IsUUID()
  departmentId!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCityDto extends PartialType(CreateCityDto) {}

/** Crear cine. */
export class CreateCinemaDto {
  @ApiProperty()
  @IsString()
  @Length(2, 160)
  name!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 255)
  address!: string;

  @ApiProperty()
  @IsUUID()
  cityId!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCinemaDto extends PartialType(CreateCinemaDto) {}

/** Crear sala. */
export class CreateRoomDto {
  @ApiProperty()
  @IsString()
  @Length(1, 80)
  name!: string;

  @ApiProperty({ enum: RoomType })
  @IsEnum(RoomType)
  roomType!: RoomType;

  @ApiProperty({ example: 120 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiProperty()
  @IsUUID()
  cinemaId!: string;
}

export class UpdateRoomDto extends PartialType(CreateRoomDto) {}

/** Una silla del plano. */
export class SeatLayoutItemDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  @Length(1, 8)
  rowLabel!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatNumber!: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  gridColumn!: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  gridRow!: number;

  @ApiPropertyOptional({ example: 'A1' })
  @IsOptional()
  @IsString()
  @Length(1, 16)
  label?: string;

  @ApiProperty({ enum: SeatType, default: SeatType.STANDARD })
  @IsEnum(SeatType)
  seatType!: SeatType;
}

/** Reemplazar / crear plano de sillas de una sala. */
export class UpsertSeatLayoutDto {
  @ApiProperty({ type: [SeatLayoutItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SeatLayoutItemDto)
  seats!: SeatLayoutItemDto[];

  @ApiPropertyOptional({
    description: 'Si true, borra sillas existentes de la sala antes de crear',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  replaceExisting?: boolean;
}

export class UpdateSeatDto extends PartialType(SeatLayoutItemDto) {}

/** Elenco en create/update película. */
export class CastMemberInputDto {
  @ApiProperty()
  @IsString()
  @Length(1, 160)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 160)
  role?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

/** Estreno por ciudad. */
export class CityReleaseInputDto {
  @ApiProperty()
  @IsUUID()
  cityId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cinemaId?: string;

  @ApiProperty({ example: '2026-09-15' })
  @IsDateString()
  releaseDate!: string;
}

/** Crear película. */
export class CreateMovieDto {
  @ApiProperty()
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 500)
  posterUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  bannerUrl?: string;

  @ApiPropertyOptional({ description: 'URL YouTube del tráiler' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  trailerUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  synopsis?: string;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @ApiProperty({ example: '12+' })
  @IsString()
  @Length(1, 10)
  classification!: string;

  @ApiProperty({ example: 120 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @ApiProperty()
  @IsString()
  @Length(1, 160)
  director!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  rating?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPremiere?: boolean;

  @ApiProperty({ enum: MovieStatus, default: MovieStatus.UPCOMING })
  @IsEnum(MovieStatus)
  status!: MovieStatus;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Nombres de género' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genres?: string[];

  @ApiPropertyOptional({ type: [CastMemberInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CastMemberInputDto)
  cast?: CastMemberInputDto[];

  @ApiPropertyOptional({ type: [CityReleaseInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CityReleaseInputDto)
  cityReleases?: CityReleaseInputDto[];
}

export class UpdateMovieDto extends PartialType(CreateMovieDto) {}

/** Crear función. */
export class CreateShowtimeDto {
  @ApiProperty()
  @IsUUID()
  movieId!: string;

  @ApiProperty()
  @IsUUID()
  roomId!: string;

  @ApiProperty({ example: '2026-08-01T20:00:00.000Z' })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ enum: MovieFormat })
  @IsEnum(MovieFormat)
  format!: MovieFormat;

  @ApiProperty({ example: 'ES' })
  @IsString()
  @Length(2, 10)
  language!: string;

  @ApiProperty({ enum: AudioType })
  @IsEnum(AudioType)
  audioType!: AudioType;

  @ApiProperty({ example: 18000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ default: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  maxSeatsPerOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateShowtimeDto extends PartialType(CreateShowtimeDto) {}

/** Crear snack. */
export class CreateSnackDto {
  @ApiProperty()
  @IsString()
  @Length(1, 150)
  name!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 500)
  description!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 500)
  imageUrl!: string;

  @ApiProperty({ enum: SnackCategory })
  @IsEnum(SnackCategory)
  category!: SnackCategory;

  @ApiProperty({ example: 12000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'null = todos los complejos' })
  @IsOptional()
  @IsUUID()
  cinemaId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  promoLabel?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  promoPercent?: number;
}

export class UpdateSnackDto extends PartialType(CreateSnackDto) {}

/** Actualizar usuario (rol / bloqueo). */
export class UpdateAdminUserDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Si true, bloquea 15 min; si false, limpia bloqueo',
  })
  @IsOptional()
  @IsBoolean()
  locked?: boolean;
}

/** Crear colaborador (STAFF/ADMIN) desde backoffice. */
export class CreateAdminUserDto {
  @ApiProperty()
  @IsString()
  email!: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @Length(8, 72)
  password!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 80)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 80)
  lastName!: string;

  @ApiProperty()
  @IsString()
  @Length(7, 30)
  phone!: string;

  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @ApiProperty()
  @IsString()
  @Length(3, 40)
  documentNumber!: string;

  @ApiProperty({ enum: [UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN] })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiProperty()
  @IsUUID()
  cityId!: string;
}
