import { Department } from './department.entity';
import { Cinema } from './cinema.entity';
export declare class City {
    id: string;
    name: string;
    isActive: boolean;
    departmentId: string;
    department: Department;
    cinemas: Cinema[];
}
