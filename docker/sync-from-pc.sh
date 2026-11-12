#!/usr/bin/env bash
# Runs legacy:sync from your PC into production, for when the server cannot
# reach the old system's MySQL. Run it in Git Bash on your PC, never inside
# the Dokploy container.
#
# Before running:
#   1. Dokploy > Postgres service > External Port (e.g. 5433) > Save.
#   2. The old data, either:
#      a. a backup of dblicencias restored in your local MySQL (Laragon), or
#      b. in another Git Bash, this tunnel open (asks the SSH password):
#           ssh -N -L 3307:127.0.0.1:3306 licencias@192.168.100.3
#
# Afterwards close the tunnel (Ctrl+C) and remove the External Port.
# Nothing is written to disk: values are asked each time.
set -euo pipefail

cd "$(dirname "$0")/.."

# From PowerShell, "bash" may be WSL (Linux): it cannot see Laragon's PHP and
# its exported variables would not reach a Windows php.exe.
if grep -qi microsoft /proc/version 2>/dev/null; then
    echo "Esto es WSL (Linux), no Git Bash. Desde PowerShell corré:"
    echo '  & "C:\laragon\bin\git\bin\bash.exe" docker/sync-from-pc.sh'
    exit 1
fi

# Git Bash often lacks Laragon's PHP on PATH, and not every Laragon build
# has the Postgres driver: take the first PHP 8.4 that does.
if [ -z "${PHP:-}" ]; then
    for candidate in php /c/laragon/bin/php/php-8.4*/php.exe; do
        if command -v "$candidate" >/dev/null 2>&1 \
            && "$candidate" -m 2>/dev/null | tr -d '\r' | grep -qx pdo_pgsql; then
            PHP=$candidate
            break
        fi
    done
fi
[ -n "${PHP:-}" ] || {
    echo "No encuentro un PHP 8.4 con pdo_pgsql. Activá la extensión pdo_pgsql en Laragon"
    echo "o corré: PHP=/ruta/a/php.exe bash docker/sync-from-pc.sh"
    exit 1
}
echo "Usando PHP: $PHP"

# Pasting from PowerShell can bring an invisible \r (and spaces) that turns a
# blank answer into a "value" and breaks hosts. ask strips them and applies
# the default; ask_secret only strips \r (a password may contain spaces).
ask() { # ask VAR "Pregunta" [default]
    local answer
    read -rp "$2${3:+ [$3]}: " answer
    answer=$(printf '%s' "$answer" | tr -d '\r\n\t ')
    printf -v "$1" '%s' "${answer:-${3:-}}"
}
ask_secret() { # ask_secret VAR "Pregunta"
    local answer
    read -rsp "$2: " answer
    echo
    printf -v "$1" '%s' "$(printf '%s' "$answer" | tr -d '\r\n')"
}

echo "== Postgres de producción (servicio Postgres en Dokploy) =="
echo "   Desde la red de la muni usa la IP interna del servidor (192.168.100.30)."
ask PG_HOST "IP del servidor Dokploy" 192.168.100.30
ask PG_PORT "Puerto externo de Postgres" 5433
ask PG_DB "Nombre de la base" licencias-db
ask PG_USER "Usuario" licencias-user
ask_secret PG_PASS "Contraseña (no se muestra)"

echo
echo "== Sistema anterior (MySQL) =="
echo "   Backup restaurado en tu Laragon: 127.0.0.1, puerto 3306."
echo "   Por el túnel SSH: 127.0.0.1, puerto 3307."
ask MY_HOST "Host" 127.0.0.1
ask MY_PORT "Puerto" 3306
ask MY_DB "Base" dblicencias
ask MY_USER "Usuario MySQL" root
ask_secret MY_PASS "Contraseña MySQL (no se muestra, Enter si no tiene)"

echo
echo "Producción:        ${PG_USER}@${PG_HOST}:${PG_PORT}/${PG_DB}"
echo "Sistema anterior:  ${MY_USER}@${MY_HOST}:${MY_PORT}/${MY_DB}"

export DB_CONNECTION=pgsql DB_HOST="$PG_HOST" DB_PORT="$PG_PORT" \
    DB_DATABASE="$PG_DB" DB_USERNAME="$PG_USER" DB_PASSWORD="$PG_PASS" \
    LEGACY_DB_HOST="$MY_HOST" LEGACY_DB_PORT="$MY_PORT" LEGACY_DB_DATABASE="$MY_DB" \
    LEGACY_DB_USERNAME="$MY_USER" LEGACY_DB_PASSWORD="$MY_PASS"

# A cached config would ignore these variables and write to the local DB.
"$PHP" artisan config:clear >/dev/null

echo
echo "Probando conexiones..."
"$PHP" artisan tinker --execute="DB::connection('legacy')->getPdo(); echo '  Sistema anterior: OK'.PHP_EOL;" \
    || { echo "  No conecta al sistema anterior: revisa host, puerto y base (¿restauraste el backup? ¿túnel abierto?)."; exit 1; }
"$PHP" artisan tinker --execute="echo '  Producción: OK ('.DB::connection()->getDriverName().', '.App\Models\License::count().' licencias hoy)'.PHP_EOL;" \
    || { echo "  No conecta a Postgres: revisa el External Port y los datos."; exit 1; }

echo
read -rp "¿Importar en ${PG_HOST}:${PG_PORT}/${PG_DB}? (s/N) " OK
[ "$OK" = "s" ] || [ "$OK" = "S" ] || { echo "Cancelado."; exit 0; }

"$PHP" artisan legacy:sync
