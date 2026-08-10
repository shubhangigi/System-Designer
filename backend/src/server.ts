import { app } from './app.js';
import { environment } from './config/environment.js';
import { runMigrations } from './database/db.js';

runMigrations().finally(() => {
  app.listen(environment.port, () => {
    console.log(`ArchSpace AI backend listening on http://localhost:${environment.port}`);
  });
});
