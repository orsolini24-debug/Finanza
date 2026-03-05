-- Fix: Category.type was created as TEXT but Prisma 7 expects a PostgreSQL ENUM type.
-- The ENUM type might or might not already exist, so we use IF NOT EXISTS.
-- Then convert the TEXT column to the ENUM type.

DO $$ BEGIN
  CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE', 'BOTH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Category" ALTER COLUMN "type" DROP DEFAULT;

ALTER TABLE "Category"
  ALTER COLUMN "type" TYPE "CategoryType"
  USING "type"::"CategoryType";

ALTER TABLE "Category" ALTER COLUMN "type" SET DEFAULT 'BOTH'::"CategoryType";
