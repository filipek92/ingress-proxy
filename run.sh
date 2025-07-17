#!/bin/bash
set -e

echo "Spouštění Ingress Proxy addon..."

# Vytvoření potřebných adresářů
mkdir -p /etc/nginx/devices
mkdir -p /etc/nginx/conf.d
mkdir -p /etc/nginx/auth
mkdir -p /var/log/nginx
mkdir -p /var/lib/nginx/tmp
mkdir -p /run/nginx

# Nastavení oprávnění
chown -R root:root /etc/nginx
chmod -R 755 /etc/nginx

# Ověření nginx konfigurace
echo "Ověřování nginx konfigurace..."
nginx -t

# Spuštění nginx v pozadí
echo "Spouštění nginx..."
nginx

# Přechod do aplikačního adresáře
cd /app

# Spuštění Node.js aplikace
echo "Spouštění management aplikace..."
exec node server.js
