-- ISBNs identify a book within a kitchen. Different kitchens may each hold it.
DROP INDEX IF EXISTS "Book_isbn_key";
CREATE UNIQUE INDEX "Book_householdId_isbn_key" ON "Book"("householdId", "isbn");
