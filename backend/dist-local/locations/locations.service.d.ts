import { Repository } from 'typeorm';
import { Country } from './entities/country.entity';
import { Department } from './entities/department.entity';
import { City } from './entities/city.entity';
import { Cinema } from './entities/cinema.entity';
import { SaveLocationDto } from './dto/save-location.dto';
export type LocationPreference = {
    city: Pick<City, 'id' | 'name' | 'isActive' | 'departmentId'>;
    department: Pick<Department, 'id' | 'name' | 'countryId'>;
    country: Pick<Country, 'id' | 'name' | 'code'>;
    cinemas: Array<Pick<Cinema, 'id' | 'name' | 'address' | 'isActive'>>;
};
export declare class LocationsService {
    private readonly countryRepo;
    private readonly departmentRepo;
    private readonly cityRepo;
    private readonly cinemaRepo;
    constructor(countryRepo: Repository<Country>, departmentRepo: Repository<Department>, cityRepo: Repository<City>, cinemaRepo: Repository<Cinema>);
    findCountries(): Promise<Country[]>;
    findDepartmentsByCountry(countryId: string): Promise<Department[]>;
    findCitiesByDepartment(departmentId: string): Promise<City[]>;
    saveLocationPreference(dto: SaveLocationDto): Promise<LocationPreference>;
}
