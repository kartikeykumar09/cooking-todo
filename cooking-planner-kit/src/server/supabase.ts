import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  // Prefer the service-role key when present (server-only); fall back to anon
  // for development environments without it. The browser never sees either.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in your env.',
    );
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
