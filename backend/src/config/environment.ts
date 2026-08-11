import 'dotenv/config';

export const environment = {
  port: Number(process.env.PORT ?? 4100),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  generationMode: (process.env.GENERATION_MODE ?? 'ai') as 'ai' | 'heuristic',
  aiProvider: process.env.AI_PROVIDER || 'ollama',
  aiApiKey: process.env.AI_API_KEY || 'local-ollama-key',
  aiModel: process.env.AI_MODEL || 'system-designer-v1:latest',
  aiBaseUrl: process.env.AI_BASE_URL || 'http://localhost:11434/v1',
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 120000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'super-secret-dev-jwt-key-minimum-32-chars-long!',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  bcryptRounds: process.env.NODE_ENV === 'test' ? 1 : Number(process.env.BCRYPT_ROUNDS ?? 12),
};
