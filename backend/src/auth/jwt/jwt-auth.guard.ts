import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard HTTP que exige un Access JWT válido (HU-007).
 *
 * Uso: `@UseGuards(JwtAuthGuard)` en rutas protegidas.
 * Tras pasar, `req.user` es un `AuthUser` ({ userId, email, role }).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
