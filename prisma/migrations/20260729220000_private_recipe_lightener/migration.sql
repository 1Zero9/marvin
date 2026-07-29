-- Lighter-meal choices are personal health data, even when the source recipe is shared.
ALTER TABLE "RecipeSwapSuggestion" ADD COLUMN "userId" TEXT;
ALTER TABLE "RecipeVariant" ADD COLUMN "userId" TEXT;

CREATE UNIQUE INDEX "RecipeSwapSuggestion_userId_recipeId_key"
ON "RecipeSwapSuggestion"("userId", "recipeId");
CREATE INDEX "RecipeSwapSuggestion_userId_idx" ON "RecipeSwapSuggestion"("userId");
CREATE UNIQUE INDEX "RecipeVariant_userId_originalRecipeId_key"
ON "RecipeVariant"("userId", "originalRecipeId");
CREATE INDEX "RecipeVariant_userId_idx" ON "RecipeVariant"("userId");

ALTER TABLE "RecipeSwapSuggestion"
ADD CONSTRAINT "RecipeSwapSuggestion_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeVariant"
ADD CONSTRAINT "RecipeVariant_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
