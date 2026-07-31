import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

type WindowBucket = {
  /** Epoch ms del inicio de la ventana. */
  windowStart: number;
  count: number;
};

/**
 * Rate limit por cliente externo (HU-029 / RN-114 / RN-116).
 *
 * Ventana fija de 60 s en memoria de proceso.
 * Suficiente para demo/dev; producción podría usar Redis.
 *
 * @remarks
 * **Patrón:** Service con estado en memoria (contador por clave).
 * Problema que resuelve: aplicar el tope configurable de cada
 * `ApiClient` sin depender solo del Throttler global.
 */
@Injectable()
export class ApiClientRateLimitService {
  private readonly buckets = new Map<string, WindowBucket>();

  /**
   * Incrementa el contador del cliente y lanza 429 si supera el límite.
   *
   * @param clientId - UUID interno del ApiClient.
   * @param limitPerMinute - Tope configurado en la entidad.
   */
  consume(clientId: string, limitPerMinute: number): void {
    const now = Date.now();
    const windowMs = 60_000;
    let bucket = this.buckets.get(clientId);

    if (!bucket || now - bucket.windowStart >= windowMs) {
      bucket = { windowStart: now, count: 0 };
      this.buckets.set(clientId, bucket);
    }

    bucket.count += 1;

    if (bucket.count > limitPerMinute) {
      const retryAfterSec = Math.ceil(
        (windowMs - (now - bucket.windowStart)) / 1000,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit del cliente excedido (${limitPerMinute}/min)`,
          retryAfterSec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
