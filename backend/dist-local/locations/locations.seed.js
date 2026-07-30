"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedLocations = seedLocations;
const country_entity_1 = require("./entities/country.entity");
async function seedLocations(dataSource) {
    const countryRepo = dataSource.getRepository(country_entity_1.Country);
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
//# sourceMappingURL=locations.seed.js.map