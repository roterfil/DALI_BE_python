import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/Toast';

const Cart = () => {
  const { cartItems, subtotal, loading, updateQuantity, removeFromCart, clearCart } = useCart();
  const { showToast } = useToast();

  const formatPrice = (price) => {
    if (price === null || price === undefined || price === '') return '—';
    const n = Number(price);
    if (Number.isNaN(n)) return String(price);
    return `₱${n.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleQuantityChange = async (productId, newQuantity) => {
    if (newQuantity < 1) return;
    await updateQuantity(productId, newQuantity);
  };

  const handleRemove = async (productId) => {
    await removeFromCart(productId);
  };

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your entire cart?')) {
      const result = await clearCart();
      if (result.success) {
        showToast('Cart cleared successfully', 'success');
      } else {
        showToast(result.error || 'Failed to clear cart', 'error');
      }
    }
  };

  if (loading) {
    return (
      <main className="cart-page container">
        <h1>Your Cart</h1>
        <p>Loading cart...</p>
      </main>
    );
  }

  return (
    <main className="cart-page container">
      <h1>Your Cart</h1>

      {cartItems.length > 0 ? (
        <div className="cart-container">
          <div className="cart-items-panel">
            <div className="cart-item-header">
              <div className="header-product">Product</div>
              <div className="header-quantity">Quantity</div>
              <div className="header-total">Total</div>
              <div className="header-action"></div>
            </div>

            {cartItems.map((item) => {
              const isSaleActive = item.is_on_sale && item.product_discount_price;
              const currentPrice = isSaleActive ? item.product_discount_price : item.product_price;

              return (
                <div key={item.product_id} className="cart-item-row">
                  <div className="cart-product-info">
                    <img
                      src={item.image ? `/images/products/${item.image}` : `/images/products/default.png`}
                      alt={item.product_name}
                    />
                    <div>
                      <p className="product-name">{item.product_name}</p>
                      
                      <div className="cart-item-price-display">
                        {isSaleActive ? (
                          <>
                            <span className="product-price sale-price">{formatPrice(currentPrice)}</span>
                            <span className="original-price-strikethrough small">{formatPrice(item.product_price)}</span>
                            <span className="cart-sale-tag">Sale</span>
                          </>
                        ) : (
                          <p className="product-price">{formatPrice(item.product_price)}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="cart-quantity-selector">
                    <input
                      type="number"
                      name="quantity"
                      value={item.quantity}
                      min="1"
                      onChange={(e) =>
                        handleQuantityChange(item.product_id, parseInt(e.target.value) || 1)
                      }
                    />
                  </div>

                  <div className="cart-item-total">
                    {formatPrice(item.subtotal)}
                  </div>

                  <div className="cart-item-remove">
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => handleRemove(item.product_id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cart-summary-panel">
            <h2>Order Summary</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              {/* This correctly uses the pre-calculated subtotal from your CartContext */}
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            <hr />
            <div className="summary-row total-row">
              <span>Total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <Link to="/checkout" className="btn btn-primary checkout-btn">
              Continue to checkout
            </Link>
            <button 
              className="btn btn-outline" 
              onClick={handleClearCart} 
              style={{ marginTop: '40px', padding: '8px 16px', fontSize: '13px' }}
            >
              Clear Cart
            </button>
          </div>
        </div>
      ) : (
        <div className="cart-empty">
          <h2>Your cart is empty.</h2>
          <p>Looks like you haven't added anything to your cart yet.</p>
          <Link to="/shop" className="btn btn-primary">
            Continue Shopping
          </Link>
        </div>
      )}
    </main>
  );
};

export default Cart;
