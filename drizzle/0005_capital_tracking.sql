CREATE TABLE IF NOT EXISTS "capital_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"pangkalan_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" decimal(12,2) NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "capital_entry" ADD CONSTRAINT "capital_entry_pangkalan_id_pangkalan_id_fk" FOREIGN KEY ("pangkalan_id") REFERENCES "pangkalan"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "capital_entry_pangkalan_date_idx" ON "capital_entry" ("pangkalan_id", "created_at");
