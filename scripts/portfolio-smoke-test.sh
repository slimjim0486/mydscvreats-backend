#!/usr/bin/env bash

set -euo pipefail

API_URL="${API_URL:-http://localhost:3001}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
BRAND_NAME="${BRAND_NAME:-Portfolio Smoke Brand}"
CUISINE_TYPE="${CUISINE_TYPE:-Smoke Test}"
LOCATION="${LOCATION:-Dubai}"
CLONE_FROM_RESTAURANT_ID="${CLONE_FROM_RESTAURANT_ID:-}"
TARGET_BRAND_ID="${TARGET_BRAND_ID:-}"
SOURCE_BRAND_ID="${SOURCE_BRAND_ID:-}"

if [[ -z "${AUTH_TOKEN}" ]]; then
  echo "AUTH_TOKEN is required."
  echo "Example:"
  echo "  API_URL=https://api.example.com AUTH_TOKEN=... ./scripts/portfolio-smoke-test.sh"
  exit 1
fi

auth_header=(
  -H "Authorization: Bearer ${AUTH_TOKEN}"
  -H "Content-Type: application/json"
)

echo
echo "1. GET /api/restaurants/me"
curl -sS "${auth_header[@]}" "${API_URL}/api/restaurants/me"
echo
echo

echo "2. POST /api/portfolio/brands"
create_payload=$(
  cat <<JSON
{"name":"${BRAND_NAME}","cuisineType":"${CUISINE_TYPE}","location":"${LOCATION}"$( [[ -n "${CLONE_FROM_RESTAURANT_ID}" ]] && printf ',"cloneFromRestaurantId":"%s"' "${CLONE_FROM_RESTAURANT_ID}" )}
JSON
)
curl -sS "${auth_header[@]}" -X POST "${API_URL}/api/portfolio/brands" --data "${create_payload}"
echo
echo

echo "3. GET /api/portfolio/analytics"
curl -sS "${auth_header[@]}" "${API_URL}/api/portfolio/analytics"
echo
echo

if [[ -n "${TARGET_BRAND_ID}" && -n "${SOURCE_BRAND_ID}" ]]; then
  echo "4. POST /api/portfolio/brands/${TARGET_BRAND_ID}/clone"
  curl -sS "${auth_header[@]}" -X POST "${API_URL}/api/portfolio/brands/${TARGET_BRAND_ID}/clone" \
    --data "{\"sourceRestaurantId\":\"${SOURCE_BRAND_ID}\",\"replaceExisting\":false}"
  echo
  echo
else
  echo "4. Skipping clone smoke test. Set TARGET_BRAND_ID and SOURCE_BRAND_ID to enable it."
  echo
fi

if [[ -n "${TARGET_BRAND_ID}" ]]; then
  echo "5. GET /api/portfolio/brands/${TARGET_BRAND_ID}/qr"
  curl -sS "${auth_header[@]}" \
    "${API_URL}/api/portfolio/brands/${TARGET_BRAND_ID}/qr?format=svg&size=1200&preset=70mm&includeBranding=true" \
    > /tmp/portfolio-qr-smoke.svg
  echo "Saved QR response to /tmp/portfolio-qr-smoke.svg"
  echo
else
  echo "5. Skipping QR smoke test. Set TARGET_BRAND_ID to enable it."
  echo
fi
