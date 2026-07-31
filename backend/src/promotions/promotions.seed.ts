import { DataSource } from 'typeorm';
import { DiscountKind, PromotionType } from './enums/promotion.enums';
import { Promotion } from './entities/promotion.entity';

/**
 * Siembra cupones demo que reemplazan los hardcodeados del carrito (HU-026).
 *
 * - `MULTICINE10`: $10.000 off entradas, no apilable.
 * - `SNACK5K`: $5.000 off confitería, apilable.
 * - `TWO4ONE`: 2x1 en entradas.
 * - `TARDE15`: 15% automático en precios de función (sin código).
 *
 * @param dataSource - TypeORM.
 */
export async function seedPromotions(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Promotion);
  const count = await repo.count();
  if (count > 0) {
    return;
  }

  const now = new Date();
  const startsAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const endsAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  await repo.save([
    repo.create({
      code: 'MULTICINE10',
      name: 'Descuento Multicine $10.000',
      description: 'Demo: $10.000 off en entradas (no apilable)',
      type: PromotionType.CUSTOM,
      discountKind: DiscountKind.FIXED,
      discountValue: 10000,
      stackable: false,
      startsAt,
      endsAt,
      maxUsesPerUser: 5,
      maxTotalUses: null,
      isActive: true,
      requiresCode: true,
      appliesToTickets: true,
      appliesToSnacks: false,
      birthdayWindowDays: 0,
    }),
    repo.create({
      code: 'SNACK5K',
      name: 'Snack $5.000',
      description: 'Demo: $5.000 off en confitería (apilable)',
      type: PromotionType.COMBO,
      discountKind: DiscountKind.FIXED,
      discountValue: 5000,
      stackable: true,
      startsAt,
      endsAt,
      maxUsesPerUser: null,
      maxTotalUses: null,
      isActive: true,
      requiresCode: true,
      appliesToTickets: false,
      appliesToSnacks: true,
      birthdayWindowDays: 0,
    }),
    repo.create({
      code: 'TWO4ONE',
      name: '2x1 entradas',
      description: 'Demo: una entrada gratis por cada par',
      type: PromotionType.TWO_FOR_ONE,
      discountKind: DiscountKind.TWO_FOR_ONE,
      discountValue: 0,
      stackable: false,
      startsAt,
      endsAt,
      maxUsesPerUser: 3,
      maxTotalUses: null,
      isActive: true,
      requiresCode: true,
      appliesToTickets: true,
      appliesToSnacks: false,
      birthdayWindowDays: 0,
    }),
    repo.create({
      code: null,
      name: 'Promo tarde 15%',
      description: 'Descuento automático 15% en entradas (RN-038)',
      type: PromotionType.SEASON,
      discountKind: DiscountKind.PERCENT,
      discountValue: 15,
      stackable: true,
      startsAt,
      endsAt,
      maxUsesPerUser: null,
      maxTotalUses: null,
      isActive: true,
      requiresCode: false,
      appliesToTickets: true,
      appliesToSnacks: false,
      birthdayWindowDays: 0,
    }),
    repo.create({
      code: 'BDAY20',
      name: 'Cumpleaños 20%',
      description: '20% en entradas el día de cumpleaños',
      type: PromotionType.BIRTHDAY,
      discountKind: DiscountKind.PERCENT,
      discountValue: 20,
      stackable: false,
      startsAt,
      endsAt,
      maxUsesPerUser: 1,
      maxTotalUses: null,
      isActive: true,
      requiresCode: true,
      appliesToTickets: true,
      appliesToSnacks: false,
      birthdayWindowDays: 0,
    }),
    repo.create({
      code: 'BLACK30',
      name: 'Black Friday 30%',
      description: '30% en entradas (tipo Black Friday)',
      type: PromotionType.BLACK_FRIDAY,
      discountKind: DiscountKind.PERCENT,
      discountValue: 30,
      stackable: false,
      startsAt,
      endsAt,
      maxUsesPerUser: 2,
      maxTotalUses: null,
      isActive: true,
      requiresCode: true,
      appliesToTickets: true,
      appliesToSnacks: false,
      birthdayWindowDays: 0,
      incompatibleWithPoints: true,
    }),
  ]);
}
