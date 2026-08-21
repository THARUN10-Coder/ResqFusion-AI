import express from 'express';
import { createServer as createViteServer } from 'vite';

async function createServer() {
  const app = express();
  
  // Use Vite's built-in dev server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  
  app.use(vite.middlewares);
  
  const port = process.env.PORT || 5173;
  app.listen(port, () => {
    console.log(`Frontend dev server running at http://localhost:${port}`);
  });
}

createServer();
