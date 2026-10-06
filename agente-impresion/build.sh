#!/usr/bin/env bash
# Compila el agente para Windows y lo deja en public/descargas para que se
# descargue desde Configuración › Impresión. Toma la URL y llave pública del .env.
set -euo pipefail
cd "$(dirname "$0")"
set -a; source ../.env; set +a
mkdir -p ../public/descargas
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath \
  -ldflags "-H windowsgui -s -w -X main.supabaseURL=${VITE_SUPABASE_URL} -X main.supabaseKey=${VITE_SUPABASE_PUBLISHABLE_KEY}" \
  -o ../public/descargas/VULO-Impresion.exe .
ls -lh ../public/descargas/VULO-Impresion.exe
