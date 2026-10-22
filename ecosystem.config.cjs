// Configuration pm2 de l'API (à lancer en tant que collaborateur, pas root).
// Première mise en route : pm2 start ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: 'kantite-api',
      cwd: __dirname,
      script: 'dist/main.js',
      // Le .env du dossier fournit PORT, NODE_ENV, DB_* et JWT_SECRET.
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 3000,
      time: true,
    },
  ],
};
