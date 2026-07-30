import { SeatRuntimeStatus, SeatType } from '../enums/seat.enums';
export type SeatMapItem = {
    id: string;
    label: string;
    rowLabel: string;
    seatNumber: number;
    gridRow: number;
    gridColumn: number;
    seatType: SeatType;
    status: SeatRuntimeStatus;
    lockExpiresAt: string | null;
};
export type SeatSelectionSummary = {
    seatCount: number;
    unitPrice: number;
    subtotal: number;
    currency: 'COP';
    seats: Array<{
        id: string;
        label: string;
        seatType: SeatType;
        unitPrice: number;
    }>;
};
export type SeatMapResponse = {
    functionId: string;
    movieId: string;
    room: {
        id: string;
        name: string;
        roomType: string;
    };
    cinema: {
        id: string;
        name: string;
    };
    startsAt: string;
    unitPrice: number;
    currency: 'COP';
    maxSeatsPerOrder: number;
    capacity: number;
    availableCount: number;
    seats: SeatMapItem[];
    mySelection: SeatSelectionSummary | null;
};
export type ReservationResponse = {
    reservationId: string;
    functionId: string;
    movieId: string;
    startsAt: string;
    expiresAt: string;
    room: {
        id: string;
        name: string;
    };
    cinema: {
        id: string;
        name: string;
    };
    summary: SeatSelectionSummary;
};
export type ReleaseSeatsResult = {
    releasedCount: number;
    reservationIds: string[];
};
