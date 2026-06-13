import { handleGetPlan } from '../../src/api/plans';

export const config = { runtime: 'nodejs' };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const url = new URL(request.url);
  const result = await handleGetPlan(url.searchParams.get('id'));
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
