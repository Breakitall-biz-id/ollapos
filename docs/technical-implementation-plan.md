# Technical Implementation Plan

## Project Overview
Ollapos - Elderly-friendly Point of Sale system for LPG retailers (Pangkalan)

### Tech Stack
- **Frontend**: Next.js 14+ (App Router), TypeScript
- **UI**: Tailwind CSS, Shadcn/ui Components
- **Icons**: Lucide React
- **Backend**: Next.js Server Actions
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better Auth
- **State Management**: Zustand
- **Deployment**: Standalone desktop mode (1920x1080 optimization)

## Architecture Overview

### 1. Project Structure
```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/                # Main POS interface
│   │   └── page.tsx             # Split-screen layout
│   ├── inventory/               # Inventory management
│   │   ├── restock/
│   │   └── logs/
│   ├── customers/               # Customer management
│   ├── api/                     # API endpoints (if needed)
│   └── globals.css
├── components/                  # Reusable components
│   ├── ui/                     # Shadcn/ui base components
│   ├── pos/                    # POS-specific components
│   ├── layout/                 # Layout components
│   └── forms/                  # Form components
├── lib/                        # Utilities and configurations
│   ├── auth.ts                 # Better Auth config
│   ├── db.ts                   # Database connection
│   ├── utils.ts                # Helper functions
│   └── validations.ts          # Zod schemas
├── stores/                     # Zustand stores
│   ├── cart.ts                 # Shopping cart state
│   ├── pos.ts                  # POS session state
│   └── inventory.ts            # Inventory state
├── types/                      # TypeScript type definitions
├── hooks/                      # Custom React hooks
└── server/                     # Server actions
    ├── actions/
    │   ├── auth.ts
    │   ├── transactions.ts
    │   ├── inventory.ts
    │   └── customers.ts
    └── queries/
```

### 2. Core Features Implementation

#### 2.1 Authentication System
**Implementation Details:**
- Better Auth with email/password
- Long-lived sessions (30 days)
- Role-based access (agent/pangkalan)
- Session persistence across browser restarts

**Key Components:**
- `lib/auth.ts` - Better Auth configuration
- `server/actions/auth.ts` - Authentication server actions
- Login/Register forms with elderly-friendly UI

#### 2.2 Split Screen POS Interface
**Layout Structure:**
```tsx
// Dashboard Layout (1920x1080 optimized)
<div className="flex h-screen">
  {/* Left Side - Product Catalog (60% width) */}
  <div className="w-3/5 p-4 border-r">
    <ProductCatalog />
  </div>

  {/* Right Side - Cart & Checkout (40% width) */}
  <div className="w-2/5 p-4">
    <CartAndCheckout />
  </div>
</div>
```

**Key Components:**
- `ProductCatalog` - Category tabs and product grid
- `ProductCard` - Large, clickable product cards with image
- `CartAndCheckout` - Shopping cart and payment interface
- `CartItem` - Individual cart items with +/- controls

#### 2.3 Elderly-Friendly UI Components
**Design Specifications:**
- Base font size: 18px
- Important text (prices): 24-36px, bold
- Large clickable areas (min 20px padding)
- High contrast colors
- No hidden menus or right-click functionality

**Special Components:**
- `NumpadModal` - On-screen number pad for all numeric input
- `SmartCalculator` - Payment calculator with quick amount buttons
- `ConfirmationDialog` - Large, clear confirmation dialogs

#### 2.4 Smart Shopping Cart
**Features:**
- Single-click add to cart (+1)
- Click quantity to edit via numpad modal
- Customer-based pricing (Regular vs VIP)
- Real-time total calculation
- Visual feedback for all actions

**State Management:**
```typescript
interface CartItem {
  productId: string;
  quantity: number;
  priceAtPurchase: number;
  subtotal: number;
}

interface CartState {
  items: CartItem[];
  customerId?: string;
  total: number;
  addItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setCustomer: (customerId: string) => void;
  clearCart: () => void;
}
```

#### 2.5 Payment System
**Payment Methods:**
1. **Cash**: Smart calculator with preset amounts and change calculation
2. **QRIS**: Static QR display with manual confirmation
3. **Debt (Kasbon)**: Requires customer selection, creates unpaid transaction

**Payment Flow:**
1. Click "BAYAR" → Open payment modal
2. Select payment method
3. Process payment logic
4. Generate receipt/struk
5. Update inventory automatically

#### 2.6 Inventory Management
**Key Features:**
- Manual restock with swap logic (filled +, empty -)
- Real-time stock tracking
- Inventory movement logs
- Low stock alerts

**Swap Logic Implementation:**
```typescript
async function restockProduct(
  pangkalanId: string,
  productId: string,
  quantity: number
) {
  // When receiving new filled canisters:
  await updateInventory(pangkalanId, productId, {
    stock_filled: { increment: quantity },
    stock_empty: { decrement: quantity }
  });

  // Log the movement
  await logInventoryChange(pangkalanId, productId, {
    qty_change_filled: quantity,
    qty_change_empty: -quantity,
    type: 'manual_restock',
    note: `Restok ${quantity} unit`
  });
}
```

### 3. Database Schema Implementation

#### 3.1 Prisma Schema Structure
```prisma
// Core enums
enum UserRole { agent, pangkalan }
enum ProductCategory { gas, water, general }
enum PaymentMethod { cash, qris, debt }
enum TransactionStatus { paid, unpaid, void }

// Key models with relationships
model User {
  id      String   @id @default(cuid())
  email   String   @unique
  name    String?
  role    UserRole @default(pangkalan)
  pangkalan Pangkalan?
  // Better Auth fields
  // ...
}

model Product {
  id          String          @id @default(cuid())
  name        String
  category    ProductCategory
  imageUrl    String?
  isGlobal    Boolean         @default(false)
  pangkalanId String?
  pangkalan   Pangkalan?      @relation(fields: [pangkalanId], references: [id])
  priceRules  PriceRule[]
  inventory   Inventory[]
  transactionItems TransactionItem[]
}

model Inventory {
  id           String  @id @default(cuid())
  pangkalanId  String
  productId    String
  stockFilled  Int     @default(0) @map("stock_filled")
  stockEmpty   Int     @default(0) @map("stock_empty")
  updatedAt    DateTime @default(now()) @updatedAt
  pangkalan    Pangkalan @relation(fields: [pangkalanId], references: [id])
  product      Product   @relation(fields: [productId], references: [id])

  @@unique([pangkalanId, productId])
}
```

### 4. Server Actions Implementation

#### 4.1 Transaction Processing
```typescript
// server/actions/transactions.ts
export async function createTransaction(data: {
  pangkalanId: string;
  customerId?: string;
  items: Array<{ productId: string; quantity: number }>;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
}) {
  // 1. Calculate pricing based on customer VIP status
  // 2. Create transaction record
  // 3. Create transaction items
  // 4. Update inventory (stock movement)
  // 5. Log inventory changes
  // 6. Handle payment method specific logic
}
```

#### 4.2 Pricing Engine
```typescript
// server/actions/pricing.ts
export async function getProductPrice(
  productId: string,
  pangkalanId: string,
  customerId?: string
): Promise<number> {
  // Get price rules for product
  // Check if customer is VIP
  // Return appropriate price (regular or VIP)
}
```

### 5. Performance & Optimization

#### 5.1 Database Optimization
- Composite indexes on frequently queried fields
- Connection pooling for concurrent access
- Read replicas for dashboard queries (future scaling)

#### 5.2 Frontend Optimization
- Image optimization for product photos
- Lazy loading for customer lists
- Debounced search for product lookup
- Efficient re-renders with proper state management

### 6. Security Considerations

#### 6.1 Authentication & Authorization
- Role-based access control
- Session management with secure cookies
- Input validation and sanitization

#### 6.2 Data Protection
- SQL injection prevention with Prisma
- XSS protection with React's built-in safeguards
- CSRF protection with Next.js built-in features

### 7. Testing Strategy

#### 7.1 Unit Tests
- Business logic validation (pricing, inventory)
- Server action testing
- Component unit tests

#### 7.2 Integration Tests
- End-to-end transaction flow
- Payment processing
- Inventory updates

#### 7.3 User Acceptance Testing
- Elderly user testing sessions
- Accessibility testing
- Performance testing on target hardware

### 8. Deployment & DevOps

#### 8.1 Development Environment
- Docker Compose for local development
- Database migrations with Prisma
- Seed data for testing

#### 8.2 Production Deployment
- Standalone deployment on desktop all-in-one
- Automated backups
- Monitoring and logging

## Implementation Priority

### Phase 1: Core POS (MVP)
1. Authentication system
2. Basic product catalog
3. Shopping cart functionality
4. Cash payment processing
5. Basic inventory tracking

### Phase 2: Enhanced Features
1. Customer management with VIP pricing
2. QRIS payment integration
3. Debt/kasbon functionality
4. Advanced inventory management
5. Reporting and analytics

### Phase 3: Optimization & Polish
1. Performance optimization
2. Accessibility improvements
3. Additional reporting features
4. Mobile responsiveness (future)

This technical plan provides a comprehensive roadmap for implementing the Ollapos system with elderly-friendly design principles and robust business logic.