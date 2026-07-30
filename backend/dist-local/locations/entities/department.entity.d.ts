import { Country } from './country.entity';
import { City } from './city.entity';
export declare class Department {
    id: string;
    name: string;
    countryId: string;
    country: Country;
    cities: City[];
}
