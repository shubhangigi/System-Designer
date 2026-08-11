import { app } from './app.js';
import { environment } from './config/environment.js';
import { runMigrations } from './database/db.js';

async function main() {
  await runMigrations();
  app.listen(environment.port, () => {
    console.log(`[System Designer] Backend running on http://localhost:${environment.port}`);
    console.log(`[System Designer] Environment: ${environment.nodeEnv}`);
    if (environment.aiProvider) {
      console.log(`[System Designer] AI Provider: ${environment.aiProvider} / ${environment.aiModel}`);
    } else {
      console.log('[System Designer] AI Provider: not configured (heuristic mode)');
    }
  });
}

main().catch((err) => {
  console.error('[System Designer] Fatal startup error:', err);
  process.exit(1);
});
