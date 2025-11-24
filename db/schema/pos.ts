import {
    pgTable,
    text,
    integer,
    decimal,
    timestamp,
    boolean,
    unique,
    index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";

// Enums for our system
export const UserRole = {
    AGENT: 'agent',
    PANGKALAN: 'pangkalan'
} as const;

export const ProductCategory = {
    GAS: 'gas',
    WATER: 'water',
    GENERAL: 'general'
} as const;

export const PaymentMethod = {
    CASH: 'cash',
    QRIS: 'qris',
    DEBT: 'debt'
} as const;

export const TransactionStatus = {
    PAID: 'paid',
    UNPAID: 'unpaid',
    VOID: 'void'
} as const;

export const InventoryLogType = {
    SALE: 'sale',
    MANUAL_RESTOCK: 'manual_restock',
    CORRECTION: 'correction',
    RETURN: 'return'
} as const;

// Pangkalan Profile (Store/Toko)
export const pangkalan = pgTable("pangkalan", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address"),
    phone: text("phone"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    userIdIdx: index("pangkalan_user_id_idx").on(table.userId),
}));

// Customer Types
export const customerType = pgTable("customer_type", {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    displayName: text("display_name").notNull(),
    discountPercent: integer("discount_percent").default(0).notNull(),
    color: text("color").notNull(), // hex color for UI
    minSpent: decimal("min_spent", { precision: 10, scale: 2 }).default(0), // minimum spending to reach this tier
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Customers
export const customer = pgTable("customer", {
    id: text("id").primaryKey(),
    pangkalanId: text("pangkalan_id").notNull().references(() => pangkalan.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    typeId: text("type_id").references(() => customerType.id).notNull(),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    pangkalanIdIdx: index("customer_pangkalan_id_idx").on(table.pangkalanId),
    pangkalanTypeIdx: index("customer_pangkalan_type_idx").on(table.pangkalanId, table.typeId),
}));

// Products
export const product = pgTable("product", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(), // gas, water, general
    imageUrl: text("image_url"),
    isGlobal: boolean("is_global").default(false).notNull(), // True for LPG products
    pangkalanId: text("pangkalan_id").references(() => pangkalan.id, { onDelete: "cascade" }), // NULL for global products
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    pangkalanIdIdx: index("product_pangkalan_id_idx").on(table.pangkalanId),
    uniqueNamePerPangkalan: unique("product_name_pangkalan_unique").on(table.name, table.pangkalanId),
}));

// Price Rules
export const priceRule = pgTable("price_rule", {
    id: text("id").primaryKey(),
    pangkalanId: text("pangkalan_id").notNull().references(() => pangkalan.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull().references(() => product.id, { onDelete: "cascade" }),
    basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(), // Base/Regular price
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    uniqueProductPerPangkalan: unique("price_rule_product_pangkalan_unique").on(table.productId, table.pangkalanId),
}));

// Inventory
export const inventory = pgTable("inventory", {
    id: text("id").primaryKey(),
    pangkalanId: text("pangkalan_id").notNull().references(() => pangkalan.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull().references(() => product.id, { onDelete: "cascade" }),
    stockFilled: integer("stock_filled").default(0).notNull(),
    stockEmpty: integer("stock_empty").default(0).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    uniqueProductPerPangkalan: unique("inventory_product_pangkalan_unique").on(table.productId, table.pangkalanId),
    pangkalanProductIdx: index("inventory_pangkalan_product_idx").on(table.pangkalanId, table.productId),
}));

// Transactions
export const transaction = pgTable("transaction", {
    id: text("id").primaryKey(),
    pangkalanId: text("pangkalan_id").notNull().references(() => pangkalan.id, { onDelete: "cascade" }),
    customerId: text("customer_id").references(() => customer.id, { onDelete: "set null" }),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    paymentMethod: text("payment_method").notNull(), // cash, qris, debt
    cashReceived: decimal("cash_received", { precision: 10, scale: 2 }),
    changeAmount: decimal("change_amount", { precision: 10, scale: 2 }),
    status: text("status").default("paid").notNull(), // paid, unpaid, void
    invoiceNumber: text("invoice_number").unique(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    pangkalanDateIdx: index("transaction_pangkalan_date_idx").on(table.pangkalanId, table.createdAt),
    customerIdx: index("transaction_customer_idx").on(table.customerId),
}));

// Transaction Items
export const transactionItem = pgTable("transaction_item", {
    id: text("id").primaryKey(),
    transactionId: text("transaction_id").notNull().references(() => transaction.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull().references(() => product.id, { onDelete: "cascade" }),
    qty: integer("qty").notNull(),
    priceAtPurchase: decimal("price_at_purchase", { precision: 10, scale: 2 }).notNull(),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
}, (table) => ({
    transactionIdx: index("transaction_item_transaction_idx").on(table.transactionId),
}));

// Inventory Logs
export const inventoryLog = pgTable("inventory_log", {
    id: text("id").primaryKey(),
    pangkalanId: text("pangkalan_id").notNull().references(() => pangkalan.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull().references(() => product.id, { onDelete: "cascade" }),
    qtyChangeFilled: integer("qty_change_filled"), // +/-
    qtyChangeEmpty: integer("qty_change_empty"), // +/-
    type: text("type").notNull(), // sale, manual_restock, correction, return
    note: text("note"),
    transactionId: text("transaction_id").references(() => transaction.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    pangkalanProductIdx: index("inventory_log_pangkalan_product_idx").on(table.pangkalanId, table.productId, table.createdAt),
}));

// Relations
export const pangkalanRelations = relations(pangkalan, ({ one, many }) => ({
    user: one(user, {
        fields: [pangkalan.userId],
        references: [user.id],
    }),
    customers: many(customer),
    products: many(product),
    priceRules: many(priceRule),
    inventory: many(inventory),
    transactions: many(transaction),
    inventoryLogs: many(inventoryLog),
}));

export const customerTypeRelations = relations(customerType, ({ many }) => ({
    customers: many(customer),
}));

export const customerRelations = relations(customer, ({ one, many }) => ({
    pangkalan: one(pangkalan, {
        fields: [customer.pangkalanId],
        references: [pangkalan.id],
    }),
    type: one(customerType, {
        fields: [customer.typeId],
        references: [customerType.id],
    }),
    transactions: many(transaction),
}));

export const productRelations = relations(product, ({ one, many }) => ({
    pangkalan: one(pangkalan, {
        fields: [product.pangkalanId],
        references: [pangkalan.id],
    }),
    priceRules: many(priceRule),
    inventory: many(inventory),
    transactionItems: many(transactionItem),
    inventoryLogs: many(inventoryLog),
}));

export const priceRuleRelations = relations(priceRule, ({ one }) => ({
    pangkalan: one(pangkalan, {
        fields: [priceRule.pangkalanId],
        references: [pangkalan.id],
    }),
    product: one(product, {
        fields: [priceRule.productId],
        references: [product.id],
    }),
}));

export const inventoryRelations = relations(inventory, ({ one, many }) => ({
    pangkalan: one(pangkalan, {
        fields: [inventory.pangkalanId],
        references: [pangkalan.id],
    }),
    product: one(product, {
        fields: [inventory.productId],
        references: [product.id],
    }),
    inventoryLogs: many(inventoryLog),
}));

export const transactionRelations = relations(transaction, ({ one, many }) => ({
    pangkalan: one(pangkalan, {
        fields: [transaction.pangkalanId],
        references: [pangkalan.id],
    }),
    customer: one(customer, {
        fields: [transaction.customerId],
        references: [customer.id],
    }),
    items: many(transactionItem),
    inventoryLogs: many(inventoryLog),
}));

export const transactionItemRelations = relations(transactionItem, ({ one }) => ({
    transaction: one(transaction, {
        fields: [transactionItem.transactionId],
        references: [transaction.id],
    }),
    product: one(product, {
        fields: [transactionItem.productId],
        references: [product.id],
    }),
}));

export const inventoryLogRelations = relations(inventoryLog, ({ one }) => ({
    pangkalan: one(pangkalan, {
        fields: [inventoryLog.pangkalanId],
        references: [pangkalan.id],
    }),
    product: one(product, {
        fields: [inventoryLog.productId],
        references: [product.id],
    }),
    transaction: one(transaction, {
        fields: [inventoryLog.transactionId],
        references: [transaction.id],
    }),
}));

// Types for TypeScript
export type Pangkalan = typeof pangkalan.$inferSelect;
export type NewPangkalan = typeof pangkalan.$inferInsert;

export type CustomerType = typeof customerType.$inferSelect;
export type NewCustomerType = typeof customerType.$inferInsert;

export type Customer = typeof customer.$inferSelect;
export type NewCustomer = typeof customer.$inferInsert;

export type Product = typeof product.$inferSelect;
export type NewProduct = typeof product.$inferInsert;

export type PriceRule = typeof priceRule.$inferSelect;
export type NewPriceRule = typeof priceRule.$inferInsert;

export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;

export type Transaction = typeof transaction.$inferSelect;
export type NewTransaction = typeof transaction.$inferInsert;

export type TransactionItem = typeof transactionItem.$inferSelect;
export type NewTransactionItem = typeof transactionItem.$inferInsert;

export type InventoryLog = typeof inventoryLog.$inferSelect;
export type NewInventoryLog = typeof inventoryLog.$inferInsert;