import { LocationsService, LocationPreference } from './locations.service';
import { SaveLocationDto } from './dto/save-location.dto';
export declare class UsersLocationController {
    private readonly locationsService;
    constructor(locationsService: LocationsService);
    saveLocation(dto: SaveLocationDto): Promise<LocationPreference>;
}
