import { useState } from 'react';
import adminService from '../services/adminService';
import { useToast } from './Toast';

const EditPriceModal = ({ product, open, onClose, onSaved }) => {
  const [price, setPrice] = useState(product ? Number(product.product_price) : 0);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  if (!open) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await adminService.updatePrice(product.product_id, Number(price));
      showToast('Price updated', 'success');
      onSaved && onSaved(Number(price));
      onClose();
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.detail || 'Failed to update price', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Edit Price - {product.product_name}</h3>
        <div className="modal-body">
          <label>Price</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="btn muted">Cancel</button>
          <button onClick={handleSave} className="btn primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
};

export default EditPriceModal;
