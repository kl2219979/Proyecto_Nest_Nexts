/**
 * Test end-to-end (e2e) del endpoint de salud.
 *
 * Diferencia con el unitario:
 * - Aquí se crea una app HTTP Nest real (aunque con DB mockeada).
 * - Se llama la ruta con Supertest como lo haría un cliente HTTP.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { getDataSourceToken } from '@nestjs/typeorm';
import { HealthController } from './../src/health/health.controller';
import { HealthService } from './../src/health/health.service';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  /**
   * Arranca una mini-aplicación solo con Health.
   *
   * @returns {Promise<void>}
   */
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: getDataSourceToken(),
          useValue: {
            query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  /**
   * Verifica contrato HTTP: 200 + cuerpo con status/database.
   *
   * @returns {request.Test} Cadena de aserciones de Supertest.
   */
  it('GET /api/v1/health', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as {
          status: string;
          database: string;
        };
        expect(body.status).toBe('ok');
        expect(body.database).toBe('up');
      });
  });

  /**
   * Cierra la app para no dejar handles abiertos entre tests.
   *
   * @returns {Promise<void>}
   */
  afterEach(async () => {
    await app.close();
  });
});
