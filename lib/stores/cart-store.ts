import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '@/lib/utils';
import { resolveDiscountClient, type ProductTierPricingItem } from '@/lib/discount-utils';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  category: 'gas' | 'water' | 'general';
  quantity: number;
  basePrice: number;
  discountedPrice: number;
  costPrice: number;
  subtotal: number;
  imageUrl?: string;
}

export interface CartState {
  items: CartItem[];
  customerId?: string;
  customerName?: string;
  customerTypeId?: string;
  customerTypeName?: string;
  customerDiscountPercent: number;
  productTierPricings: ProductTierPricingItem[];
  total: number;
  itemCount: number;

  // Actions
  addItem: (product: {
    id: string;
    name: string;
    category: 'gas' | 'water' | 'general';
    basePrice: number;
    costPrice: number;
    imageUrl?: string;
  }, stock?: number) => boolean;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number, stock?: number) => boolean;
  setCustomer: (customerId?: string, customerName?: string, customerTypeId?: string, customerTypeName?: string, customerDiscountPercent?: number) => void;
  setProductTierPricings: (pricings: ProductTierPricingItem[]) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalAmount: () => number;
  recalculateTotals: () => void;
  getDiscountedTotal: () => number;
  validateStock: (productId: string, requestedQuantity: number, availableStock: number) => boolean;
}

function calculateItemPrice(
  productId: string,
  basePrice: number,
  category: string,
  customerTypeId: string | undefined,
  customerDiscountPercent: number,
  productTierPricings: ProductTierPricingItem[]
): number {
  const resolved = resolveDiscountClient(
    productId,
    customerTypeId,
    basePrice,
    category,
    productTierPricings,
    customerDiscountPercent
  );
  return resolved.finalPrice;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customerId: undefined,
      customerName: undefined,
      customerTypeId: undefined,
      customerTypeName: undefined,
      customerDiscountPercent: 0,
      productTierPricings: [],
      total: 0,
      itemCount: 0,

      addItem: (product, stock) => {
        const state = get();

        // Check if stock validation is needed
        if (stock !== undefined) {
          const existingItem = state.items.find(item => item.productId === product.id);
          const currentQuantity = existingItem ? existingItem.quantity : 0;

          if (currentQuantity + 1 > stock) {
            return false; // Stock insufficient
          }
        }

        set((prevState) => {
          const existingItem = prevState.items.find(item => item.productId === product.id);
          const discountedPrice = calculateItemPrice(
            product.id,
            product.basePrice,
            product.category,
            prevState.customerTypeId,
            prevState.customerDiscountPercent,
            prevState.productTierPricings
          );

          if (existingItem) {
            // If item exists, increment quantity
            const updatedItems = prevState.items.map(item =>
              item.productId === product.id
                ? {
                  ...item,
                  quantity: item.quantity + 1,
                  discountedPrice,
                  subtotal: discountedPrice * (item.quantity + 1)
                }
                : item
            );

            return {
              items: updatedItems,
              total: updatedItems.reduce((sum, item) => sum + item.subtotal, 0),
              itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0)
            };
          } else {
            // Add new item
            const newItem: CartItem = {
              id: generateId(),
              productId: product.id,
              name: product.name,
              category: product.category,
              quantity: 1,
              basePrice: product.basePrice,
              discountedPrice,
              costPrice: product.costPrice,
              subtotal: discountedPrice,
              imageUrl: product.imageUrl
            };

            const updatedItems = [...prevState.items, newItem];

            return {
              items: updatedItems,
              total: updatedItems.reduce((sum, item) => sum + item.subtotal, 0),
              itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0)
            };
          }
        });

        return true; // Success
      },

      removeItem: (productId) => {
        set((state) => {
          const updatedItems = state.items.filter(item => item.productId !== productId);

          return {
            items: updatedItems,
            total: updatedItems.reduce((sum, item) => sum + item.subtotal, 0),
            itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0)
          };
        });
      },

      updateQuantity: (productId, quantity, stock) => {
        if (quantity <= 0) {
          // Remove item if quantity is 0 or less
          get().removeItem(productId);
          return true;
        }

        // Check stock validation
        if (stock !== undefined && quantity > stock) {
          return false; // Stock insufficient
        }

        set((state) => {
          const updatedItems = state.items.map(item =>
            item.productId === productId
              ? {
                ...item,
                quantity,
                subtotal: item.discountedPrice * quantity
              }
              : item
          );

          return {
            items: updatedItems,
            total: updatedItems.reduce((sum, item) => sum + item.subtotal, 0),
            itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0)
          };
        });

        return true;
      },

      setCustomer: (customerId, customerName, customerTypeId, customerTypeName, customerDiscountPercent = 0) => {
        set((state) => {
          // Update customer info
          const newState = {
            customerId,
            customerName,
            customerTypeId,
            customerTypeName,
            customerDiscountPercent
          };

          // Recalculate all item prices with new discount
          const updatedItems = state.items.map(item => {
            const newDiscountedPrice = calculateItemPrice(
              item.productId,
              item.basePrice,
              item.category,
              customerTypeId,
              customerDiscountPercent,
              state.productTierPricings
            );
            return {
              ...item,
              discountedPrice: newDiscountedPrice,
              subtotal: newDiscountedPrice * item.quantity
            };
          });

          const total = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);

          return {
            ...newState,
            items: updatedItems,
            total
          };
        });
      },

      setProductTierPricings: (pricings) => {
        set((state) => {
          // Recalculate all item prices with new pricing data
          const updatedItems = state.items.map(item => {
            const newDiscountedPrice = calculateItemPrice(
              item.productId,
              item.basePrice,
              item.category,
              state.customerTypeId,
              state.customerDiscountPercent,
              pricings
            );
            return {
              ...item,
              discountedPrice: newDiscountedPrice,
              subtotal: newDiscountedPrice * item.quantity
            };
          });

          const total = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);

          return {
            productTierPricings: pricings,
            items: updatedItems,
            total
          };
        });
      },

      clearCart: () => {
        set({
          items: [],
          customerId: undefined,
          customerName: undefined,
          customerTypeId: undefined,
          customerTypeName: undefined,
          customerDiscountPercent: 0,
          total: 0,
          itemCount: 0
        });
      },

      getTotalItems: () => {
        return get().itemCount;
      },

      getTotalAmount: () => {
        return get().total;
      },

      getDiscountedTotal: () => {
        const state = get();
        return state.total;
      },

      recalculateTotals: () => {
        const state = get();
        const total = state.items.reduce((sum, item) => sum + item.subtotal, 0);
        const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

        set({ total, itemCount });
      },

      validateStock: (productId, requestedQuantity, availableStock) => {
        const state = get();
        const cartItem = state.items.find(item => item.productId === productId);
        const currentQuantity = cartItem ? cartItem.quantity : 0;

        return currentQuantity + requestedQuantity <= availableStock;
      }
    }),
    {
      name: 'gasstation-cart-storage',
      partialize: (state) => ({
        items: state.items,
        customerId: state.customerId,
        customerName: state.customerName,
        customerTypeId: state.customerTypeId,
        customerTypeName: state.customerTypeName,
        customerDiscountPercent: state.customerDiscountPercent
      })
    }
  )
);