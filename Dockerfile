# syntax=docker/dockerfile:1

# Licencias MPP: production image (PHP 8.4, nginx + php-fpm, Postgres).
#
#   build       Composer (no dev) + Vite assets. Needs PHP and Node together:
#               the Wayfinder Vite plugin runs `php artisan` during the build.
#   production  serversideup/php: nginx + php-fpm as www-data on port 8080.
#               With AUTORUN_ENABLED it runs migrations, storage:link and the
#               config/route/view caches on start. /up is the health check.

ARG PHP_VERSION=8.4
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS node

############################################
# Build: dependencies and frontend assets
############################################
FROM serversideup/php:${PHP_VERSION}-cli AS build

USER root

# intl: Number::spell (amounts in words on printed licences).
RUN install-php-extensions intl bcmath

COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

WORKDIR /var/www/html

# Dependencies first, so code changes reuse these layers.
COPY --chown=www-data:www-data composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY --chown=www-data:www-data package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY --chown=www-data:www-data . .

RUN composer dump-autoload --optimize --classmap-authoritative --no-dev \
    && npm run build \
    && rm -rf node_modules

############################################
# Production
############################################
FROM serversideup/php:${PHP_VERSION}-fpm-nginx AS production

USER root
RUN install-php-extensions intl bcmath
USER www-data

ENV PHP_OPCACHE_ENABLE=1 \
    AUTORUN_ENABLED=true \
    HEALTHCHECK_PATH=/up \
    SSL_MODE=off \
    APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    INERTIA_SSR_ENABLED=false

COPY --chown=www-data:www-data --from=build /var/www/html /var/www/html

EXPOSE 8080
