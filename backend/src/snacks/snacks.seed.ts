import { DataSource } from 'typeorm';
import { Cinema } from '../locations/entities/cinema.entity';
import { Snack } from './entities/snack.entity';
import { SnackCategory } from './enums/snack.enums';

type SeedSnack = {
  name: string;
  description: string;
  imageUrl: string;
  category: SnackCategory;
  price: number;
  stock: number;
  promoLabel?: string | null;
  promoPercent?: number;
  /** Si true, se asocia al primer cine activo del seed. */
  cinemaSpecific?: boolean;
};

const CATALOG: SeedSnack[] = [
  {
    name: 'Crispetas grandes',
    description: 'Balde de crispetas con mantequilla.',
    imageUrl: 'https://cdn.multicine.local/snacks/popcorn-l.png',
    category: SnackCategory.POPCORN,
    price: 18000,
    stock: 80,
  },
  {
    name: 'Crispetas medianas',
    description: 'Porción mediana clásica.',
    imageUrl: 'https://cdn.multicine.local/snacks/popcorn-m.png',
    category: SnackCategory.POPCORN,
    price: 14000,
    stock: 100,
    promoLabel: '15% off tarde',
    promoPercent: 15,
  },
  {
    name: 'Combo pareja',
    description: '2 crispetas medianas + 2 gaseosas.',
    imageUrl: 'https://cdn.multicine.local/snacks/combo-couple.png',
    category: SnackCategory.COMBO,
    price: 42000,
    stock: 40,
  },
  {
    name: 'Gaseosa 32 oz',
    description: 'Refresco a elección.',
    imageUrl: 'https://cdn.multicine.local/snacks/soda-32.png',
    category: SnackCategory.SODA,
    price: 10000,
    stock: 120,
  },
  {
    name: 'Gomitas surtidas',
    description: 'Bolsa de 120 g.',
    imageUrl: 'https://cdn.multicine.local/snacks/candy.png',
    category: SnackCategory.CANDY,
    price: 8000,
    stock: 60,
  },
  {
    name: 'Chocolate con almendras',
    description: 'Barra 80 g.',
    imageUrl: 'https://cdn.multicine.local/snacks/chocolate.png',
    category: SnackCategory.CHOCOLATE,
    price: 9000,
    stock: 50,
  },
  {
    name: 'Nachos con queso',
    description: 'Porción con salsa de queso.',
    imageUrl: 'https://cdn.multicine.local/snacks/nachos.png',
    category: SnackCategory.NACHOS,
    price: 16000,
    stock: 35,
  },
  {
    name: 'Perro caliente clásico',
    description: 'Con papas chips.',
    imageUrl: 'https://cdn.multicine.local/snacks/hotdog.png',
    category: SnackCategory.HOT_DOG,
    price: 15000,
    stock: 25,
  },
  {
    name: 'Hamburguesa cine',
    description: 'Carne 120 g, queso y papas.',
    imageUrl: 'https://cdn.multicine.local/snacks/burger.png',
    category: SnackCategory.BURGER,
    price: 22000,
    stock: 20,
  },
  {
    name: 'Café americano',
    description: 'Vaso 12 oz.',
    imageUrl: 'https://cdn.multicine.local/snacks/coffee.png',
    category: SnackCategory.COFFEE,
    price: 7000,
    stock: 70,
  },
  {
    name: 'Helado de vainilla',
    description: 'Copa individual.',
    imageUrl: 'https://cdn.multicine.local/snacks/icecream.png',
    category: SnackCategory.ICE_CREAM,
    price: 11000,
    stock: 30,
  },
  /**
   * Producto agotado para probar RN-049.
   */
  {
    name: 'Combo agotado demo',
    description: 'Producto sin stock (pruebas RN-049).',
    imageUrl: 'https://cdn.multicine.local/snacks/soldout.png',
    category: SnackCategory.COMBO,
    price: 35000,
    stock: 0,
  },
  /**
   * Exclusivo del primer cine (pickup por complejo).
   */
  {
    name: 'Nachos VIP Laureles',
    description: 'Exclusivo del complejo (seed cinema-specific).',
    imageUrl: 'https://cdn.multicine.local/snacks/nachos-vip.png',
    category: SnackCategory.NACHOS,
    price: 19000,
    stock: 15,
    cinemaSpecific: true,
  },
];

/**
 * Siembra el catálogo de confitería si la tabla está vacía (HU-012).
 *
 * @param dataSource - Conexión TypeORM.
 * @returns {Promise<void>}
 */
export async function seedSnacks(dataSource: DataSource): Promise<void> {
  const snackRepo = dataSource.getRepository(Snack);
  const count = await snackRepo.count();
  if (count > 0) {
    return;
  }

  const cinema = await dataSource.getRepository(Cinema).findOne({
    where: { isActive: true },
    order: { name: 'ASC' },
  });

  const rows = CATALOG.map((item) =>
    snackRepo.create({
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      category: item.category,
      price: item.price,
      stock: item.stock,
      isActive: true,
      promoLabel: item.promoLabel ?? null,
      promoPercent: item.promoPercent ?? 0,
      cinemaId:
        item.cinemaSpecific && cinema ? cinema.id : null,
    }),
  );

  await snackRepo.save(rows);
}
