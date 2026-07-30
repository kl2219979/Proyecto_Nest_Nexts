# PRODUCT BACKLOG — Plataforma Web Multicine

> Documento reordenado por dependencias técnicas y flujo de valor.
> Los IDs originales (`HU-XXX`) se conservan para no romper referencias.

## Por qué se reordenó

- **HU-024**: Sube a Sprint 3: depende de entradas digitales (HU-014).
- **HU-020**: Sube al inicio del Sprint 4: base operativa (películas, funciones, salas).
- **HU-026**: Antes de HU-019: el motor de cupones habilita Cine Flash.
- **HU-019**: Pasa a Sprint 5: depende de promociones (HU-026) y datos de ocupación.
- **HU-021 / HU-022**: Sprint 5: requieren cartelera + auth ya estabilizados.
- **HU-025**: Sprint 5: KPIs después de ventas y operaciones.
- **HU-023**: Queda en Sprint 4 junto a membresía/postcompra, antes de features IA.



## Índice en orden de implementación


| #   | ID     | Historia                                               | Sprint   |
| --- | ------ | ------------------------------------------------------ | -------- |
| 1   | HU-001 | Configuración de la Plataforma Base                    | Sprint 1 |
| 2   | HU-002 | Selección de País, Departamento y Ciudad               | Sprint 1 |
| 3   | HU-003 | Visualización de la Cartelera Semanal                  | Sprint 1 |
| 4   | HU-004 | Consulta del Detalle de una Película                   | Sprint 1 |
| 5   | HU-005 | Visualización de Próximos Estrenos                     | Sprint 1 |
| 6   | HU-006 | Registro de Usuario y Creación de Membresía Digital    | Sprint 2 |
| 7   | HU-007 | Inicio de Sesión y Autenticación Segura                | Sprint 2 |
| 8   | HU-008 | Consulta de Perfil y Beneficios de Membresía           | Sprint 2 |
| 9   | HU-009 | Selección de Función y Formato de Proyección           | Sprint 2 |
| 10  | HU-010 | Selección Interactiva de Sillas                        | Sprint 2 |
| 11  | HU-011 | Administración del Carrito de Compras                  | Sprint 3 |
| 12  | HU-012 | Compra de Productos de Confitería                      | Sprint 3 |
| 13  | HU-013 | Proceso de Pago Seguro                                 | Sprint 3 |
| 14  | HU-014 | Generación de Entradas Digitales y Factura Electrónica | Sprint 3 |
| 15  | HU-015 | Notificaciones Automáticas por Correo Electrónico      | Sprint 3 |
| 16  | HU-024 | Escaneo y Validación de Código QR                      | Sprint 3 |
| 17  | HU-020 | Panel Administrativo del Multicine                     | Sprint 4 |
| 18  | HU-026 | Administración de Promociones y Cupones                | Sprint 4 |
| 19  | HU-016 | Cambio de Función (Reprogramación de Reserva)          | Sprint 4 |
| 20  | HU-017 | Transferencia de Entradas a Otro Usuario               | Sprint 4 |
| 21  | HU-018 | Compra y Envío de Bonos de Regalo Digitales            | Sprint 4 |
| 22  | HU-023 | Programa de Fidelización y Acumulación de Puntos       | Sprint 4 |
| 23  | HU-019 | Cine Flash (Promoción Inteligente Automática)          | Sprint 5 |
| 24  | HU-021 | Chatbot Inteligente para Recomendación de Películas    | Sprint 5 |
| 25  | HU-022 | Motor de Recomendaciones Personalizadas                | Sprint 5 |
| 26  | HU-025 | Dashboard Gerencial de Indicadores (KPIs)              | Sprint 5 |
| 27  | HU-027 | Encuestas de Satisfacción                              | Sprint 5 |
| 28  | HU-028 | PQRS Integrado                                         | Sprint 5 |
| 29  | HU-029 | API Pública para Aplicaciones Externas                 | Sprint 5 |


---



# Sprint 1 — Infraestructura y Consulta de Cartelera



## HU-001 - Configuración de la Plataforma Base

**Épica**

- Arquitectura e Infraestructura

**Sprint**

- Sprint 1

**Prioridad**

- Crítica

**Story Points**

- 8

**Dependencias**

- Ninguna

**Historia de Usuario**

- Como equipo de desarrollo
Quiero disponer de una arquitectura base del proyecto utilizando NodeJS, Express, PostgreSQL y Docker
Para desarrollar todas las funcionalidades del sistema bajo un entorno estandarizado, escalable y fácilmente desplegable.

**Objetivo**
Construir la estructura inicial del backend siguiendo buenas prácticas de arquitectura, desacoplamiento y seguridad, permitiendo que cualquier desarrollador pueda levantar el proyecto mediante Docker Compose.

**Descripción Funcional**
Se debe crear la solución base del proyecto implementando una arquitectura modular que permita el crecimiento de la aplicación sin afectar componentes existentes.
La solución debe estar preparada para soportar múltiples ambientes (Development, QA y Producción).
La aplicación deberá exponer inicialmente un endpoint de salud (Health Check) para validar la disponibilidad del servicio.

- La arquitectura deberá incluir:
- NodeJS LTS
- ExpressJS
- PostgreSQL
- Sequelize ORM
- Docker
- Docker Compose
- Variables de entorno
- Swagger
- Jest
- ESLint
- Prettier
- Helmet
- CORS

**Arquitectura de Carpetas**
src│├── config├── controllers├── services├── repositories├── middlewares├── routes├── models├── migrations├── seeders├── utils├── helpers├── tests├── docs└── app.js

**Flujo**
Levantar Docker↓Inicializar PostgreSQL↓Ejecutar Migraciones↓Levantar API↓Validar Health Check↓Swagger Disponible

**Reglas de Negocio**

- **RN-001**
La aplicación deberá iniciar utilizando únicamente Docker Compose.
- **RN-002**
Toda configuración deberá provenir de variables de entorno.
- **RN-003**
La documentación Swagger deberá generarse automáticamente.
- **RN-004**
Todos los módulos deberán implementar separación Controller → Service → Repository.
- **RN-005**
La aplicación deberá soportar futuras integraciones mediante API REST.

**Endpoints**

- `GET /api/v1/health   environment:`
  `DATABASE_HOST: db`
  `DATABASE_PORT: 5432`
  `DATABASE_USER: ${POSTGRES_USER}`
  `DATABASE_PASSWORD: ${POSTGRES_PASSWORD}`
  `DATABASE_NAME: ${POSTGRES_DB}`
  `PORT: 3000`
  `NODE_ENV: ${NODE_ENV:-development}`

**Criterios de Aceptación**
Docker levanta correctamente todos los servicios.
PostgreSQL inicia automáticamente.
Swagger responde correctamente.
Health Check responde HTTP 200.
Se ejecutan migraciones automáticamente.
Jest configurado.
Logger funcionando.

**Definition of Done**
Código en Git.
Docker funcionando.
Swagger publicado.
Jest configurado.
ESLint aprobado.
Code Review aprobado.

## HU-002 - Selección de País, Departamento y Ciudad

**Épica**

- Cartelera

**Sprint**

- Sprint 1

**Prioridad**

- Alta

**Story Points**

- 13

**Historia de Usuario**

- Como visitante del portal
- Quiero seleccionar el país, departamento y ciudad
Para visualizar únicamente la cartelera disponible en mi ubicación.

**Objetivo**
Permitir que la experiencia del usuario sea personalizada desde el ingreso al portal, mostrando únicamente la información correspondiente al cine más cercano según la ciudad seleccionada.

**Descripción Funcional**
Al ingresar por primera vez al portal, el sistema deberá presentar un asistente de selección geográfica antes de mostrar cualquier cartelera.

- El usuario deberá seleccionar:
- País
- Departamento o Estado
- Ciudad
- Una vez realizada la selección:
La ciudad quedará almacenada en Local Storage.
Se consultarán automáticamente los complejos de cine activos.
Se cargará la cartelera semanal correspondiente.
Todas las consultas posteriores utilizarán la ciudad seleccionada.
El sistema permitirá modificar la ubicación desde el menú principal sin necesidad de cerrar sesión.

**Flujo Funcional**
Ingreso Portal↓Consultar Países↓Seleccionar País↓Consultar Departamentos↓Seleccionar Departamento↓Consultar Ciudades↓Seleccionar Ciudad↓Guardar Preferencia↓Consultar Cartelera

**Reglas de Negocio**

- **RN-006**
La ciudad deberá tener al menos un cine activo.
- **RN-007**
Si no existen funciones activas deberá mostrarse un mensaje informativo.
- **RN-008**
La ciudad permanecerá almacenada durante futuras visitas.
- **RN-009**
El cambio de ciudad actualizará inmediatamente la cartelera.

**Endpoints**

- `GET /countriesGET`
- `GET /cities/{departmentId}POST`

**Validaciones**
País obligatorio.
Departamento obligatorio.
Ciudad obligatoria.
No permitir ciudades inactivas.

**Criterios de Aceptación**
La selección queda almacenada.
La cartelera corresponde únicamente a la ciudad.
El usuario puede cambiar de ciudad.
La información se actualiza automáticamente.

## HU-003 - Visualización de la Cartelera Semanal

**Épica**

- Cartelera

**Sprint**

- Sprint 1

**Prioridad**

- Muy Alta

**Story Points**

- 21

**Historia de Usuario**

- Como visitante
- Quiero visualizar toda la cartelera semanal
Para elegir la mejor película y horario disponible.

**Objetivo**
Presentar una experiencia visual moderna donde el usuario pueda explorar todas las películas disponibles en la ciudad seleccionada.

**Descripción Funcional**
La página principal mostrará la cartelera correspondiente a los próximos siete días.

- Cada tarjeta de película deberá contener:
- Poster oficial
- Nombre
- Género
- Clasificación
- Duración
- Director
- Idioma
- Subtitulada/Doblada
- Formatos disponibles (2D, 3D, IMAX, VIP)
- Horarios disponibles
- Botón "Ver detalle"
- Botón "Comprar"
- Indicador de estreno
- Calificación del público
- Adicionalmente, el usuario podrá filtrar por:
- Fecha
- Género
- Clasificación
- Idioma
- Tipo de sala
- Formato
- Complejo

**Flujo**
Consultar Cartelera↓Consultar Funciones↓Consultar Formatos↓Construir Cartelera↓Mostrar Películas

**Reglas de Negocio**

- **RN-010**
Solo mostrar funciones activas.
- **RN-011**
No mostrar funciones agotadas cuando el usuario aplique el filtro "Disponible".
- **RN-012**
La cartelera siempre mostrará siete días.
- **RN-013**
La información deberá actualizarse automáticamente cuando cambien las funciones.

**Endpoint**

- `GET /moviesGET`
- `GET /movies/todayGET`

**Criterios de Aceptación**
Se visualiza la cartelera semanal.
Los filtros funcionan correctamente.
Se muestran únicamente películas activas.
Se muestran todos los formatos disponibles.

## HU-004 - Consulta del Detalle de una Película

**Épica**

- Películas

**Sprint**

- Sprint 1

**Prioridad**

- Alta

**Story Points**

- 13

**Historia de Usuario**

- Como visitante
- Quiero consultar toda la información de una película
Para decidir si deseo comprar entradas.

**Descripción Funcional**
Al seleccionar una película, el sistema mostrará una página de detalle que incluirá:

- Poster oficial
- Banner
- Trailer oficial embebido desde YouTube
- Sinopsis completa
- Director
- Actores principales
- Géneros
- Duración
- Clasificación
- Fecha de estreno
- Idiomas disponibles
- Formatos (2D, 3D, IMAX, VIP)
- Funciones disponibles
- Valor de la entrada por formato
- Calificación promedio
- Recomendaciones de películas similares
Desde esta vista, el usuario podrá seleccionar directamente una función para iniciar el proceso de compra.

**Endpoints**

- `GET /movies/{id}GET`
- `GET /movies/{id}/recommendations`

**Reglas de Negocio**

- **RN-014**
Solo se mostrarán funciones futuras.
- **RN-015**
Los horarios agotados deberán identificarse visualmente.
- **RN-016**
El tráiler deberá reproducirse sin salir de la plataforma.

**Criterios de Aceptación**
Toda la información de la película se visualiza correctamente.
El tráiler oficial se reproduce.
Las funciones disponibles corresponden a la ciudad seleccionada.
El usuario puede iniciar el proceso de compra desde esta pantalla.

## HU-005 - Visualización de Próximos Estrenos

**Épica**

- Cartelera

**Sprint**

- Sprint 1

**Prioridad**

- Media

**Story Points**

- 8

**Historia de Usuario**

- Como visitante
- Quiero consultar los próximos estrenos
Para conocer las películas que estarán disponibles próximamente y planificar futuras visitas al cine.

**Objetivo**
Incrementar el interés del usuario mostrando los lanzamientos futuros y permitiendo que solicite notificaciones cuando una película llegue a cartelera.

**Descripción Funcional**
La plataforma contará con una sección denominada "Próximamente", donde se mostrarán todas las películas confirmadas para futuros estrenos.

- Cada tarjeta deberá incluir:
Póster oficial.
Título.
Fecha estimada de estreno.
Género.
Clasificación.
Duración (si está disponible).
Tráiler oficial de YouTube.
Sinopsis breve.
Contador regresivo hasta el estreno.
Botón "Notificarme cuando esté disponible".
Si el usuario ha iniciado sesión, podrá activar una notificación que le enviará un correo electrónico el día en que la película ingrese a la cartelera de su ciudad.

**Flujo Funcional**
Ingresar a "Próximamente"↓Consultar películas futuras↓Mostrar listado↓Seleccionar película↓Visualizar detalle↓(Opcional) Activar notificación↓Registrar solicitud de aviso

**Reglas de Negocio**

- **RN-017**
Solo podrán mostrarse películas con estado "Próximo Estreno".
- **RN-018**
Las fechas de estreno podrán variar según la ciudad y el complejo de cine.
- **RN-019**
Un usuario no podrá registrar más de una solicitud de notificación para la misma película.
- **RN-020**
Cuando la película pase a estado "En Cartelera", el sistema enviará automáticamente la notificación a los usuarios registrados.

**Endpoints**

- `GET /movies/upcomingGET`
- `POST /notifications/upcoming`

**Criterios de Aceptación**
Se muestra el listado de próximos estrenos ordenado por fecha.
El usuario puede consultar el detalle de cada película.
El tráiler oficial está disponible desde la plataforma.
Los usuarios autenticados pueden solicitar una notificación de estreno.
El sistema registra correctamente la solicitud de notificación y evita duplicados.

---



# Sprint 2 — Usuarios, Autenticación y Compra de Entradas



## HU-006 - Registro de Usuario y Creación de Membresía Digital

**Épica**

- Gestión de Usuarios

**Sprint**

- Sprint 2

**Prioridad**

- Muy Alta

**Story Points**

- 13

**Dependencias**

- HU-001, HU-002

**Historia de Usuario**

- Como visitante del portal Multicine
- Quiero registrarme mediante un formulario de creación de cuenta
Para realizar compras en línea, administrar mis reservas y acceder automáticamente a los beneficios de la membresía digital.

**Objetivo**
Implementar el proceso de registro de usuarios garantizando la autenticidad de la información, la seguridad de las credenciales y la creación automática de una membresía digital que permita acceder a beneficios y descuentos.

**Descripción Funcional**
La plataforma deberá permitir el registro de nuevos usuarios mediante un formulario seguro. Una vez completado y validado el registro, el sistema creará simultáneamente:
La cuenta del usuario.
Su perfil personal.
Su membresía digital en estado Activa.
Su código único de membresía.
Su historial de compras (vacío).
Su billetera de bonos (vacía).
Sus preferencias de notificaciones.
Posteriormente, se enviará un correo electrónico con un enlace de activación de cuenta.
Mientras la cuenta no sea confirmada, el usuario no podrá realizar compras.

**Información solicitada**

**Información Personal**

- Nombre
- Apellidos
- Tipo de documento
- Número de documento
- Fecha de nacimiento
- Género (Opcional)

**Información de contacto**

- Correo electrónico
- Confirmación de correo
- Celular

**Seguridad**

- Contraseña
- Confirmación de contraseña

**Preferencias**

- Ciudad principal
- Complejo favorito (Opcional)

**Consentimientos**

- Tratamiento de datos personales
- Términos y condiciones
- Aceptación de comunicaciones comerciales (Opcional)

**Flujo Funcional**
Usuario ingresa al formulario↓Completa información↓Validación de datos↓Validación de correo único↓Creación del usuario↓Creación de membresía digital↓Generación de código de membresía↓Envío de correo de activación↓Usuario activa su cuenta↓Cuenta habilitada

**Reglas de Negocio**

- **RN-021**
El correo electrónico deberá ser único.
- **RN-022**
La contraseña deberá tener mínimo 10 caracteres.
- **RN-023**
- La contraseña deberá contener:
- Mayúsculas
- Minúsculas
- Número
- Carácter especial
- **RN-024**
La cuenta permanecerá inactiva hasta confirmar el correo.
- **RN-025**
Todo usuario registrado tendrá automáticamente una membresía digital.
- **RN-026**
El número de membresía será generado automáticamente y será único.

**Seguridad**
Contraseñas cifradas con BCrypt.
Validación CAPTCHA.
Protección contra ataques de fuerza bruta.
Token temporal de activación (24 horas).

**Endpoints**

- `POST /auth/registerPOST`
- `POST /membership/create`

**Criterios de Aceptación**
El usuario se registra correctamente.
Se crea la membresía automáticamente.
Se envía el correo de activación.
No se permiten correos duplicados.
La contraseña cumple la política de seguridad.

## HU-007 - Inicio de Sesión y Autenticación Segura

**Épica**

**Seguridad**

**Sprint**

- Sprint 2

**Prioridad**

- Crítica

**Story Points**

- 13

**Historia de Usuario**

- Como usuario registrado
- Quiero iniciar sesión de forma segura
Para acceder a mis beneficios, compras y reservas.

**Objetivo**
Implementar un sistema de autenticación basado en JWT y Refresh Token que garantice sesiones seguras y controladas.

**Descripción Funcional**
El usuario podrá autenticarse mediante correo electrónico y contraseña. Si las credenciales son válidas, el sistema emitirá:
Access Token (JWT).
Refresh Token.
Información de la membresía.
Beneficios activos.
Datos básicos del perfil.
El sistema deberá detectar intentos fallidos de autenticación y bloquear temporalmente la cuenta cuando sea necesario.

**Flujo Funcional**
Usuario ingresa credenciales↓Validar usuario↓Validar contraseña↓Generar JWT↓Generar Refresh Token↓Consultar membresía↓Consultar beneficios↓Ingresar al portal

**Reglas de Negocio**

- **RN-027**
Máximo cinco intentos fallidos antes de bloquear la cuenta durante 15 minutos.
- **RN-028**
El Access Token tendrá una vigencia de 15 minutos.
- **RN-029**
El Refresh Token tendrá una vigencia de siete días.
- **RN-030**
Cada inicio de sesión invalidará el Refresh Token anterior.
- **RN-031**
Solo usuarios con correo verificado podrán iniciar sesión.

**Seguridad**
JWT firmado.
Refresh Token almacenado en base de datos.
Cifrado BCrypt.
Auditoría de accesos.
Registro de IP y dispositivo.

**Endpoints**

- `POST /auth/loginPOST`
- `POST /auth/logoutPOST`
- `POST /auth/reset-password`

**Criterios de Aceptación**
El usuario inicia sesión correctamente.
Se generan ambos tokens.
Se bloquean intentos maliciosos.
El Refresh Token renueva la sesión sin volver a autenticarse.

## HU-008 - Consulta de Perfil y Beneficios de Membresía

**Épica**

- Membresía Digital

**Sprint**

- Sprint 2

**Prioridad**

- Alta

**Story Points**

- 8

**Historia de Usuario**

- Como usuario autenticado
- Quiero consultar mi perfil y los beneficios asociados a mi membresía
Para conocer los descuentos y ventajas disponibles antes de realizar una compra.

**Descripción Funcional**

- Desde la sección Mi Cuenta, el usuario podrá visualizar:
Información personal.
Fotografía (opcional).
Código QR de membresía.
Nivel de membresía (Bronce, Plata, Oro o Platino).
Descuentos vigentes.
Bonos disponibles.
Historial de compras.
Historial de puntos (si aplica en futuras fases).
Reservas activas.
También podrá actualizar su información personal y preferencias de notificación.

**Reglas de Negocio**

- **RN-032**
Los descuentos se calcularán según el nivel de membresía.
- **RN-033**
El código QR será único e intransferible.
- **RN-034**
La actualización del correo requerirá una nueva validación.

**Endpoints**

- `GET /profilePUT`
- `GET /membershipGET`

**Criterios de Aceptación**
El usuario consulta correctamente su información.
Se muestran los beneficios vigentes.
El QR de membresía es visible.
Los cambios de perfil se guardan correctamente.

## HU-009 - Selección de Función y Formato de Proyección

**Épica**

- Compra de Entradas

**Sprint**

- Sprint 2

**Prioridad**

- Muy Alta

**Story Points**

- 13

**Historia de Usuario**

- Como usuario
- Quiero seleccionar la función que deseo asistir
Para continuar con la compra de entradas.

**Descripción Funcional**

- Desde el detalle de la película, el usuario podrá seleccionar:
Fecha.
Complejo de cine.
Sala.
Hora.
Formato (2D, 3D, IMAX, VIP).
Idioma.
Tipo de audio (doblada o subtitulada).
El sistema actualizará en tiempo real la disponibilidad de sillas y el valor de la entrada según la función seleccionada.

**Reglas de Negocio**

- **RN-035**
No se podrán seleccionar funciones ya iniciadas.
- **RN-036**
Solo se mostrarán funciones activas.
- **RN-037**
El precio podrá variar según el formato, la sala y el horario.
- **RN-038**
Las promociones se recalcularán automáticamente.

**Endpoints**

- `GET /movies/{id}/functionsGET`
- `GET /functions/{id}/prices`

**Criterios de Aceptación**
Se muestran únicamente funciones disponibles.
El usuario puede cambiar de formato sin recargar la página.
El precio se actualiza automáticamente.

## HU-010 - Selección Interactiva de Sillas

**Épica**

- Compra de Entradas

**Sprint**

- Sprint 2

**Prioridad**

- Crítica

**Story Points**

- 21

**Historia de Usuario**

- Como usuario
- Quiero seleccionar las sillas donde deseo ubicarme
Para reservar los puestos antes de realizar el pago.

**Objetivo**
Implementar un mapa gráfico e interactivo de la sala que permita visualizar la disponibilidad de cada silla en tiempo real y evitar conflictos por compras simultáneas.

**Descripción Funcional**
Al seleccionar una función, el sistema mostrará un plano de la sala con la distribución real de las sillas. Cada silla tendrá un estado representado visualmente mediante colores e íconos:
Disponible.
Seleccionada.
Reservada temporalmente.
Vendida.
Inhabilitada.
Preferencial (movilidad reducida).
VIP.
Las sillas seleccionadas quedarán bloqueadas temporalmente durante el proceso de compra para evitar que otro usuario las adquiera.
El usuario podrá seleccionar hasta el número máximo de entradas permitidas por la función (configurable por administración).
El sistema calculará automáticamente el valor total de las entradas seleccionadas y mostrará un resumen antes de continuar al carrito.

**Flujo Funcional**
Seleccionar función↓Consultar distribución de la sala↓Mostrar mapa interactivo↓Seleccionar sillas↓Bloqueo temporal de sillas↓Calcular valor total↓Continuar al carrito

**Reglas de Negocio**

- **RN-039**
Las sillas seleccionadas se bloquearán durante 10 minutos mientras el usuario completa la compra.
- **RN-040**
Si el usuario abandona el proceso o el tiempo expira, las sillas volverán automáticamente al estado Disponible.
- **RN-041**
No se podrán seleccionar sillas vendidas, bloqueadas o reservadas por otro usuario.
- **RN-042**
Las sillas para personas con movilidad reducida solo podrán ser adquiridas bajo las políticas definidas por el cine.
- **RN-043**
La disponibilidad deberá actualizarse en tiempo real para evitar sobreventas.

**Seguridad**
Control de concurrencia para evitar doble venta.
Auditoría de bloqueos y liberaciones.
Validación de disponibilidad antes de confirmar el pago.

**Endpoints**

- `GET /functions/{id}/seatsPOST`
- `DELETE /reservations/release-seatsGET`

**Criterios de Aceptación**
El mapa de la sala refleja el estado real de las sillas.
Las sillas se bloquean correctamente durante el tiempo configurado.
La liberación automática funciona al expirar el tiempo.
No es posible vender una misma silla a dos usuarios.
El resumen de compra se actualiza automáticamente con el total de entradas seleccionadas.

---



# Sprint 3 — Carrito, Pago, Documentos Digitales y Acceso



## HU-011 - Administración del Carrito de Compras

**Épica**

- Compra Online

**Sprint**

- Sprint 3

**Prioridad**

- Crítica

**Story Points**

- 13

**Dependencias**

- HU-009, HU-010

**Historia de Usuario**

- Como usuario autenticado
Quiero visualizar un carrito de compras donde pueda administrar las entradas y productos seleccionados
Para revisar mi compra antes de realizar el pago.

**Objetivo**
Centralizar todos los productos que el usuario desea adquirir (entradas y confitería) en un único carrito que permita modificaciones antes del proceso de pago.

**Descripción Funcional**
Una vez seleccionadas las sillas, el sistema deberá crear automáticamente un carrito de compras temporal.

- El carrito permitirá administrar:
- Entradas
- Película
- Fecha
- Hora
- Sala
- Formato
- Cantidad
- Número de sillas
- Precio unitario
- Descuento aplicado
- Total
- Confitería
- Producto
- Imagen
- Cantidad
- Precio
- Promociones
- Resumen
- Subtotal
- Descuento membresía
- Descuento promociones
- Bonos aplicados
- Impuestos
- Total
El usuario podrá regresar al selector de sillas sin perder la compra.

**Flujo**
Seleccionar sillas↓Crear carrito↓Agregar entradas↓Agregar confitería↓Aplicar descuentos↓Calcular total↓Continuar al pago

**Reglas de Negocio**

- **RN-044**
Solo podrá existir un carrito activo por usuario.
- **RN-045**
Las sillas permanecerán bloqueadas mientras exista un carrito activo.
- **RN-046**
El carrito expirará después de diez minutos sin actividad.
- **RN-047**
Los descuentos de membresía deberán calcularse automáticamente.
- **RN-048**
Las promociones no podrán combinarse si la configuración administrativa lo prohíbe.

**Endpoints**

- `POST /cartGET`
- `PUT /cartDELETE`
- `POST /cart/apply-membershipPOST`

**Validaciones**
No permitir agregar productos agotados.
No permitir modificar sillas ocupadas.
No permitir cantidades negativas.
Validar existencia del carrito.

**Criterios de Aceptación**
Se crea automáticamente el carrito.
Se calcula correctamente el total.
Se aplican descuentos.
Se mantiene la reserva temporal de sillas.
El usuario puede modificar la compra.

## HU-012 - Compra de Productos de Confitería

**Épica**

- Confitería

**Sprint**

- Sprint 3

**Prioridad**

- Alta

**Story Points**

- 8

**Historia de Usuario**

- Como usuario
- Quiero agregar productos de confitería a mi compra
Para reclamarlos junto con mis entradas el día de la función.

**Objetivo**
Permitir la venta anticipada de alimentos y bebidas desde la plataforma digital.

**Descripción Funcional**
Desde el carrito de compras el usuario podrá acceder al catálogo digital de confitería.

- Los productos estarán organizados por categorías:
- Crispetas
- Combos
- Gaseosas
- Dulces
- Chocolates
- Nachos
- Perros calientes
- Hamburguesas
- Café
- Helados
- Cada producto deberá mostrar:
- Imagen
- Nombre
- Descripción
- Precio
- Promoción vigente
- Disponibilidad
El usuario podrá modificar cantidades antes del pago.

**Flujo**
Abrir Confitería↓Consultar Catálogo↓Seleccionar Productos↓Agregar al Carrito↓Actualizar Total

**Reglas de Negocio**

- **RN-049**
No vender productos agotados.
- **RN-050**
Las promociones serán configurables desde administración.
- **RN-051**
Los descuentos de membresía también aplicarán a confitería según la configuración.
- **RN-052**
El inventario se descontará únicamente después del pago exitoso.

**Endpoints**

- `GET /snacksGET`
- `POST /cart/snacksPUT`
- `DELETE /cart/snacks`

**Criterios de Aceptación**
Se visualiza el catálogo.
Los productos se agregan correctamente.
Se actualiza el valor del carrito.
Se respetan promociones y descuentos.

## HU-013 - Proceso de Pago Seguro

**Épica**

- Pagos

**Sprint**

- Sprint 3

**Prioridad**

- Crítica

**Story Points**

- 21

**Historia de Usuario**

- Como usuario
- Quiero realizar el pago de mis entradas y productos de confitería
Para confirmar definitivamente mi compra.

**Objetivo**
Implementar un proceso de pago seguro que permita múltiples medios de pago y garantice la integridad de la información financiera.

**Descripción Funcional**

- El usuario podrá pagar utilizando:
- Tarjeta Crédito
- Tarjeta Débito
- PSE
- Nequi
- Daviplata
- Apple Pay (Futuro)
- Google Pay (Futuro)
- Durante el proceso de pago el sistema deberá:
Validar el carrito.
Validar disponibilidad de sillas.
Calcular descuentos.
Generar la orden.
Enviar la información cifrada a la pasarela.
Esperar confirmación.
Confirmar compra.
- Una vez aprobado el pago:
Cambiar estado de las sillas a Vendidas.
Crear la venta.
Crear las entradas.
Crear la factura.
Descontar inventario.
Registrar auditoría.

**Seguridad**
JWT obligatorio.
Información sensible cifrada mediante AES-256.
Comunicación HTTPS.
Tokenización de medios de pago.
Nunca almacenar información de tarjetas.
Validación de firma digital del proveedor de pagos.

**Reglas de Negocio**

- **RN-053**
No confirmar ventas sin autorización de la pasarela.
- **RN-054**
Si el pago falla deberán liberarse las sillas automáticamente.
- **RN-055**
Toda transacción deberá quedar auditada.
- **RN-056**
No permitir pagos duplicados sobre la misma reserva.

**Endpoints**

- `POST /paymentsGET`
- `POST /payments/webhookPOST`

**Criterios de Aceptación**
Pago aprobado correctamente.
Liberación automática en caso de error.
Registro completo de la venta.
Auditoría almacenada.
Información financiera protegida.

## HU-014 - Generación de Entradas Digitales y Factura Electrónica

**Épica**

- Documentos Digitales

**Sprint**

- Sprint 3

**Prioridad**

- Alta

**Story Points**

- 13

**Historia de Usuario**

- Como usuario
- Quiero recibir mis entradas digitales y comprobante de compra
Para ingresar al cine sin necesidad de imprimir documentos.

**Objetivo**
Generar automáticamente documentos digitales que permitan el ingreso al cine y sirvan como soporte de la compra realizada.

**Descripción Funcional**

- Una vez confirmado el pago, el sistema deberá generar:
Entradas digitales en PDF.
Código QR único por cada entrada.
Factura electrónica o comprobante de compra.
Resumen de productos adquiridos.
Información de la función.
Condiciones de uso.
- Cada entrada deberá incluir:
Código único.
QR.
Película.
Fecha.
Hora.
Complejo.
Sala.
Silla.
Formato.
Tipo de entrada.
Nombre del comprador.

**Reglas de Negocio**

- **RN-057**
Cada entrada tendrá un QR único.
- **RN-058**
Un QR solo podrá utilizarse una vez.
- **RN-059**
El PDF deberá poder descargarse nuevamente desde "Mis Compras".
- **RN-060**
El QR será invalidado automáticamente después del ingreso a la sala.

**Endpoints**

- `GET /ticketsGET`
- `GET /invoice/{id}POST`

**Criterios de Aceptación**
PDF generado correctamente.
QR válido.
Documento disponible para descarga.
Factura asociada a la compra.

## HU-015 - Notificaciones Automáticas por Correo Electrónico

**Épica**

- Notificaciones

**Sprint**

- Sprint 3

**Prioridad**

- Alta

**Story Points**

- 8

**Historia de Usuario**

- Como usuario
Quiero recibir notificaciones automáticas por correo electrónico sobre los eventos importantes relacionados con mi cuenta y mis compras
Para mantenerme informado y contar con evidencia digital de todas mis transacciones.

**Objetivo**
Centralizar el envío de comunicaciones automáticas mediante una plataforma de correo transaccional que garantice la entrega de mensajes oportunos y personalizados.

**Descripción Funcional**
El sistema enviará correos electrónicos automáticos para los siguientes eventos:

- Cuenta
Registro exitoso.
Activación de cuenta.
Recuperación de contraseña.
Cambio de contraseña.
Actualización de perfil.
- Compras
Compra exitosa.
Pago rechazado.
Factura generada.
Entradas digitales.
Recordatorio de la función (24 horas y 2 horas antes).
- Reservas
Cambio de función.
Transferencia de entradas.
Cancelación.
Reembolso (si aplica).
- Marketing
Próximos estrenos.
Cine Flash.
Nuevas promociones.
Bonos de regalo.
Beneficios de membresía.
Cada correo deberá utilizar plantillas HTML corporativas con el branding del Multicine y enlaces seguros para descargar entradas o consultar la compra.

**Reglas de Negocio**

- **RN-061**
Todos los correos deberán registrarse en un historial de notificaciones.
- **RN-062**
Los usuarios podrán administrar sus preferencias para comunicaciones promocionales, sin afectar los correos transaccionales obligatorios.
- **RN-063**
Si el envío falla, el sistema realizará hasta tres reintentos antes de marcar la notificación como fallida.
- **RN-064**
El envío de entradas y facturas deberá realizarse inmediatamente después de la confirmación del pago.

**Endpoints**

- `POST /notifications/emailGET`
- `PUT /notifications/preferencesPOST`

**Criterios de Aceptación**
Los correos transaccionales se envían automáticamente.
Las entradas y facturas llegan adjuntas o mediante enlaces seguros.
El historial de envíos puede ser consultado por el usuario y el administrador.
Se respetan las preferencias de comunicaciones comerciales.
Los fallos de envío quedan registrados para auditoría.

## HU-024 - Escaneo y Validación de Código QR

**Épica**

- Control de Acceso

**Sprint**

- Sprint 3

**Dependencias**

- HU-014

> Reordenada: el escaneo QR solo tiene sentido después de generar entradas digitales.

**Story Points**

- 13

**Historia de Usuario**

- Como colaborador del Multicine
- Quiero escanear el código QR de las entradas
Para validar el ingreso de los asistentes.

**Descripción Funcional**
Los operadores utilizarán una aplicación web o móvil para escanear el código QR.

- El sistema validará:
- Existencia
- Compra pagada
- Función
- Fecha
- Hora
- Sala
- Estado
- Después del ingreso
- La entrada cambiará a
- UTILIZADA
- Si el QR ya fue utilizado
El sistema mostrará alerta.
- Reglas
- **RN-102**
Un QR solo podrá utilizarse una vez.
- **RN-103**
Registrar fecha y hora de ingreso.
- **RN-104**
Registrar colaborador que realizó el escaneo.

**Endpoint**

- `POST /tickets/validate`

---



# Sprint 4 — Administración, Postcompra y Fidelización



## HU-020 - Panel Administrativo del Multicine

**Épica**

- Administración

**Sprint**

- Sprint 4

**Prioridad**

- Crítica

**Story Points**

- 34

**Historia de Usuario**

- Como administrador del Multicine
- Quiero disponer de un panel administrativo integral
Para administrar toda la operación del negocio desde una única plataforma.

**Objetivo**
Centralizar la administración de la operación del cine mediante un BackOffice con control de accesos basado en roles.

**Descripción Funcional**
El sistema deberá ofrecer un panel administrativo con módulos independientes para la gestión completa del negocio.

- Catálogos
- Países
- Departamentos
- Ciudades
- Complejos
- Salas
- Distribución de sillas
- Tipos de sala
- Horarios
- Festivos
- Películas
- Crear
- Editar
- Publicar
- Despublicar
- Programar estrenos
- Asociar tráiler de YouTube
- Configurar formatos
- Configurar idiomas
- Configurar clasificación
- Funciones
- Crear funciones
- Editar funciones
- Cancelar funciones
- Cambiar precios
- Programar promociones
- Configurar Cine Flash
- Confitería
- Productos
- Categorías
- Inventario
- Promociones
- Combos
- Usuarios
- Gestión de usuarios
- Membresías
- Roles
- Permisos
- Bloqueos
- Ventas
- Órdenes
- Pagos
- Facturas
- Reembolsos
- Historial
- Reportes
- Ventas diarias
- Ocupación por sala
- Películas más vendidas
- Confitería
- Bonos
- Membresías
- Cine Flash
- Indicadores KPI

**Seguridad**

- Auditoría
- Logs
- Intentos de acceso
- Administración de sesiones
- Parámetros del sistema
- Reglas
- **RN-087**
Toda operación deberá quedar auditada.
- **RN-088**
Los permisos estarán controlados mediante RBAC (Role Based Access Control).
- **RN-089**
Solo los usuarios autorizados podrán modificar información crítica.
- **RN-090**
Todas las operaciones deberán registrar usuario, fecha, hora, dirección IP y acción realizada.

**Endpoints**

- /api/admin/*
Cada módulo expondrá operaciones CRUD completas documentadas en Swagger y protegidas mediante JWT y autorización por roles.

**Criterios de Aceptación**
Acceso restringido por roles.
Administración completa de todos los módulos.
Auditoría de operaciones.
Reportes disponibles para consulta y exportación.
Interfaz preparada para futuras integraciones con sistemas ERP y CRM.

> Reordenada al inicio del Sprint 4: habilita la operación del catálogo y configuraciones.



## HU-026 - Administración de Promociones y Cupones

**Épica**

- Marketing

**Sprint**

- Sprint 4

**Story Points**

- 13

**Historia de Usuario**

- Como administrador
- Quiero crear promociones y cupones
Para incentivar las ventas.
- Tipos
- 2x1
- 20%
- 30%
- Combo
- Cumpleaños
- Membresía
- Temporadas
- Black Friday
- Cine Flash
- Configuración
- Fechas
- Cantidad máxima
- Ciudad
- Complejo
- Sala
- Película
- Categoría
- Formato
- Reglas
- **RN-105**
Promociones acumulables configurables.
- **RN-106**
Control de vigencia.
- **RN-107**
Cantidad máxima por usuario.

**Endpoints**

- `POST /promotionsPUT`
- `DELETE /promotionsPOST`

> Reordenada: debe implementarse antes de Cine Flash (HU-019).



## HU-016 - Cambio de Función (Reprogramación de Reserva)

**Épica**

- Administración de Reservas

**Sprint**

- Sprint 4

**Prioridad**

- Alta

**Story Points**

- 13

**Dependencias**

- HU-013, HU-014

**Historia de Usuario**

- Como usuario que ha comprado una entrada
- Quiero cambiar la fecha, hora o función de mi reserva
Para poder asistir al cine en otro horario cuando no pueda asistir a la función originalmente seleccionada.

**Objetivo**
Permitir la reprogramación de una reserva sin necesidad de cancelar la compra, conservando el valor pagado y ajustando las diferencias económicas cuando sea necesario.

**Descripción Funcional**
Desde la sección Mis Compras, el usuario podrá seleccionar una compra confirmada y solicitar el cambio de función.
El sistema mostrará todas las funciones disponibles para la misma película.

- El usuario podrá modificar:
- Fecha
- Hora
- Complejo
- Sala
- Formato (2D, 3D, IMAX, VIP)
- Idioma
Posteriormente deberá seleccionar nuevamente las sillas disponibles.
- Si existe diferencia de valor:
Cobrar el excedente.
Generar saldo a favor (si la política del cine lo permite).
- Finalmente el sistema deberá:
Invalidar los QR anteriores.
Generar nuevas entradas.
Enviar nuevo correo.
Registrar auditoría.

**Flujo**
Mis Compras↓Seleccionar Compra↓Solicitar Cambio↓Consultar Funciones↓Seleccionar Nueva Función↓Seleccionar Sillas↓Calcular Diferencia↓Confirmar Cambio↓Generar Nuevos QR↓Enviar Correo

**Reglas de Negocio**

- **RN-065**
Solo podrá realizarse hasta 1 hora antes del inicio de la función.
- **RN-066**
Solo podrá cambiarse por funciones futuras.
- **RN-067**
No podrán cambiarse funciones ya iniciadas.
- **RN-068**
Los QR anteriores deberán quedar invalidados inmediatamente.
- **RN-069**
La nueva compra conservará el número de orden original.
- **RN-070**
Todo cambio deberá quedar auditado.

**Endpoints**

- `GET /reservationsGET`
- `GET /reservations/{id}/available-functionsPUT`
- `POST /tickets/regenerate`

**Validaciones**
Reserva existente.
Función futura.
Disponibilidad de sillas.
Tiempo permitido.

**Criterios de Aceptación**
✔ Cambio realizado correctamente.
✔ Nuevos QR generados.
✔ Correos enviados.
✔ Auditoría registrada.

## HU-017 - Transferencia de Entradas a Otro Usuario

**Épica**

- Administración de Reservas

**Sprint**

- Sprint 4

**Prioridad**

- Alta

**Story Points**

- 13

**Historia de Usuario**

- Como comprador de una entrada
- Quiero transferir mi reserva a otra persona
Para que pueda asistir en mi lugar cuando no pueda hacerlo.

**Objetivo**
Permitir la cesión digital de entradas entre usuarios registrados sin afectar la capacidad de la sala.

**Descripción Funcional**
Desde Mis Compras, el usuario podrá seleccionar una compra y transferir una o varias entradas.

- El sistema solicitará:
Nombre del nuevo asistente.
Correo electrónico.
Documento.
- Si la persona no posee cuenta:
El sistema enviará un correo invitándola a registrarse.
- Después del registro:
Se transferirá la entrada.
Se invalidará el QR anterior.
Se emitirá uno nuevo.

**Flujo**
Mis Compras↓Seleccionar Entradas↓Transferir↓Ingresar Correo↓Validar Usuario↓Generar Nuevo QR↓Enviar Correo↓Actualizar Titular

**Reglas de Negocio**

- **RN-071**
Solo podrá transferirse hasta una hora antes.
- **RN-072**
Cada entrada solo podrá transferirse una vez.
- **RN-073**
El nuevo propietario deberá aceptar la transferencia.
- **RN-074**
Se invalidará automáticamente el QR anterior.
- **RN-075**
La transferencia quedará registrada.

**Endpoints**

- `POST /tickets/transferGET`
- `POST /tickets/transfer/accept`
- Criterios
Transferencia correcta.
Nuevo QR.
Historial actualizado.
Auditoría.



## HU-018 - Compra y Envío de Bonos de Regalo Digitales

**Épica**

- Bonos Digitales

**Sprint**

- Sprint 4

**Prioridad**

- Media

**Story Points**

- 13

**Historia de Usuario**

- Como usuario
- Quiero comprar bonos digitales
Para regalarlos a familiares o amigos.

**Objetivo**
Permitir la venta de bonos digitales con entrega inmediata o programada mediante correo electrónico.

**Descripción Funcional**

- El usuario podrá seleccionar entre diferentes tipos de bono:
- $20.000
- $50.000
- $100.000
- Valor personalizado
- Cada bono podrá incluir:
Mensaje personalizado.
Nombre del destinatario.
Correo.
Fecha de envío.
Diseño temático (Cumpleaños, Navidad, Aniversario, etc.).
- El sistema generará:
Código único.
Código QR.
Fecha de expiración.
Estado.

**Flujo**
Comprar Bono↓Seleccionar Valor↓Ingresar Destinatario↓Escribir Mensaje↓Pagar↓Generar Bono↓Enviar Correo

- Reglas
- **RN-076**
Cada bono tendrá código único.
- **RN-077**
Los bonos podrán utilizarse parcialmente si la configuración lo permite.
- **RN-078**
Los bonos tendrán fecha de expiración configurable.
- **RN-079**
Los bonos podrán utilizarse tanto para entradas como para confitería.

**Endpoints**

- `POST /giftcardsGET`
- `GET /giftcards/{code}POST`
- Criterios
Bono generado.
QR válido.
Correo enviado.
Bono redimible.



## HU-023 - Programa de Fidelización y Acumulación de Puntos

**Épica**

- Membresía

**Sprint**

- Sprint 4

**Story Points**

- 13

**Historia de Usuario**

- Como miembro del programa de fidelización
- Quiero acumular puntos por cada compra
Para redimir beneficios y obtener descuentos exclusivos.

**Descripción Funcional**
Cada compra generará puntos.

- Los puntos dependerán de:
- Valor compra
- Tipo de membresía
- Promociones activas
- Los puntos podrán utilizarse para:
- Entradas
- Confitería
- Bonos
- Niveles
- Bronce
- Plata
- Oro
- Platino
Cada nivel otorgará beneficios diferentes.
- Reglas
- **RN-099**
Los puntos vencerán después de doce meses.
- **RN-100**
No podrán acumularse cuando la compra utilice promociones incompatibles.
- **RN-101**
El cambio de nivel será automático.

**Endpoints**

- `GET /pointsPOST`
- `GET /membership/levels`

---



# Sprint 5 — Inteligencia, Experiencia e Integraciones



## HU-019 - Cine Flash (Promoción Inteligente Automática)

**Épica**

- Promociones

**Sprint**

- Sprint 5

**Dependencias**

- HU-020, HU-026

> Reordenada: requiere panel admin y motor de promociones.

**Prioridad**

- Muy Alta

**Story Points**

- 21

**Historia de Usuario**

- Como administrador del Multicine
- Quiero que el sistema active automáticamente promociones de último minuto
Para incrementar la ocupación de salas con baja venta.

**Objetivo**
Automatizar campañas promocionales sin intervención humana.

**Descripción Funcional**
Un proceso automático se ejecutará cada cinco minutos.
El proceso evaluará todas las funciones próximas a iniciar.

- Cuando falte exactamente una hora para la función:
- El sistema calculará
- Porcentaje Ocupación=Sillas Vendidas/Capacidad Sala
- Si la ocupación es inferior al 60%
- Activará automáticamente
- Cine Flash
La función cambiará visualmente.
- Se mostrará
- 🔥 Cine Flash
- 20% OFF
- Solo por tiempo limitado
El descuento aplicará únicamente a entradas.
Nunca sobre confitería.
El usuario podrá comprar máximo tres entradas.

**Flujo**
Proceso Automático↓Consultar Funciones↓Calcular Ocupación↓Menor 60%↓Activar Promoción↓Actualizar Precio↓Mostrar Banner↓Finalizar al iniciar función

- Reglas
- **RN-080**
Solo una hora antes.
- **RN-081**
Máximo tres entradas.
- **RN-082**
Solo entradas.
- **RN-083**
No acumulable.
- **RN-084**
Finaliza automáticamente.
- **RN-085**
Registrar auditoría.
- **RN-086**
Enviar notificación Push y Email.

**Endpoint**

- `POST /cineflash/processGET`
- `GET /movies/cineflash`
- Criterios
Activación automática.
Descuento correcto.
Máximo tres entradas.
Desactivación automática.



## HU-021 - Chatbot Inteligente para Recomendación de Películas

**Épica**

- Inteligencia Artificial

**Sprint**

- Sprint 5

**Prioridad**

- Muy Alta

**Story Points**

- 21

**Dependencias**

- HU-003, HU-004, HU-006, HU-007

**Historia de Usuario**

- Como visitante o usuario autenticado
- Quiero interactuar con un asistente virtual inteligente
Para recibir recomendaciones de películas según mis gustos, edad, tipo de acompañantes, estado de ánimo y preferencias personales, facilitando la decisión de compra.

**Objetivo**
Implementar un chatbot basado en Inteligencia Artificial Generativa que permita conversar en lenguaje natural y recomiende películas utilizando la cartelera disponible, preferencias del usuario y reglas de negocio del Multicine.

**Descripción Funcional**
El portal contará con un chatbot accesible desde todas las páginas.

- El asistente iniciará la conversación con preguntas como:
- ¿Qué tipo de película deseas ver?
- ¿Vienes con niños?
- ¿Es una salida familiar?
- ¿Es una cita?
- ¿Prefieres acción, comedia, terror, drama o animación?
- ¿Quieres una película corta o larga?
- ¿Prefieres doblada o subtitulada?
- ¿Cuál es tu rango de edad?
- ¿Qué ciudad visitarás?
Con base en las respuestas, el asistente consultará la API de cartelera y recomendará las mejores opciones.
- Cada recomendación mostrará:
- Poster
- Trailer de YouTube
- Sinopsis
- Calificación
- Duración
- Horarios disponibles
- Formatos
- Precio
- Botón Comprar
- Además podrá responder preguntas como:
- ¿Qué películas hay hoy?
- ¿Qué películas son para niños?
- ¿Qué funciones quedan después de las 8 pm?
- ¿Qué promociones existen?
- ¿Qué salas VIP están disponibles?

**Reglas de Negocio**

- **RN-091**
Solo recomendar películas disponibles en la ciudad seleccionada.
- **RN-092**
Priorizar funciones con disponibilidad.
- **RN-093**
No recomendar películas con clasificación superior a la edad indicada.
- **RN-094**
Las respuestas deberán generarse en menos de cinco segundos.
- **RN-095**
El chatbot podrá escalar la conversación a soporte humano cuando no pueda responder.
- Integraciones
- OpenAI
- Amazon Bedrock (opcional)
- API Cartelera
- API Membresías

**Endpoints**

- `POST /ai/chatPOST`
- `POST /ai/history`

**Criterios de Aceptación**
El chatbot comprende lenguaje natural.
Recomienda películas relevantes.
Permite iniciar la compra desde la conversación.
Responde preguntas frecuentes.
Registra el historial de conversaciones.

## HU-022 - Motor de Recomendaciones Personalizadas

**Épica**

- Inteligencia Artificial

**Sprint**

- Sprint 5

**Story Points**

- 13

**Historia de Usuario**

- Como usuario autenticado
- Quiero recibir recomendaciones personalizadas
Para descubrir nuevas películas acordes con mis gustos e historial.

**Descripción Funcional**

- El sistema analizará automáticamente:
Historial de compras.
Géneros favoritos.
Horarios frecuentes.
Complejos preferidos.
Idiomas.
Formatos.
Frecuencia de visitas.
Con esta información generará recomendaciones automáticas.
- Ejemplo
Como normalmente ves películas de acción los viernes en formato IMAX, te recomendamos Misión Imposible 9.
- Reglas
- **RN-096**
Las recomendaciones deberán actualizarse diariamente.
- **RN-097**
Solo utilizar información autorizada por el usuario.
- **RN-098**
No recomendar películas ya vistas recientemente (configurable).

**Endpoints**

- `GET /recommendationsGET`
- `POST /recommendations/preferences`
- Criterios
Recomendaciones personalizadas.
Actualización automática.
Configuración de preferencias.



## HU-025 - Dashboard Gerencial de Indicadores (KPIs)

**Épica**

- Business Intelligence

**Sprint**

- Sprint 5

**Story Points**

- 21

**Historia de Usuario**

- Como gerente del Multicine
- Quiero visualizar indicadores en tiempo real
Para tomar decisiones estratégicas sobre la operación del negocio.
- Indicadores
- Ventas
- Entradas
- Ocupación
- Películas
- Confitería
- Cine Flash
- Bonos
- Membresías
- Usuarios activos
- Conversión
- Cancelaciones
- Transferencias
- Ingresos
- Top películas
- Top ciudades
- Top complejos
- Dashboard
- Gráficos
- Filtros
- Exportar PDF
- Exportar Excel
- Comparativos
- Indicadores diarios
- Semanales
- Mensuales
- Anuales

**Endpoint**

- `GET /dashboard`



## HU-027 - Encuestas de Satisfacción

**Épica**

- Experiencia del Cliente

**Sprint**

- Sprint 5

**Story Points**

- 8

**Historia de Usuario**

- Como usuario
- Quiero responder una encuesta
Para calificar mi experiencia.
- Encuesta
- Calificación película
- Sala
- Sonido
- Imagen
- Comodidad
- Confitería
- Limpieza
- Servicio
- Probabilidad de recomendar
- Comentarios
- Reglas
- **RN-108**
Solo usuarios que asistieron.
- **RN-109**
Una encuesta por compra.

**Endpoint**

- `POST /surveys`



## HU-028 - PQRS Integrado

**Épica**

- Servicio al Cliente

**Sprint**

- Sprint 5

**Story Points**

- 13

**Historia de Usuario**

- Como cliente
- Quiero registrar una PQRS
Para reportar inconvenientes o realizar solicitudes.
- Categorías
- Petición
- Queja
- Reclamo
- Sugerencia
- Felicitación
- Funcionalidades
- Adjuntar archivos
- Seguimiento
- Estados
- Comentarios
- Notificaciones
- Historial
- Reglas
- **RN-110**
Número consecutivo automático.
- **RN-111**
SLA configurable.
- **RN-112**
Notificaciones automáticas.

**Endpoint**

- `POST /pqrsGET`
- `PUT /pqrs`



## HU-029 - API Pública para Aplicaciones Externas

**Épica**

- Integraciones

**Sprint**

- Sprint 5

**Story Points**

- 21

**Historia de Usuario**

- Como desarrollador externo autorizado
- Quiero consumir una API pública
Para integrar aplicaciones móviles, kioscos de autoservicio y sistemas de terceros con la plataforma del Multicine.

**Objetivo**
Exponer un conjunto de APIs seguras y documentadas que permitan consultar información pública y ejecutar operaciones autorizadas desde clientes externos, garantizando la escalabilidad y la interoperabilidad del ecosistema digital.

**Descripción Funcional**
La plataforma deberá ofrecer una API pública versionada (/api/v1) protegida mediante OAuth 2.0 o API Keys (según el tipo de consumidor), con documentación completa en Swagger/OpenAPI.

- La API deberá permitir:
- Consulta de Información
Países, departamentos y ciudades.
Complejos de cine.
Salas.
Cartelera.
Próximos estrenos.
Detalle de películas.
Funciones disponibles.
Formatos e idiomas.
- Operaciones
Registro de usuarios.
Inicio de sesión.
Consulta de perfil.
Compra de entradas.
Compra de confitería.
Consulta de reservas.
Validación de bonos.
Consulta de membresía.
Consulta de promociones.
Consulta de Cine Flash.
- Integraciones Futuras
Aplicación móvil Android.
Aplicación móvil iOS.
Kioscos de autoservicio.
Tótems de consulta.
Integración con ERP.
Integración con CRM.
Integración con plataformas de marketing.

**Reglas de Negocio**

- **RN-113**
Toda la API deberá estar versionada para garantizar compatibilidad hacia atrás.
- **RN-114**
Cada consumidor externo contará con credenciales individuales y límites de consumo configurables.
- **RN-115**
Las operaciones de escritura requerirán autenticación y autorización válidas.
- **RN-116**
Se implementará limitación de tasa (Rate Limiting) para prevenir abuso del servicio.
- **RN-117**
Todas las solicitudes y respuestas deberán registrarse para fines de auditoría y monitoreo.
- **RN-118**
La documentación Swagger deberá mantenerse sincronizada con la implementación de la API.

**Seguridad**
HTTPS obligatorio.
JWT para usuarios finales.
OAuth 2.0 o API Keys para clientes externos.
Rate Limiting.
CORS configurable.
Registro de auditoría.
Versionado de API.

- Endpoints Base
- `GET    /api/v1/moviesGET`
- `GET    /api/v1/functionsGET`
- `POST   /api/v1/auth/loginPOST`
- `GET    /api/v1/profilePOST`
- `GET    /api/v1/orders/{id}GET`
- `GET    /api/v1/membership`

**Criterios de Aceptación**
La API pública está completamente documentada en Swagger.
Las aplicaciones externas pueden autenticarse y consumir los servicios autorizados.
Se respetan los límites de consumo configurados.
La API es compatible con futuras aplicaciones móviles y kioscos.
Se garantiza la trazabilidad y auditoría de todas las operaciones.