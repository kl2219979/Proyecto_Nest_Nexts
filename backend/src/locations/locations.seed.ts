import { DataSource } from 'typeorm';
import { Country } from './entities/country.entity';

/**
 * Inserta datos de demostración para HU-002 (Colombia).
 *
 * Incluye a propósito la ciudad "Guatapé" **sin cines activos**
 * para que puedas verificar que `GET /cities/:departmentId` la omite (RN-006).
 *
 * @param dataSource - Conexión TypeORM ya inicializada.
 * @returns {Promise<void>} Resuelve cuando el seed termina (o si ya había datos).
 */
export async function seedLocations(dataSource: DataSource): Promise<void> {
  const countryRepo = dataSource.getRepository(Country);
  const existing = await countryRepo.count();

  if (existing > 0) {
    return;
  }

  const colombia = countryRepo.create({
    name: 'Colombia',
    code: 'CO',
    departments: [
      {
        name: 'Antioquia',
        cities: [
          {
            name: 'Medellín',
            isActive: true,
            cinemas: [
              {
                name: 'Multicine Laureles',
                address: 'Av. Nutibara #70-20, Medellín',
                isActive: true,
              },
              {
                name: 'Multicine Premium Plaza',
                address: 'Carrera 43A #30-25, Medellín',
                isActive: true,
              },
            ],
          },
          {
            name: 'Envigado',
            isActive: true,
            cinemas: [
              {
                name: 'Multicine Envigado',
                address: 'Calle 37 Sur #48-40, Envigado',
                isActive: true,
              },
            ],
          },
          {
            // Ciudad activa pero SIN cines → no debe listarse (RN-006).
            name: 'Guatapé',
            isActive: true,
            cinemas: [],
          },
        ],
      },
      {
        name: 'Cundinamarca',
        cities: [
          {
            name: 'Bogotá',
            isActive: true,
            cinemas: [
              {
                name: 'Multicine Andino',
                address: 'Carrera 11 #82-71, Bogotá',
                isActive: true,
              },
              {
                name: 'Multicine Titan',
                address: 'Av. Boyacá #80-94, Bogotá',
                isActive: true,
              },
            ],
          },
        ],
      },
      {
        name: 'Valle del Cauca',
        cities: [
          {
            name: 'Cali',
            isActive: true,
            cinemas: [
              {
                name: 'Multicine Chipichape',
                address: 'Calle 38 Norte #6N-45, Cali',
                isActive: true,
              },
            ],
          },
          {
            // Ciudad inactiva: tampoco debe listarse.
            name: 'Yumbo',
            isActive: false,
            cinemas: [
              {
                name: 'Multicine Yumbo (cerrado)',
                address: 'Calle 5 #10-20, Yumbo',
                isActive: false,
              },
            ],
          },
        ],
      },
    ],
  });

  await countryRepo.save(colombia);
}
