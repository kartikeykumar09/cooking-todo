import { handleListPlans } from '../../src/api/plans';

export const config = { runtime: 'nodejs' };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const result = await handleListPlans();
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
