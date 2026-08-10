export const environment = {
  port: Number(process.env.PORT ?? 4100),
  generationMode: (process.env.GENERATION_MODE ?? 'ai') as 'ai' | 'heuristic',
  aiProvider: process.env.AI_PROVIDER ?? '',
  aiApiKey: process.env.AI_API_KEY ?? '',
  aiModel: process.env.AI_MODEL ?? 'gpt-4o-mini',
  aiBaseUrl: process.env.AI_BASE_URL ?? 'https://api.openai.com/v1',
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 60000),
  databaseUrl: process.env.DATABASE_URL ?? '',
};
