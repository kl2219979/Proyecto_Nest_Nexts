/**
 * Tests unitarios de `HealthService`.
 *
 * Aquí NO levantamos Postgres real: mockeamos el `DataSource`
 * para probar la lógica “si query ok → up / si falla → down”.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  /** Mock de `dataSource.query`. Jest controla qué resuelve o rechaza. */
  const query = jest.fn();

  /**
   * Antes de cada test: crea un módulo Nest mínimo con el servicio
   * y un DataSource falso.
   *
   * @returns {Promise<void>}
   */
  beforeEach(async () => {
    query.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: getDataSourceToken(),
          useValue: { query },
        },
      ],
    }).compile();

    service = module.get(HealthService);
  });

  /**
   * Caso feliz: la DB responde → status ok + database up.
   *
   * @returns {Promise<void>}
   */
  it('returns ok when database responds', async () => {
    query.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
  });

  /**
   * Caso de fallo: la query lanza → status degraded + database down.
   *
   * @returns {Promise<void>}
   */
  it('returns degraded when database fails', async () => {
    query.mockRejectedValue(new Error('connection refused'));

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.database).toBe('down');
  });
});
