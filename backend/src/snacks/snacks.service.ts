import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SnackCatalogItem,
  SnacksCatalogResponse,
} from './dto/snack-response';
import { SnacksQueryDto } from './dto/snacks-query.dto';
import { Snack } from './entities/snack.entity';
import {
  SNACK_CATEGORY_LABELS,
  SnackCategory,
} from './enums/snack.enums';

/**
 * Resultado de validar una compra de snack para el carrito.
 */
export type PurchasableSnack = {
  snack: Snack;
  /** Precio unitario tras promo de producto (antes de membresía). */
  unitPrice: number;
};

/**
 * Catálogo e inventario de confitería (HU-012).
 *
 * RN-049 no vender agotados · RN-050 promo stub en producto ·
 * RN-051 descuento membresía lo aplica el carrito ·
 * RN-052 stock no baja aquí (pago = HU-013).
 *
 * Separado de `CartService` por responsabilidad única (catálogo vs carrito).
 */
@Injectable()
export class SnacksService {
  /**
   * @param snackRepo - Persistencia del catálogo.
   */
  constructor(
    @InjectRepository(Snack)
    private readonly snackRepo: Repository<Snack>,
  ) {}

  /**
   * `GET /snacks`: catálogo activo agrupado por categoría.
   *
   * @param query - `cinemaId` / `category` opcionales.
   * @returns {Promise<SnacksCatalogResponse>} Menú digital.
   */
  async listCatalog(query: SnacksQueryDto): Promise<SnacksCatalogResponse> {
    const qb = this.snackRepo
      .createQueryBuilder('snack')
      .where('snack.isActive = true')
      .orderBy('snack.category', 'ASC')
      .addOrderBy('snack.name', 'ASC');

    if (query.cinemaId) {
      qb.andWhere(
        '(snack.cinemaId IS NULL OR snack.cinemaId = :cinemaId)',
        { cinemaId: query.cinemaId },
      );
    }

    if (query.category) {
      qb.andWhere('snack.category = :category', {
        category: query.category,
      });
    }

    const rows = await qb.getMany();
    const items = rows.map((s) => this.toCatalogItem(s));

    const byCategory = new Map<SnackCategory, SnackCatalogItem[]>();
    for (const item of items) {
      const list = byCategory.get(item.category) ?? [];
      list.push(item);
      byCategory.set(item.category, list);
    }

    const categories = [...byCategory.entries()].map(([category, catItems]) => ({
      category,
      label: SNACK_CATEGORY_LABELS[category],
      items: catItems,
    }));

    return {
      currency: 'COP',
      cinemaId: query.cinemaId ?? null,
      pickupHint: query.cinemaId
        ? 'Recoge en el complejo indicado (cine de tu función al pagar).'
        : 'Filtra por cinemaId para ver menú del complejo; el pickup será el cine de tu carrito.',
      categories,
      totalItems: items.length,
    };
  }

  /**
   * Valida que un snack se pueda agregar/actualizar en el carrito (RN-049).
   *
   * No descuenta inventario (RN-052).
   *
   * @param snackId - UUID del producto.
   * @param quantity - Cantidad deseada en el carrito (≥ 1).
   * @param cinemaId - Cine de pickup (función del carrito); opcional.
   * @returns {Promise<PurchasableSnack>} Producto + precio unitario.
   */
  async assertPurchasable(
    snackId: string,
    quantity: number,
    cinemaId?: string | null,
  ): Promise<PurchasableSnack> {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException(
        'La cantidad de confitería debe ser un entero ≥ 1',
      );
    }

    const snack = await this.snackRepo.findOne({ where: { id: snackId } });
    if (!snack || !snack.isActive) {
      throw new NotFoundException(`Producto de confitería no encontrado: ${snackId}`);
    }

    if (
      snack.cinemaId &&
      cinemaId &&
      snack.cinemaId !== cinemaId
    ) {
      throw new BadRequestException(
        `El producto "${snack.name}" no está disponible en el complejo de tu función`,
      );
    }

    if (snack.stock < quantity) {
      throw new BadRequestException(
        snack.stock <= 0
          ? `Producto agotado (RN-049): ${snack.name}`
          : `Stock insuficiente para "${snack.name}" (disponible: ${snack.stock}, pedido: ${quantity})`,
      );
    }

    const promoPercent = Number(snack.promoPercent) || 0;
    const base = Number(snack.price);
    const unitPrice =
      Math.round((base * (1 - promoPercent / 100) + Number.EPSILON) * 100) /
      100;

    return { snack, unitPrice };
  }

  /**
   * Busca un snack activo por id (lectura simple).
   *
   * @param snackId - UUID.
   * @returns {Promise<Snack | null>} Entidad o null.
   */
  async findActiveById(snackId: string): Promise<Snack | null> {
    return this.snackRepo.findOne({
      where: { id: snackId, isActive: true },
    });
  }

  /**
   * Mapea entidad → ítem de catálogo.
   */
  private toCatalogItem(snack: Snack): SnackCatalogItem {
    const price = Number(snack.price);
    const promoPercent = Number(snack.promoPercent) || 0;
    const priceAfterPromo =
      Math.round((price * (1 - promoPercent / 100) + Number.EPSILON) * 100) /
      100;

    return {
      id: snack.id,
      name: snack.name,
      description: snack.description,
      imageUrl: snack.imageUrl,
      category: snack.category,
      categoryLabel: SNACK_CATEGORY_LABELS[snack.category],
      price,
      currency: 'COP',
      stock: snack.stock,
      available: snack.stock > 0,
      promotion: {
        label: snack.promoLabel,
        percent: promoPercent,
      },
      priceAfterPromo,
      cinemaId: snack.cinemaId,
    };
  }
}
