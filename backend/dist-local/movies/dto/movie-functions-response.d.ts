import { AudioType, MovieFormat, RoomType } from '../enums/movie.enums';
export type MovieFunctionItem = {
    id: string;
    startsAt: string;
    date: string;
    format: MovieFormat;
    language: string;
    audioType: AudioType;
    price: number;
    capacity: number;
    soldSeats: number;
    availableSeats: number;
    isSoldOut: boolean;
    isSelectable: boolean;
    cinema: {
        id: string;
        name: string;
    };
    room: {
        id: string;
        name: string;
        roomType: RoomType;
    };
};
export type MovieFunctionsFacets = {
    dates: string[];
    formats: MovieFormat[];
    languages: string[];
    audioTypes: AudioType[];
    roomTypes: RoomType[];
    cinemas: Array<{
        id: string;
        name: string;
    }>;
};
export type MovieFunctionsResponse = {
    movieId: string;
    cityId: string;
    functions: MovieFunctionItem[];
    facets: MovieFunctionsFacets;
};
export type FunctionPricesResponse = {
    functionId: string;
    movieId: string;
    startsAt: string;
    format: MovieFormat;
    language: string;
    audioType: AudioType;
    cinema: {
        id: string;
        name: string;
    };
    room: {
        id: string;
        name: string;
        roomType: RoomType;
    };
    basePrice: number;
    priceFactors: {
        format: MovieFormat;
        roomType: RoomType;
        startsAt: string;
    };
    promotions: Array<{
        code: string;
        description: string;
        discountAmount: number;
    }>;
    discountTotal: number;
    finalPrice: number;
    currency: 'COP';
    availableSeats: number;
    capacity: number;
    isSoldOut: boolean;
    isSelectable: boolean;
};
