ALTER TABLE "User" ADD COLUMN "aiProcessingEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "AccountRecoveryCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "AccountRecoveryCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountRecoveryCode_codeHash_key" ON "AccountRecoveryCode"("codeHash");
CREATE INDEX "AccountRecoveryCode_userId_usedAt_idx" ON "AccountRecoveryCode"("userId", "usedAt");

ALTER TABLE "AccountRecoveryCode" ADD CONSTRAINT "AccountRecoveryCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
