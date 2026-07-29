-- Private daily companion check-ins are scoped only to an individual user.
CREATE TABLE "DailyCompanion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "intention" TEXT,
    "waterGlasses" INTEGER NOT NULL DEFAULT 0,
    "reflection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyCompanion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyCompanion_userId_date_key" ON "DailyCompanion"("userId", "date");
CREATE INDEX "DailyCompanion_userId_date_idx" ON "DailyCompanion"("userId", "date");

ALTER TABLE "DailyCompanion" ADD CONSTRAINT "DailyCompanion_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
