import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import EditPriceModal from './EditPriceModal';

const ProductCard = ({ product, availableToAdd = null }) => {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatPrice = (price) => {
    return `₱${price.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await addToCart(product.product_id, quantity);
    setLoading(false);
    if (result.success) {
      showToast(`${product.product_name} added to cart!`, 'success');
    } else {
      showToast(result.error || 'Failed to add to cart', 'error');
    }
    setQuantity(1);
  };

  const isOutOfStock = product.product_quantity <= 0;
  const allInCart = availableToAdd !== null && availableToAdd <= 0;
  const maxQuantity = availableToAdd || product.product_quantity;

  const { isSuperAdmin } = useAuth();

  return (
    <div className="product-card">
      <Link className="product-card-body" to={`/product/${product.product_id}`}>
        <div className="product-image-container">
          <img
            src={product.image ? `/images/products/${product.image}` : `/images/products/default.png`}
            alt={product.product_name}
          />
        </div>
        <div className="product-card-info">
          <p className="product-card-category">{product.product_category}</p>
          <h3 className="product-card-name">{product.product_name}</h3>
          <p className="product-price">{formatPrice(product.product_price)}</p>
        </div>
      </Link>
      <div className="product-card-actions">
        
        <form onSubmit={handleAddToCart}>
          {!isOutOfStock && !allInCart ? (
            <div className="product-card-quantity-form">
              <input
                type="number"
                name="quantity"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(maxQuantity, parseInt(e.target.value) || 1)))}
                min="1"
                max={maxQuantity}
                className="product-card-quantity-input"
              />
              <button
                type="submit"
                className="add-to-cart-btn"
                disabled={loading}
              >
                {loading ? '...' : 'Add'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="add-to-cart-btn-disabled"
              disabled
            >
              {isOutOfStock ? 'Out of Stock' : 'All in Cart'}
            </button>
          )}
        </form>
      </div>
      {isSuperAdmin && (
        <EditPriceModal
          product={product}
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaved={(newPrice) => { product.product_price = newPrice; }}
        />
      )}
    </div>
  );
};

export default ProductCard;
