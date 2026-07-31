import { Repository } from 'typeorm';
import {
  DEFAULT_PQRS_SLA_HOURS,
  PqrsCategory,
} from './enums/pqrs.enums';
import { PqrsSlaConfig } from './entities/pqrs-sla-config.entity';

/**
 * Siembra SLAs por categoría si faltan filas (HU-028 / RN-111).
 *
 * @param slaRepo - Repositorio de `pqrs_sla_configs`.
 */
export async function seedPqrsSlaConfigs(
  slaRepo: Repository<PqrsSlaConfig>,
): Promise<void> {
  for (const category of Object.values(PqrsCategory)) {
    const existing = await slaRepo.findOne({ where: { category } });
    if (existing) continue;
    await slaRepo.save(
      slaRepo.create({
        category,
        hours: DEFAULT_PQRS_SLA_HOURS[category],
      }),
    );
  }
}
