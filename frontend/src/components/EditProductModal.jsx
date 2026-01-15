import { useState, useEffect } from 'react';
import { productsAPI, adminAPI } from '../api/api';

const EditProductModal = ({ product, open, onClose, onSaved }) => {
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [editImageFile, setEditImageFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setEditName(product.product_name || '');
      setEditDescription(product.product_description || '');
      setEditCategory(product.product_category || '');
      setEditSubcategory(product.product_subcategory || '');
    }
  }, [product]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await productsAPI.getCategories();
        // Axios wraps data in .data
        const data = response.data.categories || response.data || [];
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    if (open) loadCategories();
  }, [open]);

  useEffect(() => {
    const loadSubcategories = async () => {
      if (editCategory) {
        try {
          const response = await productsAPI.getSubcategories(editCategory);
          const data = response.data.subcategories || response.data || [];
          setSubcategories(Array.isArray(data) ? data : []);
        } catch (err) {
          setSubcategories([]);
        }
      } else {
        setSubcategories([]);
      }
    };
    loadSubcategories();
  }, [editCategory]);

  const handleSave = async () => {
    setError('');
    setLoading(true);
    try {
      // Use FormData because the Python backend uses Form(...) and UploadFile
      const formData = new FormData();
      formData.append('product_name', editName);
      formData.append('product_description', editDescription);
      formData.append('product_category', editCategory);
      formData.append('product_subcategory', editSubcategory || '');
      
      if (editImageFile) {
        formData.append('image', editImageFile);
      }

      await adminAPI.updateProduct(product.product_id, formData);
      
      // Fetch fresh data for the UI
      const updatedRes = await productsAPI.getProduct(product.product_id);
      onSaved(updatedRes.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ marginBottom: '20px' }}>Edit Product Information</h3>
        
        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

        <label style={labelStyle}>Product Name</label>
        <input value={editName} onChange={(e) => setEditName(e.target.value)} style={inputStyle} />

        <label style={labelStyle}>Description</label>
        <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} style={{ ...inputStyle, height: '80px' }} />

        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Category</label>
            <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} style={inputStyle}>
              <option value="">Select Category</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Subcategory</label>
            <select value={editSubcategory} onChange={(e) => setEditSubcategory(e.target.value)} style={inputStyle}>
              <option value="">Select Subcategory</option>
              {subcategories.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <label style={labelStyle}>Update Image</label>
        <input type="file" onChange={(e) => setEditImageFile(e.target.files[0])} style={inputStyle} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={btnSecondary}>Cancel</button>
          <button onClick={handleSave} disabled={loading} style={btnPrimary}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Styles to match your existing modals
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '15px', width: '500px', maxWidth: '90%' };
const inputStyle = { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' };
const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' };
const btnPrimary = { backgroundColor: '#C11B6C', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold' };
const btnSecondary = { backgroundColor: '#f4f4f4', color: '#555', border: '1px solid #ddd', padding: '12px 24px', borderRadius: '25px', cursor: 'pointer' };

export default EditProductModal;