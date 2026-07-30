import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../jwt/jwt.strategy';

/**
 * Extrae el usuario autenticado de `req.user` (tras `JwtAuthGuard`).
 *
 * @example
 * ```ts
 * @Get('me')
 * @UseGuards(JwtAuthGuard)
 * me(@CurrentUser() user: AuthUser) { ... }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
