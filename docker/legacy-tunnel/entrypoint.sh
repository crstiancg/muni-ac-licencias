#!/bin/sh
# Forwards 0.0.0.0:3306 (Docker network only) to MySQL on the old server.
#
#   LEGACY_SSH_HOST             old server, e.g. 192.168.100.3
#   LEGACY_SSH_USER             SSH user (default: licencias)
#   LEGACY_SSH_PORT             SSH port (default: 22)
#   LEGACY_SSH_PRIVATE_KEY_B64  private key, base64 on one line
#   LEGACY_SSH_KNOWN_HOSTS      optional: the server's host key line; pins it
#                               instead of trusting it on first connection
#   LEGACY_SSH_TARGET           MySQL as seen from the server (default: 127.0.0.1:3306)
#
# If ssh drops, the container exits and Docker restarts it.
set -eu

if [ -z "${LEGACY_SSH_HOST:-}" ] || [ -z "${LEGACY_SSH_PRIVATE_KEY_B64:-}" ]; then
    echo "legacy-tunnel: faltan LEGACY_SSH_HOST o LEGACY_SSH_PRIVATE_KEY_B64; el túnel queda apagado." >&2
    exec tail -f /dev/null
fi

key="$HOME/.ssh/id_legacy"
known="$HOME/.ssh/known_hosts"
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

printf '%s' "$LEGACY_SSH_PRIVATE_KEY_B64" | base64 -d > "$key"
chmod 600 "$key"

if [ -n "${LEGACY_SSH_KNOWN_HOSTS:-}" ]; then
    printf '%s\n' "$LEGACY_SSH_KNOWN_HOSTS" > "$known"
    host_check=yes
else
    host_check=accept-new
fi

echo "legacy-tunnel: ${LEGACY_SSH_USER:-licencias}@${LEGACY_SSH_HOST} -> ${LEGACY_SSH_TARGET:-127.0.0.1:3306}"

# +ssh-rsa: old servers (the one with MySQL 5.5) may only offer RSA/SHA-1,
# which current OpenSSH clients refuse by default.
exec ssh -N \
    -i "$key" \
    -p "${LEGACY_SSH_PORT:-22}" \
    -o BatchMode=yes \
    -o ExitOnForwardFailure=yes \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    -o StrictHostKeyChecking="$host_check" \
    -o UserKnownHostsFile="$known" \
    -o HostKeyAlgorithms=+ssh-rsa \
    -o PubkeyAcceptedAlgorithms=+ssh-rsa \
    -L "0.0.0.0:3306:${LEGACY_SSH_TARGET:-127.0.0.1:3306}" \
    "${LEGACY_SSH_USER:-licencias}@${LEGACY_SSH_HOST}"
