# =============================================================================
# Dockerfile — imagen de la API NestJS (contenedor `api`)
# =============================================================================
# ¿Qué es?
#   Receta para construir una imagen Docker con Node + el código del backend.
#
# ¿Por qué existe?
#   Para que cualquier persona (o servidor) pueda levantar la misma API sin
#   instalar Node a mano. Cumple RN-001 de HU-001: arrancar con Docker Compose.
#
# Guía detallada: docs/config/Dockerfile.md
# =============================================================================

# Imagen base oficial de Node 22 (LTS) en Alpine (Linux pequeño y liviano).
FROM node:22-alpine

# Directorio de trabajo DENTRO del contenedor. Los siguientes COPY/RUN usan /app.
WORKDIR /app

# Copiamos solo package.json / package-lock.json primero.
# Así Docker cachea la capa de `npm install` si el código cambia pero las deps no.
COPY package*.json ./

# Instala dependencias listadas en package.json.
RUN npm install

# Copia el resto del código fuente al contenedor.
COPY . .

# Documenta (no publica) el puerto que la app usa. La publicación real está
# en docker-compose.yml → ports: "3000:3000".
EXPOSE 3000

# Comando por defecto al iniciar el contenedor.
# start:dev = Nest en modo watch (recarga al cambiar código; ideal en práctica).
CMD ["npm", "run", "start:dev"]
