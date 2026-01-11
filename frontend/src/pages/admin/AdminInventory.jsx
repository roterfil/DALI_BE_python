import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { productService } from '../../services';
import { useAuth } from '../../context/AuthContext';

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

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const params = {};
      if (query) params.search = query;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedSubcategory) params.subcategory = selectedSubcategory;
      
      const response = await productService.getProducts(params);
      let productList = Array.isArray(response) ? response : (response.products || []);
      
      if (stockFilter === 'out') {
        productList = productList.filter(p => p.product_quantity === 0);
      } else if (stockFilter === 'low') {
        productList = productList.filter(p => p.product_quantity > 0 && p.product_quantity <= 10);
      }
      
      setProducts(productList);
      if (productList.length === 0) {
        setErrorMessage('No products found');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setErrorMessage('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [query, selectedCategory, selectedSubcategory, stockFilter]);

  useEffect(() => {
    const timeoutId = setTimeout(fetchProducts, 200);
    return () => clearTimeout(timeoutId);
  }, [fetchProducts]);

  const { isSuperAdmin } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedSubcategory) params.set('subcategory', selectedSubcategory);
    if (stockFilter) params.set('stock', stockFilter);
    setSearchParams(params);
  }, [query, selectedCategory, selectedSubcategory, stockFilter, setSearchParams]);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSelectedSubcategory('');
  };

  const handleReset = () => {
    setQuery('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setStockFilter('');
  };

  const formatPrice = (price) => {
    return `₱${price.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="shop-layout" style={{ display: 'flex', padding: '20px 5%', gap: '30px', fontFamily: 'Arial, sans-serif' }}>
      {/* Filter Sidebar */}
      <aside style={{ width: '250px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0, color: '#333' }}>Filters</h2>
          <button 
            onClick={handleReset}
            style={{
              padding: '5px 15px',
              borderRadius: '20px',
              border: '1px solid #ccc',
              backgroundColor: 'white',
              fontSize: '12px',
              color: '#888',
              cursor: 'pointer'
            }}
          >
            Clear filter
          </button>
        </div>

        {/* Category Section */}
        <div className="filter-group" style={{ marginBottom: '25px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#888', marginBottom: '15px', letterSpacing: '1px' }}>CATEGORY</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
             <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  id="cat-all"
                  checked={selectedCategory === ''}
                  onChange={() => handleCategoryChange('')}
                  style={{ width: '18px', height: '18px', marginRight: '10px', accentColor: '#b21984' }}
                />
                <label htmlFor="cat-all" style={{ fontSize: '14px', color: '#444', cursor: 'pointer' }}>All Categories</label>
              </li>
            {categories.map((cat, index) => (
              <li key={cat} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    id={`cat-${index}`}
                    checked={selectedCategory === cat}
                    onChange={() => handleCategoryChange(cat)}
                    style={{ width: '18px', height: '18px', marginRight: '10px', accentColor: '#b21984' }}
                  />
                  <label htmlFor={`cat-${index}`} style={{ fontSize: '14px', color: selectedCategory === cat ? '#b21984' : '#444', fontWeight: selectedCategory === cat ? 'bold' : 'normal', cursor: 'pointer' }}>
                    {cat}
                  </label>
                </div>
                
                {selectedCategory === cat && subcategories.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: '10px 0 0 28px' }}>
                    {subcategories.map((subcat, subIndex) => (
                      <li key={subcat} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                         <input
                          type="checkbox"
                          id={`subcat-${subIndex}`}
                          checked={selectedSubcategory === subcat}
                          onChange={() => setSelectedSubcategory(subcat === selectedSubcategory ? '' : subcat)}
                          style={{ width: '16px', height: '16px', marginRight: '10px', accentColor: '#b21984' }}
                        />
                        <label htmlFor={`subcat-${subIndex}`} style={{ fontSize: '13px', color: '#666', cursor: 'pointer' }}>{subcat}</label>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Stock Level Section */}
        <div className="filter-group">
          <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#888', marginBottom: '15px', letterSpacing: '1px' }}>STOCK LEVEL</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                id="stock-all"
                checked={stockFilter === ''}
                onChange={() => setStockFilter('')}
                style={{ width: '18px', height: '18px', marginRight: '10px', accentColor: '#b21984' }}
              />
              <label htmlFor="stock-all" style={{ fontSize: '14px', color: '#444', cursor: 'pointer' }}>All</label>
            </li>
            <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                id="stock-low"
                checked={stockFilter === 'low'}
                onChange={() => setStockFilter(stockFilter === 'low' ? '' : 'low')}
                style={{ width: '18px', height: '18px', marginRight: '10px', accentColor: '#b21984' }}
              />
              <label htmlFor="stock-low" style={{ fontSize: '14px', color: '#b58105', fontWeight: '500', cursor: 'pointer' }}>Low Stock (≤10)</label>
            </li>
            <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                id="stock-out"
                checked={stockFilter === 'out'}
                onChange={() => setStockFilter(stockFilter === 'out' ? '' : 'out')}
                style={{ width: '18px', height: '18px', marginRight: '10px', accentColor: '#b21984' }}
              />
              <label htmlFor="stock-out" style={{ fontSize: '14px', color: '#dc3545', fontWeight: '500', cursor: 'pointer' }}>Out of Stock</label>
            </li>
          </ul>
        </div>
      </aside>
{/* Main Content Area */}
<main style={{ flexGrow: 1 }}>
  {/* Magenta Search Banner */}
  <section style={{ 
    backgroundColor: '#b21984', 
    borderRadius: '10px', 
    height: '180px', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: '30px'
  }}>
    
    {/* Success Message Banner */}
    {successMessage && (
      <div style={{
        backgroundColor: '#d4edda',
        color: '#155724',
        padding: '10px 20px',
        borderRadius: '8px',
        marginBottom: '15px', // Space between message and search bar
        width: '70%',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        {successMessage}
      </div>
    )}

    
    {/* Search Input Container */}
    <div style={{ position: 'relative', width: '70%' }}>
      <span style={{ 
        position: 'absolute', 
        left: '15px', 
        top: '50%', 
        transform: 'translateY(-50%)', 
        color: '#888' 
      }}>
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>
      <input
        type="text"
        placeholder="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '12px 12px 12px 45px',
          borderRadius: '8px',
          border: 'none',
          fontSize: '16px',
          outline: 'none'
        }}
      />
    </div>
  </section>


{/* Product Grid Results */}
        <div id="product-grid-results">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>Loading products...</div>
          ) : products.length === 0 ? (
            /* Error Message placed here inside the grid area */
            <div style={{ 
              textAlign: 'center', 
              padding: '80px 20px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '10px',
              border: '2px dashed #ddd',
              color: '#721c24'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔍</div>
              <h3 style={{ margin: 0 }}>No products found</h3>
              <p style={{ color: '#888', marginTop: '10px' }}>Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <div key={product.product_id} className="product-card">
                  <Link className="product-card-body" to={`/admin/inventory/${product.product_id}`}>
                    <div className="product-image-container">
                      <img src={`/images/products/${product.image}`} alt={product.product_name} />
                    </div>
                    <div className="product-card-info">
                      <p className="product-card-category">{product.product_category}</p>
                      <h3 className="product-card-name">{product.product_name}</h3>
                      <p className="product-price">{formatPrice(product.product_price)}</p>
                    </div>
                  </Link>
                  <div className="product-card-actions">
                    <div style={{ 
                        fontSize: '14px', 
                        marginBottom: '10px',
                        color: product.product_quantity === 0 ? '#dc3545' : product.product_quantity <= 10 ? '#b58105' : 'inherit'
                    }}>
                      <strong>Stock: {product.product_quantity}</strong>
                    </div>
                    <Link
                      to={`/admin/inventory/${product.product_id}`}
                      className="btn btn-primary"
                      style={{ 
                        display: 'block', 
                        backgroundColor: '#b21984', 
                        color: 'white', 
                        textDecoration: 'none', 
                        padding: '10px', 
                        textAlign: 'center', 
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      Manage Product
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminInventory;