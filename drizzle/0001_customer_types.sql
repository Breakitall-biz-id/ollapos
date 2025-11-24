-- Create customer_type table
CREATE TABLE IF NOT EXISTS "customer_type" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "display_name" text NOT NULL,
    "discount_percent" integer DEFAULT 0 NOT NULL,
    "color" text NOT NULL,
    "min_spent" decimal(10, 2) DEFAULT 0 NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create unique constraint on customer_type.name
DO $$ BEGIN
    ALTER TABLE "customer_type" ADD CONSTRAINT "customer_type_name_unique" UNIQUE ("name");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to customer table
ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "type_id" text NOT NULL DEFAULT 'regular';

-- Add other new columns to customer table
ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "total_spent" decimal(10, 2) DEFAULT 0 NOT NULL;
ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

-- Drop old is_vip column if it exists
ALTER TABLE "customer" DROP COLUMN IF EXISTS "is_vip";

-- Create index on customer.pangkalan_id and customer.type_id
CREATE INDEX IF NOT EXISTS "customer_pangkalan_type_idx" ON "customer" ("pangkalan_id", "type_id");

-- Add foreign key constraint to customer.type_id
DO $$ BEGIN
    ALTER TABLE "customer" ADD CONSTRAINT "customer_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "customer_type"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update price_rules table: remove old columns and add base_price
ALTER TABLE "price_rule" DROP COLUMN IF EXISTS "price_regular";
ALTER TABLE "price_rule" DROP COLUMN IF EXISTS "price_vip";
ALTER TABLE "price_rule" ADD COLUMN IF NOT EXISTS "base_price" decimal(10, 2) NOT NULL;