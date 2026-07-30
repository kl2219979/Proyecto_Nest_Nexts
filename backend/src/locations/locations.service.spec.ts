/**
 * Tests unitarios de `LocationsService` (HU-002 / RN-006).
 *
 * No levantamos Postgres real: mockeamos los repositorios TypeORM.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LocationsService } from './locations.service';
import { Country } from './entities/country.entity';
import { Department } from './entities/department.entity';
import { City } from './entities/city.entity';
import { Cinema } from './entities/cinema.entity';

describe('LocationsService', () => {
  let service: LocationsService;

  const countryRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const departmentRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const cityRepo = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const cinemaRepo = {
    find: jest.fn(),
  };

  /**
   * Arma el módulo de testing con repos falsos.
   *
   * @returns {Promise<void>}
   */
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: getRepositoryToken(Country), useValue: countryRepo },
        { provide: getRepositoryToken(Department), useValue: departmentRepo },
        { provide: getRepositoryToken(City), useValue: cityRepo },
        { provide: getRepositoryToken(Cinema), useValue: cinemaRepo },
      ],
    }).compile();

    service = module.get(LocationsService);
  });

  /**
   * RN-006: el query builder debe filtrar ciudades con cine activo.
   *
   * @returns {Promise<void>}
   */
  it('findCitiesByDepartment returns only cities with active cinemas', async () => {
    departmentRepo.findOne.mockResolvedValue({
      id: 'dept-1',
      name: 'Antioquia',
    });

    const getMany = jest
      .fn()
      .mockResolvedValue([{ id: 'city-1', name: 'Medellín', isActive: true }]);

    cityRepo.createQueryBuilder.mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getMany,
    });

    const result = await service.findCitiesByDepartment('dept-1');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Medellín');
    expect(cityRepo.createQueryBuilder).toHaveBeenCalledWith('city');
  });

  /**
   * Departamento inexistente → 404.
   *
   * @returns {Promise<void>}
   */
  it('findCitiesByDepartment throws when department is missing', async () => {
    departmentRepo.findOne.mockResolvedValue(null);

    await expect(
      service.findCitiesByDepartment('missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  /**
   * POST location: ciudad sin cines activos → 400 (RN-006).
   *
   * @returns {Promise<void>}
   */
  it('saveLocationPreference rejects cities without active cinemas', async () => {
    cityRepo.findOne.mockResolvedValue({
      id: 'city-guatape',
      name: 'Guatapé',
      isActive: true,
      departmentId: 'dept-1',
      department: {
        id: 'dept-1',
        name: 'Antioquia',
        countryId: 'co-1',
        country: { id: 'co-1', name: 'Colombia', code: 'CO' },
      },
    });
    cinemaRepo.find.mockResolvedValue([]);

    await expect(
      service.saveLocationPreference({ cityId: 'city-guatape' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  /**
   * POST location feliz: devuelve contexto completo.
   *
   * @returns {Promise<void>}
   */
  it('saveLocationPreference returns location context with cinemas', async () => {
    cityRepo.findOne.mockResolvedValue({
      id: 'city-1',
      name: 'Medellín',
      isActive: true,
      departmentId: 'dept-1',
      department: {
        id: 'dept-1',
        name: 'Antioquia',
        countryId: 'co-1',
        country: { id: 'co-1', name: 'Colombia', code: 'CO' },
      },
    });
    cinemaRepo.find.mockResolvedValue([
      {
        id: 'cine-1',
        name: 'Multicine Laureles',
        address: 'Av. Nutibara',
        isActive: true,
      },
    ]);

    const result = await service.saveLocationPreference({ cityId: 'city-1' });

    expect(result.city.name).toBe('Medellín');
    expect(result.country.code).toBe('CO');
    expect(result.cinemas).toHaveLength(1);
  });
});
