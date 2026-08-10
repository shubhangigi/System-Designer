import fs from 'node:fs';
import path from 'node:path';
import pkg from 'pg';
import { environment } from '../config/environment.js';

const { Pool } = pkg;

let poolInstance: InstanceType<typeof Pool> | null = null;

export function getPool() {
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: environment.databaseUrl || 'postgresql://archspace:archspace@localhost:5432/archspace',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    poolInstance.on('error', (err) => {
      console.error('[ArchSpace DB Pool Error]', err.message);
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
  try {
    const schemaPath = path.resolve(process.cwd(), 'database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await query(sql);
      console.log('[ArchSpace DB] Database schema migration executed successfully.');
    }
  } catch (error: any) {
    console.warn('[ArchSpace DB Warning] Migration notice:', error.message);
  }
}

export async function closePool() {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}
