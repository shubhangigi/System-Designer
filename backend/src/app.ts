import cors from 'cors';
import express from 'express';
import { environment } from './config/environment.js';
import { projectRoutes } from './routes/projectRoutes.js';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', product: 'ArchSpace AI', aiProvider: environment.aiProvider });
});

app.use('/api', projectRoutes);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  res.status(400).json({ error: message });
});
