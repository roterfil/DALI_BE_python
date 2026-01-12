import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { productService } from '../services';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/Toast';
import { ReviewList } from '../components';

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [product, setProduct] = useState(null);
  const [maxAllowedToAdd, setMaxAllowedToAdd] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        // Backend returns product directly
        const productData = await productService.getProduct(id);
        setProduct(productData);
        setMaxAllowedToAdd(productData.product_quantity || 0);
      } catch (err) {
        setError('Failed to load product');
        console.error('Error loading product:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [id]);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    setAddingToCart(true);
    setError('');

    const result = await addToCart(product.product_id, quantity);

    if (result.success) {
      showToast(`${product.product_name} added to cart!`, 'success');
      setMaxAllowedToAdd((prev) => prev - quantity);
      setQuantity(1);
    } else {
      showToast(result.error || 'Failed to add to cart', 'error');
    }

    setAddingToCart(false);
  };

  const formatPrice = (price) => {
    return `₱${Number(price).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (loading) {
    return (
      <div className="product-detail-container container">
        <p>Loading product...</p>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="product-detail-container container">
        <div className="auth-error">{error}</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-container container">
        <p>Product not found.</p>
      </div>
    );
  }

  const isOutOfStock = product.product_quantity <= 0;
  const allInCart = maxAllowedToAdd <= 0;
  const isSaleActive = product.is_on_sale && product.product_discount_price;

  const calculateDiscountPercentage = () => {
    if (!isSaleActive) return 0;
    const originalPrice = parseFloat(product.product_price);
    const discountPrice = parseFloat(product.product_discount_price);
    const discount = ((originalPrice - discountPrice) / originalPrice) * 100;
    return Math.round(discount);
  };

  return (
    <main className="product-detail-container container">
      {/* Product Image */}
      <div className="product-detail-image">
        {isSaleActive && (
          <div className="sale-badge">
            SALE {calculateDiscountPercentage()}% OFF
          </div>
        )}
        <img
          src={product.image ? `/images/products/${product.image}` : `/images/products/default.png`}
          alt={product.product_name}
        />
      </div>

      {/* Product Info */}
      <div className="product-detail-info">
        <h1>{product.product_name}</h1>
        <div className="price-container" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
          {isSaleActive ? (
            <>
              <span className="product-detail-price sale-price" style={{ fontSize: '2rem', color: '#a1127c', fontWeight: 'bold' }}>
                {formatPrice(product.product_discount_price)}
              </span>
              <span className="original-price-strikethrough" style={{ fontSize: '1.25rem', color: '#999', textDecoration: 'line-through' }}>
                {formatPrice(product.product_price)}
              </span>
            </>
          ) : (
            <p className="product-detail-price">{formatPrice(product.product_price)}</p>
          )}
        </div>

        {error && <div className="auth-error">{error}</div>}

        {/* Add to Cart Form */}
        <div className="product-actions">
          <form onSubmit={handleAddToCart}>
            {!isOutOfStock && !allInCart ? (
              <>
                <div className="quantity-selector">
                  <label htmlFor="quantity">Quantity:</label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        Math.max(1, Math.min(maxAllowedToAdd, parseInt(e.target.value) || 1))
                      )
                    }
                    min="1"
                    max={maxAllowedToAdd}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary btn-large"
                  disabled={addingToCart}
                >
                  {addingToCart ? 'Adding...' : 'Add to Cart'}
                </button>
              </>
            ) : (
              <button type="button" className="btn-disabled btn-large" disabled>
                {isOutOfStock ? 'Out of Stock' : 'All stock in cart'}
              </button>
            )}
          </form>
        </div>

        <div className="product-description">
          <h3>Description</h3>
          <p>{product.product_description || 'No description available.'}</p>
        </div>

        {/* Customer Reviews Section */}
        <ReviewList productId={product.product_id} />
      </div>
    </main>
  );
};

export default ProductDetail;
