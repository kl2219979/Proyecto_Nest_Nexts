import { LocationsService } from './locations.service';
import { Country } from './entities/country.entity';
import { Department } from './entities/department.entity';
import { City } from './entities/city.entity';
export declare class LocationsController {
    private readonly locationsService;
    constructor(locationsService: LocationsService);
    findCountries(): Promise<Country[]>;
    findDepartments(countryId: string): Promise<Department[]>;
    findCities(departmentId: string): Promise<City[]>;
}
