/**
 * Ventanas de agregación del dashboard gerencial (HU-025).
 *
 * El frontend usa estos valores para gráficos diarios / semanales /
 * mensuales / anuales. `from`/`to` en query pueden sobrescribir el rango.
 */
export enum DashboardPeriod {
  /** Día calendario UTC en curso (o `from`/`to` si se envían). */
  DAILY = 'daily',
  /** Últimos 7 días hasta ahora. */
  WEEKLY = 'weekly',
  /** Mes calendario UTC en curso. */
  MONTHLY = 'monthly',
  /** Año calendario UTC en curso. */
  YEARLY = 'yearly',
}
