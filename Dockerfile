ARG BUILD_FROM
FROM $BUILD_FROM

# Instalace potřebných balíčků
RUN apk add --no-cache \
    nginx \
    nginx-mod-http-lua \
    nginx-mod-devel-kit \
    lua5.1 \
    lua5.1-socket \
    lua5.1-cjson \
    nodejs \
    npm \
    curl \
    bash

# Vytvoření adresářů
RUN mkdir -p /etc/nginx/lua \
    /var/log/nginx \
    /var/lib/nginx \
    /run/nginx \
    /app

# Kopírování konfigurace nginx
COPY nginx.conf /etc/nginx/nginx.conf
COPY lua/ /etc/nginx/lua/

# Kopírování aplikace
COPY app/ /app/
WORKDIR /app

# Instalace Node.js dependencies
RUN npm install

# Kopírování spouštěcího skriptu
COPY run.sh /
RUN chmod +x /run.sh

# Kopírování S6 skriptů
COPY rootfs/ /

EXPOSE 8080

CMD ["/run.sh"]
