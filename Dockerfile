# VisuaLearn: the static site served by nginx, running as a non-root user on port 8080.
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY docker/default.conf /etc/nginx/conf.d/default.conf
COPY docker/security.conf /etc/nginx/snippets/security.conf
COPY web/ /usr/share/nginx/html/

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
