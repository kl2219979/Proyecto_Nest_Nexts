# HU-024 — Escaneo y Validación de Código QR (Backend)

## Qué resuelve

Los colaboradores validan el ingreso a sala escaneando el QR de la entrada:

```text
POST /tickets/validate { qrPayload }
  → existencia + orden PAID + status VALID
  → status VALID → USED
  → usedAt (RN-103) + validatedByUserId (RN-104)
  → respuesta con película / sala / silla / hora
```

Si el QR ya fue usado → **409** con alerta (`TICKET_ALREADY_USED`).

## Endpoints

Prefijo global: `/api/v1`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/tickets/validate` | JWT (colaborador) | Escaneo en puerta |

Swagger: http://localhost:3000/api/docs → tag **Tickets**

> Roles STAFF formales llegan con el panel admin (**HU-020**).
> Hoy cualquier usuario autenticado puede invocar el endpoint;
> el JWT queda registrado como colaborador del escaneo.

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-102** | Un QR solo una vez (`VALID` → `USED`; update atómico anti carrera) |
| **RN-103** | Se guarda `usedAt` (fecha/hora de ingreso) |
| **RN-104** | Se guarda `validatedByUserId` (colaborador del JWT) |

También se comprueba: existencia del payload, orden `PAID` y que no esté `CANCELLED`.
La respuesta exitosa incluye película, fecha/hora, complejo, sala y silla
para confirmación visual en el dispositivo.

## Modelo incremental

```text
Ticket.validatedByUserId  (uuid nullable)  ← nuevo en HU-024
Ticket.usedAt             (ya existía desde HU-014)
Ticket.status             VALID | USED | CANCELLED
```

## Cómo probar

```bash
# Tras un pago APPROVED (ver HU-013 / HU-014), obtener el qr.payload:
curl http://localhost:3000/api/v1/tickets \
  -H "Authorization: Bearer $BUYER_TOKEN"

# Escanear en puerta (JWT del colaborador):
curl -X POST http://localhost:3000/api/v1/tickets/validate \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"qrPayload":"MCQR-…"}'

# Reintento → 409 TICKET_ALREADY_USED
```
