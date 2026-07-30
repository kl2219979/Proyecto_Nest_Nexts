import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * Punto de entrada de la API Multicine.
 *
 * NestJS no “arranca solo”: esta función crea la aplicación HTTP,
 * aplica seguridad/documentación y deja el servidor escuchando un puerto.
 *
 * @returns {Promise<void>} No retorna datos al cliente; solo inicia el proceso.
 *                          Si algo falla al arrancar, la promesa se rechaza y el proceso termina con error.
 *
 * @example
 * // Se invoca al final del archivo con: void bootstrap();
 */
async function bootstrap(): Promise<void> {
  /**
   * Crea la app Nest a partir del módulo raíz (`AppModule`).
   * Aquí se registran módulos, controladores, servicios, TypeORM, etc.
   */
  const app = await NestFactory.create(AppModule);

  /** Lee variables ya validadas (PORT, DATABASE_*, NODE_ENV, …). */
  const configService = app.get(ConfigService);

  /** Logger con contexto "Bootstrap" para filtrar logs de arranque. */
  const logger = new Logger('Bootstrap');

  /**
   * Prefijo global de la API.
   * Ejemplo: un `@Controller('health')` queda en `/api/v1/health`.
   */
  app.setGlobalPrefix('api/v1');

  /**
   * ValidationPipe global:
   * - `whitelist`: elimina propiedades no declaradas en el DTO
   * - `forbidNonWhitelisted`: error si mandan campos extra
   * - `transform`: convierte tipos (string → number/UUID class, etc.)
   *
   * Así los `@Body()` llegan ya validados por `class-validator`.
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  /**
   * CORS: permite que un frontend (otro origen/puerto) llame a esta API.
   * `origin: true` refleja el Origin de la petición (útil en desarrollo).
   * En producción normalmente se restringe a dominios concretos.
   */
  app.enableCors({
    origin: true,
    credentials: true,
  });

  /**
   * Helmet añade cabeceras HTTP de seguridad
   * (XSS, clickjacking, sniffing de MIME, etc.).
   */
  app.use(helmet());

  /**
   * Metadatos de Swagger/OpenAPI.
   * `addBearerAuth()` prepara el candado JWT para historias futuras (login).
   */
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Multicine API')
    .setDescription('API REST de la Plataforma Web Multicine')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  /** Genera el documento OpenAPI recorriendo controladores y decoradores `@Api*`. */
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  /**
   * Publica la UI de Swagger.
   * Nota: esta ruta NO usa el prefijo `api/v1` → queda en `/api/docs`.
   */
  SwaggerModule.setup('api/docs', app, document);

  /** Puerto HTTP. Si no existe PORT en env, usa 3000. */
  const port = configService.get<number>('PORT', 3000);

  /** Abre el socket HTTP y empieza a aceptar peticiones. */
  await app.listen(port);

  logger.log(`API listening on http://localhost:${port}/api/v1`);
  logger.log(`Swagger available at http://localhost:${port}/api/docs`);
}

/**
 * `void` indica que no esperamos el resultado aquí.
 * Los errores no capturados de la promesa se verán en consola / crash del proceso.
 */
void bootstrap();
