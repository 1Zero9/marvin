ALTER TABLE "Book" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Book" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'private';
ALTER TABLE "Recipe" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Recipe" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'private';

UPDATE "Book" AS b
SET "createdById" = (
  SELECT m."userId" FROM "Membership" AS m
  WHERE m."householdId" = b."householdId"
  ORDER BY m."createdAt" ASC
  LIMIT 1
)
WHERE b."createdById" IS NULL;

UPDATE "Recipe" AS r
SET "createdById" = (
  SELECT m."userId" FROM "Membership" AS m
  WHERE m."householdId" = r."householdId"
  ORDER BY m."createdAt" ASC
  LIMIT 1
)
WHERE r."createdById" IS NULL;

CREATE INDEX "Book_householdId_visibility_idx" ON "Book"("householdId", "visibility");
CREATE INDEX "Recipe_householdId_visibility_idx" ON "Recipe"("householdId", "visibility");
ALTER TABLE "Book" ADD CONSTRAINT "Book_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
