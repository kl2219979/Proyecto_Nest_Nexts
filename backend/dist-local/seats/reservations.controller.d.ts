import type { AuthUser } from '../auth/jwt/jwt.strategy';
import { ReleaseSeatsDto } from './dto/lock-seats.dto';
import { ReleaseSeatsResult, ReservationResponse } from './dto/seat-map-response';
import { SeatsService } from './seats.service';
export declare class ReservationsController {
    private readonly seatsService;
    constructor(seatsService: SeatsService);
    listMine(user: AuthUser): Promise<ReservationResponse[]>;
    release(user: AuthUser, dto?: ReleaseSeatsDto): Promise<ReleaseSeatsResult>;
}
