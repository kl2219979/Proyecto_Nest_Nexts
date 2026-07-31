import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cinema } from '../../locations/entities/cinema.entity';
import { City } from '../../locations/entities/city.entity';
import { Country } from '../../locations/entities/country.entity';
import { Department } from '../../locations/entities/department.entity';
import { Room } from '../../movies/entities/room.entity';
import { Seat } from '../../seats/entities/seat.entity';
import {
  AdminPage,
  AdminPaginationQueryDto,
} from '../dto/admin-pagination.dto';
import {
  CreateCinemaDto,
  CreateCityDto,
  CreateCountryDto,
  CreateDepartmentDto,
  CreateRoomDto,
  SeatLayoutItemDto,
  UpdateCinemaDto,
  UpdateCityDto,
  UpdateCountryDto,
  UpdateDepartmentDto,
  UpdateRoomDto,
  UpdateSeatDto,
  UpsertSeatLayoutDto,
} from '../dto/admin-write.dto';

/**
 * CRUD geográfico + complejos + salas + sillas (HU-020).
 */
@Injectable()
export class AdminCatalogService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(City)
    private readonly cityRepo: Repository<City>,
    @InjectRepository(Cinema)
    private readonly cinemaRepo: Repository<Cinema>,
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    @InjectRepository(Seat)
    private readonly seatRepo: Repository<Seat>,
  ) {}

  // ── Countries ──────────────────────────────────────────────

  /** @returns Todos los países. */
  listCountries(): Promise<Country[]> {
    return this.countryRepo.find({ order: { name: 'ASC' } });
  }

  /**
   * @param dto - Datos del país.
   * @returns País creado.
   */
  async createCountry(dto: CreateCountryDto): Promise<Country> {
    const code = dto.code.trim().toUpperCase();
    const exists = await this.countryRepo.findOne({ where: { code } });
    if (exists) {
      throw new ConflictException(`Ya existe un país con código ${code}`);
    }
    return this.countryRepo.save(
      this.countryRepo.create({ name: dto.name.trim(), code }),
    );
  }

  /**
   * @param id - UUID.
   * @param dto - Campos a actualizar.
   * @returns País actualizado.
   */
  async updateCountry(id: string, dto: UpdateCountryDto): Promise<Country> {
    const country = await this.requireCountry(id);
    if (dto.name !== undefined) country.name = dto.name.trim();
    if (dto.code !== undefined) {
      const code = dto.code.trim().toUpperCase();
      const clash = await this.countryRepo.findOne({ where: { code } });
      if (clash && clash.id !== id) {
        throw new ConflictException(`Código ${code} ya en uso`);
      }
      country.code = code;
    }
    return this.countryRepo.save(country);
  }

  /**
   * @param id - UUID.
   * @returns Confirmación.
   */
  async deleteCountry(id: string): Promise<{ deleted: true }> {
    await this.requireCountry(id);
    await this.countryRepo.delete(id);
    return { deleted: true };
  }

  // ── Departments ────────────────────────────────────────────

  /**
   * @param countryId - Filtro opcional.
   * @returns Departamentos.
   */
  listDepartments(countryId?: string): Promise<Department[]> {
    return this.departmentRepo.find({
      where: countryId ? { countryId } : {},
      order: { name: 'ASC' },
    });
  }

  /**
   * @param dto - Datos.
   * @returns Departamento creado.
   */
  async createDepartment(dto: CreateDepartmentDto): Promise<Department> {
    await this.requireCountry(dto.countryId);
    return this.departmentRepo.save(
      this.departmentRepo.create({
        name: dto.name.trim(),
        countryId: dto.countryId,
      }),
    );
  }

  /**
   * @param id - UUID.
   * @param dto - Campos.
   * @returns Departamento.
   */
  async updateDepartment(
    id: string,
    dto: UpdateDepartmentDto,
  ): Promise<Department> {
    const row = await this.requireDepartment(id);
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.countryId !== undefined) {
      await this.requireCountry(dto.countryId);
      row.countryId = dto.countryId;
    }
    return this.departmentRepo.save(row);
  }

  /**
   * @param id - UUID.
   * @returns Confirmación.
   */
  async deleteDepartment(id: string): Promise<{ deleted: true }> {
    await this.requireDepartment(id);
    await this.departmentRepo.delete(id);
    return { deleted: true };
  }

  // ── Cities ─────────────────────────────────────────────────

  /**
   * @param departmentId - Filtro opcional.
   * @returns Ciudades.
   */
  listCities(departmentId?: string): Promise<City[]> {
    return this.cityRepo.find({
      where: departmentId ? { departmentId } : {},
      order: { name: 'ASC' },
    });
  }

  /**
   * @param dto - Datos.
   * @returns Ciudad.
   */
  async createCity(dto: CreateCityDto): Promise<City> {
    await this.requireDepartment(dto.departmentId);
    return this.cityRepo.save(
      this.cityRepo.create({
        name: dto.name.trim(),
        departmentId: dto.departmentId,
        isActive: dto.isActive ?? true,
      }),
    );
  }

  /**
   * @param id - UUID.
   * @param dto - Campos.
   * @returns Ciudad.
   */
  async updateCity(id: string, dto: UpdateCityDto): Promise<City> {
    const row = await this.requireCity(id);
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.departmentId !== undefined) {
      await this.requireDepartment(dto.departmentId);
      row.departmentId = dto.departmentId;
    }
    if (dto.isActive !== undefined) row.isActive = dto.isActive;
    return this.cityRepo.save(row);
  }

  /**
   * @param id - UUID.
   * @returns Confirmación.
   */
  async deleteCity(id: string): Promise<{ deleted: true }> {
    await this.requireCity(id);
    await this.cityRepo.delete(id);
    return { deleted: true };
  }

  // ── Cinemas ────────────────────────────────────────────────

  /**
   * @param query - Paginación / filtro ciudad.
   * @param cityId - Filtro.
   * @returns Página de cines.
   */
  async listCinemas(
    query: AdminPaginationQueryDto,
    cityId?: string,
  ): Promise<AdminPage<Cinema>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const qb = this.cinemaRepo.createQueryBuilder('c');
    if (cityId) qb.andWhere('c.cityId = :cityId', { cityId });
    if (query.q) {
      qb.andWhere('(c.name ILIKE :q OR c.address ILIKE :q)', {
        q: `%${query.q}%`,
      });
    }
    qb.orderBy('c.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, page, limit, total };
  }

  /**
   * @param dto - Datos.
   * @returns Cine.
   */
  async createCinema(dto: CreateCinemaDto): Promise<Cinema> {
    await this.requireCity(dto.cityId);
    return this.cinemaRepo.save(
      this.cinemaRepo.create({
        name: dto.name.trim(),
        address: dto.address.trim(),
        cityId: dto.cityId,
        isActive: dto.isActive ?? true,
      }),
    );
  }

  /**
   * @param id - UUID.
   * @param dto - Campos.
   * @returns Cine.
   */
  async updateCinema(id: string, dto: UpdateCinemaDto): Promise<Cinema> {
    const row = await this.requireCinema(id);
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.address !== undefined) row.address = dto.address.trim();
    if (dto.cityId !== undefined) {
      await this.requireCity(dto.cityId);
      row.cityId = dto.cityId;
    }
    if (dto.isActive !== undefined) row.isActive = dto.isActive;
    return this.cinemaRepo.save(row);
  }

  /**
   * @param id - UUID.
   * @returns Confirmación.
   */
  async deleteCinema(id: string): Promise<{ deleted: true }> {
    await this.requireCinema(id);
    await this.cinemaRepo.delete(id);
    return { deleted: true };
  }

  // ── Rooms ──────────────────────────────────────────────────

  /**
   * @param cinemaId - Filtro opcional.
   * @returns Salas.
   */
  listRooms(cinemaId?: string): Promise<Room[]> {
    return this.roomRepo.find({
      where: cinemaId ? { cinemaId } : {},
      order: { name: 'ASC' },
    });
  }

  /**
   * @param dto - Datos.
   * @returns Sala.
   */
  async createRoom(dto: CreateRoomDto): Promise<Room> {
    await this.requireCinema(dto.cinemaId);
    return this.roomRepo.save(
      this.roomRepo.create({
        name: dto.name.trim(),
        roomType: dto.roomType,
        capacity: dto.capacity,
        cinemaId: dto.cinemaId,
      }),
    );
  }

  /**
   * @param id - UUID.
   * @param dto - Campos.
   * @returns Sala.
   */
  async updateRoom(id: string, dto: UpdateRoomDto): Promise<Room> {
    const row = await this.requireRoom(id);
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.roomType !== undefined) row.roomType = dto.roomType;
    if (dto.capacity !== undefined) row.capacity = dto.capacity;
    if (dto.cinemaId !== undefined) {
      await this.requireCinema(dto.cinemaId);
      row.cinemaId = dto.cinemaId;
    }
    return this.roomRepo.save(row);
  }

  /**
   * @param id - UUID.
   * @returns Confirmación.
   */
  async deleteRoom(id: string): Promise<{ deleted: true }> {
    await this.requireRoom(id);
    await this.roomRepo.delete(id);
    return { deleted: true };
  }

  // ── Seats ──────────────────────────────────────────────────

  /**
   * @param roomId - Sala.
   * @returns Plano de sillas.
   */
  async listSeats(roomId: string): Promise<Seat[]> {
    await this.requireRoom(roomId);
    return this.seatRepo.find({
      where: { roomId },
      order: { gridRow: 'ASC', gridColumn: 'ASC' },
    });
  }

  /**
   * Crea (o reemplaza) el plano de una sala.
   *
   * @param roomId - Sala.
   * @param dto - Layout.
   * @returns Sillas resultantes.
   */
  async upsertSeatLayout(
    roomId: string,
    dto: UpsertSeatLayoutDto,
  ): Promise<Seat[]> {
    const room = await this.requireRoom(roomId);
    if (dto.replaceExisting) {
      await this.seatRepo.delete({ roomId });
    }
    const entities = dto.seats.map((s) => this.toSeatEntity(roomId, s));
    await this.seatRepo.save(entities);
    room.capacity = await this.seatRepo.count({ where: { roomId } });
    await this.roomRepo.save(room);
    return this.listSeats(roomId);
  }

  /**
   * @param id - UUID silla.
   * @param dto - Campos.
   * @returns Silla.
   */
  async updateSeat(id: string, dto: UpdateSeatDto): Promise<Seat> {
    const seat = await this.seatRepo.findOne({ where: { id } });
    if (!seat) throw new NotFoundException(`Silla no encontrada: ${id}`);
    if (dto.rowLabel !== undefined) seat.rowLabel = dto.rowLabel;
    if (dto.seatNumber !== undefined) seat.seatNumber = dto.seatNumber;
    if (dto.gridColumn !== undefined) seat.gridColumn = dto.gridColumn;
    if (dto.gridRow !== undefined) seat.gridRow = dto.gridRow;
    if (dto.label !== undefined) seat.label = dto.label;
    if (dto.seatType !== undefined) seat.seatType = dto.seatType;
    if (!seat.label) {
      seat.label = `${seat.rowLabel}${seat.seatNumber}`;
    }
    return this.seatRepo.save(seat);
  }

  /**
   * @param id - UUID silla.
   * @returns Confirmación.
   */
  async deleteSeat(id: string): Promise<{ deleted: true }> {
    const seat = await this.seatRepo.findOne({ where: { id } });
    if (!seat) throw new NotFoundException(`Silla no encontrada: ${id}`);
    await this.seatRepo.delete(id);
    return { deleted: true };
  }

  // ── helpers ────────────────────────────────────────────────

  private toSeatEntity(roomId: string, s: SeatLayoutItemDto): Seat {
    return this.seatRepo.create({
      roomId,
      rowLabel: s.rowLabel,
      seatNumber: s.seatNumber,
      gridColumn: s.gridColumn,
      gridRow: s.gridRow,
      label: s.label ?? `${s.rowLabel}${s.seatNumber}`,
      seatType: s.seatType,
    });
  }

  private async requireCountry(id: string): Promise<Country> {
    const row = await this.countryRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`País no encontrado: ${id}`);
    return row;
  }

  private async requireDepartment(id: string): Promise<Department> {
    const row = await this.departmentRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Departamento no encontrado: ${id}`);
    return row;
  }

  private async requireCity(id: string): Promise<City> {
    const row = await this.cityRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Ciudad no encontrada: ${id}`);
    return row;
  }

  private async requireCinema(id: string): Promise<Cinema> {
    const row = await this.cinemaRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Cine no encontrado: ${id}`);
    return row;
  }

  private async requireRoom(id: string): Promise<Room> {
    const row = await this.roomRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Sala no encontrada: ${id}`);
    return row;
  }
}
