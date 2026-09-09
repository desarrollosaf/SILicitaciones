# Control de Licitaciones y Resguardos

Migración de la aplicación de archivo único (HTML + localStorage) a una arquitectura de tres capas:

- `frontend/backend/` — API REST con **NestJS 10**, **TypeORM** y **MySQL 8**.
- `frontend/` — SPA con **Angular 17** (componentes standalone y signals).
- `docker-compose.yml` — MySQL 8, API y frontend listos para desarrollo (hot reload).
- `docker-compose.prod.yml` — build de producción (frontend con Nginx, backend compilado).

## Puesta en marcha (sin Docker)

```bash
# 1. Base de datos (o levanta el servicio mysql del docker-compose.yml)
docker compose up -d mysql

# 2. API
cd frontend/backend
cp .env.example .env
npm install
npm run seed       # crea el esquema y carga los datos iniciales
npm run start:dev  # http://localhost:3000/api

# 3. Aplicación web
cd ../frontend
npm install
npm start          # http://localhost:4200
```

El frontend hace proxy de `/api` hacia el backend (ver `frontend/proxy.conf.js`, que usa `BACKEND_HOST`/`BACKEND_PORT` o `localhost:3000` por defecto).

## Puesta en marcha con Docker (desarrollo)

```bash
cp frontend/backend/.env.example frontend/backend/.env
docker compose up -d
docker compose exec backend npm run seed   # solo la primera vez
```

Esto levanta MySQL, el backend (`npm run start:dev` con recarga en caliente) y el frontend (`ng serve` con polling) en un solo comando, igual que en SIPresupuesto:

- Frontend: http://localhost:4220
- API: http://localhost:3065/api
- MySQL: localhost:3306

## Despliegue a producción con Docker

```bash
cp frontend/backend/.env.example frontend/backend/.env   # completa credenciales reales
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend npm run seed   # solo la primera vez
```

- Frontend (Nginx + build de Angular): http://localhost:8094
- API (Node compilado): http://localhost:3044/api

`DB_SYNC` debe quedar en `false` en el `.env` de producción; `DB_HOST` debe apuntar a `host.docker.internal` (MySQL en la misma máquina) o a la IP/nombre del servidor de base de datos.

El Nginx del frontend solo sirve el build estático de Angular, igual que en SIPresupuesto: no reenvía `/api`. En el servidor de producción hace falta un reverse proxy (IIS, Nginx, etc.) que sirva el sitio y reenvíe `/api` al puerto del backend (3044), tal como ya se hace para SIPresupuesto.

## Lógica de negocio migrada

Toda la lógica vive ahora en el backend, que es la única fuente de verdad:

- Periodos anuales; al cerrarse bloquean la captura de sus registros.
- Cadena dictamen → procedimiento → partida → memorándum de salida.
- Fecha compromiso calculada con días hábiles o naturales y calendario de asueto.
- Existencias por partida: cantidad comprometida y disponible, derivadas de los memorándums vigentes.
- Reglas de borrado: no se elimina nada que tenga bienes comprometidos.
- Alertas operativas y semáforo de entrega.
- Importación CSV de licitaciones, partidas y resguardatarios, aceptando fechas `AAAA-MM-DD`, `DD/MM/AAAA` y seriales de Excel.

## Diferencias respecto al archivo único

- Los datos viven en MySQL; varias personas pueden trabajar al mismo tiempo.
- Los folios se generan en el servidor dentro de una transacción, así que ya no se duplican.
- Los adjuntos siguen guardando solo el nombre. Para almacenarlos falta un módulo de archivos (disco o S3).
- El padrón institucional en Excel y el catálogo de unidades administrativas quedaron pendientes; el punto de entrada para cargarlos está en `backend/src/database/seed.ts`.
