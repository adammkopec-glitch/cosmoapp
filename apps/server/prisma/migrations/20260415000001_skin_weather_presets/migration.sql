-- Delete all existing rules (incompatible with new system)
DELETE FROM "SkinWeatherRule";

-- Drop old parameter columns
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "uvEnabled";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "uvTarget";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "aqiEnabled";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "aqiTarget";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "humidityEnabled";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "humidityTarget";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "temperatureEnabled";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "temperatureTarget";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "precipEnabled";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "precipTarget";
ALTER TABLE "SkinWeatherRule" DROP COLUMN IF EXISTS "matchThreshold";

-- Add new conditions array column
ALTER TABLE "SkinWeatherRule" ADD COLUMN "conditions" TEXT[] NOT NULL DEFAULT '{}';
