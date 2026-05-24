-- DineCrew V2 Schema — Hospitality Operations & Talent Platform
-- Run this in the Supabase SQL Editor
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS guards throughout

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- HELPER: updated_at trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLES
-- ============================================================

-- Businesses (restaurants, hotels, cafés, bars)
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'restaurant' CHECK (type IN ('restaurant', 'hotel')),
  logo_url TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  google_place_id TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staff Profiles
CREATE TABLE IF NOT EXISTS staff_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'waiter'
    CHECK (role IN ('waiter', 'chef', 'manager', 'host', 'bartender')),
  upi_id TEXT,
  avatar_url TEXT,
  bio TEXT,
  skills TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0 CHECK (experience_years >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tables (physical tables in a venue)
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  qr_slug TEXT NOT NULL,
  assigned_staff_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  capacity INTEGER DEFAULT 4 CHECK (capacity > 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, qr_slug),
  UNIQUE(business_id, table_number)
);

-- Reviews / Guest Feedback
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  tip_amount NUMERIC(10, 2) DEFAULT 0 CHECK (tip_amount >= 0),
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  food_rating INTEGER CHECK (food_rating BETWEEN 1 AND 5),
  service_rating INTEGER CHECK (service_rating BETWEEN 1 AND 5),
  feedback TEXT,
  guest_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Job Postings
CREATE TABLE IF NOT EXISTS job_postings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  role TEXT NOT NULL
    CHECK (role IN ('waiter', 'chef', 'manager', 'host', 'bartender')),
  description TEXT,
  location TEXT,
  salary_min NUMERIC(10, 2) CHECK (salary_min >= 0),
  salary_max NUMERIC(10, 2) CHECK (salary_max >= 0),
  employment_type TEXT NOT NULL DEFAULT 'full-time'
    CHECK (employment_type IN ('full-time', 'part-time', 'contract')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT salary_range_check CHECK (salary_max IS NULL OR salary_min IS NULL OR salary_max >= salary_min)
);

-- Job Applications
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  cover_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, staff_id)
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_businesses_updated_at') THEN
    CREATE TRIGGER trg_businesses_updated_at
      BEFORE UPDATE ON businesses
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_staff_profiles_updated_at') THEN
    CREATE TRIGGER trg_staff_profiles_updated_at
      BEFORE UPDATE ON staff_profiles
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_job_postings_updated_at') THEN
    CREATE TRIGGER trg_job_postings_updated_at
      BEFORE UPDATE ON job_postings
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_job_applications_updated_at') THEN
    CREATE TRIGGER trg_job_applications_updated_at
      BEFORE UPDATE ON job_applications
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_businesses_owner   ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_slug    ON businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_city    ON businesses(city);

CREATE INDEX IF NOT EXISTS idx_staff_business     ON staff_profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_user         ON staff_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_role         ON staff_profiles(role);
CREATE INDEX IF NOT EXISTS idx_staff_active       ON staff_profiles(active) WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_tables_business    ON tables(business_id);
CREATE INDEX IF NOT EXISTS idx_tables_qr_slug     ON tables(qr_slug);

CREATE INDEX IF NOT EXISTS idx_reviews_business   ON reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_staff      ON reviews(staff_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created    ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_sentiment  ON reviews(sentiment);

CREATE INDEX IF NOT EXISTS idx_jobs_business      ON job_postings(business_id);
CREATE INDEX IF NOT EXISTS idx_jobs_role          ON job_postings(role);
CREATE INDEX IF NOT EXISTS idx_jobs_active        ON job_postings(active) WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_applications_job   ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_staff ON job_applications(staff_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON job_applications(status);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE businesses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews         ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- ---- Businesses ----
-- Owners can do everything on their own businesses
CREATE POLICY "businesses_owner_all" ON businesses
  FOR ALL USING (auth.uid() = owner_id);

-- Anyone can read business info (for public pages)
CREATE POLICY "businesses_public_read" ON businesses
  FOR SELECT USING (true);

-- ---- Staff Profiles ----
-- Business owners can manage all staff in their business
CREATE POLICY "staff_owner_all" ON staff_profiles
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- Staff can insert their own profile upon registration
CREATE POLICY "staff_self_insert" ON staff_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Staff can read their own profile
CREATE POLICY "staff_self_read" ON staff_profiles
  FOR SELECT USING (user_id = auth.uid());

-- Staff can update their own profile (bio, skills, upi, etc.)
CREATE POLICY "staff_self_update" ON staff_profiles
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Public can read active staff (for guest-facing pages)
CREATE POLICY "staff_public_read" ON staff_profiles
  FOR SELECT USING (active = true);

-- ---- Tables ----
-- Business owners manage their tables
CREATE POLICY "tables_owner_all" ON tables
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- Public can read tables (for QR code lookups)
CREATE POLICY "tables_public_read" ON tables
  FOR SELECT USING (true);

-- ---- Reviews ----
-- Anyone can insert a review (guests don't need an account)
CREATE POLICY "reviews_public_insert" ON reviews
  FOR INSERT WITH CHECK (true);

-- Business owners can read reviews for their business
CREATE POLICY "reviews_owner_read" ON reviews
  FOR SELECT USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- Staff can read reviews addressed to them
CREATE POLICY "reviews_staff_read" ON reviews
  FOR SELECT USING (
    staff_id IN (SELECT id FROM staff_profiles WHERE user_id = auth.uid())
  );

-- ---- Job Postings ----
-- Business owners can manage their job postings
CREATE POLICY "jobs_owner_all" ON job_postings
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- Anyone can read active job postings (job board is public)
CREATE POLICY "jobs_public_read" ON job_postings
  FOR SELECT USING (active = true);

-- ---- Job Applications ----
-- Staff can insert their own applications
CREATE POLICY "applications_staff_insert" ON job_applications
  FOR INSERT WITH CHECK (
    staff_id IN (SELECT id FROM staff_profiles WHERE user_id = auth.uid())
  );

-- Staff can read their own applications
CREATE POLICY "applications_staff_read" ON job_applications
  FOR SELECT USING (
    staff_id IN (SELECT id FROM staff_profiles WHERE user_id = auth.uid())
  );

-- Staff can update their own applications (e.g. withdraw)
CREATE POLICY "applications_staff_update" ON job_applications
  FOR UPDATE USING (
    staff_id IN (SELECT id FROM staff_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    staff_id IN (SELECT id FROM staff_profiles WHERE user_id = auth.uid())
  );

-- Business owners can read applications for their jobs
CREATE POLICY "applications_owner_read" ON job_applications
  FOR SELECT USING (
    job_id IN (
      SELECT id FROM job_postings
      WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
    )
  );

-- Business owners can update application status
CREATE POLICY "applications_owner_update" ON job_applications
  FOR UPDATE USING (
    job_id IN (
      SELECT id FROM job_postings
      WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
    )
  )
  WITH CHECK (
    job_id IN (
      SELECT id FROM job_postings
      WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
    )
  );

-- ============================================================
-- REALTIME
-- ============================================================

-- Enable realtime for reviews and applications
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE job_applications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- STORAGE (avatars bucket — idempotent)
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Safe policy creation for storage
DO $$ BEGIN
  CREATE POLICY "avatars_auth_upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "avatars_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "avatars_auth_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "avatars_auth_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
