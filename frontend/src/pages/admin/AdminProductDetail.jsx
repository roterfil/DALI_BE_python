import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productService } from '../../services';
import adminService from '../../services/adminService';
import { productsAPI, adminAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import EditPriceModal from '../../components/EditPriceModal';
import EditDiscountModal from '../../components/EditDiscountModal';
import EditProductModal from '../../components/EditProductModal';
import ReviewList from '../../components/ReviewList';

const AdminProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [newStock, setNewStock] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);

  const { isSuperAdmin } = useAuth();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [editImageFile, setEditImageFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const product = await productService.getProduct(id);
        setProduct(product);
        setNewStock(product.product_quantity);
        // init edit fields
        setEditName(product.product_name);
        setEditDescription(product.product_description || '');
        setEditCategory(product.product_category || '');
        setEditSubcategory(product.product_subcategory || '');
      } catch (err) {
        setError('Failed to load product');
        console.error('Error loading product:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [id]);

  // load categories for edit form
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await productService.getCategories();
        setCategories(data.categories || data || []);
      } catch (err) {
        console.error('Failed to load categories for edit form', err);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadSubcategories = async () => {
      if (editCategory) {
        try {
          const data = await productService.getSubcategories(editCategory);
          setSubcategories(data.subcategories || data || []);
        } catch (err) {
          console.error('Failed to load subcategories', err);
          setSubcategories([]);
        }
      } else {
        setSubcategories([]);
      }
    };
    loadSubcategories();
  }, [editCategory]);

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      await adminService.updateStock(id, newStock);
      // Optionally show a success message before navigating
      setSuccess('Stock updated successfully!');
      setTimeout(() => {
        setSuccess('');
        navigate('/admin/inventory'); // Go back to inventory to trigger refresh
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to update stock');
    } finally {
      setUpdating(false);
    }
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
        <Link to="/admin/inventory" className="btn btn-primary">
          Back to Inventory
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-container container">
        <p>Product not found.</p>
        <Link to="/admin/inventory" className="btn btn-primary">
          Back to Inventory
        </Link>
      </div>
    );
  }

  return (
    <main className="product-detail-container container">
      {/* Product Image */}
      <div className="product-detail-image">
        <img src={`/images/products/${product.image}`} alt={product.product_name} />
      </div>

      {/* Product Info */}
      <div className="product-detail-info">
        <Link
          to="/admin/inventory"
          style={{
            display: 'inline-block',
            marginBottom: '20px',
            color: '#555',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          ← Back to Inventory
        </Link>

        <h1>{product.product_name}</h1>
        <div style={{ marginBottom: '20px' }}>
          {product.is_on_sale && product.product_discount_price ? (
            <>
              <p className="product-detail-price" style={{ 
                marginBottom: '4px', 
                textDecoration: 'line-through',
                color: '#999',
                fontSize: '1.2rem'
              }}>
                {formatPrice(product.product_price)}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <p className="product-detail-price" style={{ 
                  margin: 0,
                  color: '#a1127c',
                  fontWeight: 'bold',
                  fontSize: '1.8rem'
                }}>
                  {formatPrice(product.product_discount_price)}
                </p>
                <span style={{
                  padding: '6px 12px',
                  background: 'linear-gradient(135deg, #a1127c 0%, #d91a5b 100%)',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  {Math.round(((product.product_price - product.product_discount_price) / product.product_price) * 100)}% OFF
                </span>
              </div>
            </>
          ) : (
            <p className="product-detail-price" style={{ marginBottom: '8px' }}>
              {formatPrice(product.product_price)}
            </p>
          )}
        </div>

        {success && <div className="auth-success">{success}</div>}
        {error && <div className="auth-error">{error}</div>}

        {/* Stock Management */}
        <div className="product-actions">
          <div className="product-stock-level" style={{ marginBottom: '20px' }}>
            Current Stock: <strong>{product.product_quantity}</strong>
          </div>

          <form onSubmit={handleUpdateStock}>
            <div className="stock-update-group">
              <label htmlFor="newStock" style={{ fontWeight: 600, marginRight: '15px' }}>
                Set New Stock:
              </label>
              <input
                type="number"
                id="newStock"
                name="newStock"
                value={newStock}
                onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                min="0"
                className="stock-update-input"
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={updating}
                style={{ marginLeft: '15px' }}
              >
                {updating ? 'Updating...' : 'Update Stock'}
              </button>
            </div>
          </form>
          {isSuperAdmin && (
            <div style={{ marginTop: '12px', position: 'relative', display: 'inline-block' }}>
              <button
                className="btn btn-primary"
                onClick={() => setIsEditMenuOpen((prev) => !prev)}
                style={{ padding: '8px 12px' }}
              >
                Edit
              </button>
              {isEditMenuOpen && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    zIndex: 10,
                    minWidth: '160px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                >
                  <button
                    onClick={() => {
                      setIsPriceModalOpen(true);
                      setIsEditMenuOpen(false);
                    }}
                    style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }}
                  >
                    Edit Price
                  </button>
                  <button
                    onClick={() => {
                      setIsDiscountModalOpen(true);
                      setIsEditMenuOpen(false);
                    }}
                    style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }}
                  >
                    Edit Discount
                  </button>
                  <button
                    onClick={() => {
                      setIsEditOpen((s) => !s);
                      setIsEditMenuOpen(false);
                    }}
                    style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }}
                  >
                    {isEditOpen ? 'Cancel Edit' : 'Edit Product'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {isSuperAdmin && (
          <div style={{ marginTop: '24px' }}>
            <button
              className="btn"
              style={{ backgroundColor: '#dc3545', color: 'white', padding: '10px 16px', borderRadius: 6 }}
              onClick={async () => {
                if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;
                try {
                  await adminService.deleteProduct(id);
                  // navigate back to inventory after deletion
                  navigate('/admin/inventory');
                } catch (err) {
                  console.error('Failed to delete product', err);
                  setError(err.response?.data?.detail || 'Failed to delete product');
                }
              }}
            >
              Delete Product
            </button>
          </div>
        )}

        <div className="product-description" style={{ marginTop: '30px' }}>
          <h3>Product Details</h3>
          <p>
            <strong>Category:</strong> {product.product_category}
          </p>
          {product.product_subcategory && (
            <p>
              <strong>Subcategory:</strong> {product.product_subcategory}
            </p>
          )}
          <p>
            <strong>Description:</strong>{' '}
            {product.product_description || 'No description available.'}
          </p>
        </div>

        {/* Customer Reviews Section */}
        <div style={{ marginTop: '40px' }}>
          <ReviewList productId={product.product_id} />
        </div>
      </div>
      {isPriceModalOpen && (
        <EditPriceModal
          product={product}
          open={isPriceModalOpen}
          onClose={() => setIsPriceModalOpen(false)}
          onSaved={(newPrice) => {
            setProduct(prev => ({ ...prev, product_price: Number(newPrice) }));
            setIsPriceModalOpen(false);
            setSuccess('Price updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
          }}
        />
      )}

      {isDiscountModalOpen && (
        <EditDiscountModal
          product={product}
          open={isDiscountModalOpen}
          onClose={() => setIsDiscountModalOpen(false)}
          onSaved={(discountData) => {
            setProduct(prev => ({
              ...prev,
              product_discount_price: discountData.product_discount_price,
              is_on_sale: discountData.is_on_sale
            }));
            setIsDiscountModalOpen(false);
            setSuccess('Discount updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
          }}
        />
      )}

{isEditOpen && (
        <EditProductModal
          product={product}
          open={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSaved={(updatedProduct) => {
            setProduct(updatedProduct);
            setSuccess('Product details updated successfully!');
            setIsEditOpen(false);
            setTimeout(() => setSuccess(''), 3000);
          }}
        />
      )}
    </main>
  );
};

export default AdminProductDetail;
