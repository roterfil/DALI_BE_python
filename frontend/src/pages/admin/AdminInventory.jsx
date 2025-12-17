import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { productService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import EditPriceModal from '../../components/EditPriceModal';
import adminService from '../../services/adminService';

const AdminInventory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || ''
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState(
    searchParams.get('subcategory') || ''
  );
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [stockFilter, setStockFilter] = useState(
    searchParams.get('stock') || ''
  );
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await productService.getCategories();
        // Backend returns { categories: [...] }
        setCategories(data.categories || data || []);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Fetch subcategories when category changes
  useEffect(() => {
    const loadSubcategories = async () => {
      if (selectedCategory) {
        try {
          const data = await productService.getSubcategories(selectedCategory);
          setSubcategories(data.subcategories || data || []);
        } catch (error) {
          console.error('Error loading subcategories:', error);
          setSubcategories([]);
        }
      } else {
        setSubcategories([]);
      }
    };
    loadSubcategories();
  }, [selectedCategory]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const params = {};
      if (query) params.search = query;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedSubcategory) params.subcategory = selectedSubcategory;
      
      const response = await productService.getProducts(params);
      console.log('Products response:', response);
      // Backend returns array directly, or object with products property
      let productList = Array.isArray(response) ? response : (response.products || []);
      
      // Apply stock level filter
      if (stockFilter === 'out') {
        productList = productList.filter(p => p.product_quantity === 0);
      } else if (stockFilter === 'low') {
        productList = productList.filter(p => p.product_quantity > 0 && p.product_quantity <= 10);
      }
      
      console.log('Product list:', productList);
      setProducts(productList);
      if (productList.length === 0) {
        setErrorMessage('No products found');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setErrorMessage('Failed to load products: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [query, selectedCategory, selectedSubcategory, stockFilter]);

  useEffect(() => {
    const timeoutId = setTimeout(fetchProducts, 200);
    return () => clearTimeout(timeoutId);
  }, [fetchProducts]);

  const { isSuperAdmin } = useAuth();

  const openPriceModal = (product) => {
    setSelectedProduct(product);
    setIsPriceModalOpen(true);
  };

  const handlePriceSaved = (newPrice) => {
    // EditPriceModal already performs the API call. Parent should only update local state.
    setProducts((prev) => prev.map((p) => (p.product_id === selectedProduct.product_id ? { ...p, product_price: Number(newPrice) } : p)));
  };

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedSubcategory) params.set('subcategory', selectedSubcategory);
    if (stockFilter) params.set('stock', stockFilter);
    setSearchParams(params);
  }, [query, selectedCategory, selectedSubcategory, stockFilter, setSearchParams]);

  // Handle category change - reset subcategory
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSelectedSubcategory('');
  };

  const formatPrice = (price) => {
    return `₱${price.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="shop-container container">
      {/* Filter Sidebar */}
      <aside className="filter-sidebar">
        <h4>Filters</h4>
        <div className="filter-group">
          <h5>CATEGORY</h5>
          <ul>
            <li>
              <input
                type="radio"
                name="category"
                value=""
                id="cat-all"
                checked={selectedCategory === '' && selectedSubcategory === ''}
                onChange={() => handleCategoryChange('')}
              />
              <label htmlFor="cat-all">All</label>
            </li>
            {categories.map((cat, index) => (
              <li key={cat} className="category-item">
                <input
                  type="radio"
                  name="category"
                  value={cat}
                  id={`cat-${index}`}
                  checked={selectedCategory === cat && selectedSubcategory === ''}
                  onChange={() => handleCategoryChange(cat)}
                />
                <label htmlFor={`cat-${index}`}>{cat}</label>
                
                {/* Subcategories nested under selected category */}
                {selectedCategory === cat && subcategories.length > 0 && (
                  <ul className="subcategory-list" style={{ marginLeft: '20px', marginTop: '8px' }}>
                    {subcategories.map((subcat, subIndex) => (
                      <li key={subcat}>
                        <input
                          type="radio"
                          name="subcategory"
                          value={subcat}
                          id={`subcat-${subIndex}`}
                          checked={selectedSubcategory === subcat}
                          onChange={() => setSelectedSubcategory(subcat)}
                        />
                        <label htmlFor={`subcat-${subIndex}`}>{subcat}</label>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Stock Level Filter */}
        <div className="filter-group" style={{ marginTop: '20px' }}>
          <h5>STOCK LEVEL</h5>
          <ul>
            <li>
              <input
                type="radio"
                name="stockFilter"
                value=""
                id="stock-all"
                checked={stockFilter === ''}
                onChange={() => setStockFilter('')}
              />
              <label htmlFor="stock-all">All</label>
            </li>
            <li>
              <input
                type="radio"
                name="stockFilter"
                value="low"
                id="stock-low"
                checked={stockFilter === 'low'}
                onChange={() => setStockFilter('low')}
              />
              <label htmlFor="stock-low" style={{ color: '#856404' }}>Low Stock (≤10)</label>
            </li>
            <li>
              <input
                type="radio"
                name="stockFilter"
                value="out"
                id="stock-out"
                checked={stockFilter === 'out'}
                onChange={() => setStockFilter('out')}
              />
              <label htmlFor="stock-out" style={{ color: '#dc3545' }}>Out of Stock</label>
            </li>
          </ul>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="product-grid-container">
        <section className="search-banner admin-inventory-banner">
          <div className="banner-flash-wrapper">
            {successMessage && <div className="auth-success">{successMessage}</div>}
            {errorMessage && <div className="auth-error">{errorMessage}</div>}
          </div>

          <input
            type="search"
            id="search-input"
            name="query"
            className="main-search-input"
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </section>

        {/* Product Grid Results */}
        <div id="product-grid-results">
          {loading ? (
            <p style={{ padding: '20px' }}>Loading products...</p>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <div key={product.product_id} className="product-card">
                  <Link
                    className="product-card-body"
                    to={`/admin/inventory/${product.product_id}`}
                  >
                    <div className="product-image-container">
                      <img
                        src={`/images/products/${product.image}`}
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
                    <div className="product-stock-level" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span>Stock: {product.product_quantity}</span>
                      {product.product_quantity === 0 && (
                        <span style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          Out of Stock
                        </span>
                      )}
                      {product.product_quantity > 0 && product.product_quantity <= 10 && (
                        <span style={{
                          backgroundColor: '#ffc107',
                          color: '#212529',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          Low Stock
                        </span>
                      )}
                    </div>
                    <Link
                      to={`/admin/inventory/${product.product_id}`}
                      className="btn btn-primary btn-small"
                      style={{ width: '90%', textAlign: 'center', padding: '8px 15px', fontSize: '0.9rem' }}
                    >
                      Manage Stock
                    </Link>
                    {isSuperAdmin && (
                      <button
                        className="edit-price-btn"
                        style={{ width: '90%', marginTop: '8px' }}
                        onClick={() => openPriceModal(product)}
                      >
                        Edit Price
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      {isPriceModalOpen && selectedProduct && (
        <EditPriceModal
          product={selectedProduct}
          open={isPriceModalOpen}
          onClose={() => setIsPriceModalOpen(false)}
          onSaved={(newPrice) => { handlePriceSaved(newPrice); setIsPriceModalOpen(false); }}
        />
      )}
    </div>
  );
};

export default AdminInventory;
