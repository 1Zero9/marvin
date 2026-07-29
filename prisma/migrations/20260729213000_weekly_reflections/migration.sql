-- Weekly reflections are private to an individual user and never household-scoped.
CREATE TABLE "WeeklyReflection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "win" TEXT,
    "lesson" TEXT,
    "experiment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyReflection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WeeklyReflection_userId_weekStart_key" ON "WeeklyReflection"("userId", "weekStart");
CREATE INDEX "WeeklyReflection_userId_weekStart_idx" ON "WeeklyReflection"("userId", "weekStart");

ALTER TABLE "WeeklyReflection" ADD CONSTRAINT "WeeklyReflection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
