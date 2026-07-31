import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { City } from '../locations/entities/city.entity';
import { Movie } from '../movies/entities/movie.entity';
import { Showtime } from '../movies/entities/showtime.entity';
import { Order } from '../payments/entities/order.entity';
import { RecommendationFeed } from './entities/recommendation-feed.entity';
import { RecommendationPreference } from './entities/recommendation-preference.entity';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsJob } from './recommendations.job';
import { RecommendationsService } from './recommendations.service';

/**
 * Motor de recomendaciones personalizadas (HU-022).
 *
 * - `GET /recommendations` · `POST /recommendations/preferences`
 * - RN-096 snapshot diario · RN-097 consentimiento · RN-098 exclusión reciente
 * - Señales: historial PAID, géneros, formatos, idiomas, complejos, horarios
 *
 * Independiente del chatbot (HU-021) y de similares por ficha (HU-004).
 */
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      RecommendationPreference,
      RecommendationFeed,
      Order,
      Movie,
      Showtime,
      City,
      UserProfile,
    ]),
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, RecommendationsJob],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
