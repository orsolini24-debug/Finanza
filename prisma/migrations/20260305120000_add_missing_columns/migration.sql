-- Add missing Category.type column
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'BOTH';

-- Add missing Goal.currentAmount column
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "currentAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.0;

-- Add missing Goal.accountId column
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "accountId" TEXT;

-- Add foreign key for Goal.accountId (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Goal_accountId_fkey'
  ) THEN
    ALTER TABLE "Goal" ADD CONSTRAINT "Goal_accountId_fkey"
      FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
