# syntax=docker/dockerfile:1

# =============================================================================
# Production nginx reverse proxy image.
#
# Based on the "unprivileged" nginx variant, pre-configured to run as a
# non-root user out of the box (it listens on 8080/8443 instead of 80/443,
# since binding ports <1024 requires root). This gives "not root" for the
# proxy tier too, not just the app containers - see docker-compose.yml for
# the 80->8080 / 443->8443 port mapping.
# =============================================================================

FROM nginxinc/nginx-unprivileged:1.27-alpine

# Replace the base image's default config with our own - nothing here should
# depend on what nginxinc ships beyond the non-root runtime setup.
COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf
COPY --chown=nginx:nginx conf.d/ /etc/nginx/conf.d/
COPY --chown=nginx:nginx snippets/ /etc/nginx/snippets/

# TLS material is supplied at container start via a read-only bind mount
# (see docker-compose.yml) - never bake certificates/keys into an image
# layer. This just ensures the mount point exists.
RUN mkdir -p /etc/nginx/certs

USER nginx

EXPOSE 8080 8443

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
