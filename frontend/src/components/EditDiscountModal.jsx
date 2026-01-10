import { useState, useEffect } from 'react';
import { adminAPI } from '../api/api';
import { useToast } from './Toast';

const EditDiscountModal = ({ product, open, onClose, onSaved }) => {
  const [discountPrice, setDiscountPrice] = useState('');
  const [isOnSale, setIsOnSale] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (product) {
      setDiscountPrice(product.product_discount_price || '');
      setIsOnSale(product.is_on_sale || false);
    }
  }, [product]);

  if (!open) return null;

  const calculateDiscount = () => {
    if (!discountPrice || !product?.product_price) return 0;
    const original = parseFloat(product.product_price);
    const discount = parseFloat(discountPrice);
    if (discount >= original) return 0;
    return Math.round(((original - discount) / original) * 100);
  };

  const formatPrice = (price) => {
    return `₱${parseFloat(price).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleSave = async () => {
    // Validation
    if (isOnSale && !discountPrice) {
      showToast('Discount price is required when item is on sale', 'error');
      return;
    }
    if (discountPrice && parseFloat(discountPrice) >= parseFloat(product.product_price)) {
      showToast('Discount price must be less than regular price', 'error');
      return;
    }

    setLoading(true);
    try {
      await adminAPI.updateDiscount(product.product_id, {
        product_discount_price: discountPrice === '' ? null : Number(discountPrice),
        is_on_sale: isOnSale
      });
      showToast('Discount updated successfully', 'success');
      onSaved && onSaved({ 
        product_discount_price: discountPrice === '' ? null : Number(discountPrice),
        is_on_sale: isOnSale 
      });
      onClose();
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.detail || 'Failed to update discount', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <h3>Manage Sale - {product?.product_name}</h3>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Regular Price Display */}
          <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
            <strong>Regular Price:</strong> {formatPrice(product?.product_price)}
          </div>

          {/* Sale Toggle */}
          <div className="form-group-checkbox">
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={isOnSale} 
                onChange={(e) => setIsOnSale(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '600' }}>Activate Sale Price</span>
            </label>
          </div>

          {/* Discount Price Input */}
          <div className="form-group" style={{ opacity: isOnSale ? 1 : 0.5 }}>
            <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>
              Discount Price (₱)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={product?.product_price || 0}
              value={discountPrice}
              onChange={(e) => setDiscountPrice(e.target.value)}
              placeholder="Enter sale price"
              disabled={!isOnSale}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Discount Preview */}
          {isOnSale && discountPrice && parseFloat(discountPrice) < parseFloat(product?.product_price) && (
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #a1127c 0%, #d91a5b 100%)',
              color: 'white',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Customer Discount</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '8px 0' }}>
                {calculateDiscount()}% OFF
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                Customers save {formatPrice(parseFloat(product?.product_price) - parseFloat(discountPrice))}
              </div>
            </div>
          )}

          {/* Warning Messages */}
          {isOnSale && !discountPrice && (
            <div style={{ color: '#d91a5b', fontSize: '14px', fontStyle: 'italic' }}>
              ⚠️ Please enter a discount price
            </div>
          )}
          {discountPrice && parseFloat(discountPrice) >= parseFloat(product?.product_price) && (
            <div style={{ color: '#d91a5b', fontSize: '14px', fontStyle: 'italic' }}>
              ⚠️ Discount price must be less than regular price
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button onClick={onClose} className="btn btn-outline">Cancel</button>
          <button onClick={handleSave} className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditDiscountModal;