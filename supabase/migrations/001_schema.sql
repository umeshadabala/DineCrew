-- RestoTip schema for Supabase (PostgreSQL)
-- Run this in the Supabase SQL Editor

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS restaurants (
  id            BIGSERIAL PRIMARY KEY,
  owner_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  logo_url      TEXT,
  email         TEXT UNIQUE NOT NULL,
  google_place_id TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS waiters (
  id              BIGSERIAL PRIMARY KEY,
  restaurant_id   BIGINT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  upi_id          TEXT NOT NULL,
  avatar_url      TEXT,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tables (
  id              BIGSERIAL PRIMARY KEY,
  restaurant_id   BIGINT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number    TEXT NOT NULL,
  waiter_id       BIGINT REFERENCES waiters(id) ON DELETE SET NULL,
  qr_slug         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, table_number)
);

CREATE TABLE IF NOT EXISTS reviews (
  id              BIGSERIAL PRIMARY KEY,
  restaurant_id   BIGINT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id        BIGINT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  waiter_id       BIGINT REFERENCES waiters(id) ON DELETE SET NULL,
  food_rating     INTEGER NOT NULL CHECK (food_rating BETWEEN 1 AND 5),
  service_rating  INTEGER NOT NULL CHECK (service_rating BETWEEN 1 AND 5),
  feedback        TEXT DEFAULT '',
  tip_amount      INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_waiters_restaurant ON waiters(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tables_restaurant  ON tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_waiter     ON reviews(waiter_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created    ON reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_restaurants_slug   ON restaurants(slug);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiters     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews     ENABLE ROW LEVEL SECURITY;

-- Restaurants: owners can manage their own; public read by slug
CREATE POLICY "restaurants_owner_all" ON restaurants
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "restaurants_public_read" ON restaurants
  FOR SELECT USING (true);

-- Waiters: restaurant owner full access; public read active only
CREATE POLICY "waiters_owner_all" ON waiters
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  );

CREATE POLICY "waiters_public_read" ON waiters
  FOR SELECT USING (active = true);

-- Tables: restaurant owner full access; public read
CREATE POLICY "tables_owner_all" ON tables
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  );

CREATE POLICY "tables_public_read" ON tables
  FOR SELECT USING (true);

-- Reviews: restaurant owner can read; anyone can insert
CREATE POLICY "reviews_owner_read" ON reviews
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  );

CREATE POLICY "reviews_public_insert" ON reviews
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE reviews;

-- ============================================================
-- STORAGE (for staff avatars)
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_auth_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "avatars_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
