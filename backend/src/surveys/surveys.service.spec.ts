/**
 * Tests unitarios de `SurveysService` (HU-027).
 */
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from '../payments/entities/order.entity';
import { OrderStatus } from '../payments/enums/payment.enums';
import { Ticket } from '../tickets/entities/ticket.entity';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { Survey } from './entities/survey.entity';
import { SurveysService } from './surveys.service';

describe('SurveysService', () => {
  let service: SurveysService;

  const surveyRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: Survey) => ({
      ...x,
      id: x.id ?? 'survey-1',
      createdAt: x.createdAt ?? new Date('2026-07-31T12:00:00.000Z'),
      updatedAt: new Date('2026-07-31T12:00:00.000Z'),
    })),
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const orderRepo = {
    findOne: jest.fn(),
  };
  const ticketRepo = {
    exist: jest.fn(),
  };

  const baseDto = (): CreateSurveyDto => ({
    orderId: 'order-1',
    movieRating: 5,
    roomRating: 4,
    soundRating: 5,
    imageRating: 5,
    comfortRating: 4,
    snacksRating: 3,
    cleanlinessRating: 4,
    serviceRating: 5,
    recommendScore: 9,
    comments: '  Muy bueno  ',
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    surveyRepo.findOne.mockResolvedValue(null);
    orderRepo.findOne.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.PAID,
      userId: 'user-1',
    });
    ticketRepo.exist.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SurveysService,
        { provide: getRepositoryToken(Survey), useValue: surveyRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(Ticket), useValue: ticketRepo },
      ],
    }).compile();

    service = module.get(SurveysService);
  });

  it('create persiste encuesta si asistió (RN-108) y no hay previa (RN-109)', async () => {
    const result = await service.create('user-1', baseDto());

    expect(result.id).toBe('survey-1');
    expect(result.orderId).toBe('order-1');
    expect(result.movieRating).toBe(5);
    expect(result.recommendScore).toBe(9);
    expect(result.comments).toBe('Muy bueno');
    expect(surveyRepo.save).toHaveBeenCalled();
  });

  it('create rechaza orden inexistente', async () => {
    orderRepo.findOne.mockResolvedValue(null);

    await expect(service.create('user-1', baseDto())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create rechaza orden no PAID', async () => {
    orderRepo.findOne.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.PENDING,
    });

    await expect(service.create('user-1', baseDto())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('create rechaza sin asistencia (RN-108)', async () => {
    ticketRepo.exist.mockResolvedValue(false);

    await expect(service.create('user-1', baseDto())).rejects.toMatchObject({
      response: { code: 'SURVEY_ATTENDANCE_REQUIRED' },
    });
  });

  it('create rechaza encuesta duplicada (RN-109)', async () => {
    surveyRepo.findOne.mockResolvedValue({ id: 'survey-prev' });

    await expect(service.create('user-1', baseDto())).rejects.toMatchObject({
      response: { code: 'SURVEY_ALREADY_EXISTS' },
    });
  });

  it('create mapea UNIQUE 23505 a ConflictException (RN-109)', async () => {
    surveyRepo.save.mockRejectedValueOnce({ code: '23505' });

    await expect(service.create('user-1', baseDto())).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('listMine devuelve encuestas del usuario', async () => {
    surveyRepo.find.mockResolvedValue([
      {
        id: 'survey-1',
        userId: 'user-1',
        orderId: 'order-1',
        movieRating: 5,
        roomRating: 4,
        soundRating: 5,
        imageRating: 5,
        comfortRating: 4,
        snacksRating: 3,
        cleanlinessRating: 4,
        serviceRating: 5,
        recommendScore: 9,
        comments: null,
        createdAt: new Date('2026-07-31T12:00:00.000Z'),
      },
    ]);

    const result = await service.listMine('user-1');
    expect(result.surveys).toHaveLength(1);
    expect(result.surveys[0].id).toBe('survey-1');
  });

  it('getMine lanza NotFound si no es del usuario', async () => {
    surveyRepo.findOne.mockResolvedValue(null);

    await expect(service.getMine('user-1', 'survey-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
