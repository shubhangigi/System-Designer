import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import { environment } from './config/environment.js';
import { projectRoutes } from './routes/projectRoutes.js';
import { authRoutes } from './routes/authRoutes.js';

export const app = express();

app.use(cors({
  origin: environment.nodeEnv === 'production' ? false : 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', product: 'System Designer', aiProvider: environment.aiProvider });
});

app.use('/api', authRoutes);
app.use('/api', projectRoutes);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  if (environment.nodeEnv !== 'production') {
    console.error('[SystemDesigner Error]', message);
  }
  res.status(400).json({ error: 'An unexpected error occurred. Please try again.' });
});
