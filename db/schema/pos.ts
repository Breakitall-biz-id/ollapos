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

export const ExpenseCategory = {
    OPERATIONAL: 'operational',
    UTILITIES: 'utilities',
    MAINTENANCE: 'maintenance',
    SALARY: 'salary',
    MARKETING: 'marketing',
    EQUIPMENT: 'equipment',
    RENT: 'rent',
    TAX: 'tax',
    OTHER: 'other'
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
    minSpent: decimal("min_spent", { precision: 10, scale: 2 }).default("0"), // minimum spending to reach this tier
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
    totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default("0"),
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
    costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull().default("0"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    uniqueProductPerPangkalan: unique("price_rule_product_pangkalan_unique").on(table.productId, table.pangkalanId),
}));

// Product Tier Pricing (per-product per-tier discounts)
export const productTierPricing = pgTable("product_tier_pricing", {
    id: text("id").primaryKey(),
    pangkalanId: text("pangkalan_id").notNull().references(() => pangkalan.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull().references(() => product.id, { onDelete: "cascade" }),
    customerTypeId: text("customer_type_id").notNull().references(() => customerType.id, { onDelete: "cascade" }),
    discountType: text("discount_type").notNull(), // 'percentage' or 'fixed'
    discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    uniqueProductTypePangkalan: unique("product_tier_pricing_unique").on(table.productId, table.customerTypeId, table.pangkalanId),
    pangkalanIdx: index("product_tier_pricing_pangkalan_idx").on(table.pangkalanId),
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
    totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull().default("0"),
    totalProfit: decimal("total_profit", { precision: 10, scale: 2 }).notNull().default("0"),
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
    costAtPurchase: decimal("cost_at_purchase", { precision: 10, scale: 2 }).notNull().default("0"),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    profit: decimal("profit", { precision: 10, scale: 2 }).notNull().default("0"),
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

// Expense Categories (Predefined categories with user-friendly names)
export const expenseCategory = pgTable("expense_category", {
    id: text("id").primaryKey(), // Will use the enum values as IDs
    name: text("name").notNull().unique(), // Display name for the category
    description: text("description"),
    color: text("color").notNull().default("#6B7280"), // Hex color for UI
    icon: text("icon").notNull().default("FileText"), // Icon name from lucide-react
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Expenses
export const expense = pgTable("expense", {
    id: text("id").primaryKey(),
    pangkalanId: text("pangkalan_id").notNull().references(() => pangkalan.id, { onDelete: "cascade" }),
    categoryId: text("category_id").notNull().references(() => expenseCategory.id, { onDelete: "restrict" }),
    description: text("description").notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    receiptNumber: text("receipt_number").unique(),
    notes: text("notes"),
    expenseDate: timestamp("expense_date").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    pangkalanDateIdx: index("expense_pangkalan_date_idx").on(table.pangkalanId, table.expenseDate),
    categoryIdx: index("expense_category_idx").on(table.categoryId),
    receiptNumberIdx: index("expense_receipt_number_idx").on(table.receiptNumber),
}));

// Capital Entries (manual modal masuk/keluar)
export const capitalEntry = pgTable("capital_entry", {
    id: text("id").primaryKey(),
    pangkalanId: text("pangkalan_id").notNull().references(() => pangkalan.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // in | out
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    pangkalanDateIdx: index("capital_entry_pangkalan_date_idx").on(table.pangkalanId, table.createdAt),
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
    expenses: many(expense),
    capitalEntries: many(capitalEntry),
}));

export const customerTypeRelations = relations(customerType, ({ many }) => ({
    customers: many(customer),
    productTierPricings: many(productTierPricing),
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
    productTierPricings: many(productTierPricing),
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

export const productTierPricingRelations = relations(productTierPricing, ({ one }) => ({
    pangkalan: one(pangkalan, {
        fields: [productTierPricing.pangkalanId],
        references: [pangkalan.id],
    }),
    product: one(product, {
        fields: [productTierPricing.productId],
        references: [product.id],
    }),
    customerType: one(customerType, {
        fields: [productTierPricing.customerTypeId],
        references: [customerType.id],
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

export const expenseCategoryRelations = relations(expenseCategory, ({ many }) => ({
    expenses: many(expense),
}));

export const expenseRelations = relations(expense, ({ one }) => ({
    pangkalan: one(pangkalan, {
        fields: [expense.pangkalanId],
        references: [pangkalan.id],
    }),
    category: one(expenseCategory, {
        fields: [expense.categoryId],
        references: [expenseCategory.id],
    }),
}));

export const capitalEntryRelations = relations(capitalEntry, ({ one }) => ({
    pangkalan: one(pangkalan, {
        fields: [capitalEntry.pangkalanId],
        references: [pangkalan.id],
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

export type ExpenseCategory = typeof expenseCategory.$inferSelect;
export type NewExpenseCategory = typeof expenseCategory.$inferInsert;

export type Expense = typeof expense.$inferSelect;
export type NewExpense = typeof expense.$inferInsert;

export type ProductTierPricing = typeof productTierPricing.$inferSelect;
export type NewProductTierPricing = typeof productTierPricing.$inferInsert;

export type CapitalEntry = typeof capitalEntry.$inferSelect;
export type NewCapitalEntry = typeof capitalEntry.$inferInsert;
