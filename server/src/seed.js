import { supabase, supabaseForUser } from "./supabase.js";

async function run() {
  console.log("Seeding SpiceHub demo data to Supabase...");

  const email = "restotip.demo@gmail.com";
  const password = "password123";
  let token;
  let userId;

  // 1. Try to sign in first to avoid signup rate limits
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    console.log("Sign in failed (expected if new user), attempting sign up:", signInError.message);
    // If sign in fails, attempt sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    });

    if (signUpError) {
      console.error("Sign up failed too:", signUpError.message);
      process.exit(1);
    }
    token = signUpData.session?.access_token;
    userId = signUpData.user?.id;
  } else {
    console.log("Sign in succeeded!");
    token = signInData.session.access_token;
    userId = signInData.user.id;
  }

  if (!userId) {
    console.error("Could not obtain user ID.");
    process.exit(1);
  }

  // Create user-scoped client using session token
  const userClient = supabaseForUser(token);

  // 2. Fetch or create restaurant
  let { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();

  if (!restaurant) {
    const { data: newRest, error: restError } = await userClient
      .from("restaurants")
      .insert({
        owner_id: userId,
        name: "SpiceHub",
        slug: "spicehub",
        logo_url: "https://api.dicebear.com/8.x/initials/svg?seed=SpiceHub",
        email: email,
        google_place_id: "ChIJuR4bC0sZqzsR1S2Y_8Q7j3s"
      })
      .select("*")
      .single();

    if (restError) {
      console.error("Error creating seed restaurant:", restError.message);
      process.exit(1);
    }
    restaurant = newRest;
  }

  const restaurantId = restaurant.id;

  // Delete previous waiters (which cascades to tables and reviews)
  const { error: deleteWaitersError } = await userClient
    .from("waiters")
    .delete()
    .eq("restaurant_id", restaurantId);

  if (deleteWaitersError) {
    console.warn("Notice: cleaning up old waiters error:", deleteWaitersError.message);
  }

  // 3. Insert waiters
  const { data: waiters, error: waitersError } = await userClient
    .from("waiters")
    .insert([
      { restaurant_id: restaurantId, name: "Aarav", upi_id: "aarav@upi", active: true },
      { restaurant_id: restaurantId, name: "Meera", upi_id: "meera@upi", active: true }
    ])
    .select("*");

  if (waitersError) {
    console.error("Error inserting waiters:", waitersError.message);
    process.exit(1);
  }

  const waiterA = waiters.find(w => w.name === "Aarav");
  const waiterB = waiters.find(w => w.name === "Meera");

  // 4. Insert tables
  const { data: tables, error: tablesError } = await userClient
    .from("tables")
    .insert([
      { restaurant_id: restaurantId, table_number: "table-4", waiter_id: waiterA.id, qr_slug: "table-4" },
      { restaurant_id: restaurantId, table_number: "table-8", waiter_id: waiterB.id, qr_slug: "table-8" },
      { restaurant_id: restaurantId, table_number: "Restaurant QR", waiter_id: null, qr_slug: "restaurant" }
    ])
    .select("*");

  if (tablesError) {
    console.error("Error inserting tables:", tablesError.message);
    process.exit(1);
  }

  const table4 = tables.find(t => t.qr_slug === "table-4");

  // 5. Insert reviews (anyone can insert reviews according to public policy)
  const { error: reviewsError } = await supabase
    .from("reviews")
    .insert([
      {
        restaurant_id: restaurantId,
        table_id: table4.id,
        waiter_id: waiterA.id,
        food_rating: 5,
        service_rating: 5,
        feedback: "Loved the paneer tikka and quick service.",
        tip_amount: 100
      }
    ]);

  if (reviewsError) {
    console.error("Error inserting reviews:", reviewsError.message);
    process.exit(1);
  }

  console.log("Seeded RestoTip demo data successfully to Supabase!");
}

run();
