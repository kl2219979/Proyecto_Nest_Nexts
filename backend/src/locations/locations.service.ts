import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from './entities/country.entity';
import { Department } from './entities/department.entity';
import { City } from './entities/city.entity';
import { Cinema } from './entities/cinema.entity';
import { SaveLocationDto } from './dto/save-location.dto';

/**
 * Respuesta de `POST /users/location`.
 * El frontend puede guardar este objeto en Local Storage.
 */
export type LocationPreference = {
  city: Pick<City, 'id' | 'name' | 'isActive' | 'departmentId'>;
  department: Pick<Department, 'id' | 'name' | 'countryId'>;
  country: Pick<Country, 'id' | 'name' | 'code'>;
  cinemas: Array<Pick<Cinema, 'id' | 'name' | 'address' | 'isActive'>>;
};

/**
 * Lógica de negocio del catálogo geográfico (HU-002).
 *
 * Controller → Service → Repository (TypeORM):
 * el controller no habla con la DB; este service sí.
 */
@Injectable()
export class LocationsService {
  /**
   * @param countryRepo - Acceso a la tabla `countries`.
   * @param departmentRepo - Acceso a la tabla `departments`.
   * @param cityRepo - Acceso a la tabla `cities`.
   * @param cinemaRepo - Acceso a la tabla `cinemas`.
   */
  constructor(
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(City)
    private readonly cityRepo: Repository<City>,
    @InjectRepository(Cinema)
    private readonly cinemaRepo: Repository<Cinema>,
  ) {}

  /**
   * Lista todos los países ordenados alfabéticamente.
   *
   * @returns {Promise<Country[]>} Países sin relaciones anidadas.
   */
  async findCountries(): Promise<Country[]> {
    return this.countryRepo.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Lista departamentos de un país.
   *
   * @param countryId - UUID del país seleccionado.
   * @returns {Promise<Department[]>} Departamentos del país.
   * @throws {NotFoundException} Si el país no existe.
   */
  async findDepartmentsByCountry(countryId: string): Promise<Department[]> {
    const country = await this.countryRepo.findOne({
      where: { id: countryId },
    });
    if (!country) {
      throw new NotFoundException(`País no encontrado: ${countryId}`);
    }

    return this.departmentRepo.find({
      where: { countryId },
      order: { name: 'ASC' },
    });
  }

  /**
   * Lista ciudades **elegibles** de un departamento (RN-006).
   *
   * Criterios:
   * - ciudad `isActive = true`
   * - al menos un cine con `isActive = true`
   *
   * @param departmentId - UUID del departamento seleccionado.
   * @returns {Promise<City[]>} Ciudades filtradas (sin cines embebidos).
   * @throws {NotFoundException} Si el departamento no existe.
   */
  async findCitiesByDepartment(departmentId: string): Promise<City[]> {
    const department = await this.departmentRepo.findOne({
      where: { id: departmentId },
    });
    if (!department) {
      throw new NotFoundException(
        `Departamento no encontrado: ${departmentId}`,
      );
    }

    return this.cityRepo
      .createQueryBuilder('city')
      .innerJoin('city.cinemas', 'cinema', 'cinema.isActive = :cinemaActive', {
        cinemaActive: true,
      })
      .where('city.departmentId = :departmentId', { departmentId })
      .andWhere('city.isActive = :cityActive', { cityActive: true })
      .orderBy('city.name', 'ASC')
      .distinct(true)
      .getMany();
  }

  /**
   * Valida la ciudad elegida y arma el contexto de ubicación.
   *
   * Hoy no persiste en un usuario autenticado (eso llega en HU-006/007).
   * Devuelve el payload que el frontend guardará en Local Storage.
   *
   * @param dto - Contiene `cityId` enviado por el cliente.
   * @returns {Promise<LocationPreference>} Ciudad + depto + país + cines activos.
   * @throws {NotFoundException} Si la ciudad no existe.
   * @throws {BadRequestException} Si está inactiva o no tiene cines activos.
   */
  async saveLocationPreference(
    dto: SaveLocationDto,
  ): Promise<LocationPreference> {
    const city = await this.cityRepo.findOne({
      where: { id: dto.cityId },
      relations: { department: { country: true } },
    });

    if (!city) {
      throw new NotFoundException(`Ciudad no encontrada: ${dto.cityId}`);
    }

    if (!city.isActive) {
      throw new BadRequestException(
        'La ciudad seleccionada está inactiva y no puede usarse',
      );
    }

    const cinemas = await this.cinemaRepo.find({
      where: { cityId: city.id, isActive: true },
      order: { name: 'ASC' },
    });

    if (cinemas.length === 0) {
      throw new BadRequestException(
        'La ciudad debe tener al menos un cine activo (RN-006)',
      );
    }

    return {
      city: {
        id: city.id,
        name: city.name,
        isActive: city.isActive,
        departmentId: city.departmentId,
      },
      department: {
        id: city.department.id,
        name: city.department.name,
        countryId: city.department.countryId,
      },
      country: {
        id: city.department.country.id,
        name: city.department.country.name,
        code: city.department.country.code,
      },
      cinemas: cinemas.map((cinema) => ({
        id: cinema.id,
        name: cinema.name,
        address: cinema.address,
        isActive: cinema.isActive,
      })),
    };
  }
}
