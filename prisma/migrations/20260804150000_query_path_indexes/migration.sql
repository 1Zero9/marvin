CREATE INDEX "Book_householdId_archived_createdAt_idx"
  ON "Book"("householdId", "archived", "createdAt");

CREATE INDEX "IndexEntry_bookId_page_idx"
  ON "IndexEntry"("bookId", "page");

CREATE INDEX "Recipe_householdId_archived_createdAt_idx"
  ON "Recipe"("householdId", "archived", "createdAt");

CREATE INDEX "Recipe_bookId_pageRef_idx"
  ON "Recipe"("bookId", "pageRef");

CREATE INDEX "CookLog_recipeId_cookedAt_idx"
  ON "CookLog"("recipeId", "cookedAt");

CREATE INDEX "CookLog_cookedById_cookedAt_idx"
  ON "CookLog"("cookedById", "cookedAt");

CREATE INDEX "CookLog_countsAsCooked_cookedAt_idx"
  ON "CookLog"("countsAsCooked", "cookedAt");

CREATE INDEX "Photo_recipeId_createdAt_idx"
  ON "Photo"("recipeId", "createdAt");

CREATE INDEX "Photo_cookLogId_createdAt_idx"
  ON "Photo"("cookLogId", "createdAt");
