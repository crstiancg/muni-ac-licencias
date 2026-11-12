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
| `php artisan legacy:sync` | Trae los datos del sistema anterior (`dblicencias`); se puede repetir. |

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

# Sistema anterior, para legacy:sync (ver "Conexión al sistema anterior")
LEGACY_SSH_HOST=192.168.100.3
LEGACY_SSH_USER=licencias
LEGACY_SSH_PRIVATE_KEY_B64=   # llave privada en base64, una línea
LEGACY_SSH_KNOWN_HOSTS=       # opcional: fija la llave del servidor
LEGACY_DB_DATABASE=dblicencias
LEGACY_DB_USERNAME=licencias_lectura
LEGACY_DB_PASSWORD=
```

`LEGACY_DB_HOST` y `LEGACY_DB_PORT` no se cargan: el compose apunta la app
al túnel (`legacy-tunnel:3306`).

No hace falta `SESSION_DOMAIN`.

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
7. **Datos del sistema anterior**: en la terminal del contenedor `app`:
   ```bash
   php artisan legacy:sync
   ```
   Importa en orden tipos de trámite, contribuyentes, establecimientos,
   trámites y licencias, y mercados. Si un paso falla, se detiene ahí.
8. **Verificar** los conteos contra el sistema anterior y entrar con un
   usuario real.

## Sincronizar con el sistema anterior

Mientras los dos sistemas convivan, `php artisan legacy:sync` se corre las
veces que haga falta (por ejemplo, cada mañana o el día del corte):

- Cada importador reconoce lo ya traído por su id del sistema anterior:
  **solo entra lo nuevo** y nunca se duplica.
- **Nunca pisa** lo trabajado en este sistema (confirmaciones, cambios de
  estado, ediciones).
- Limitación: si en el sistema anterior **modifican** un registro ya
  importado, ese cambio no se trae.
- Si se corta a mitad, se vuelve a correr y continúa sin duplicar.

## Conexión al sistema anterior

El MySQL de `192.168.100.3` solo escucha en `127.0.0.1` de ese servidor;
se llega por SSH, como hace HeidiSQL. El servicio `legacy-tunnel` hace lo
mismo: entra por SSH como `licencias` y ofrece el MySQL a la app solo
dentro de la red interna del compose. No se toca el servidor anterior.

1. **Llave SSH** (en tu PC, con Git Bash). No uses la contraseña de
   `licencias`:
   ```bash
   ssh-keygen -t ed25519 -f dokploy_legacy -N "" -C dokploy-legacy-tunnel
   ```
   Si el servidor es muy antiguo y rechaza `ed25519`, usar
   `-t rsa -b 4096`.
2. **Autorizarla** en el servidor anterior (te pide la contraseña de
   `licencias` una vez):
   ```bash
   cat dokploy_legacy.pub | ssh licencias@192.168.100.3 \
     'mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
   ```
3. **Cargarla en Dokploy**: `base64 -w0 dokploy_legacy` y pegar el
   resultado en `LEGACY_SSH_PRIVATE_KEY_B64`. Después borrar
   `dokploy_legacy` de tu PC: la llave solo vive en Dokploy.
4. **Opcional, recomendado**: fijar la llave del servidor para que nadie
   pueda hacerse pasar por él. Desde el servidor de Dokploy,
   `ssh-keyscan -t ed25519 192.168.100.3` y pegar esa línea en
   `LEGACY_SSH_KNOWN_HOSTS`.
5. **Usuario de solo lectura** en MySQL, desde HeidiSQL con la sesión
   `root` (la app no debe leer como root). Por el túnel, MySQL ve las
   conexiones como locales:
   ```sql
   CREATE USER 'licencias_lectura'@'127.0.0.1' IDENTIFIED BY '<contraseña>';
   GRANT SELECT ON dblicencias.* TO 'licencias_lectura'@'127.0.0.1';
   CREATE USER 'licencias_lectura'@'localhost' IDENTIFIED BY '<contraseña>';
   GRANT SELECT ON dblicencias.* TO 'licencias_lectura'@'localhost';
   ```
6. **Deploy** y revisar los logs de `legacy-tunnel`: tiene que mostrar
   `legacy-tunnel: licencias@192.168.100.3 -> 127.0.0.1:3306` sin errores.
7. **Probar** desde la terminal del contenedor `app`:
   ```bash
   php artisan tinker --execute="DB::connection('legacy')->getPdo(); echo 'OK';"
   ```
   - `Connection refused`: el túnel no está arriba (ver sus logs).
   - `Access denied`: usuario, contraseña o host del `GRANT`.

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
