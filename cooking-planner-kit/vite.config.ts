import { defineConfig, loadEnv } from 'vite';
import type { Connect, Plugin, ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

function jsonResponse(
  res: Parameters<Connect.NextHandleFunction>[1],
  result: ApiResult<unknown>,
): void {
  res.statusCode = result.ok ? 200 : 400;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(result));
}

function errorResponse(
  res: Parameters<Connect.NextHandleFunction>[1],
  err: unknown,
): void {
  res.statusCode = 500;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }),
  );
}

function readJsonBody(req: Parameters<Connect.NextHandleFunction>[0]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function mountPost(
  server: ViteDevServer,
  path: string,
  modulePath: string,
  handler: (mod: Record<string, unknown>, body: unknown) => Promise<ApiResult<unknown>>,
): void {
  server.middlewares.use(path, (req, res, next) => {
    if (req.method !== 'POST') {
      next();
      return;
    }
    void (async () => {
      try {
        const body = await readJsonBody(req);
        const mod = (await server.ssrLoadModule(modulePath)) as Record<string, unknown>;
        const result = await handler(mod, body);
        jsonResponse(res, result);
      } catch (err) {
        errorResponse(res, err);
      }
    })();
  });
}

function mountGet(
  server: ViteDevServer,
  path: string,
  modulePath: string,
  handler: (mod: Record<string, unknown>, url: URL) => Promise<ApiResult<unknown>>,
): void {
  server.middlewares.use(path, (req, res, next) => {
    if (req.method !== 'GET') {
      next();
      return;
    }
    void (async () => {
      try {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const mod = (await server.ssrLoadModule(modulePath)) as Record<string, unknown>;
        const result = await handler(mod, url);
        jsonResponse(res, result);
      } catch (err) {
        errorResponse(res, err);
      }
    })();
  });
}

function devApiPlugin(): Plugin {
  return {
    name: 'cooking-planner-dev-api',
    configureServer(server) {
      mountPost(
        server,
        '/api/generate-plan',
        '/src/api/generate-plan.ts',
        async (mod, body) => {
          const generatePlan = mod.generatePlan as (
            input: unknown,
          ) => Promise<ApiResult<unknown>>;
          return generatePlan(body);
        },
      );

      mountPost(
        server,
        '/api/suggest-substitutions',
        '/src/api/suggest-substitutions.ts',
        async (mod, body) => {
          const suggestSubstitutions = mod.suggestSubstitutions as (
            input: unknown,
          ) => Promise<ApiResult<unknown>>;
          return suggestSubstitutions(body);
        },
      );

      mountPost(server, '/api/plans/save', '/src/api/plans.ts', async (mod, body) => {
        const handleSavePlan = mod.handleSavePlan as (
          input: unknown,
        ) => Promise<ApiResult<unknown>>;
        return handleSavePlan(body);
      });

      mountGet(server, '/api/plans/list', '/src/api/plans.ts', async (mod) => {
        const handleListPlans = mod.handleListPlans as () => Promise<ApiResult<unknown>>;
        return handleListPlans();
      });

      mountGet(server, '/api/plans/get', '/src/api/plans.ts', async (mod, url) => {
        const handleGetPlan = mod.handleGetPlan as (
          id: unknown,
        ) => Promise<ApiResult<unknown>>;
        return handleGetPlan(url.searchParams.get('id'));
      });

      mountPost(server, '/api/plans/delete', '/src/api/plans.ts', async (mod, body) => {
        const handleDeletePlan = mod.handleDeletePlan as (
          id: unknown,
        ) => Promise<ApiResult<unknown>>;
        const id = (body as { id?: unknown } | null)?.id;
        return handleDeletePlan(id);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Make non-VITE_-prefixed vars visible to server-side middleware too.
  const env = loadEnv(mode, process.cwd(), '');
  if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  if (env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
  if (env.SUPABASE_URL) process.env.SUPABASE_URL = env.SUPABASE_URL;
  if (env.SUPABASE_ANON_KEY) process.env.SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
  if (env.SUPABASE_SERVICE_ROLE_KEY)
    process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

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
