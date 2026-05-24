import { createBrowserClient } from "@supabase/ssr";

let client;

export function getSupabaseBrowser() {
  if (client) return client;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  client = createBrowserClient(
    supabaseUrl,
    supabaseKey
  );
  return client;
}
