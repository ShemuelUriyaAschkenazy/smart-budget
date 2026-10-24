ALTER TABLE "Transaction" RENAME COLUMN "isMaaserEligible" TO "isMaaserEligibleOverride";
ALTER TABLE "Transaction" ALTER COLUMN "isMaaserEligibleOverride" DROP NOT NULL;