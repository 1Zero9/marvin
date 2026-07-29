-- One private entry per meal slot keeps planning edits idempotent.
CREATE UNIQUE INDEX "MealPlanEntry_userId_date_mealType_key"
ON "MealPlanEntry"("userId", "date", "mealType");
