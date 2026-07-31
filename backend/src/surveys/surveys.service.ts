import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../payments/entities/order.entity';
import { OrderStatus } from '../payments/enums/payment.enums';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../tickets/enums/ticket.enums';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { SurveyListResponse, SurveyView } from './dto/survey-response';
import { Survey } from './entities/survey.entity';

/**
 * Encuestas de satisfacción post-visita (HU-027).
 *
 * RN-108: solo quien asistió (ticket `USED` de la orden).
 * RN-109: una encuesta por compra (`orderId` único).
 *
 * Capas: Controller → Service → Repository (TypeORM).
 */
@Injectable()
export class SurveysService {
  /**
   * @param surveyRepo - Persistencia de encuestas.
   * @param orderRepo - Validación de compra PAID.
   * @param ticketRepo - Prueba de asistencia (RN-108).
   */
  constructor(
    @InjectRepository(Survey)
    private readonly surveyRepo: Repository<Survey>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
  ) {}

  /**
   * Crea una encuesta para una compra ya asistida (HU-027).
   *
   * @param userId - Usuario del JWT.
   * @param dto - Calificaciones + `orderId`.
   * @returns Encuesta persistida.
   * @throws {NotFoundException} Orden inexistente.
   * @throws {ForbiddenException} Orden no PAID o sin asistencia (RN-108).
   * @throws {ConflictException} Ya existe encuesta para esa compra (RN-109).
   */
  async create(userId: string, dto: CreateSurveyDto): Promise<SurveyView> {
    const order = await this.orderRepo.findOne({
      where: { id: dto.orderId },
    });
    if (!order) {
      throw new NotFoundException({
        message: 'Orden no encontrada',
        code: 'ORDER_NOT_FOUND',
      });
    }
    if (order.status !== OrderStatus.PAID) {
      throw new ForbiddenException({
        message: 'Solo se encuestan compras pagadas',
        code: 'ORDER_NOT_PAID',
      });
    }

    const attended = await this.ticketRepo.exist({
      where: {
        orderId: dto.orderId,
        userId,
        status: TicketStatus.USED,
      },
    });
    if (!attended) {
      throw new ForbiddenException({
        message:
          'Solo usuarios que asistieron pueden responder la encuesta (RN-108)',
        code: 'SURVEY_ATTENDANCE_REQUIRED',
      });
    }

    const existing = await this.surveyRepo.findOne({
      where: { orderId: dto.orderId },
    });
    if (existing) {
      throw new ConflictException({
        message: 'Ya existe una encuesta para esta compra (RN-109)',
        code: 'SURVEY_ALREADY_EXISTS',
      });
    }

    const survey = this.surveyRepo.create({
      userId,
      orderId: dto.orderId,
      movieRating: dto.movieRating,
      roomRating: dto.roomRating,
      soundRating: dto.soundRating,
      imageRating: dto.imageRating,
      comfortRating: dto.comfortRating,
      snacksRating: dto.snacksRating,
      cleanlinessRating: dto.cleanlinessRating,
      serviceRating: dto.serviceRating,
      recommendScore: dto.recommendScore,
      comments: dto.comments?.trim() ? dto.comments.trim() : null,
    });

    try {
      const saved = await this.surveyRepo.save(survey);
      return this.toView(saved);
    } catch (err: unknown) {
      /**
       * Carrera: dos POST concurrentes pueden pasar el `findOne` y chocar
       * con el UNIQUE de `orderId` (RN-109).
       */
      if (this.isUniqueViolation(err)) {
        throw new ConflictException({
          message: 'Ya existe una encuesta para esta compra (RN-109)',
          code: 'SURVEY_ALREADY_EXISTS',
        });
      }
      throw err;
    }
  }

  /**
   * Lista las encuestas respondidas por el usuario JWT.
   *
   * @param userId - Usuario autenticado.
   */
  async listMine(userId: string): Promise<SurveyListResponse> {
    const rows = await this.surveyRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return { surveys: rows.map((s) => this.toView(s)) };
  }

  /**
   * Consulta una encuesta propia por id.
   *
   * @param userId - Dueño esperado.
   * @param surveyId - UUID de la encuesta.
   */
  async getMine(userId: string, surveyId: string): Promise<SurveyView> {
    const survey = await this.surveyRepo.findOne({
      where: { id: surveyId, userId },
    });
    if (!survey) {
      throw new NotFoundException({
        message: 'Encuesta no encontrada',
        code: 'SURVEY_NOT_FOUND',
      });
    }
    return this.toView(survey);
  }

  /**
   * Serializa entidad → DTO de respuesta.
   *
   * @param survey - Fila persistida.
   */
  private toView(survey: Survey): SurveyView {
    return {
      id: survey.id,
      userId: survey.userId,
      orderId: survey.orderId,
      movieRating: survey.movieRating,
      roomRating: survey.roomRating,
      soundRating: survey.soundRating,
      imageRating: survey.imageRating,
      comfortRating: survey.comfortRating,
      snacksRating: survey.snacksRating,
      cleanlinessRating: survey.cleanlinessRating,
      serviceRating: survey.serviceRating,
      recommendScore: survey.recommendScore,
      comments: survey.comments,
      createdAt: survey.createdAt.toISOString(),
    };
  }

  /**
   * Detecta violación de UNIQUE de Postgres (código 23505).
   *
   * @param err - Error crudo de TypeORM/driver.
   */
  private isUniqueViolation(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const driver = err as { code?: string; driverError?: { code?: string } };
    return driver.code === '23505' || driver.driverError?.code === '23505';
  }
}
