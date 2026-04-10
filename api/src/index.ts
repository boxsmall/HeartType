import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import hearttypeRoutes from './routes/hearttype.routes';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const publicDir = path.join(__dirname, '../public');

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    code: 200,
    message: 'ok',
    data: {
      service: 'hearttype-api',
      now: new Date().toISOString(),
    },
  });
});

app.use('/api/v1', hearttypeRoutes);

app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({
    code: 404,
    message: '资源不存在',
    error: {
      type: 'NOT_FOUND',
      details: [],
    },
  });
});

app.use(express.static(publicDir));

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  res.status(500).json({
    code: 500,
    message: '服务器错误',
    error: {
      type: 'INTERNAL_ERROR',
      details: [message],
    },
  });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[hearttype-api] listening on http://localhost:${port}`);
});
