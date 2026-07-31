import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PqrsCategory, PqrsHistoryEvent, PqrsStatus } from '../enums/pqrs.enums';

/** Adjunto serializado. */
export class PqrsAttachmentView {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  uploadedByUserId!: string;

  @ApiProperty()
  createdAt!: string;
}

/** Comentario serializado (sin internos para el cliente). */
export class PqrsCommentView {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  authorUserId!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ description: 'Solo staff ve `true`' })
  isInternal!: boolean;

  @ApiProperty()
  createdAt!: string;
}

/** Entrada de historial. */
export class PqrsHistoryView {
  @ApiProperty({ enum: PqrsHistoryEvent })
  event!: PqrsHistoryEvent;

  @ApiPropertyOptional({ nullable: true })
  actorUserId!: string | null;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional({ nullable: true })
  metadata!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: string;
}

/**
 * Vista de un caso PQRS (listado o detalle).
 */
export class PqrsCaseView {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'PQRS-2026-000001', description: 'RN-110' })
  ticketNumber!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: PqrsCategory })
  category!: PqrsCategory;

  @ApiProperty()
  subject!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: PqrsStatus })
  status!: PqrsStatus;

  @ApiPropertyOptional({ nullable: true })
  assignedToUserId!: string | null;

  @ApiProperty({ description: 'Horas SLA snapshot (RN-111)' })
  slaHours!: number;

  @ApiProperty({ description: 'Fecha límite SLA (RN-111)' })
  slaDueAt!: string;

  @ApiProperty({
    description: 'true si ya pasó `slaDueAt` y no está cerrado',
  })
  slaBreached!: boolean;

  @ApiPropertyOptional({ nullable: true })
  orderId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  cinemaId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  closedAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ type: [PqrsCommentView] })
  comments?: PqrsCommentView[];

  @ApiPropertyOptional({ type: [PqrsAttachmentView] })
  attachments?: PqrsAttachmentView[];

  @ApiPropertyOptional({ type: [PqrsHistoryView] })
  history?: PqrsHistoryView[];
}

/** Listado de casos. */
export class PqrsListResponse {
  @ApiProperty({ type: [PqrsCaseView] })
  cases!: PqrsCaseView[];
}

/** Fila de configuración SLA. */
export class PqrsSlaConfigView {
  @ApiProperty({ enum: PqrsCategory })
  category!: PqrsCategory;

  @ApiProperty()
  hours!: number;

  @ApiProperty()
  updatedAt!: string;
}

/** Listado de SLAs. */
export class PqrsSlaListResponse {
  @ApiProperty({ type: [PqrsSlaConfigView] })
  configs!: PqrsSlaConfigView[];
}
