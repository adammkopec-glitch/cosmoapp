-- Add missing User fields that were added to schema.prisma without migrations

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "termsAcceptedAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "marketingConsent"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "photoConsent"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "cardAllergies"     TEXT,
  ADD COLUMN IF NOT EXISTS "cardConditions"    TEXT,
  ADD COLUMN IF NOT EXISTS "cardPreferences"   TEXT,
  ADD COLUMN IF NOT EXISTS "cardStaffNotes"    TEXT,
  ADD COLUMN IF NOT EXISTS "ambassadorCode"    TEXT,
  ADD COLUMN IF NOT EXISTS "referredById"      TEXT,
  ADD COLUMN IF NOT EXISTS "referralCount"     INTEGER NOT NULL DEFAULT 0;

-- Unique index on ambassadorCode
CREATE UNIQUE INDEX IF NOT EXISTS "User_ambassadorCode_key" ON "User"("ambassadorCode");

-- Self-referencing FK for referrals
ALTER TABLE "User"
  ADD CONSTRAINT "User_referredById_fkey"
  FOREIGN KEY ("referredById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
