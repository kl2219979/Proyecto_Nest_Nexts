import { SnackCategory } from '../enums/snack.enums';

/**
 * Producto en el catálogo de confitería.
 */
export type SnackCatalogItem = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: SnackCategory;
  categoryLabel: string;
  price: number;
  currency: 'COP';
  stock: number;
  /** RN-049: false si stock = 0. */
  available: boolean;
  /** Promo de producto (RN-050 stub). */
  promotion: {
    label: string | null;
    percent: number;
  };
  /** Precio tras promo de producto (antes de membresía). */
  priceAfterPromo: number;
  cinemaId: string | null;
};

/**
 * Respuesta de `GET /snacks` agrupada por categoría.
 */
export type SnacksCatalogResponse = {
  currency: 'COP';
  cinemaId: string | null;
  /** Pickup sugerido cuando hay carrito / cine filtrado. */
  pickupHint: string;
  categories: Array<{
    category: SnackCategory;
    label: string;
    items: SnackCatalogItem[];
  }>;
  totalItems: number;
};
