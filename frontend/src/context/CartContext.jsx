import { createContext, useContext, useState, useEffect } from 'react';
import { cartService, productService } from '../services';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [voucherCode, setVoucherCode] = useState(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Calculate cart count from items
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Helper: guest cart stored in localStorage when not authenticated
  const GUEST_KEY = 'guest_cart';

  const readGuestCart = () => {
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  const writeGuestCart = (items) => {
    try {
      localStorage.setItem(GUEST_KEY, JSON.stringify(items || []));
    } catch (e) {
      // ignore
    }
  };

  // Fetch cart on mount and when auth changes
  useEffect(() => {
    fetchCart();
  }, [isAuthenticated]);

  // When a user becomes authenticated, merge any guest cart into server cart
  useEffect(() => {
    if (!isAuthenticated) return;
    const guest = readGuestCart();
    if (!guest || guest.length === 0) return;
    mergeGuestCart().catch(e => console.error('mergeGuestCart error', e));
  }, [isAuthenticated]);

  // Merge guest cart into server cart; callable by UI to wait for completion
  const mergeGuestCart = async () => {
    const guest = readGuestCart();
    if (!guest || guest.length === 0) return;
    try {
      for (const it of guest) {
        await cartService.addToCart(it.product_id, it.quantity);
      }
    } finally {
      writeGuestCart([]);
      await fetchCart();
    }
  };

  const fetchCart = async () => {
    try {
      setLoading(true);
      // Backend returns: { items: [], subtotal: number, total: number }
      if (!isAuthenticated) {
        // show guest cart from localStorage when not authenticated
        let guest = readGuestCart();
        if (!guest) guest = [];
        // Ensure guest items have product metadata (name, image, price)
        const needsFetch = guest.filter(it => !it.product_name || !it.product_price || !it.image).map(it => it.product_id);
        if (needsFetch.length > 0) {
          try {
            // fetch details for each missing id (sequential to avoid rate limits)
            for (const id of needsFetch) {
              try {
                const p = await productService.getProduct(id);
                const idx = guest.findIndex(x => x.product_id === id);
                if (idx >= 0) {
                  guest[idx] = {
                    ...guest[idx],
                    product_name: p.product_name || p.name || p.title || guest[idx].product_name,
                    image: p.image || guest[idx].image,
                    product_price: p.product_price || p.price || guest[idx].product_price,
                  };
                }
              } catch (e) {
                // ignore product fetch errors for individual items
              }
            }
            // persist enhanced guest cart
            writeGuestCart(guest);
          } catch (e) {
            // ignore
          }
        }

        // compute subtotal from available metadata - use discount price if item is on sale
        const subtotalCalc = (guest || []).reduce((s, it) => {
          const isOnSale = it.is_on_sale && it.product_discount_price;
          const price = isOnSale ? Number(it.product_discount_price) : Number(it.product_price || it.price || 0);
          return s + (price * Number(it.quantity || 0));
        }, 0);
        setCartItems(guest || []);
        setSubtotal(subtotalCalc);
        setTotal(subtotalCalc);
      } else {
        const response = await cartService.getCart();
        setCartItems(response.items || []);
        setSubtotal(response.subtotal || 0);
        setTotal(response.total || 0);
        
        // Store voucher in both state AND localStorage for persistence
        const vCode = response.voucher_code || null;
        const vDiscount = response.voucher_discount || 0;
        setVoucherCode(vCode);
        setVoucherDiscount(vDiscount);
        
        if (vCode) {
          localStorage.setItem('applied_voucher', JSON.stringify({ code: vCode, discount: vDiscount }));
        } else {
          localStorage.removeItem('applied_voucher');
        }
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      // For guest cart errors, don't clear - just use what we have
      if (!isAuthenticated) {
        const guest = readGuestCart() || [];
        setCartItems(guest);
        const subtotalCalc = guest.reduce((s, it) => {
          const isOnSale = it.is_on_sale && it.product_discount_price;
          const price = isOnSale ? Number(it.product_discount_price) : Number(it.product_price || it.price || 0);
          return s + (price * Number(it.quantity || 0));
        }, 0);
        setSubtotal(subtotalCalc);
        setTotal(subtotalCalc);
      } else {
        // Only reset cart on authenticated user errors
        setCartItems([]);
        setSubtotal(0);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1) => {
    try {
      setLoading(true);
      if (!isAuthenticated) {
        // add to guest cart in localStorage
        const guest = readGuestCart();
        const existing = guest.find(i => i.product_id === productId);
        if (existing) {
          existing.quantity = (existing.quantity || 0) + quantity;
        } else {
          // price may be unknown here; allow caller to pass price in later fetch
          guest.push({ product_id: productId, quantity });
        }
        // try to enrich the newly added item with product metadata so UI updates immediately
        try {
          const targetId = productId;
          const prod = await productService.getProduct(targetId);
          const idx = guest.findIndex(i => i.product_id === targetId);
          if (idx >= 0) {
            guest[idx] = {
              ...guest[idx],
              product_name: prod.product_name || prod.name || prod.title,
              image: prod.image || prod.product_image || prod.picture,
              product_price: prod.product_price || prod.price || prod.list_price,
              product_discount_price: prod.product_discount_price || null,
              is_on_sale: prod.is_on_sale || false
            };
          }
        } catch (e) {
          // ignore metadata fetch failures; cart will be enriched on next fetch
        }

        writeGuestCart(guest);
        setCartItems(guest);
        const subtotalCalc = guest.reduce((s, it) => {
          const isOnSale = it.is_on_sale && it.product_discount_price;
          const price = isOnSale ? Number(it.product_discount_price) : Number(it.product_price || it.price || 0);
          return s + (price * Number(it.quantity || 0));
        }, 0);
        setSubtotal(subtotalCalc);
        setTotal(subtotalCalc);
        return { success: true, guest: true };
      }

      // Backend returns { message: "Item added to cart" }
      await cartService.addToCart(productId, quantity);
      // Refetch cart to get updated data
      await fetchCart();
      return { success: true };
    } catch (error) {
      console.error('Error adding to cart:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to add to cart' 
      };
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      setLoading(true);
      if (!isAuthenticated) {
        const guest = readGuestCart() || [];
        const idx = guest.findIndex(i => i.product_id === productId);
        if (idx >= 0) {
          guest[idx].quantity = quantity;
          writeGuestCart(guest);
          setCartItems(guest);
          const subtotalCalc = guest.reduce((s, it) => {
            const isOnSale = it.is_on_sale && it.product_discount_price;
            const price = isOnSale ? Number(it.product_discount_price) : Number(it.product_price || it.price || 0);
            return s + (price * Number(it.quantity || 0));
          }, 0);
          setSubtotal(subtotalCalc);
          setTotal(subtotalCalc);
          return { success: true };
        }
        return { success: false, error: 'Item not found in cart' };
      }

      // Backend returns { message: "Cart updated" }
      await cartService.updateCartItem(productId, quantity);
      // Refetch cart to get updated data
      await fetchCart();
      return { success: true };
    } catch (error) {
      console.error('Error updating cart:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to update cart' 
      };
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (productId) => {
    try {
      setLoading(true);
      if (!isAuthenticated) {
        const guest = readGuestCart() || [];
        const updated = guest.filter(i => i.product_id !== productId);
        writeGuestCart(updated);
        setCartItems(updated);
        const subtotalCalc = updated.reduce((s, it) => {
          const isOnSale = it.is_on_sale && it.product_discount_price;
          const price = isOnSale ? Number(it.product_discount_price) : Number(it.product_price || it.price || 0);
          return s + (price * Number(it.quantity || 0));
        }, 0);
        setSubtotal(subtotalCalc);
        setTotal(subtotalCalc);
        return { success: true };
      }

      setLoading(true);
      // Backend returns { message: "Item removed from cart" }
      await cartService.removeFromCart(productId);
      // Refetch cart to get updated data
      await fetchCart();
      return { success: true };
    } catch (error) {
      console.error('Error removing from cart:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to remove from cart' 
      };
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    try {
      setLoading(true);
      if (!isAuthenticated) {
        writeGuestCart([]);
        setCartItems([]);
        setSubtotal(0);
        setTotal(0);
        return { success: true };
      }

      await cartService.clearCart();
      setCartItems([]);
      setSubtotal(0);
      setTotal(0);
      return { success: true };
    } catch (error) {
      console.error('Error clearing cart:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to clear cart' 
      };
    } finally {
      setLoading(false);
    }
  };

  const clearVoucher = () => {
    setVoucherCode(null);
    setVoucherDiscount(0);
  };

  const value = {
    cartItems,
    cartCount,
    voucherCode,
    voucherDiscount,
    subtotal,
    total,
    loading,
    fetchCart,
    mergeGuestCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    clearVoucher,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
