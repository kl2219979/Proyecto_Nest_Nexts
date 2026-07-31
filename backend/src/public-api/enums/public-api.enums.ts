/**
 * Scopes de la API pública para terceros (HU-029 / RN-114 / RN-115).
 *
 * Cada `ApiClient` declara un subconjunto; el guard rechaza
 * operaciones fuera de ese alcance.
 */
export enum ApiClientScope {
  /** Cartelera, geo, complejos, salas, funciones, promos, Cine Flash. */
  CATALOG_READ = 'catalog:read',
  /** Registro e inicio de sesión de usuarios finales. */
  AUTH_WRITE = 'auth:write',
  /** Perfil y membresía del usuario (requiere JWT de usuario). */
  USERS_READ = 'users:read',
  /** Consulta de órdenes / reservas del usuario. */
  ORDERS_READ = 'orders:read',
  /** Consulta/validación de bonos de regalo. */
  GIFTCARDS_READ = 'giftcards:read',
}

/** Todos los scopes disponibles (alta de cliente con acceso completo). */
export const ALL_API_CLIENT_SCOPES: ApiClientScope[] = Object.values(
  ApiClientScope,
);
