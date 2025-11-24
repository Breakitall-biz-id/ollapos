# UI Components Breakdown & Structure

## Design System for Elderly-Friendly Interface

### Typography Scale
```css
/* Base: 18px (Large and readable) */
.text-xs { font-size: 14px; line-height: 20px; } /* Small labels */
.text-base { font-size: 18px; line-height: 24px; } /* Default text */
.text-lg { font-size: 20px; line-height: 28px; } /* Subheadings */
.text-xl { font-size: 24px; line-height: 32px; } /* Important text */
.text-2xl { font-size: 28px; line-height: 36px; } /* Section headers */
.text-3xl { font-size: 32px; line-height: 40px; } /* Page titles */
.text-4xl { font-size: 36px; line-height: 44px; } /* Prices, totals */
.text-5xl { font-size: 48px; line-height: 56px; } /* Large displays */

/* Font weights */
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
```

### Color Palette (High Contrast)
```css
/* Primary Colors */
.bg-primary { background-color: #0066CC; } /* Blue for primary actions */
.bg-primary-hover { background-color: #0052A3; }
.bg-success { background-color: #10B981; } /* Green for success */
.bg-success-hover { background-color: #059669; }
.bg-warning { background-color: #F59E0B; } /* Orange for warnings */
.bg-danger { background-color: #EF4444; } /* Red for danger/delete */
.bg-secondary { background-color: #6B7280; } /* Gray for secondary */

/* Surface Colors */
.bg-surface { background-color: #FFFFFF; }
.bg-surface-secondary { background-color: #F9FAFB; }
.bg-surface-tertiary { background-color: #F3F4F6; }

/* Text Colors */
.text-primary { color: #111827; }
.text-secondary { color: #6B7280; }
.text-muted { color: #9CA3AF; }
.text-white { color: #FFFFFF; }

/* Border Colors */
.border-light { border-color: #E5E7EB; }
.border-medium { border-color: #D1D5DB; }
.border-dark { border-color: #9CA3AF; }
```

### Spacing System
```css
/* Base 8px grid system */
.p-2 { padding: 8px; }      /* Small spacing */
.p-3 { padding: 12px; }     /* Default button padding */
.p-4 { padding: 16px; }     /* Card padding */
.p-5 { padding: 20px; }     /* Large padding */
.p-6 { padding: 24px; }     /* Section padding */
.p-8 { padding: 32px; }     /* Large section padding */

/* Minimum touch targets (44px minimum for accessibility) */
.min-h-11 { min-height: 44px; } /* Minimum button height */
.min-h-12 { min-height: 48px; } /* Large buttons */
.min-h-14 { min-height: 56px; } /* Extra large buttons */
```

## Core Components Architecture

### 1. Base UI Components (Shadcn/ui Extensions)

#### Button Component
```tsx
// components/ui/button.tsx
import { forwardRef } from "react"
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary-hover min-h-12 px-6 text-lg",
        success: "bg-success text-white hover:bg-success-hover min-h-12 px-6 text-lg",
        danger: "bg-danger text-white hover:bg-red-700 min-h-12 px-6 text-lg",
        outline: "border border-medium text-primary hover:bg-surface-secondary min-h-12 px-6 text-lg",
        ghost: "text-primary hover:bg-surface-secondary min-h-12 px-6 text-lg",
        // Extra large for primary actions
        xl: "bg-primary text-white hover:bg-primary-hover min-h-14 px-8 text-xl font-semibold",
      },
      size: {
        sm: "h-10 px-4 text-base",
        md: "min-h-12 px-6 text-lg",
        lg: "min-h-14 px-8 text-xl",
        xl: "min-h-16 px-10 text-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

#### Card Component
```tsx
// components/ui/card.tsx
const Card = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-light bg-surface text-primary shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"
```

### 2. POS-Specific Components

#### ProductCard Component
```tsx
// components/pos/ProductCard.tsx
interface ProductCardProps {
  product: {
    id: string
    name: string
    category: ProductCategory
    imageUrl?: string
    price: number
    stock: number
  }
  quantityInCart: number
  onAddToCart: (productId: string) => void
  onEditQuantity?: (productId: string) => void
}

export function ProductCard({
  product,
  quantityInCart,
  onAddToCart,
  onEditQuantity
}: ProductCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Product Image */}
        <div className="relative aspect-square mb-3 bg-surface-secondary rounded-lg overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-16 h-16 text-muted" />
            </div>
          )}

          {/* Quantity Badge */}
          {quantityInCart > 0 && (
            <div
              className="absolute top-2 right-2 bg-primary text-white rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                onEditQuantity?.(product.id)
              }}
            >
              {quantityInCart}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg text-primary line-clamp-2">
            {product.name}
          </h3>

          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(product.price)}
            </span>
            <span className="text-sm text-secondary">
              Stok: {product.stock}
            </span>
          </div>

          {/* Stock Warning */}
          {product.stock <= 10 && (
            <div className="flex items-center text-warning text-base font-medium">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Stok menipis!
            </div>
          )}
        </div>

        {/* Add to Cart Button */}
        <Button
          className="w-full mt-4"
          onClick={() => onAddToCart(product.id)}
          disabled={product.stock === 0}
        >
          {product.stock === 0 ? "Habis" : "Tambah"}
        </Button>
      </CardContent>
    </Card>
  )
}
```

#### CartItem Component
```tsx
// components/pos/CartItem.tsx
interface CartItemProps {
  item: {
    id: string
    productId: string
    name: string
    quantity: number
    price: number
    subtotal: number
  }
  onQuantityChange: (productId: string, quantity: number) => void
  onRemove: (productId: string) => void
  onEditQuantity: (productId: string) => void
}

export function CartItem({
  item,
  onQuantityChange,
  onRemove,
  onEditQuantity
}: CartItemProps) {
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Product Info */}
          <div className="flex-1">
            <h4 className="font-semibold text-lg text-primary">
              {item.name}
            </h4>
            <div className="text-secondary text-base">
              {formatCurrency(item.price)} × {item.quantity}
            </div>
          </div>

          {/* Quantity Controls */}
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuantityChange(item.productId, item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="w-10 h-10 p-0"
            >
              <Minus className="w-5 h-5" />
            </Button>

            {/* Editable Quantity */}
            <button
              className="min-w-[60px] text-center text-xl font-bold py-2 px-3 border border-medium rounded-lg hover:bg-surface-secondary"
              onClick={() => onEditQuantity(item.productId)}
            >
              {item.quantity}
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuantityChange(item.productId, item.quantity + 1)}
              className="w-10 h-10 p-0"
            >
              <Plus className="w-5 h-5" />
            </Button>

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(item.productId)}
              className="w-10 h-10 p-0 text-danger hover:text-danger"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Subtotal */}
        <div className="mt-3 text-right">
          <span className="text-xl font-bold text-primary">
            {formatCurrency(item.subtotal)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
```

#### NumpadModal Component
```tsx
// components/ui/NumpadModal.tsx
interface NumpadModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (value: number) => void
  title: string
  initialValue?: number
  maxValue?: number
}

export function NumpadModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  initialValue = 0,
  maxValue
}: NumpadModalProps) {
  const [value, setValue] = useState(initialValue.toString())

  const handleNumberPress = (num: string) => {
    if (num === '0' && value === '0') return
    if (maxValue && parseInt(value + num) > maxValue) return
    setValue(value === '0' ? num : value + num)
  }

  const handleClear = () => {
    setValue('0')
  }

  const handleBackspace = () => {
    setValue(value.length > 1 ? value.slice(0, -1) : '0')
  }

  const handleConfirm = () => {
    onConfirm(parseInt(value))
    onClose()
    setValue('0')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">{title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Display */}
          <div className="bg-surface-secondary border-2 border-medium rounded-lg p-4 text-center">
            <div className="text-4xl font-bold text-primary">
              {formatCurrency(parseInt(value) || 0)}
            </div>
          </div>

          {/* Numpad Grid */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                size="lg"
                onClick={() => handleNumberPress(num.toString())}
                className="text-2xl font-semibold min-h-14"
              >
                {num}
              </Button>
            ))}

            <Button
              variant="outline"
              size="lg"
              onClick={handleClear}
              className="text-lg font-semibold min-h-14 text-danger hover:text-danger"
            >
              HAPUS
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => handleNumberPress('0')}
              className="text-2xl font-semibold min-h-14"
            >
              0
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleBackspace}
              className="min-h-14"
            >
              <Backspace className="w-6 h-6" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Batal
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
            >
              Konfirmasi
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

#### PaymentModal Component
```tsx
// components/pos/PaymentModal.tsx
interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  totalAmount: number
  onPaymentComplete: (paymentData: PaymentData) => void
}

interface PaymentData {
  method: PaymentMethod
  cashReceived?: number
  changeAmount?: number
  customerId?: string
}

export function PaymentModal({
  isOpen,
  onClose,
  totalAmount,
  onPaymentComplete
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash')
  const [cashReceived, setCashReceived] = useState(0)
  const [selectedCustomer, setSelectedCustomer] = useState<string>()

  const quickAmounts = [
    { label: 'Pas', value: totalAmount },
    { label: '20rb', value: 20000 },
    { label: '50rb', value: 50000 },
    { label: '100rb', value: 100000 },
    { label: '200rb', value: 200000 },
    { label: '500rb', value: 500000 },
  ]

  const changeAmount = cashReceived - totalAmount

  const handlePayment = () => {
    const paymentData: PaymentData = {
      method: selectedMethod,
      cashReceived: selectedMethod === 'cash' ? cashReceived : undefined,
      changeAmount: selectedMethod === 'cash' ? Math.max(0, changeAmount) : undefined,
      customerId: selectedMethod === 'debt' ? selectedCustomer : undefined,
    }

    onPaymentComplete(paymentData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-3xl text-center">Pembayaran</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Total Amount Display */}
          <div className="bg-primary text-white rounded-lg p-6 text-center">
            <div className="text-lg mb-2">Total Tagihan</div>
            <div className="text-5xl font-bold">
              {formatCurrency(totalAmount)}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold">Pilih Metode Pembayaran</h3>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={selectedMethod === 'cash' ? 'default' : 'outline'}
                onClick={() => setSelectedMethod('cash')}
                className="min-h-16 text-lg flex flex-col space-y-1"
              >
                <DollarSign className="w-8 h-8" />
                <span>Tunai</span>
              </Button>

              <Button
                variant={selectedMethod === 'qris' ? 'default' : 'outline'}
                onClick={() => setSelectedMethod('qris')}
                className="min-h-16 text-lg flex flex-col space-y-1"
              >
                <QrCode className="w-8 h-8" />
                <span>QRIS</span>
              </Button>

              <Button
                variant={selectedMethod === 'debt' ? 'default' : 'outline'}
                onClick={() => setSelectedMethod('debt')}
                className="min-h-16 text-lg flex flex-col space-y-1"
              >
                <FileText className="w-8 h-8" />
                <span>Kasbon</span>
              </Button>
            </div>
          </div>

          {/* Method-specific Content */}
          {selectedMethod === 'cash' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Masukkan Uang yang Diterima</h3>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-3 gap-3">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount.label}
                    variant="outline"
                    onClick={() => setCashReceived(amount.value)}
                    className="text-lg min-h-14"
                  >
                    {amount.label}
                  </Button>
                ))}
              </div>

              {/* Custom Amount Input */}
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <NumpadModal
                    isOpen={false}
                    onClose={() => {}}
                    onConfirm={(value) => setCashReceived(value)}
                    title="Masukkan Jumlah Uang"
                    initialValue={cashReceived}
                  />
                </div>
              </div>

              {/* Change Calculation */}
              {cashReceived > 0 && (
                <div className="bg-success/10 border-2 border-success rounded-lg p-4 text-center">
                  <div className="text-lg text-success font-medium mb-1">
                    Kembalian
                  </div>
                  <div className="text-4xl font-bold text-success">
                    {formatCurrency(Math.max(0, changeAmount))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedMethod === 'qris' && (
            <div className="space-y-4 text-center">
              <div className="bg-surface-secondary border-2 border-medium rounded-lg p-8">
                <QrCode className="w-32 h-32 mx-auto mb-4 text-primary" />
                <p className="text-lg">Scan QR Code di atas</p>
                <p className="text-secondary">atau transfer ke rekening</p>
                <p className="text-xl font-mono font-bold mt-2">1234567890</p>
              </div>
            </div>
          )}

          {selectedMethod === 'debt' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Pilih Pelanggan</h3>
              <CustomerSelector
                selectedCustomerId={selectedCustomer}
                onCustomerSelect={setSelectedCustomer}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <Button
              variant="outline"
              className="flex-1 min-h-14 text-lg"
              onClick={onClose}
            >
              Batal
            </Button>
            <Button
              className="flex-1 min-h-14 text-lg"
              onClick={handlePayment}
              disabled={
                (selectedMethod === 'cash' && cashReceived < totalAmount) ||
                (selectedMethod === 'debt' && !selectedCustomer)
              }
            >
              {selectedMethod === 'cash' ? 'Proses Pembayaran' : 'Simpan Transaksi'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 3. Layout Components

#### SplitScreenLayout Component
```tsx
// components/layout/SplitScreenLayout.tsx
interface SplitScreenLayoutProps {
  children: React.ReactNode
}

export function SplitScreenLayout({ children }: SplitScreenLayoutProps) {
  return (
    <div className="flex h-screen bg-surface-secondary">
      {/* Left Side - Product Catalog (60%) */}
      <div className="w-3/5 flex flex-col border-r border-medium">
        {children[0]}
      </div>

      {/* Right Side - Cart & Checkout (40%) */}
      <div className="w-2/5 flex flex-col">
        {children[1]}
      </div>
    </div>
  )
}
```

#### CategoryTabs Component
```tsx
// components/pos/CategoryTabs.tsx
interface CategoryTabsProps {
  activeCategory: ProductCategory
  onCategoryChange: (category: ProductCategory) => void
}

const categories = [
  { id: 'gas', label: 'GAS LPG', icon: Flame },
  { id: 'water', label: 'AIR GALON', icon: Droplet },
  { id: 'general', label: 'LAINNYA', icon: Package },
]

export function CategoryTabs({
  activeCategory,
  onCategoryChange
}: CategoryTabsProps) {
  return (
    <div className="flex border-b border-medium bg-surface">
      {categories.map((category) => {
        const Icon = category.icon
        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id as ProductCategory)}
            className={cn(
              "flex-1 flex items-center justify-center space-x-2 py-4 px-6 text-lg font-semibold transition-colors",
              activeCategory === category.id
                ? "text-primary border-b-4 border-primary bg-surface"
                : "text-secondary hover:text-primary hover:bg-surface-secondary"
            )}
          >
            <Icon className="w-6 h-6" />
            <span>{category.label}</span>
          </button>
        )
      })}
    </div>
  )
}
```

### 4. Utility Components

#### LoadingSpinner Component
```tsx
// components/ui/loading-spinner.tsx
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div className={cn("animate-spin rounded-full border-4 border-primary border-t-transparent", sizeClasses[size])} />
  )
}
```

#### ErrorMessage Component
```tsx
// components/ui/error-message.tsx
interface ErrorMessageProps {
  message: string
  onDismiss?: () => void
}

export function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div className="bg-danger/10 border-2 border-danger text-danger rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <AlertCircle className="w-6 h-6" />
        <span className="text-lg font-medium">{message}</span>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-danger hover:text-danger"
        >
          <X className="w-5 h-5" />
        </Button>
      )}
    </div>
  )
}
```

### 5. Accessibility Features

#### Focus Management
```tsx
// hooks/useFocusTrap.ts
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    firstElement?.focus()

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus()
          e.preventDefault()
        }
      }
    }

    containerRef.current.addEventListener('keydown', handleTabKey)
    return () => containerRef.current?.removeEventListener('keydown', handleTabKey)
  }, [isActive])

  return containerRef
}
```

#### Keyboard Navigation
```tsx
// hooks/useKeyboardNavigation.ts
export function useKeyboardNavigation(
  items: Array<{ id: string; element: HTMLElement }>,
  onSelect?: (id: string) => void
) {
  const [focusedIndex, setFocusedIndex] = useState(0)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((prev) => (prev + 1) % items.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((prev) => (prev - 1 + items.length) % items.length)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        onSelect?.(items[focusedIndex].id)
        break
    }
  }, [items, focusedIndex, onSelect])

  useEffect(() => {
    const focusedElement = items[focusedIndex]?.element
    focusedElement?.focus()
  }, [focusedIndex, items])

  return { focusedIndex, handleKeyDown }
}
```

## Component Usage Guidelines

### 1. Elderly-Friendly Design Rules
- **Minimum Touch Target**: 44px × 44px for all clickable elements
- **High Contrast**: Minimum WCAG AA contrast ratio (4.5:1)
- **Clear Feedback**: Visual and potentially audio feedback for all interactions
- **Large Text**: Minimum 18px for body text, 24px+ for important information

### 2. Responsive Considerations
- **Primary Target**: Desktop all-in-one (1920x1080)
- **Secondary**: Tablet landscape (1024x768 minimum)
- **Fallback**: Mobile landscape (480px minimum, simplified UI)

### 3. Performance Guidelines
- **Image Optimization**: WebP format with fallbacks
- **Lazy Loading**: For product images and long lists
- **Debounced Input**: For search and quantity inputs
- **Efficient Re-renders**: Proper memoization with React.memo and useMemo

This component breakdown provides a comprehensive foundation for building an elderly-friendly POS system that prioritizes usability, accessibility, and performance.