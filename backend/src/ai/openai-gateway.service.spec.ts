/**
 * Tests del adaptador OpenAI stub (HU-021).
 */
import { ConfigService } from '@nestjs/config';
import { ChatIntent } from './enums/ai.enums';
import { OpenAiGatewayService } from './openai-gateway.service';

describe('OpenAiGatewayService', () => {
  const config = { get: jest.fn().mockReturnValue(undefined) };
  const gateway = new OpenAiGatewayService(config as unknown as ConfigService);

  const catalog = [
    {
      movieId: 'm1',
      title: 'Pixel Heroes',
      genres: ['animación'],
      classification: 'T',
      durationMinutes: 90,
      rating: 8,
      availableShowtimeCount: 3,
      formats: ['2D'],
      roomTypes: ['STANDARD'],
      earliestStartsAt: new Date().toISOString(),
    },
    {
      movieId: 'm2',
      title: 'Odisea Estelar',
      genres: ['acción', 'ciencia ficción'],
      classification: '12+',
      durationMinutes: 130,
      rating: 9,
      availableShowtimeCount: 2,
      formats: ['IMAX', 'VIP'],
      roomTypes: ['VIP', 'IMAX'],
      earliestStartsAt: new Date().toISOString(),
    },
  ];

  it('detects kids intent', async () => {
    const result = await gateway.complete({
      message: '¿Qué películas son para niños?',
      catalog,
      history: [],
    });
    expect(result.intent).toBe(ChatIntent.KIDS);
    expect(result.suggestedMovieIds).toContain('m1');
    expect(result.escalate).toBe(false);
  });

  it('detects promotions intent', async () => {
    const result = await gateway.complete({
      message: '¿Qué promociones existen?',
      catalog,
      history: [],
    });
    expect(result.intent).toBe(ChatIntent.PROMOTIONS);
  });

  it('detects VIP intent', async () => {
    const result = await gateway.complete({
      message: '¿Qué salas VIP están disponibles?',
      catalog,
      history: [],
    });
    expect(result.intent).toBe(ChatIntent.VIP);
    expect(result.suggestedMovieIds).toContain('m2');
  });

  it('parses after-hour intent', async () => {
    const result = await gateway.complete({
      message: '¿Qué funciones quedan después de las 8 pm?',
      catalog,
      history: [],
    });
    expect(result.intent).toBe(ChatIntent.AFTER_HOUR);
    expect(result.afterHour).toBe(20);
  });

  it('escalates to human support', async () => {
    const result = await gateway.complete({
      message: 'Quiero hablar con un humano',
      catalog,
      history: [],
    });
    expect(result.intent).toBe(ChatIntent.ESCALATE);
    expect(result.escalate).toBe(true);
  });

  it('recommends by genre without inventing ids', async () => {
    const result = await gateway.complete({
      message: 'Quiero una de acción',
      catalog,
      history: [],
    });
    expect(result.intent).toBe(ChatIntent.RECOMMEND);
    for (const id of result.suggestedMovieIds) {
      expect(['m1', 'm2']).toContain(id);
    }
  });
});
