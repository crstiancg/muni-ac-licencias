# Despliegue en Dokploy

Producción usa **Postgres**; en local seguimos con MySQL. El código es
compatible con ambos (búsquedas con `whereLike`, numeración correlativa con
bloqueo según el motor), pero **los tests corren en SQLite**: antes de cada
salida a producción importante, corré la suite contra Postgres (ver al final).

## Piezas

| Archivo | Para qué |
| --- | --- |
| `Dockerfile` | Imagen de producción: PHP 8.4 (nginx + php-fpm, puerto 8080), assets compilados. |
| `docker-compose.prod.yml` | Servicio `app` (web) y `scheduler` (`licenses:expire` a las 00:10). |
| `docker/pgloader/` | Copia de los datos de MySQL local a Postgres. |

## Variables (pestaña *Environment* de Dokploy)

Nunca las commitees. Además de estas, copiá de tu `.env` local las que
personalicen el sistema (`LICENCIAS_*`, correo).

```dotenv
APP_NAME="Licencias MPP"
APP_ENV=production
APP_KEY=                  # php artisan key:generate --show (una sola vez)
APP_DEBUG=false
APP_URL=https://<dominio>
APP_LOCALE=es
APP_FALLBACK_LOCALE=es

LOG_CHANNEL=stderr
LOG_LEVEL=warning

DB_CONNECTION=pgsql
DB_HOST=                  # host interno del Postgres de Dokploy
DB_PORT=5432
DB_DATABASE=
DB_USERNAME=
DB_PASSWORD=

SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
CACHE_STORE=database
QUEUE_CONNECTION=sync     # hoy no se encola nada: sin worker
INERTIA_SSR_ENABLED=false

LICENCIAS_VERIFICATION_URL=   # URL pública de los QR; vacío = APP_URL

APIS_NET_TOKEN=           # consulta RENIEC/SUNAT al registrar contribuyentes
```

No hacen falta en producción: `LEGACY_DB_*` (importadores del sistema
anterior) ni `SESSION_DOMAIN`.

`APP_KEY` no se cambia nunca más: cifra los secretos de la verificación en
dos pasos y las sesiones.

## Primera salida

1. **Postgres**: en Dokploy, crear un servicio de base de datos Postgres
   (16 o superior). Anotar host interno, usuario, contraseña y base.
2. **Aplicación**: crear un servicio *Docker Compose* desde este repositorio,
   archivo `docker-compose.prod.yml`.
3. **Variables**: cargar en *Environment* las de la sección anterior, con
   los `DB_*` del servicio Postgres del paso 1.
4. **Dominio**: en *Domains*, servicio `app`, puerto `8080`, HTTPS activado.
5. **Deploy**. El primer arranque crea el esquema (`migrate --force`).
   Verificar `https://<dominio>/up` → 200.
6. **Primer acceso**: en Dokploy, abrir la terminal del contenedor `app` y
   correr:
   ```bash
   php artisan db:seed --force        # roles y permisos (no crea usuarios)
   php artisan app:create-admin       # pide nombre, correo y contraseña
   ```
   La contraseña se escribe oculta y en producción exige 12 caracteres con
   mayúsculas, minúsculas, números y símbolos. El resto del personal se crea
   desde la pantalla Usuarios.
7. **Datos** (una sola vez, con la app ya desplegada). Ojo: pgloader vacía
   las tablas y copia las de tu MySQL, **incluidos los usuarios**: el
   administrador creado en el paso 6 se reemplaza por los locales, y entre
   ellos viaja el usuario de desarrollo `password@gmail.com` con contraseña
   `password`. Después de copiar, desactivalo o borralo y volvé a correr
   `php artisan app:create-admin` si hace falta.
   ```bash
   cd docker/pgloader
   cp mysql-to-postgres.load.example mysql-to-postgres.load   # completar URLs
   docker run --rm -v "$PWD":/work dimitri/pgloader:latest \
       pgloader /work/mysql-to-postgres.load
   ```
   Postgres tiene que ser alcanzable desde tu máquina: exponer el puerto
   temporalmente en Dokploy o usar un túnel SSH, y cerrarlo al terminar.
8. **Verificar** que los conteos coinciden (licencias, trámites,
   contribuyentes, usuarios) y entrar con un usuario real.

## Si el dominio responde 502 Bad Gateway

Traefik no llega al contenedor. En orden de probabilidad:

1. **Puerto del dominio**: en *Domains* tiene que ser `8080` (la imagen no
   escucha en 80).
2. **El contenedor se reinicia**: mirar *Logs* del servicio `app`.
   - `could not connect to server` / `SQLSTATE[08006]`: `DB_HOST` mal (usar
     el host interno del Postgres de Dokploy) o credenciales.
   - `No application encryption key`: falta `APP_KEY`.
   - Error en una migración: copiar el mensaje completo.
3. **Todavía construye**: el primer build tarda varios minutos (Composer,
   npm y Vite).

## Deploys siguientes

Push a la rama configurada → Dokploy reconstruye. Las migraciones nuevas
corren solas al arrancar el contenedor `app`.

## Probar contra Postgres en local

```bash
docker run --rm -d --name pg-test -e POSTGRES_PASSWORD=secret \
    -e POSTGRES_DB=testing -p 54329:5432 postgres:17
DB_CONNECTION=pgsql DB_HOST=127.0.0.1 DB_PORT=54329 DB_DATABASE=testing \
    DB_USERNAME=postgres DB_PASSWORD=secret php artisan test
docker rm -f pg-test
```
