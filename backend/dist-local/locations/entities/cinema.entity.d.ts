import { City } from './city.entity';
export declare class Cinema {
    id: string;
    name: string;
    address: string;
    isActive: boolean;
    cityId: string;
    city: City;
}
