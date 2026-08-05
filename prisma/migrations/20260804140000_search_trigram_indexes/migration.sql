CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "IndexEntry_ingredient_trgm_idx" ON "IndexEntry" USING GIN ("ingredient" gin_trgm_ops);
CREATE INDEX "IndexEntry_dish_trgm_idx" ON "IndexEntry" USING GIN ("dish" gin_trgm_ops);
CREATE INDEX "Recipe_title_trgm_idx" ON "Recipe" USING GIN ("title" gin_trgm_ops);
