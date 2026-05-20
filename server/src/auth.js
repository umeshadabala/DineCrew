import { supabase, supabaseForUser } from "./supabase.js";

/**
 * Express middleware: validates Supabase access token from Authorization header.
 * Attaches req.restaurant, req.accessToken, and req.supabase (user-scoped client).
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    // Verify the JWT and get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Fetch the restaurant linked to this user
    const { data: restaurant, error: restError } = await supabase
      .from("restaurants")
      .select("id, name, slug, logo_url, email, google_place_id, created_at")
      .eq("owner_id", user.id)
      .single();

    if (restError || !restaurant) {
      return res.status(401).json({ error: "Restaurant not found for this account" });
    }

    req.user = user;
    req.accessToken = token;
    req.restaurant = restaurant;
    req.supabase = supabaseForUser(token);
    next();
  } catch {
    res.status(401).json({ error: "Authentication failed" });
  }
}
