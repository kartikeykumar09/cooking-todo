import { handleDeletePlan } from '../../src/api/plans';

export const config = { runtime: 'nodejs' };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  let body: { id?: unknown } = {};
  try {
    body = (await request.json()) as { id?: unknown };
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }
  const result = await handleDeletePlan(body.id);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
