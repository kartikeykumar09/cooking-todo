import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

function devApiPlugin(): Plugin {
  return {
    name: 'cooking-planner-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/generate-plan', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          void (async () => {
            try {
              const body: unknown = chunks.length
                ? JSON.parse(Buffer.concat(chunks).toString('utf8'))
                : {};
              const mod = (await server.ssrLoadModule(
                '/src/api/generate-plan.ts',
              )) as typeof import('./src/api/generate-plan');
              const result = await mod.generatePlan(body);
              res.statusCode = result.ok ? 200 : 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  ok: false,
                  error: err instanceof Error ? err.message : 'Unknown error',
                }),
              );
            }
          })();
        });
      });

      server.middlewares.use('/api/suggest-substitutions', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          void (async () => {
            try {
              const body: unknown = chunks.length
                ? JSON.parse(Buffer.concat(chunks).toString('utf8'))
                : {};
              const mod = (await server.ssrLoadModule(
                '/src/api/suggest-substitutions.ts',
              )) as typeof import('./src/api/suggest-substitutions');
              const result = await mod.suggestSubstitutions(body);
              res.statusCode = result.ok ? 200 : 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  ok: false,
                  error: err instanceof Error ? err.message : 'Unknown error',
                }),
              );
            }
          })();
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Make non-VITE_-prefixed vars visible to server-side middleware too.
  const env = loadEnv(mode, process.cwd(), '');
  if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  if (env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;

  return {
    plugins: [react(), tailwindcss(), devApiPlugin()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
    },
  };
});
