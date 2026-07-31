# HU-021 — Chatbot Inteligente para Recomendación de Películas

## Qué resuelve

Asistente conversacional (visitante o JWT) que recomienda películas
**solo desde la cartelera real** de la ciudad, aplicando reglas de
negocio Multicine:

```text
POST /ai/chat
  → sesión + mensaje USER
  → cartelera cityId (RN-091) · cupo (RN-092) · edad (RN-093)
  → OpenAiGateway (Adapter stub / OpenAI opcional)
  → tarjetas (poster, trailer, sinopsis, horarios, precio, buyPath)
  → historial · escalado humano (RN-095) · latencyMs (RN-094)

POST /ai/history
  → mensajes de la sesión
```

## Endpoints

Prefijo global: `/api/v1`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/ai/chat` | JWT opcional | Turno de conversación |
| `POST` | `/ai/history` | JWT opcional | Historial de una sesión |

Swagger: tag **AI Chat**.

### Body `POST /ai/chat`

```json
{
  "sessionId": "opcional-uuid",
  "message": "¿Qué películas son para niños?",
  "cityId": "uuid-obligatorio",
  "age": 10,
  "preferences": {
    "genre": "comedia",
    "withKids": true,
    "companionType": "family",
    "durationPreference": "short",
    "audioType": "DUBBED"
  }
}
```

### Respuesta (resumen)

- `reply` — texto del asistente
- `recommendations[]` — tarjetas con `posterUrl`, `trailerUrl`, `synopsis`,
  `rating`, `durationMinutes`, `formats`, `priceFrom`, `showtimes`, `buyPath`
- `escalated` — RN-095
- `latencyMs` — objetivo &lt; 5000 (RN-094)
- `suggestedFollowUps` — pistas para el widget

## Reglas

| RN | Comportamiento |
|---|---|
| **RN-091** | Solo películas con funciones en `cityId` |
| **RN-092** | Prioriza / exige funciones con cupo (`available`) |
| **RN-093** | No recomienda clasificación superior a `age` (T/7+/12+/15+/18+) |
| **RN-094** | Mide `latencyMs`; stub local &lt; 5 s |
| **RN-095** | Intención ESCALATE o pedido explícito → `escalated=true` |

## FAQ cubiertas

- ¿Qué películas hay hoy?
- ¿Qué películas son para niños?
- ¿Qué funciones quedan después de las 8 pm?
- ¿Qué promociones existen? → `PromotionsService.listActivePublic`
- ¿Qué salas VIP están disponibles?
- Membresía / beneficios → `MembershipService` (si hay JWT)

## Modelo

```text
chat_sessions   (userId?, cityId, age?, preferences jsonb, escalated)
chat_messages   (sessionId, role, content, intent?, recommendations jsonb?)
```

## Adaptador

`OpenAiGatewayService` (**Adapter**): stub determinista por palabras clave.
Con `OPENAI_API_KEY` queda listo para sustituir por Completions reales
sin tocar `AiService`. Bedrock = misma idea de sustitución.

## Cómo probar

1. Obtén un `cityId` de seed (Medellín/Bogotá).
2. `POST /api/v1/ai/chat` con mensaje “¿Qué hay hoy para niños?” + `age: 10`.
3. Verifica `recommendations` solo con clasificación ≤ edad.
4. `POST /api/v1/ai/history` con el `sessionId` devuelto.
5. Mensaje “quiero hablar con un humano” → `escalated: true`.

## Fuera de alcance

| Tema | HU |
|---|---|
| Motor de recomendaciones por historial de compras | HU-022 |
| UI del widget / embed YouTube | Frontend |
| OpenAI/Bedrock productivos | Stub + env opcional |
