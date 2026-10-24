-- שינוי שם העמודה בטבלת Category
ALTER TABLE "Category" RENAME COLUMN "isMaaserEligible" TO "countInMaaserDefault";

-- שינוי שם העמודה בטבלת Transaction מ-isMaaserEligibleOverride ל-countInMaaser
ALTER TABLE "Transaction" RENAME COLUMN "isMaaserEligibleOverride" TO "countInMaaser";
ALTER TABLE "Transaction" ALTER COLUMN "countInMaaser" DROP NOT NULL;