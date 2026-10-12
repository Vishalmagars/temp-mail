import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { handler } from './netlify/functions/api.js'

// Vite dev server plugin to emulate Netlify Functions locally
function netlifyFunctionsDevPlugin() {
  return {
    name: 'netlify-functions-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api')) {
          return next();
        }

        try {
          const urlObj = new URL(req.url, 'http://localhost');
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          await new Promise((resolve) => req.on('end', resolve));

          const queryParams = Object.fromEntries(urlObj.searchParams.entries());

          const event = {
            httpMethod: req.method,
            path: urlObj.pathname,
            queryStringParameters: queryParams,
            headers: req.headers,
            body: body || null,
          };

          const result = await handler(event, {});

          res.statusCode = result.statusCode || 200;
          for (const [k, v] of Object.entries(result.headers || {})) {
            res.setHeader(k, v);
          }
          res.end(result.body || '');
        } catch (err) {
          console.error('Local Netlify function error:', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), netlifyFunctionsDevPlugin()],
  server: {
    port: 5173,
    host: true,
  },
})
