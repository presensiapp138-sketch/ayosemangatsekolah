import app from '../server';

export default function handler(req: any, res: any) {
  // Normalize req.url so Express router always sees /api/...
  const orig = req.originalUrl || req.url || '';
  if (!req.url.startsWith('/api') && orig.startsWith('/api')) {
    req.url = orig;
  } else if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  return app(req, res);
}

