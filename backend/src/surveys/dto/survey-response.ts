import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Vista de una encuesta de satisfacción (HU-027).
 */
export class SurveyView {
  @ApiProperty({ example: 's1u2r3v4-...' })
  id!: string;

  @ApiProperty({ example: 'u1s2e3r4-...' })
  userId!: string;

  @ApiProperty({ example: 'o1r2d3e4-...' })
  orderId!: string;

  @ApiProperty({ example: 5 })
  movieRating!: number;

  @ApiProperty({ example: 4 })
  roomRating!: number;

  @ApiProperty({ example: 5 })
  soundRating!: number;

  @ApiProperty({ example: 5 })
  imageRating!: number;

  @ApiProperty({ example: 4 })
  comfortRating!: number;

  @ApiProperty({ example: 3 })
  snacksRating!: number;

  @ApiProperty({ example: 4 })
  cleanlinessRating!: number;

  @ApiProperty({ example: 5 })
  serviceRating!: number;

  @ApiProperty({ example: 9, description: '0–10 (NPS)' })
  recommendScore!: number;

  @ApiPropertyOptional({
    nullable: true,
    example: 'Excelente experiencia',
  })
  comments!: string | null;

  @ApiProperty({ example: '2026-07-31T12:00:00.000Z' })
  createdAt!: string;
}

/**
 * Listado de encuestas del usuario autenticado.
 */
export class SurveyListResponse {
  @ApiProperty({ type: [SurveyView] })
  surveys!: SurveyView[];
}
