# HU-015 — Notificaciones Automáticas por Correo Electrónico (Backend)

## Qué resuelve

Motor centralizado de correo transaccional con historial, reintentos y
preferencias (RN-061…064).

```text
Evento de negocio (registro, pago, estreno, …)
  → EmailService.enqueueAndSend
  → historial email_notifications (RN-061)
  → EmailGatewayService (Adapter / stub log)
  → hasta 3 reintentos (RN-063)

GET  /notifications/email          → historial del usuario (JWT)
POST /notifications/email          → encolar demo / reenvío (JWT)
GET  /notifications/preferences    → leer prefs
PUT|POST /notifications/preferences → actualizar (RN-062)
```

## Disparos automáticos (integrados)

| Evento | Plantilla |
|---|---|
| Registro | `ACCOUNT_ACTIVATION` |
| Activación | `ACCOUNT_ACTIVATED` |
| Forgot / reset password | `PASSWORD_RESET` / `PASSWORD_CHANGED` |
| Perfil actualizado | `PROFILE_UPDATED` |
| Cambio de email | `EMAIL_REVERIFICATION` |
| Pago APPROVED + tickets/factura | `PURCHASE_SUCCESS` (RN-064, enlaces seguros) |
| Pago REJECTED | `PAYMENT_REJECTED` |
| Estreno a cartelera (RN-020) | `UPCOMING_RELEASE` (respeta `emailUpcoming`) |
| Función en ~24 h / ~2 h | `SHOWTIME_REMINDER_24H` / `_2H` (cron cada 5 min) |

Plantillas listas para HU futuras (sin endpoints aún): cambio de función,
transferencia, cancelación, reembolso, Cine Flash, promos, giftcard, beneficios.

## Reglas de negocio

| RN | Comportamiento |
|---|---|
| **RN-061** | Toda salida queda en `email_notifications` |
| **RN-062** | Marketing/upcoming opt-out; transaccionales obligatorios siempre |
| **RN-063** | Hasta 3 intentos; luego `FAILED` + `lastError` |
| **RN-064** | Tras webhook APPROVED se envía compra + links a tickets/factura |

## Adaptador

`EmailGatewayService` (patrón **Adapter**): en desarrollo registra el correo
en el log de Nest. `EMAIL_FORCE_FAIL=true` simula fallos para probar reintentos.

Sustituir el stub por SendGrid/SES/SMTP no requiere tocar Auth/Payments.

## Modelo incremental

```text
EmailNotification (toEmail, template, category, status, attemptCount,
                   payload, relatedEntity*, sentAt)
NotificationPreference (ya HU-006; endpoints dedicados aquí)
```

## Cómo probar

```bash
# Preferencias
curl http://localhost:3000/api/v1/notifications/preferences \
  -H "Authorization: Bearer $TOKEN"

curl -X PUT http://localhost:3000/api/v1/notifications/preferences \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"emailMarketing":false,"emailUpcoming":true}'

# Historial
curl http://localhost:3000/api/v1/notifications/email \
  -H "Authorization: Bearer $TOKEN"

# Demo de envío
curl -X POST http://localhost:3000/api/v1/notifications/email \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"template":"PROFILE_UPDATED"}'
```

Tras un pago APPROVED (HU-013/014) debe aparecer `PURCHASE_SUCCESS` en el historial.

## Fuera de alcance

- Proveedor SMTP real en producción (solo Adapter stub).
- Push notifications.
- Escaneo QR (HU-024) y flujos de reprogramación/transferencia (HU-016/017).
