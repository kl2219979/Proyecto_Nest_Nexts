# HU-019 — Cine Flash (Promoción Inteligente Automática)

## Qué resuelve

Proceso automático (~cada 5 min) que activa un **20% OFF** en funciones
con baja ocupación una hora antes del inicio, para llenar salas:

```text
Cron / POST /cineflash/process
  → Funciones a ~1 h · ocupación < 60%
  → Promotion type=CINE_FLASH (scope showtimeId)
  → maxSeatsPerOrder = 3 · auditoría · email + push stub
  → GET /movies/cineflash · precios / carrito auto
  → Apaga al iniciar función o sala llena
```

## Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/v1/cineflash/process` | JWT ADMIN+ | Ejecuta una pasada (igual al cron) |
| `GET` | `/api/v1/movies/cineflash?cityId=` | Público | Funciones con flash activo |

Swagger: tags **Cine Flash** y **Movies**.

## Reglas

| RN | Comportamiento |
|---|---|
| **RN-080** | Solo ~1 h antes (`±15 min` por cadence del cron) |
| **RN-081** | Máximo 3 entradas (`maxSeatsPerOrder` temporal) |
| **RN-082** | Solo entradas (`appliesToSnacks=false`) |
| **RN-083** | No acumulable (`stackable=false`) |
| **RN-084** | Apaga al iniciar o al llenar la sala |
| **RN-085** | Tabla `cineflash_audits` |
| **RN-086** | Email marketing (`CINE_FLASH`) + push stub en log |

## Integraciones

- **Precios:** `GET /functions/:id/prices` lista la promo automática (HU-026 / RN-038).
- **Carrito:** auto-aplica código `FLASH-*` si no hay otro cupón manual.
- **Promos:** reutiliza entidad `Promotion` + scope nuevo `showtimeId`.

## Modelo

```text
promotions.showtimeId          (nullable, HU-019)
cineflash_audits               (ACTIVATED / DEACTIVATED + ocupación)
```

## Cómo probar

1. Ajusta una función demo a `startsAt ≈ now + 1h` con `soldSeats / capacity < 0.6`.
2. Login admin → `POST /api/v1/cineflash/process`.
3. `GET /api/v1/movies/cineflash` → ver badge / precio flash.
4. Bloquear ≤3 sillas y crear carrito → promo `FLASH-*` automática.
5. Llenar sala o pasar `startsAt` → otra pasada apaga el flash.

## Fuera de alcance

| Tema | HU |
|---|---|
| Push real (FCM/APNs) | Stub en esta HU |
| KPI gerencial | HU-025 |
| Chatbot / recomendaciones IA | HU-021 / HU-022 |
