ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'staff';

ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "default_pangkalan_id" text;

ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "active_pangkalan_id" text;