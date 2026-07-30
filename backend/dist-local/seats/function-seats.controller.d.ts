import type { AuthUser } from '../auth/jwt/jwt.strategy';
import { LockSeatsDto } from './dto/lock-seats.dto';
import { ReservationResponse, SeatMapResponse } from './dto/seat-map-response';
import { SeatsService } from './seats.service';
export declare class FunctionSeatsController {
    private readonly seatsService;
    constructor(seatsService: SeatsService);
    getSeats(id: string, user: AuthUser | null): Promise<SeatMapResponse>;
    lockSeats(id: string, user: AuthUser, dto: LockSeatsDto): Promise<ReservationResponse>;
}
