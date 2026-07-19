ALTER TABLE "CookLog"
ADD COLUMN "context" TEXT NOT NULL DEFAULT 'home',
ADD COLUMN "venue" TEXT,
ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "CookLog_context_idx" ON "CookLog"("context");
