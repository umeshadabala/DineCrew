import "dotenv/config";
import express from "express";
import cors from "cors";
import QRCode from "qrcode";
import { supabase, supabaseForUser } from "./supabase.js";
import { requireAuth } from "./auth.js";

const app = express();
const port = process.env.PORT || 4000;
const host = process.env.HOST || "127.0.0.1";
const customerBaseUrl = process.env.CUSTOMER_BASE_URL || "http://localhost:5173";

app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true }));

// Slugify helper
function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, logoUrl } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }

  // 1. Sign up user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });

  if (authError || !authData.user) {
    return res.status(400).json({ error: authError?.message || "Failed to register account" });
  }

  // 2. Generate slug
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let suffix = 2;
  while (true) {
    const { data } = await supabase.from("restaurants").select("id").eq("slug", slug).maybeSingle();
    if (!data) break;
    slug = `${baseSlug}-${suffix++}`;
  }

  // 3. Create user-scoped client to perform insert as the newly signed-up user
  const token = authData.session?.access_token;
  const userClient = token ? supabaseForUser(token) : supabase;

  const { data: restaurant, error: insertError } = await userClient
    .from("restaurants")
    .insert({
      owner_id: authData.user.id,
      name,
      slug,
      logo_url: logoUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}`,
      email: email.toLowerCase()
    })
    .select("id, name, slug, logo_url, email, google_place_id, created_at")
    .single();

  if (insertError) {
    return res.status(400).json({ error: insertError.message || "Failed to create restaurant profile" });
  }

  res.status(201).json({ token, restaurant });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) {
    return res.status(401).json({ error: error?.message || "Invalid email or password" });
  }

  const { data: restaurant, error: restError } = await supabase
    .from("restaurants")
    .select("id, name, slug, logo_url, email, google_place_id, created_at")
    .eq("owner_id", data.user.id)
    .single();

  if (restError || !restaurant) {
    return res.status(404).json({ error: "Restaurant profile not found" });
  }

  res.json({ token: data.session.access_token, restaurant });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ restaurant: req.restaurant });
});

// Helper for reviews: get or create restaurant QR table record
async function getOrCreateRestaurantQrTable(restaurantId) {
  const { data: existing } = await supabase
    .from("tables")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("qr_slug", "restaurant")
    .maybeSingle();

  if (existing) return existing.id;

  const { data: inserted, error } = await supabase
    .from("tables")
    .insert({
      restaurant_id: restaurantId,
      table_number: "Restaurant QR",
      qr_slug: "restaurant"
    })
    .select("id")
    .single();

  if (error) throw error;
  return inserted.id;
}

app.get("/api/public/restaurants/:slug", async (req, res) => {
  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("id, name, slug, logo_url, google_place_id")
    .eq("slug", req.params.slug)
    .maybeSingle();

  if (error || !restaurant) return res.status(404).json({ error: "Restaurant not found" });

  const { data: waiters } = await supabase
    .from("waiters")
    .select("id, name, upi_id, avatar_url")
    .eq("restaurant_id", restaurant.id)
    .eq("active", true)
    .order("name", { ascending: true });

  res.json({
    restaurant_id: restaurant.id,
    restaurant_name: restaurant.name,
    slug: restaurant.slug,
    logo_url: restaurant.logo_url,
    google_place_id: restaurant.google_place_id,
    table_id: null,
    table_number: "Restaurant QR",
    qr_slug: restaurant.slug,
    waiters: waiters || []
  });
});

app.get("/api/public/restaurants/:slug/tables/:tableId", async (req, res) => {
  const { data: table, error } = await supabase
    .from("tables")
    .select(`
      id,
      table_number,
      qr_slug,
      restaurant:restaurants(id, name, slug, logo_url, google_place_id)
    `)
    .eq("qr_slug", req.params.tableId)
    .maybeSingle();

  // Validate restaurant slug matches
  if (error || !table || !table.restaurant || table.restaurant.slug !== req.params.slug) {
    return res.status(404).json({ error: "Table not found" });
  }

  const { data: waiters } = await supabase
    .from("waiters")
    .select("id, name, upi_id, avatar_url")
    .eq("restaurant_id", table.restaurant.id)
    .eq("active", true)
    .order("name", { ascending: true });

  res.json({
    restaurant_id: table.restaurant.id,
    restaurant_name: table.restaurant.name,
    slug: table.restaurant.slug,
    logo_url: table.restaurant.logo_url,
    google_place_id: table.restaurant.google_place_id,
    table_id: table.id,
    table_number: table.table_number,
    qr_slug: table.qr_slug,
    waiters: waiters || []
  });
});

app.post("/api/public/reviews", async (req, res) => {
  const { restaurantId, tableId, waiterId, foodRating, serviceRating, feedback, tipAmount } = req.body;
  if (!restaurantId || !waiterId || !foodRating || !serviceRating) {
    return res.status(400).json({ error: "Restaurant, staff member, food rating, and service rating are required" });
  }

  // Verify active waiter
  const { data: waiter } = await supabase
    .from("waiters")
    .select("id")
    .eq("id", waiterId)
    .eq("restaurant_id", restaurantId)
    .eq("active", true)
    .maybeSingle();

  if (!waiter) {
    return res.status(400).json({ error: "Please select an active staff member" });
  }

  try {
    const reviewTableId = tableId || (await getOrCreateRestaurantQrTable(restaurantId));
    const { data: review, error } = await supabase
      .from("reviews")
      .insert({
        restaurant_id: restaurantId,
        table_id: reviewTableId,
        waiter_id: waiterId,
        food_rating: foodRating,
        service_rating: serviceRating,
        feedback: feedback || "",
        tip_amount: tipAmount || null
      })
      .select("id")
      .single();

    if (error) throw error;

    // Fetch restaurant's Google Place ID to check if we can redirect
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("google_place_id")
      .eq("id", restaurantId)
      .single();

    const redirectToGoogle = foodRating >= 4 && serviceRating >= 4 && !!restaurant?.google_place_id;
    const googleReviewUrl = redirectToGoogle
      ? `https://search.google.com/local/writereview?placeid=${restaurant.google_place_id}`
      : null;

    res.status(201).json({ id: review.id, redirect_to_google: redirectToGoogle, google_review_url: googleReviewUrl });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to submit review" });
  }
});

app.get("/api/dashboard/overview", requireAuth, async (req, res) => {
  const { data: reviews, error } = await req.supabase
    .from("reviews")
    .select("food_rating, service_rating, tip_amount")
    .eq("restaurant_id", req.restaurant.id);

  if (error) return res.status(500).json({ error: error.message });

  const totalReviews = reviews.length;
  let totalFoodRating = 0;
  let totalServiceRating = 0;
  let totalTipAttempts = 0;

  reviews.forEach(r => {
    totalFoodRating += r.food_rating;
    totalServiceRating += r.service_rating;
    if (r.tip_amount !== null && r.tip_amount !== undefined) {
      totalTipAttempts++;
    }
  });

  const averageFoodRating = totalReviews > 0 ? (totalFoodRating / totalReviews).toFixed(1) : "0.0";
  const averageServiceRating = totalReviews > 0 ? (totalServiceRating / totalReviews).toFixed(1) : "0.0";

  // Calculate top waiter in JS
  const { data: waiterRatings } = await req.supabase
    .from("reviews")
    .select("service_rating, waiter:waiters(name)")
    .eq("restaurant_id", req.restaurant.id)
    .not("waiter_id", "is", null);

  const waiterStats = {};
  waiterRatings?.forEach(r => {
    const name = r.waiter?.name;
    if (!name) return;
    if (!waiterStats[name]) {
      waiterStats[name] = { totalRating: 0, count: 0 };
    }
    waiterStats[name].totalRating += r.service_rating;
    waiterStats[name].count += 1;
  });

  let topWaiterName = "No reviews yet";
  let maxAvgRating = 0;
  let maxCount = 0;
  Object.entries(waiterStats).forEach(([name, stats]) => {
    const avg = stats.totalRating / stats.count;
    if (avg > maxAvgRating || (avg === maxAvgRating && stats.count > maxCount)) {
      maxAvgRating = avg;
      maxCount = stats.count;
      topWaiterName = name;
    }
  });

  res.json({
    total_reviews: totalReviews,
    average_food_rating: averageFoodRating,
    average_service_rating: averageServiceRating,
    total_tip_attempts: totalTipAttempts,
    top_waiter: topWaiterName
  });
});

app.get("/api/waiters", requireAuth, async (req, res) => {
  const { data: waiters, error } = await req.supabase
    .from("waiters")
    .select("*")
    .eq("restaurant_id", req.restaurant.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(waiters);
});

app.post("/api/waiters", requireAuth, async (req, res) => {
  const { name, upiId, active = true, avatarUrl = null } = req.body;
  if (!name?.trim() || !upiId?.trim()) {
    return res.status(400).json({ error: "Staff name and UPI ID are required" });
  }

  const { data: waiter, error } = await req.supabase
    .from("waiters")
    .insert({
      restaurant_id: req.restaurant.id,
      name: name.trim(),
      upi_id: upiId.trim(),
      active: active,
      avatar_url: avatarUrl
    })
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(waiter);
});

app.put("/api/waiters/:id", requireAuth, async (req, res) => {
  const { name, upiId, active, avatarUrl } = req.body;
  if (!name?.trim() || !upiId?.trim()) {
    return res.status(400).json({ error: "Staff name and UPI ID are required" });
  }

  const updateData = {
    name: name.trim(),
    upi_id: upiId.trim(),
    active: active
  };
  if (avatarUrl !== undefined) {
    updateData.avatar_url = avatarUrl;
  }

  const { data: waiter, error } = await req.supabase
    .from("waiters")
    .update(updateData)
    .eq("id", req.params.id)
    .eq("restaurant_id", req.restaurant.id)
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(waiter);
});

app.delete("/api/waiters/:id", requireAuth, async (req, res) => {
  const { error } = await req.supabase
    .from("waiters")
    .delete()
    .eq("id", req.params.id)
    .eq("restaurant_id", req.restaurant.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

app.get("/api/tables", requireAuth, async (req, res) => {
  const { data: tables, error } = await req.supabase
    .from("tables")
    .select(`
      id,
      restaurant_id,
      table_number,
      qr_slug,
      created_at,
      waiter:waiters(id, name, upi_id)
    `)
    .eq("restaurant_id", req.restaurant.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const formattedTables = tables.map(t => ({
    id: t.id,
    restaurant_id: t.restaurant_id,
    table_number: t.table_number,
    waiter_id: t.waiter?.id || null,
    waiter_name: t.waiter?.name || null,
    upi_id: t.waiter?.upi_id || null,
    qr_slug: t.qr_slug,
    created_at: t.created_at,
    customer_url: `${customerBaseUrl}/r/${req.restaurant.slug}/${t.qr_slug}`
  }));

  res.json(formattedTables);
});

app.post("/api/tables", requireAuth, async (req, res) => {
  const { tableNumber, waiterId } = req.body;
  if (!tableNumber?.trim()) {
    return res.status(400).json({ error: "Table number is required" });
  }
  const qrSlug = slugify(tableNumber);

  if (waiterId) {
    const { data: waiter } = await req.supabase
      .from("waiters")
      .select("id")
      .eq("id", waiterId)
      .eq("restaurant_id", req.restaurant.id)
      .maybeSingle();

    if (!waiter) return res.status(400).json({ error: "Selected staff member was not found" });
  }

  const { data: inserted, error } = await req.supabase
    .from("tables")
    .insert({
      restaurant_id: req.restaurant.id,
      table_number: tableNumber.trim(),
      waiter_id: waiterId || null,
      qr_slug: qrSlug
    })
    .select(`
      id,
      restaurant_id,
      table_number,
      qr_slug,
      created_at,
      waiter:waiters(id, name, upi_id)
    `)
    .single();

  if (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "That table already exists" });
    }
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({
    id: inserted.id,
    restaurant_id: inserted.restaurant_id,
    table_number: inserted.table_number,
    waiter_id: inserted.waiter?.id || null,
    waiter_name: inserted.waiter?.name || null,
    upi_id: inserted.waiter?.upi_id || null,
    qr_slug: inserted.qr_slug,
    created_at: inserted.created_at,
    customer_url: `${customerBaseUrl}/r/${req.restaurant.slug}/${inserted.qr_slug}`
  });
});

app.get("/api/restaurant/qr.png", requireAuth, async (req, res) => {
  const url = `${customerBaseUrl}/r/${req.restaurant.slug}`;
  const png = await QRCode.toBuffer(url, { width: 960, margin: 2 });
  res.type("png").send(png);
});

app.get("/api/tables/:id/qr.png", requireAuth, async (req, res) => {
  const { data: table, error } = await req.supabase
    .from("tables")
    .select("*")
    .eq("id", req.params.id)
    .eq("restaurant_id", req.restaurant.id)
    .single();

  if (error || !table) return res.status(404).json({ error: "Table not found" });

  const url = `${customerBaseUrl}/r/${req.restaurant.slug}/${table.qr_slug}`;
  const png = await QRCode.toBuffer(url, { width: 960, margin: 2 });
  res.type("png").send(png);
});

app.get("/api/reviews", requireAuth, async (req, res) => {
  const { waiter, rating, date } = req.query;

  let query = req.supabase
    .from("reviews")
    .select(`
      id,
      restaurant_id,
      table_id,
      waiter_id,
      food_rating,
      service_rating,
      feedback,
      tip_amount,
      created_at,
      table:tables(table_number),
      waiter:waiters(name)
    `)
    .eq("restaurant_id", req.restaurant.id);

  if (waiter) {
    query = query.eq("waiter_id", waiter);
  }
  if (rating) {
    query = query.or(`food_rating.eq.${rating},service_rating.eq.${rating}`);
  }
  if (date) {
    const start = `${date}T00:00:00.000Z`;
    const end = `${date}T23:59:59.999Z`;
    query = query.gte("created_at", start).lte("created_at", end);
  }

  const { data: reviews, error } = await query.order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const formattedReviews = reviews.map(r => ({
    id: r.id,
    restaurant_id: r.restaurant_id,
    table_id: r.table_id,
    waiter_id: r.waiter_id,
    food_rating: r.food_rating,
    service_rating: r.service_rating,
    feedback: r.feedback,
    tip_amount: r.tip_amount,
    created_at: r.created_at,
    table_number: r.table?.table_number || "Restaurant QR",
    waiter_name: r.waiter?.name || "Team"
  }));

  res.json(formattedReviews);
});

app.get("/api/analytics", requireAuth, async (req, res) => {
  const { data: reviews, error } = await req.supabase
    .from("reviews")
    .select(`
      id,
      food_rating,
      service_rating,
      created_at,
      waiter:waiters(name)
    `)
    .eq("restaurant_id", req.restaurant.id);

  if (error) return res.status(500).json({ error: error.message });

  const reviewsByDate = {};
  reviews.forEach(r => {
    const dateStr = new Date(r.created_at).toISOString().split("T")[0];
    if (!reviewsByDate[dateStr]) {
      reviewsByDate[dateStr] = { count: 0, foodSum: 0, serviceSum: 0 };
    }
    reviewsByDate[dateStr].count++;
    reviewsByDate[dateStr].foodSum += r.food_rating;
    reviewsByDate[dateStr].serviceSum += r.service_rating;
  });

  const dailyReviews = Object.entries(reviewsByDate)
    .map(([date, data]) => ({ label: date, reviews: data.count }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const ratingTrends = Object.entries(reviewsByDate)
    .map(([date, data]) => ({
      label: date,
      food: Number((data.foodSum / data.count).toFixed(1)),
      service: Number((data.serviceSum / data.count).toFixed(1))
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const waitersData = {};
  reviews.forEach(r => {
    const name = r.waiter?.name;
    if (!name) return;
    if (!waitersData[name]) {
      waitersData[name] = { ratingSum: 0, count: 0 };
    }
    waitersData[name].ratingSum += r.service_rating;
    waitersData[name].count++;
  });

  const topWaiters = Object.entries(waitersData)
    .map(([name, data]) => ({
      label: name,
      rating: Number((data.ratingSum / data.count).toFixed(1)),
      reviews: data.count
    }))
    .sort((a, b) => b.rating - a.rating);

  const hoursData = {};
  reviews.forEach(r => {
    const hour = new Date(r.created_at).getUTCHours();
    const hourStr = `${String(hour).padStart(2, "0")}:00`;
    hoursData[hourStr] = (hoursData[hourStr] || 0) + 1;
  });

  const busyHours = Object.entries(hoursData)
    .map(([hour, count]) => ({ label: hour, reviews: count }))
    .sort((a, b) => a.label.localeCompare(b.label));

  res.json({ dailyReviews, ratingTrends, topWaiters, busyHours });
});

app.put("/api/restaurant/settings", requireAuth, async (req, res) => {
  const { name, logoUrl, googlePlaceId } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: "Restaurant name is required" });
  }

  const { data: restaurant, error } = await req.supabase
    .from("restaurants")
    .update({
      name: name.trim(),
      logo_url: logoUrl || req.restaurant.logo_url,
      google_place_id: googlePlaceId ? googlePlaceId.trim() : null
    })
    .eq("id", req.restaurant.id)
    .select("id, name, slug, logo_url, email, google_place_id, created_at")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(restaurant);
});

app.get("/api/analytics/leaderboard", requireAuth, async (req, res) => {
  const { data: reviews, error } = await req.supabase
    .from("reviews")
    .select(`
      service_rating,
      tip_amount,
      waiter:waiters(id, name, avatar_url, upi_id)
    `)
    .eq("restaurant_id", req.restaurant.id)
    .not("waiter_id", "is", null);

  if (error) return res.status(500).json({ error: error.message });

  const leaderboardMap = {};
  reviews.forEach(r => {
    const waiter = r.waiter;
    if (!waiter) return;
    if (!leaderboardMap[waiter.id]) {
      leaderboardMap[waiter.id] = {
        id: waiter.id,
        name: waiter.name,
        avatar_url: waiter.avatar_url,
        upi_id: waiter.upi_id,
        reviews_count: 0,
        rating_sum: 0,
        total_tips: 0
      };
    }
    const entry = leaderboardMap[waiter.id];
    entry.reviews_count++;
    entry.rating_sum += r.service_rating;
    if (r.tip_amount) {
      entry.total_tips += r.tip_amount;
    }
  });

  const leaderboard = Object.values(leaderboardMap).map(e => ({
    ...e,
    average_rating: Number((e.rating_sum / e.reviews_count).toFixed(1))
  })).sort((a, b) => b.total_tips - a.total_tips || b.average_rating - a.average_rating);

  res.json(leaderboard);
});

app.get("/api/admin/stats", async (_, res) => {
  const [restaurantsCount, reviewsCount, waitersCount, tablesCount] = await Promise.all([
    supabase.from("restaurants").select("id", { count: "exact", head: true }),
    supabase.from("reviews").select("id", { count: "exact", head: true }),
    supabase.from("waiters").select("id", { count: "exact", head: true }),
    supabase.from("tables").select("id", { count: "exact", head: true })
  ]);
  res.json({
    restaurants: restaurantsCount.count || 0,
    reviews: reviewsCount.count || 0,
    waiters: waitersCount.count || 0,
    tables: tablesCount.count || 0
  });
});

app.listen(port, host, () => {
  console.log(`RestoTip API running on http://${host}:${port}`);
});
