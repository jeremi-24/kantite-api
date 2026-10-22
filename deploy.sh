#!/usr/bin/env bash
# Déploiement de l'API sur le serveur : bash deploy.sh
# Compile d'abord, redémarre ensuite, puis vérifie que l'API répond.
set -euo pipefail
cd "$(dirname "$0")"

NAME=kantite-api
PORT=$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2 || true)
PORT=${PORT:-5003}

[ -f .env ] || { echo "!! Fichier .env absent, déploiement annulé"; exit 1; }

echo "== Récupération du code"
git checkout -- tsconfig.build.tsbuildinfo 2>/dev/null || true
OLD=$(git rev-parse HEAD)
git pull --ff-only

if [ ! -d node_modules ] || ! git diff --quiet "$OLD" HEAD -- package-lock.json; then
  echo "== Installation des dépendances"
  npm ci
fi

echo "== Compilation"
npm run build
[ -f dist/main.js ] || { echo "!! dist/main.js absent après la compilation, l'API n'est pas redémarrée"; exit 1; }

echo "== Redémarrage pm2"
pm2 startOrReload ecosystem.config.cjs
pm2 save

echo "== Vérification"
for i in $(seq 1 15); do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 5 -X POST "http://localhost:$PORT/api/auth/login" \
    -H 'Content-Type: application/json' -d '{"email":"healthcheck@local","motDePasse":"x"}' || true)
  if [ "$CODE" = "401" ]; then
    echo "OK : l'API répond sur le port $PORT"
    exit 0
  fi
  sleep 2
done

echo "!! L'API ne répond pas (dernier code : $CODE)"
pm2 logs "$NAME" --lines 40 --nostream
exit 1
