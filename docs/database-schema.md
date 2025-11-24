# Database Schema & Migration Plan

## Prisma Schema Definition

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Enums
enum UserRole {
  agent
  pangkalan
}

enum ProductCategory {
  gas
  water
  general
}

enum PaymentMethod {
  cash
  qris
  debt
}

enum TransactionStatus {
  paid
  unpaid
  void
}

enum InventoryLogType {
  sale
  manual_restock
  correction
  return
}

// Models
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  name              String?
  role              UserRole  @default(pangkalan)
  createdAt         DateTime  @default(now())

  // Relations
  pangkalan         Pangkalan?

  // Better Auth fields
  emailVerified     DateTime?
  image             String?

  @@map("users")
}

model Pangkalan {
  id          String   @id @default(cuid())
  userId      String   @unique
  name        String
  address     String?
  phone       String?
  createdAt   DateTime @default(now())

  // Relations
  user        User     @relation(fields: [userId], references: [id])
  customers   Customer[]
  products    Product[]
  inventory   Inventory[]
  priceRules  PriceRule[]
  transactions Transaction[]
  inventoryLogs InventoryLog[]

  @@map("pangkalans")
}

model Customer {
  id          String   @id @default(cuid())
  pangkalanId String
  name        String
  isVip       Boolean  @default(false) @map("is_vip")
  phone       String?
  createdAt   DateTime @default(now())

  // Relations
  pangkalan   Pangkalan @relation(fields: [pangkalanId], references: [id])
  transactions Transaction[]

  @@map("customers")
}

model Product {
  id          String          @id @default(cuid())
  name        String
  category    ProductCategory
  imageUrl    String?         @map("image_url")
  isGlobal    Boolean         @default(false) @map("is_global")
  pangkalanId String?         // NULL for global products (LPG)
  createdAt   DateTime        @default(now())

  // Relations
  pangkalan   Pangkalan?      @relation(fields: [pangkalanId], references: [id])
  priceRules  PriceRule[]
  inventory   Inventory[]
  transactionItems TransactionItem[]

  @@unique([pangkalanId, name])
  @@map("products")
}

model Inventory {
  id           String   @id @default(cuid())
  pangkalanId  String
  productId    String
  stockFilled  Int      @default(0) @map("stock_filled")
  stockEmpty   Int      @default(0) @map("stock_empty")
  updatedAt    DateTime @default(now()) @updatedAt

  // Relations
  pangkalan    Pangkalan @relation(fields: [pangkalanId], references: [id])
  product      Product   @relation(fields: [productId], references: [id])
  inventoryLogs InventoryLog[]

  @@unique([pangkalanId, productId])
  @@map("inventory")
}

model PriceRule {
  id           String   @id @default(cuid())
  pangkalanId  String
  productId    String
  priceRegular Decimal  @map("price_regular") @db.Decimal(10, 2)
  priceVip     Decimal  @map("price_vip") @db.Decimal(10, 2)
  updatedAt    DateTime @default(now()) @updatedAt

  // Relations
  pangkalan    Pangkalan @relation(fields: [pangkalanId], references: [id])
  product      Product   @relation(fields: [productId], references: [id])

  @@unique([pangkalanId, productId])
  @@map("price_rules")
}

model Transaction {
  id             String             @id @default(cuid())
  pangkalanId    String
  customerId     String?
  totalAmount    Decimal            @map("total_amount") @db.Decimal(10, 2)
  paymentMethod  PaymentMethod      @map("payment_method")
  cashReceived   Decimal?           @map("cash_received") @db.Decimal(10, 2)
  changeAmount   Decimal?           @map("change_amount") @db.Decimal(10, 2)
  status         TransactionStatus  @default(paid)
  invoiceNumber  String?            @unique @map("invoice_number")
  notes          String?
  createdAt      DateTime           @default(now())

  // Relations
  pangkalan      Pangkalan          @relation(fields: [pangkalanId], references: [id])
  customer       Customer?          @relation(fields: [customerId], references: [id])
  items          TransactionItem[]
  inventoryLogs  InventoryLog[]

  @@map("transactions")
}

model TransactionItem {
  id              String   @id @default(cuid())
  transactionId   String
  productId       String
  qty             Int
  priceAtPurchase Decimal  @map("price_at_purchase") @db.Decimal(10, 2)
  subtotal        Decimal  @db.Decimal(10, 2)

  // Relations
  transaction     Transaction @relation(fields: [transactionId], references: [id])
  product         Product     @relation(fields: [productId], references: [id])

  @@map("transaction_items")
}

model InventoryLog {
  id                 String          @id @default(cuid())
  pangkalanId        String
  productId          String
  qtyChangeFilled    Int?            @map("qty_change_filled")
  qtyChangeEmpty     Int?            @map("qty_change_empty")
  type               InventoryLogType
  note               String?
  transactionId      String?         @map("transaction_id")
  createdAt          DateTime        @default(now())

  // Relations
  pangkalan          Pangkalan       @relation(fields: [pangkalanId], references: [id])
  product            Product         @relation(fields: [productId], references: [id])
  transaction        Transaction?    @relation(fields: [transactionId], references: [id])
  inventory          Inventory?      @relation(fields: [pangkalanId, productId], references: [pangkalanId, productId])

  @@map("inventory_logs")
}
```

## Migration Plan

### Step 1: Initial Database Setup
```bash
# Install Prisma CLI
npm install prisma --save-dev

# Initialize Prisma
npx prisma init

# Create initial migration
npx prisma migrate dev --name init
```

### Step 2: Seed Data Implementation

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 1. Create Pangkalan User
  const hashedPassword = await bcrypt.hash('password123', 10)

  const user = await prisma.user.create({
    data: {
      email: 'bude@sri-pangkalan.com',
      name: 'Bude Sri',
      role: 'pangkalan',
    }
  })

  // 2. Create Pangkalan Profile
  const pangkalan = await prisma.pangkalan.create({
    data: {
      userId: user.id,
      name: 'Pangkalan Bude Sri',
      address: 'Jl. Merdeka No. 123, Jakarta',
      phone: '0812-3456-7890',
    }
  })

  // 3. Create Global Products (LPG)
  const globalProducts = await prisma.product.createMany({
    data: [
      {
        name: 'Gas LPG 3kg',
        category: 'gas',
        isGlobal: true,
        imageUrl: '/images/gas-3kg.jpg',
      },
      {
        name: 'Gas LPG 5.5kg',
        category: 'gas',
        isGlobal: true,
        imageUrl: '/images/gas-5kg.jpg',
      },
      {
        name: 'Gas LPG 12kg',
        category: 'gas',
        isGlobal: true,
        imageUrl: '/images/gas-12kg.jpg',
      }
    ]
  })

  // 4. Create Local Products
  const localProducts = await prisma.product.createMany({
    data: [
      {
        name: 'Air Galon',
        category: 'water',
        pangkalanId: pangkalan.id,
        imageUrl: '/images/galon.jpg',
      },
      {
        name: 'Beras 5kg',
        category: 'general',
        pangkalanId: pangkalan.id,
        imageUrl: '/images/beras.jpg',
      }
    ]
  })

  // 5. Get all products for price rules and inventory
  const allProducts = await prisma.product.findMany({
    where: {
      OR: [
        { isGlobal: true },
        { pangkalanId: pangkalan.id }
      ]
    }
  })

  // 6. Create Price Rules
  await prisma.priceRule.createMany({
    data: allProducts.map(product => ({
      pangkalanId: pangkalan.id,
      productId: product.id,
      priceRegular: product.category === 'gas' ? 25000 : 15000, // Default prices
      priceVip: product.category === 'gas' ? 23000 : 14000, // VIP prices
    }))
  })

  // 7. Create Initial Inventory
  await prisma.inventory.createMany({
    data: allProducts.map(product => ({
      pangkalanId: pangkalan.id,
      productId: product.id,
      stockFilled: product.category === 'gas' ? 100 : 50, // Initial stock
      stockEmpty: product.category === 'gas' ? 50 : 0, // Empty canisters for gas
    }))
  })

  // 8. Create Sample Customers
  await prisma.customer.createMany({
    data: [
      {
        pangkalanId: pangkalan.id,
        name: 'Pak Joko Bakso',
        isVip: true,
        phone: '0813-9876-5432',
      },
      {
        pangkalanId: pangkalan.id,
        name: 'Ibu Sumiati',
        isVip: false,
        phone: '0822-1111-2222',
      },
      {
        pangkalanId: pangkalan.id,
        name: 'Bapak Ahmad',
        isVip: true,
        phone: '0818-5555-6666',
      }
    ]
  })

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

### Step 3: Database Connection Setup

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### Step 4: Environment Variables

```env
# .env.local
DATABASE_URL="postgresql://username:password@localhost:5432/gasstation_pos?schema=public"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:3000"

# Next.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"
```

## Database Relationships Overview

```mermaid
erDiagram
    User ||--|| Pangkalan : "has one"
    Pangkalan ||--o{ Customer : "has many"
    Pangkalan ||--o{ Product : "has many local"
    Product ||--o{ PriceRule : "has many"
    Product ||--o{ Inventory : "has many"
    Product ||--o{ TransactionItem : "has many"
    Pangkalan ||--o{ Transaction : "has many"
    Customer ||--o{ Transaction : "has many"
    Transaction ||--o{ TransactionItem : "has many"
    Transaction ||--o{ InventoryLog : "has many"
    Pangkalan ||--o{ InventoryLog : "has many"
    Product ||--o{ InventoryLog : "has many"
    Pangkalan ||--o{ Inventory : "has many"
```

## Key Database Logic

### 1. Pricing Query
```sql
-- Get price for specific customer
SELECT
  pr.price_regular,
  pr.price_vip,
  c.is_vip
FROM price_rules pr
JOIN products p ON pr.product_id = p.id
JOIN pangkalans pang ON pr.pangkalan_id = pang.id
LEFT JOIN customers c ON c.id = $customer_id
WHERE pr.product_id = $product_id
  AND pr.pangkalan_id = $pangkalan_id;
```

### 2. Inventory Update on Sale
```sql
-- Update inventory after transaction
UPDATE inventory
SET
  stock_filled = stock_filled - $qty,
  stock_empty = stock_empty + $qty,
  updated_at = NOW()
WHERE pangkalan_id = $pangkalan_id
  AND product_id = $product_id;
```

### 3. Restock Logic (Swap)
```sql
-- Manual restock with swap logic
UPDATE inventory
SET
  stock_filled = stock_filled + $qty,
  stock_empty = stock_empty - $qty,
  updated_at = NOW()
WHERE pangkalan_id = $pangkalan_id
  AND product_id = $product_id;
```

## Database Optimization

### Indexes
```sql
-- Performance indexes
CREATE INDEX idx_inventory_pangkalan_product ON inventory(pangkalan_id, product_id);
CREATE INDEX idx_transactions_pangkalan_date ON transactions(pangkalan_id, created_at);
CREATE INDEX idx_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX idx_inventory_logs_pangkalan_product ON inventory_logs(pangkalan_id, product_id, created_at);
CREATE INDEX idx_customers_pangkalan_vip ON customers(pangkalan_id, is_vip);
```

### Constraints
```sql
-- Prevent negative stock
ALTER TABLE inventory ADD CONSTRAINT check_stock_non_negative
CHECK (stock_filled >= 0 AND stock_empty >= 0);

-- Validate price rules
ALTER TABLE price_rules ADD CONSTRAINT check_price_positive
CHECK (price_regular > 0 AND price_vip > 0 AND price_vip <= price_regular);
```

## Migration Commands

```bash
# Development
npx prisma migrate dev --name add_new_feature
npx prisma generate
npx prisma db seed

# Production
npx prisma migrate deploy
npx prisma generate

# Reset development database
npx prisma migrate reset
```

This database schema provides a robust foundation for the Ollapos system with proper relationships, constraints, and optimization for elderly-friendly retail operations.