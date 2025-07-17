#!/bin/bash

# Build script pro Ingress Proxy addon

set -e

echo "=== Ingress Proxy Addon Build Script ==="

# Kontrola požadavků
if ! command -v docker &> /dev/null; then
    echo "❌ Docker není nainstalován!"
    exit 1
fi

# Parametry
ADDON_NAME="ingress-proxy"
VERSION="1.0.0"
PLATFORMS=("linux/amd64" "linux/arm64" "linux/arm/v7" "linux/arm/v6")

echo "📦 Sestavování addon: $ADDON_NAME v$VERSION"

# Vytvoření multi-platform builderu
echo "🔧 Nastavování Docker buildx..."
docker buildx create --name ingress-proxy-builder --use 2>/dev/null || true
docker buildx use ingress-proxy-builder

# Build pro všechny platformy
echo "🏗️  Sestavování pro všechny platformy..."
for platform in "${PLATFORMS[@]}"; do
    echo "📦 Sestavování pro $platform..."
    docker buildx build \
        --platform $platform \
        --build-arg BUILD_FROM="homeassistant/base:latest" \
        --tag "ghcr.io/home-assistant/addon-$ADDON_NAME:$VERSION-${platform//\//-}" \
        --push \
        .
done

# Create manifest
echo "📋 Vytváření manifestu..."
docker buildx build \
    --platform linux/amd64,linux/arm64,linux/arm/v7,linux/arm/v6 \
    --build-arg BUILD_FROM="homeassistant/base:latest" \
    --tag "ghcr.io/home-assistant/addon-$ADDON_NAME:$VERSION" \
    --tag "ghcr.io/home-assistant/addon-$ADDON_NAME:latest" \
    --push \
    .

echo "✅ Build dokončen!"
echo "📦 Image: ghcr.io/home-assistant/addon-$ADDON_NAME:$VERSION"
