/**
 * Tests unitarios de `AiService` (HU-021).
 */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MembershipService } from '../membership/membership.service';
import { MoviesService } from '../movies/movies.service';
import { PromotionsService } from '../promotions/promotions.service';
import { AiService } from './ai.service';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatSession } from './entities/chat-session.entity';
import { ChatIntent } from './enums/ai.enums';
import { OpenAiGatewayService } from './openai-gateway.service';

describe('AiService', () => {
  let service: AiService;

  const sessionRepo = {
    findOne: jest.fn(),
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: ChatSession) => ({
      ...x,
      id: x.id ?? 'session-1',
    })),
  };
  const messageRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: unknown) => ({
      ...(x as object),
      id: 'msg-1',
      createdAt: new Date(),
    })),
    find: jest.fn().mockResolvedValue([]),
  };

  const moviesService = {
    getWeeklyBillboard: jest.fn(),
    getMovieDetail: jest.fn(),
  };
  const promotionsService = {
    listActivePublic: jest.fn().mockResolvedValue([]),
  };
  const membershipService = {
    getDetailForUser: jest.fn(),
  };
  const gateway = {
    complete: jest.fn(),
  };

  const sampleMovie = {
    id: 'movie-kids',
    title: 'Pixel Heroes',
    posterUrl: 'https://example.com/p.jpg',
    genres: ['animación', 'familiar'],
    classification: 'T',
    durationMinutes: 95,
    director: 'Demo',
    rating: 8.2,
    isPremiere: false,
    formats: ['2D'],
    languages: ['ES'],
    audioTypes: ['DUBBED'],
    showtimes: [
      {
        id: 'st-1',
        startsAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        format: '2D',
        language: 'ES',
        audioType: 'DUBBED',
        isSoldOut: false,
        cinema: { id: 'c1', name: 'Laureles' },
        room: { id: 'r1', name: 'Sala 1', roomType: 'STANDARD' },
      },
    ],
  };

  const adultMovie = {
    ...sampleMovie,
    id: 'movie-adult',
    title: 'Archivo Oscuro',
    genres: ['terror'],
    classification: '18+',
    rating: 7.1,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    messageRepo.find.mockResolvedValue([]);
    sessionRepo.findOne.mockResolvedValue(null);
    moviesService.getWeeklyBillboard.mockResolvedValue({
      cityId: 'city-1',
      from: '2026-07-31',
      to: '2026-08-06',
      movies: [sampleMovie, adultMovie],
    });
    moviesService.getMovieDetail.mockImplementation(async (id: string) => ({
      id,
      title: id === 'movie-kids' ? 'Pixel Heroes' : 'Archivo Oscuro',
      posterUrl: 'https://example.com/p.jpg',
      bannerUrl: null,
      trailerUrl: 'https://youtube.com/watch?v=demo',
      synopsis: 'Sinopsis demo',
      director: 'Demo',
      cast: [],
      genres: id === 'movie-kids' ? ['animación'] : ['terror'],
      durationMinutes: 95,
      classification: id === 'movie-kids' ? 'T' : '18+',
      releaseDate: null,
      status: 'NOW_SHOWING',
      rating: 8,
      isPremiere: false,
      languages: ['ES'],
      formats: ['2D'],
      pricesByFormat: [{ format: '2D', price: 18000 }],
      cityId: 'city-1',
      showtimes: [
        {
          id: 'st-1',
          startsAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          format: '2D',
          language: 'ES',
          audioType: 'DUBBED',
          price: 18000,
          isSoldOut: false,
          cinema: { id: 'c1', name: 'Laureles' },
          room: { id: 'r1', name: 'Sala 1', roomType: 'STANDARD' },
        },
      ],
    }));
    gateway.complete.mockResolvedValue({
      intent: ChatIntent.KIDS,
      draftReply: 'Opciones para niños.',
      suggestedMovieIds: ['movie-kids'],
      escalate: false,
      provider: 'stub',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: getRepositoryToken(ChatSession), useValue: sessionRepo },
        { provide: getRepositoryToken(ChatMessage), useValue: messageRepo },
        { provide: MoviesService, useValue: moviesService },
        { provide: PromotionsService, useValue: promotionsService },
        { provide: MembershipService, useValue: membershipService },
        { provide: OpenAiGatewayService, useValue: gateway },
      ],
    }).compile();

    service = module.get(AiService);
  });

  it('filterByAge excludes classifications above age (RN-093)', () => {
    const result = service.filterByAge(
      [sampleMovie, adultMovie] as never,
      12,
    );
    expect(result.map((m) => m.id)).toEqual(['movie-kids']);
  });

  it('minAgeForClassification maps known labels', () => {
    expect(service.minAgeForClassification('T')).toBe(0);
    expect(service.minAgeForClassification('15+')).toBe(15);
    expect(service.minAgeForClassification('??')).toBe(18);
  });

  it('chat creates session, recommends from catalog and persists history', async () => {
    const result = await service.chat(
      {
        message: '¿Qué películas son para niños?',
        cityId: 'city-1',
        age: 10,
      },
      null,
    );

    expect(result.sessionId).toBe('session-1');
    expect(result.intent).toBe(ChatIntent.KIDS);
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].movieId).toBe('movie-kids');
    expect(result.recommendations[0].buyPath).toContain('cityId=city-1');
    expect(result.latencyMs).toBeLessThan(5000);
    expect(result.escalated).toBe(false);
    expect(messageRepo.save).toHaveBeenCalledTimes(2);
    expect(moviesService.getWeeklyBillboard).toHaveBeenCalledWith({
      cityId: 'city-1',
      available: true,
    });
  });

  it('chat escalates when gateway requests human support (RN-095)', async () => {
    gateway.complete.mockResolvedValue({
      intent: ChatIntent.ESCALATE,
      draftReply: 'Escalo a humano.',
      suggestedMovieIds: [],
      escalate: true,
      provider: 'stub',
    });

    const result = await service.chat(
      { message: 'Quiero hablar con un humano', cityId: 'city-1' },
      null,
    );

    expect(result.escalated).toBe(true);
    expect(result.recommendations).toHaveLength(0);
    expect(sessionRepo.save).toHaveBeenCalled();
  });

  it('chat answers promotions FAQ from PromotionsService', async () => {
    gateway.complete.mockResolvedValue({
      intent: ChatIntent.PROMOTIONS,
      draftReply: 'Promos',
      suggestedMovieIds: [],
      escalate: false,
      provider: 'stub',
    });
    promotionsService.listActivePublic.mockResolvedValue([
      {
        id: 'p1',
        code: 'MULTICINE10',
        name: '10% OFF',
        description: 'Descuento general',
        type: 'PERCENT',
      },
    ]);

    const result = await service.chat(
      { message: '¿Qué promociones existen?', cityId: 'city-1' },
      null,
    );

    expect(result.reply).toContain('MULTICINE10');
    expect(result.recommendations).toHaveLength(0);
  });

  it('getHistory throws if session missing', async () => {
    sessionRepo.findOne.mockResolvedValue(null);
    await expect(service.getHistory('missing', null)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('getHistory forbids foreign owned session', async () => {
    sessionRepo.findOne.mockResolvedValue({
      id: 'session-1',
      userId: 'user-a',
      cityId: 'city-1',
      escalated: false,
    });
    await expect(
      service.getHistory('session-1', 'user-b'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('getHistory returns ordered messages', async () => {
    sessionRepo.findOne.mockResolvedValue({
      id: 'session-1',
      userId: null,
      cityId: 'city-1',
      escalated: false,
    });
    messageRepo.find.mockResolvedValue([
      {
        id: 'm1',
        role: 'USER',
        content: 'hola',
        intent: null,
        recommendations: null,
        createdAt: new Date('2026-07-31T10:00:00Z'),
      },
      {
        id: 'm2',
        role: 'ASSISTANT',
        content: '¡Hola!',
        intent: 'GREETING',
        recommendations: [],
        createdAt: new Date('2026-07-31T10:00:01Z'),
      },
    ]);

    const history = await service.getHistory('session-1', null);
    expect(history.messages).toHaveLength(2);
    expect(history.messages[0].content).toBe('hola');
  });
});
