import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment");
  process.exit(1);
}

/** Server-side Supabase client (uses anon key, relies on RLS). */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  },
  realtime: {
    transport: ws
  }
});

/**
 * Create a Supabase client scoped to a specific user's JWT.
 * This ensures RLS policies apply for the authenticated user.
 */
export function supabaseForUser(accessToken) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` }
    },
    auth: {
      persistSession: false
    },
    realtime: {
      transport: ws
    }
  });
}

export { supabaseUrl, supabaseAnonKey };
