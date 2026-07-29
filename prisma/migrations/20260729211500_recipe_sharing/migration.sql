-- Sharing is explicit and only applies to recipe content, never personal health data.
ALTER TABLE "Recipe" ADD COLUMN "shareEnabled" BOOLEAN NOT NULL DEFAULT false;
