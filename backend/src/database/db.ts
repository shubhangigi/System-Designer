import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from 'pg';
import { environment } from '../config/environment.js';

const { Pool } = pkg;

// ---------------------------------------------------------------------------
// Resolve the database directory relative to THIS file, not process.cwd().
// When started with `npm run dev -w backend`, CWD is the backend/ directory,
// but the schema lives at <repo-root>/database/schema.sql.
// Using import.meta.url guarantees a stable, absolute path at all times.
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// From backend/src/database/ -> up 3 levels -> repo root -> database/schema.sql
const SCHEMA_PATH = path.resolve(__dirname, '../../../database/schema.sql');

let poolInstance: InstanceType<typeof Pool> | null = null;

export function getPool() {
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: environment.databaseUrl || 'postgresql://archspace:archspace@localhost:5433/archspace',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    poolInstance.on('error', (err) => {
      console.error('[System Designer DB Pool Error]', err.message);
    });
  }
  return poolInstance;
}

export async function query(text: string, params?: unknown[]) {
  const pool = getPool();
  return pool.query(text, params);
}

export async function withTransaction<T>(
  callback: (client: pkg.PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function runMigrations() {
  console.log('[System Designer] Running database migrations...');

  const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
  const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');

  // Run main schema first
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await query(schemaSql);
  }

  // Run numbered migration files in order
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      try {
        await query(sql);
        console.log(`[System Designer] Migration applied: ${file}`);
      } catch (err: any) {
        // Skip already-applied DDL (IF NOT EXISTS handles most cases)
        if (err.code !== '42701' && err.code !== '42P07') {
          console.warn(`[System Designer] Migration warning for ${file}:`, err.message);
        }
      }
    }
  }

  console.log('[System Designer] Database migrations completed.');
}

export async function closePool() {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}
