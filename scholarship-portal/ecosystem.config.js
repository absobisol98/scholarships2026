// PM2 process-manager config for running this app on a single EC2 instance,
// matching the deployment pattern described in DEPLOY.md.
//
// Usage:
//   pm2 start ecosystem.config.js --env production
//   pm2 reload ecosystem.config.js   (zero-downtime redeploy)
//   pm2 logs scholarship-portal
//   pm2 list

module.exports = {
  apps: [
    {
      name: "scholarship-portal",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: __dirname,

      // Cluster mode: PM2 starts one Next.js worker process per CPU core and
      // load-balances requests across them on the same port. This is what lets a
      // single EC2 box handle more concurrent traffic than one Node process can —
      // see the sizing notes in DEPLOY.md.
      exec_mode: "cluster",
      instances: "max",

      // Restart a worker automatically if it grows past this — guards against a
      // slow memory leak taking the whole box down over days of uptime.
      max_memory_restart: "400M",

      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        // Set these in the shell/systemd environment (or a .env file next to this
        // config) before starting PM2 — do not hardcode real values here, since
        // this file is committed to the repo:
        //   DATABASE_URL, SESSION_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
        //   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET
      },

      out_file: "logs/pm2-out.log",
      error_file: "logs/pm2-error.log",
      time: true,
    },
  ],
};
