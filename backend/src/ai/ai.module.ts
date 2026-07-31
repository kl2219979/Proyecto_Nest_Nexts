import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MembershipModule } from '../membership/membership.module';
import { MoviesModule } from '../movies/movies.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatSession } from './entities/chat-session.entity';
import { OpenAiGatewayService } from './openai-gateway.service';

/**
 * Módulo de Inteligencia Artificial — chatbot (HU-021).
 *
 * Reutiliza cartelera (`MoviesModule`), promociones y membresía.
 * El proveedor LLM queda aislado en `OpenAiGatewayService` (Adapter).
 *
 * Motor de recomendaciones personalizadas por historial → `RecommendationsModule` (HU-022).
 */
@Module({
  imports: [
    AuthModule,
    MoviesModule,
    PromotionsModule,
    MembershipModule,
    TypeOrmModule.forFeature([ChatSession, ChatMessage]),
  ],
  controllers: [AiController],
  providers: [AiService, OpenAiGatewayService],
  exports: [AiService],
})
export class AiModule {}
