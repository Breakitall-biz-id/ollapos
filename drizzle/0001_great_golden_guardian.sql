CREATE TABLE "customer" (
	"id" text PRIMARY KEY NOT NULL,
	"pangkalan_id" text NOT NULL,
	"name" text NOT NULL,
	"is_vip" boolean DEFAULT false NOT NULL,
	"phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" text PRIMARY KEY NOT NULL,
	"pangkalan_id" text NOT NULL,
	"product_id" text NOT NULL,
	"stock_filled" integer DEFAULT 0 NOT NULL,
	"stock_empty" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_product_pangkalan_unique" UNIQUE("product_id","pangkalan_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_log" (
	"id" text PRIMARY KEY NOT NULL,
	"pangkalan_id" text NOT NULL,
	"product_id" text NOT NULL,
	"qty_change_filled" integer,
	"qty_change_empty" integer,
	"type" text NOT NULL,
	"note" text,
	"transaction_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pangkalan" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pangkalan_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "price_rule" (
	"id" text PRIMARY KEY NOT NULL,
	"pangkalan_id" text NOT NULL,
	"product_id" text NOT NULL,
	"price_regular" numeric(10, 2) NOT NULL,
	"price_vip" numeric(10, 2) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "price_rule_product_pangkalan_unique" UNIQUE("product_id","pangkalan_id")
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"image_url" text,
	"is_global" boolean DEFAULT false NOT NULL,
	"pangkalan_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_name_pangkalan_unique" UNIQUE("name","pangkalan_id")
);
--> statement-breakpoint
CREATE TABLE "transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"pangkalan_id" text NOT NULL,
	"customer_id" text,
	"total_amount" numeric(10, 2) NOT NULL,
	"payment_method" text NOT NULL,
	"cash_received" numeric(10, 2),
	"change_amount" numeric(10, 2),
	"status" text DEFAULT 'paid' NOT NULL,
	"invoice_number" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "transaction_item" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"product_id" text NOT NULL,
	"qty" integer NOT NULL,
	"price_at_purchase" numeric(10, 2) NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_pangkalan_id_pangkalan_id_fk" FOREIGN KEY ("pangkalan_id") REFERENCES "public"."pangkalan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_pangkalan_id_pangkalan_id_fk" FOREIGN KEY ("pangkalan_id") REFERENCES "public"."pangkalan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_log" ADD CONSTRAINT "inventory_log_pangkalan_id_pangkalan_id_fk" FOREIGN KEY ("pangkalan_id") REFERENCES "public"."pangkalan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_log" ADD CONSTRAINT "inventory_log_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_log" ADD CONSTRAINT "inventory_log_transaction_id_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transaction"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pangkalan" ADD CONSTRAINT "pangkalan_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_rule" ADD CONSTRAINT "price_rule_pangkalan_id_pangkalan_id_fk" FOREIGN KEY ("pangkalan_id") REFERENCES "public"."pangkalan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_rule" ADD CONSTRAINT "price_rule_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_pangkalan_id_pangkalan_id_fk" FOREIGN KEY ("pangkalan_id") REFERENCES "public"."pangkalan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_pangkalan_id_pangkalan_id_fk" FOREIGN KEY ("pangkalan_id") REFERENCES "public"."pangkalan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_item" ADD CONSTRAINT "transaction_item_transaction_id_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_item" ADD CONSTRAINT "transaction_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_pangkalan_id_idx" ON "customer" USING btree ("pangkalan_id");--> statement-breakpoint
CREATE INDEX "customer_pangkalan_vip_idx" ON "customer" USING btree ("pangkalan_id","is_vip");--> statement-breakpoint
CREATE INDEX "inventory_pangkalan_product_idx" ON "inventory" USING btree ("pangkalan_id","product_id");--> statement-breakpoint
CREATE INDEX "inventory_log_pangkalan_product_idx" ON "inventory_log" USING btree ("pangkalan_id","product_id","created_at");--> statement-breakpoint
CREATE INDEX "pangkalan_user_id_idx" ON "pangkalan" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "product_pangkalan_id_idx" ON "product" USING btree ("pangkalan_id");--> statement-breakpoint
CREATE INDEX "transaction_pangkalan_date_idx" ON "transaction" USING btree ("pangkalan_id","created_at");--> statement-breakpoint
CREATE INDEX "transaction_customer_idx" ON "transaction" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "transaction_item_transaction_idx" ON "transaction_item" USING btree ("transaction_id");