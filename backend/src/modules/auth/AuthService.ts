import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../../database/db.js';
import { environment } from '../../config/environment.js';

export interface UserRecord {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

function getJwtSecret(): string {
  const secret = environment.jwtSecret;
  if (!secret || secret.length < 32) {
    if (environment.nodeEnv === 'production') {
      throw new Error('[SystemDesigner Auth] JWT_SECRET must be set and at least 32 characters in production.');
    }
    console.warn('[SystemDesigner Auth] JWT_SECRET is not set or too short. Using insecure default for development only.');
    return 'dev-only-insecure-secret-do-not-use-in-prod-123456';
  }
  return secret;
}

interface MemUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

const memUsers = new Map<string, MemUser>();

export async function registerUser(email: string, password: string): Promise<{ user: UserRecord; token: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  // Check existing in DB or memory
  let existingFound = false;
  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if ((existing.rowCount ?? 0) > 0) existingFound = true;
  } catch {
    for (const u of memUsers.values()) {
      if (u.email === normalizedEmail) { existingFound = true; break; }
    }
  }

  if (existingFound) {
    throw new AuthError('An account with this email already exists.', 'EMAIL_IN_USE');
  }

  const passwordHash = await bcrypt.hash(password, environment.bcryptRounds);
  const id = crypto.randomUUID();
  const now = new Date();
  const isoNow = now.toISOString();

  try {
    await query(
      `INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`,
      [id, normalizedEmail, passwordHash, now, now],
    );
  } catch {
    // DB not available or table doesn't exist — store in memory
    memUsers.set(id, { id, email: normalizedEmail, passwordHash, createdAt: isoNow, updatedAt: isoNow });
  }

  const user: UserRecord = { id, email: normalizedEmail, createdAt: isoNow, updatedAt: isoNow };
  const token = signToken({ sub: id, email: normalizedEmail });
  return { user, token };
}

export async function loginUser(email: string, password: string): Promise<{ user: UserRecord; token: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  let userRow: { id: string; email: string; passwordHash: string; createdAt: string; updatedAt: string } | null = null;

  try {
    const result = await query('SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1', [normalizedEmail]);
    if ((result.rowCount ?? 0) > 0) {
      const row = result.rows[0];
      userRow = {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      };
    }
  } catch {
    for (const u of memUsers.values()) {
      if (u.email === normalizedEmail) {
        userRow = u;
        break;
      }
    }
  }

  if (!userRow) {
    for (const u of memUsers.values()) {
      if (u.email === normalizedEmail) {
        userRow = u;
        break;
      }
    }
  }

  if (!userRow) {
    throw new AuthError('The email or password is incorrect. Please try again.', 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, userRow.passwordHash);
  if (!valid) {
    throw new AuthError('The email or password is incorrect. Please try again.', 'INVALID_CREDENTIALS');
  }

  const user: UserRecord = {
    id: userRow.id,
    email: userRow.email,
    createdAt: userRow.createdAt,
    updatedAt: userRow.updatedAt,
  };
  const token = signToken({ sub: userRow.id, email: userRow.email });
  return { user, token };
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  try {
    const result = await query('SELECT id, email, created_at, updated_at FROM users WHERE id = $1', [id]);
    if ((result.rowCount ?? 0) > 0) {
      const row = result.rows[0];
      return { id: row.id, email: row.email, createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() };
    }
  } catch {
    // Fall through to memory
  }

  const memUser = memUsers.get(id);
  if (memUser) {
    return { id: memUser.id, email: memUser.email, createdAt: memUser.createdAt, updatedAt: memUser.updatedAt };
  }

  return null;
}

function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: environment.jwtExpiresIn as any });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
}

export class AuthError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'AuthError';
  }
}
