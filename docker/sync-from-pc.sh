#!/usr/bin/env bash
# Runs legacy:sync from your PC into production, for when the server cannot
# reach the old system's MySQL. Run it in Git Bash on your PC, never inside
# the Dokploy container.
#
# Before running:
#   1. Dokploy > Postgres service > External Port (e.g. 5433) > Save.
#   2. In another Git Bash, keep this tunnel open (asks the SSH password):
#        ssh -N -L 3307:127.0.0.1:3306 licencias@192.168.100.3
#
# Afterwards close the tunnel (Ctrl+C) and remove the External Port.
# Nothing is written to disk: values are asked each time.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "== Postgres de producción (datos del servicio Postgres en Dokploy) =="
read -rp "IP del servidor Dokploy: " PG_HOST
read -rp "Puerto externo de Postgres [5433]: " PG_PORT
PG_PORT=${PG_PORT:-5433}
read -rp "Nombre de la base: " PG_DB
read -rp "Usuario: " PG_USER
read -rsp "Contraseña (no se muestra): " PG_PASS
echo

echo
echo "== Sistema anterior (por el túnel en 127.0.0.1:3307) =="
read -rp "Usuario MySQL [root]: " MY_USER
MY_USER=${MY_USER:-root}
read -rsp "Contraseña MySQL (no se muestra): " MY_PASS
echo

export DB_CONNECTION=pgsql DB_HOST="$PG_HOST" DB_PORT="$PG_PORT" \
    DB_DATABASE="$PG_DB" DB_USERNAME="$PG_USER" DB_PASSWORD="$PG_PASS" \
    LEGACY_DB_HOST=127.0.0.1 LEGACY_DB_PORT=3307 LEGACY_DB_DATABASE=dblicencias \
    LEGACY_DB_USERNAME="$MY_USER" LEGACY_DB_PASSWORD="$MY_PASS"

# A cached config would ignore these variables and write to the local DB.
php artisan config:clear >/dev/null

echo
echo "Probando conexiones..."
php artisan tinker --execute="DB::connection('legacy')->getPdo(); echo '  Sistema anterior: OK'.PHP_EOL;" \
    || { echo "  No conecta al sistema anterior: ¿está abierto el túnel en otra terminal?"; exit 1; }
php artisan tinker --execute="echo '  Producción: OK ('.DB::connection()->getDriverName().', '.App\Models\License::count().' licencias hoy)'.PHP_EOL;" \
    || { echo "  No conecta a Postgres: revisa el External Port y los datos."; exit 1; }

echo
read -rp "¿Importar en ${PG_HOST}:${PG_PORT}/${PG_DB}? (s/N) " OK
[ "$OK" = "s" ] || [ "$OK" = "S" ] || { echo "Cancelado."; exit 0; }

php artisan legacy:sync
