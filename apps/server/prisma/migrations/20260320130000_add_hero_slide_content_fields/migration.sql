ALTER TABLE "HeroSlide" ADD COLUMN "heading" TEXT;
ALTER TABLE "HeroSlide" ADD COLUMN "subtitle" TEXT;
ALTER TABLE "HeroSlide" ADD COLUMN "textPosition" TEXT DEFAULT 'middle-center';
ALTER TABLE "HeroSlide" ADD COLUMN "fontStyle" TEXT DEFAULT 'heading';
ALTER TABLE "HeroSlide" ADD COLUMN "buttons" JSONB;
