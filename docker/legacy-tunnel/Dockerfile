# SSH tunnel to the old system's MySQL, which only listens on 127.0.0.1 of
# its server. Same connection HeidiSQL makes: SSH in as "licencias" and
# forward MySQL to the app over Docker's internal network (never published).

FROM alpine:3.20

RUN apk add --no-cache openssh-client \
    && adduser -D -h /home/tunnel tunnel

COPY --chmod=755 entrypoint.sh /usr/local/bin/legacy-tunnel

USER tunnel

EXPOSE 3306

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
    CMD nc -z 127.0.0.1 3306 || exit 1

ENTRYPOINT ["legacy-tunnel"]
