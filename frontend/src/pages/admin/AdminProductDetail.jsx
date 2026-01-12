import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productService } from '../../services';
import adminService from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import EditPriceModal from '../../components/EditPriceModal';
import EditDiscountModal from '../../components/EditDiscountModal';

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
      await productService.updateStock(id, newStock);
      // Update the local product state with new quantity
      setProduct(prev => ({ ...prev, product_quantity: newStock }));
      setSuccess('Stock updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
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
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => setIsPriceModalOpen(true)}
                style={{ padding: '8px 12px' }}
              >
                Edit Price
              </button>
              <button
                className="btn"
                onClick={() => setIsDiscountModalOpen(true)}
                style={{ padding: '8px 12px', background: '#a1127c', color: 'white' }}
              >
                Edit Discount
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setIsEditOpen((s) => !s)}
              >
                {isEditOpen ? 'Cancel Edit' : 'Edit Product'}
              </button>
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
  <div className="edit-product-form" style={{ marginTop: '40px', maxWidth: '640px' }}>
    <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px', color: '#333' }}>
      Edit Product
    </h2>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Form Group: Name */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <label style={{ fontSize: '14px', fontWeight: '600', color: '#666', marginBottom: '6px' }}>
          Product Name
        </label>
        <input 
          value={editName} 
          onChange={(e) => setEditName(e.target.value)} 
          style={{
            padding: '10px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px',
            outline: 'none'
          }}
        />
      </div>

      {/* Form Group: Description */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <label style={{ fontSize: '14px', fontWeight: '600', color: '#666', marginBottom: '6px' }}>
          Description
        </label>
        <textarea 
          value={editDescription} 
          onChange={(e) => setEditDescription(e.target.value)} 
          rows={4} 
          style={{
            padding: '10px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px',
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none'
          }}
        />
      </div>

      {/* Row for Category & Subcategory */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#666', marginBottom: '6px' }}>
            Category
          </label>
          <select 
            value={editCategory} 
            onChange={(e) => setEditCategory(e.target.value)}
            style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }}
          >
            <option value="">-- Select category --</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {subcategories.length > 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#666', marginBottom: '6px' }}>
              Subcategory
            </label>
            <select 
              value={editSubcategory} 
              onChange={(e) => setEditSubcategory(e.target.value)}
              style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }}
            >
              <option value="">-- Select subcategory --</option>
              {subcategories.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Form Group: Image */}
<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '14px', fontWeight: '600', color: '#666' }}>
          Update Image
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Custom Styled Button */}
          <label 
            htmlFor="product-image-upload" 
            style={{
              display: 'inline-block',
              padding: '8px 20px',
              backgroundColor: '#f1f3f5',
              color: '#495057',
              border: '1px solid #ced4da',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#e9ecef'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#f1f3f5'}
          >
            Choose File
          </label>
          
          {/* File Name Display */}
          <span style={{ fontSize: '14px', color: '#777', fontStyle: 'italic' }}>
            {editImageFile ? editImageFile.name : 'No file chosen'}
          </span>

          {/* Hidden Actual Input */}
          <input 
            id="product-image-upload"
            type="file" 
            accept="image/*" 
            onChange={(e) => setEditImageFile(e.target.files[0])} 
            style={{ display: 'none' }} 
          />
        </div>
      </div>


      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button
          style={{
            backgroundColor: '#C11B6C', // Brand Magenta
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '25px', // Match the rounded style of your stock button
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '15px'
          }}
          onClick={async () => {
            setError('');
            setSuccess('');
            try {
              const payload = {
                product_name: editName,
                product_description: editDescription,
                product_category: editCategory,
                product_subcategory: editSubcategory,
                imageFile: editImageFile,
              };
              await adminService.updateProduct(id, payload);
              const updated = await productService.getProduct(id);
              setProduct(updated);
              setSuccess('Product updated successfully');
              setIsEditOpen(false);
              setTimeout(() => setSuccess(''), 3000);
            } catch (err) {
              setError(err.response?.data?.detail || 'Failed to update product');
            }
          }}
        >
          Save Changes
        </button>
        <button 
          style={{
            backgroundColor: '#f4f4f4',
            color: '#555',
            padding: '12px 24px',
            border: '1px solid #ddd',
            borderRadius: '25px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '15px'
          }}
          onClick={() => setIsEditOpen(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
    </main>
  );
};

export default AdminProductDetail;
