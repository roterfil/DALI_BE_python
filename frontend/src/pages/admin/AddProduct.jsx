import { useState, useEffect, useRef } from 'react';
import adminService from '../../services/adminService';
import productService from '../../services/productService';
import { useNavigate } from 'react-router-dom';
import './AddProduct.css';

// --- REUSABLE DROPDOWN COMPONENT ---
const CustomSelect = ({ options, value, onChange, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div className={`custom-select-container ${disabled ? 'disabled' : ''}`} ref={wrapperRef}>
      <div 
        className={`custom-select-header ${isOpen ? 'is-open' : ''}`} 
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={value ? "selected-text" : "placeholder-text"}>
          {value || placeholder}
        </span>
        <div className="arrow-icon"></div>
      </div>

      {isOpen && (
        <div className="custom-select-list">
          {options.length > 0 ? (
            options.map((option) => (
              <div 
                key={option} 
                className={`custom-option ${value === option ? 'selected' : ''}`}
                onClick={() => handleSelect(option)}
              >
                {option}
              </div>
            ))
          ) : (
            <div style={{ padding: '10px', color: '#999', textAlign: 'center' }}>
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---
const AddProduct = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await productService.getCategories();
        setCategories(data.categories || data || []);
      } catch (err) {
        setCategories([]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!category) {
      setSubcategories([]);
      return;
    }
    const loadSub = async () => {
      try {
        const data = await productService.getSubcategories(category);
        setSubcategories(data.subcategories || data || []);
      } catch (err) {
        setSubcategories([]);
      }
    };
    loadSub();
  }, [category]);

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const product = {
        product_name: name,
        product_description: desc,
        product_price: Number(price),
        product_category: category,
        product_subcategory: subcategory,
        product_quantity: Number(quantity),
        imageFile,
      };
      await adminService.addProduct(product);
      navigate('/admin/inventory');
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="form-card">
        <div className="form-header">
          <h2>Add New Product</h2>
          <p>Enter the details to add a new item to the global inventory.</p>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          {/* Name */}
          <div className="input-group">
            <label>Product Name</label>
            <input 
              className="input-field" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g., DALI Whole Wheat Bread"
              required 
            />
          </div>

          {/* Description */}
          <div className="input-group">
            <label>Description</label>
            <textarea 
              className="input-field" 
              value={desc} 
              onChange={e => setDesc(e.target.value)}
              placeholder="Enter product details..."
            />
          </div>

          {/* Price & Quantity */}
          <div className="row-two">
            <div className="input-group">
              <label>Price (PHP)</label>
              <input 
                type="number" 
                step="0.01" 
                className="input-field" 
                value={price} 
                onChange={e => setPrice(e.target.value)} 
                placeholder="0.00"
                required 
              />
            </div>
            <div className="input-group">
              <label>Initial Quantity</label>
              <input 
                type="number" 
                className="input-field" 
                value={quantity} 
                onChange={e => setQuantity(e.target.value)} 
                required 
              />
            </div>
          </div>

          {/* Categories - USING NEW CUSTOM SELECT */}
          <div className="row-two">
            <div className="input-group">
              <label>Category</label>
              <CustomSelect 
                options={categories}
                value={category}
                onChange={(val) => {
                  setCategory(val);
                  setSubcategory(''); // Reset sub on change
                }}
                placeholder="Select Category"
              />
            </div>
            
            <div className="input-group">
              <label>Subcategory</label>
              <CustomSelect 
                options={subcategories}
                value={subcategory}
                onChange={setSubcategory}
                placeholder="Select Subcategory"
                disabled={!category || subcategories.length === 0}
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="input-group">
            <label>Product Image</label>
            <label className="file-upload-wrapper">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                className="file-input"
              />
              <span className="file-label-text">
                {imageFile ? "Change Image" : "Click to Upload Product Image"}
              </span>
              {imageFile && (
                <span className="file-preview-name">
                  Selected: {imageFile.name}
                </span>
              )}
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="button-group">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => navigate('/admin/inventory')}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProduct;