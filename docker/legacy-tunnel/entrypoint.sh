#!/bin/sh
# Forwards 0.0.0.0:3306 (Docker network only) to MySQL on the old server.
#
#   LEGACY_SSH_HOST             old server, e.g. 192.168.100.3
#   LEGACY_SSH_USER             SSH user (default: licencias)
#   LEGACY_SSH_PORT             SSH port (default: 22)
#   LEGACY_SSH_PASSWORD         the user's password (simplest; temporary use)
#   LEGACY_SSH_PRIVATE_KEY_B64  or a private key, base64 on one line (wins
#                               over the password when both are set)
#   LEGACY_SSH_KNOWN_HOSTS      optional: the server's host key line; pins it
#                               instead of trusting it on first connection
#   LEGACY_SSH_TARGET           MySQL as seen from the server (default: 127.0.0.1:3306)
#
# Without host and credentials it idles: removing the variables after the
# migration turns the tunnel off. If ssh drops, Docker restarts it.
set -eu

if [ -z "${LEGACY_SSH_HOST:-}" ] \
    || { [ -z "${LEGACY_SSH_PRIVATE_KEY_B64:-}" ] && [ -z "${LEGACY_SSH_PASSWORD:-}" ]; }; then
    echo "legacy-tunnel: sin LEGACY_SSH_HOST o sin credenciales; el túnel queda apagado." >&2
    exec tail -f /dev/null
fi

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
known="$HOME/.ssh/known_hosts"

if [ -n "${LEGACY_SSH_KNOWN_HOSTS:-}" ]; then
    printf '%s\n' "$LEGACY_SSH_KNOWN_HOSTS" > "$known"
    host_check=yes
else
    host_check=accept-new
fi

# +ssh-rsa: old servers (the one with MySQL 5.5) may only offer RSA/SHA-1,
# which current OpenSSH clients refuse by default.
set -- -N \
    -p "${LEGACY_SSH_PORT:-22}" \
    -o ExitOnForwardFailure=yes \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    -o StrictHostKeyChecking="$host_check" \
    -o UserKnownHostsFile="$known" \
    -o HostKeyAlgorithms=+ssh-rsa \
    -o PubkeyAcceptedAlgorithms=+ssh-rsa \
    -L "0.0.0.0:3306:${LEGACY_SSH_TARGET:-127.0.0.1:3306}" \
    "${LEGACY_SSH_USER:-licencias}@${LEGACY_SSH_HOST}"

if [ -n "${LEGACY_SSH_PRIVATE_KEY_B64:-}" ]; then
    key="$HOME/.ssh/id_legacy"
    printf '%s' "$LEGACY_SSH_PRIVATE_KEY_B64" | base64 -d > "$key"
    chmod 600 "$key"
    echo "legacy-tunnel: ${LEGACY_SSH_USER:-licencias}@${LEGACY_SSH_HOST} (llave) -> ${LEGACY_SSH_TARGET:-127.0.0.1:3306}"
    exec ssh -i "$key" -o BatchMode=yes "$@"
fi

# sshpass -e reads SSHPASS from the environment, so the password never
# shows up in the process list.
export SSHPASS="$LEGACY_SSH_PASSWORD"
echo "legacy-tunnel: ${LEGACY_SSH_USER:-licencias}@${LEGACY_SSH_HOST} (contraseña) -> ${LEGACY_SSH_TARGET:-127.0.0.1:3306}"
exec sshpass -e ssh \
    -o PreferredAuthentications=password,keyboard-interactive \
    -o PubkeyAuthentication=no \
    -o NumberOfPasswordPrompts=1 \
    "$@"
