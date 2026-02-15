CREATE TABLE IF NOT EXISTS "expense_category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text NOT NULL DEFAULT '#6B7280',
	"icon" text NOT NULL DEFAULT 'FileText',
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "expense" (
	"id" text PRIMARY KEY NOT NULL,
	"pangkalan_id" text NOT NULL,
	"category_id" text NOT NULL,
	"description" text NOT NULL,
	"amount" decimal(12,2) NOT NULL,
	"receipt_number" text,
	"notes" text,
	"expense_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "expense_receipt_number_unique" UNIQUE("receipt_number")
);

DO $$ BEGIN
 ALTER TABLE "expense" ADD CONSTRAINT "expense_pangkalan_id_pangkalan_id_fk" FOREIGN KEY ("pangkalan_id") REFERENCES "pangkalan"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "expense" ADD CONSTRAINT "expense_category_id_expense_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "expense_category"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "expense_pangkalan_date_idx" ON "expense" ("pangkalan_id", "expense_date");
CREATE INDEX IF NOT EXISTS "expense_category_idx" ON "expense" ("category_id");
CREATE INDEX IF NOT EXISTS "expense_receipt_number_idx" ON "expense" ("receipt_number");

-- Insert default expense categories
INSERT INTO "expense_category" (id, name, description, color, icon) VALUES
('operational', 'Operasional', 'Biaya operasional sehari-hari', '#EF4444', 'Settings'),
('utilities', 'Utilitas', 'Tagihan listrik, air, internet', '#3B82F6', 'Zap'),
('maintenance', 'Pemeliharaan', 'Perawatan peralatan dan fasilitas', '#F59E0B', 'Wrench'),
('salary', 'Gaji', 'Penggajian karyawan', '#10B981', 'Users'),
('marketing', 'Pemasaran', 'Biaya promosi dan pemasaran', '#8B5CF6', 'Megaphone'),
('equipment', 'Peralatan', 'Pembelian peralatan dan perlengkapan', '#EC4899', 'Package'),
('rent', 'Sewa', 'Biaya sewa tempat usaha', '#F97316', 'Home'),
('tax', 'Pajak', 'Pembayaran pajak', '#06B6D4', 'FileText'),
('other', 'Lainnya', 'Biaya lainnya', '#6B7280', 'MoreHorizontal')
ON CONFLICT (id) DO NOTHING;