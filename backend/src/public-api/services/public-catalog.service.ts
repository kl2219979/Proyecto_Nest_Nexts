import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cinema } from '../../locations/entities/cinema.entity';
import { Room } from '../../movies/entities/room.entity';

/**
 * Consultas de catálogo venues para la facade pública (HU-029).
 *
 * Separado de LocationsService para no ensanchar HU-002:
 * solo lectura de complejos y salas activas.
 */
@Injectable()
export class PublicCatalogService {
  /**
   * @param cinemaRepo - Complejos.
   * @param roomRepo - Salas.
   */
  constructor(
    @InjectRepository(Cinema)
    private readonly cinemaRepo: Repository<Cinema>,
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
  ) {}

  /**
   * Complejos activos, opcionalmente filtrados por ciudad.
   *
   * @param cityId - UUID de ciudad (opcional).
   */
  async listCinemas(cityId?: string): Promise<
    Array<{
      id: string;
      name: string;
      address: string;
      cityId: string;
      isActive: boolean;
    }>
  > {
    const rows = await this.cinemaRepo.find({
      where: {
        isActive: true,
        ...(cityId ? { cityId } : {}),
      },
      order: { name: 'ASC' },
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      address: c.address,
      cityId: c.cityId,
      isActive: c.isActive,
    }));
  }

  /**
   * Salas de un complejo.
   *
   * @param cinemaId - UUID del cine.
   */
  async listRooms(cinemaId: string): Promise<
    Array<{
      id: string;
      name: string;
      roomType: string;
      capacity: number;
      cinemaId: string;
    }>
  > {
    const rows = await this.roomRepo.find({
      where: { cinemaId },
      order: { name: 'ASC' },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      roomType: r.roomType,
      capacity: r.capacity,
      cinemaId: r.cinemaId,
    }));
  }
}
