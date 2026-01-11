import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { productsAPI } from '../api/api';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/Toast';
import './ShopPage.css';

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('popular');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [addingToCart, setAddingToCart] = useState(null);

  // Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await productsAPI.getCategories();
        setCategories(response.data.categories || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch Subcategories
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (selectedCategory) {
        try {
          const response = await productsAPI.getSubcategories(selectedCategory);
          setSubcategories(response.data.subcategories || []);
        } catch (error) {
          console.error('Error fetching subcategories:', error);
        }
      }
    };
    fetchSubcategories();
  }, [selectedCategory]);

  // Fetch Products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = {};
        if (selectedCategory) params.category = selectedCategory;
        if (selectedSubcategories.length > 0) params.subcategory = selectedSubcategories[0];
        if (searchQuery) params.search = searchQuery;

        const response = await productsAPI.getProducts(params);
        setProducts(response.data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [selectedCategory, selectedSubcategories, searchQuery]);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setSelectedSubcategories([]);
    setSearchParams({ category });
  };

  const handleBackToCategories = () => {
    setSelectedCategory('');
    setSearchParams({});
  };

  const handleAddToCart = async (product) => {
    setAddingToCart(product.product_id);
    const result = await addToCart(product.product_id, 1);
    if (result.success) showToast(`${product.product_name} added!`, 'success');
    setAddingToCart(null);
  };

  return (
    <div className="shop-page">
      {!selectedCategory ? (
        /* --- LANDING PAGE VIEW --- */
        <div className="landing-view">
          <div className="landing-header">
            <button onClick={() => window.history.back()} className="back-btn-pill">‹ Back</button>
            <h1 className="dali-title">DALI Online</h1>
            <p className="dali-subtitle">
              The same hard-to-beat prices you love, now just a click away. Shop smart and <br/>
              save big on your everyday groceries with DALI Online
            </p>
          </div>

          <section className="categories-section">
            <h2 className="section-title">Popular Categories</h2>
            <div className="category-grid">
              {categories.map((cat) => (
                <div key={cat} className="category-card" onClick={() => handleCategorySelect(cat)}>
                  <div className="category-image-wrapper">
                    <img src={`/images/categories/${cat.toLowerCase().replace(/\s/g, '-')}.png`} alt={cat} />
                  </div>
                  <h3>{cat}</h3>
                  <button className="shop-now-btn">Shop now</button>
                </div>
              ))}
            </div>
            <button className="load-more-btn">Load more categories</button>
          </section>
        </div>
      ) : (
        /* --- PRODUCT SHOP VIEW --- */
        <div className="shop-container">
          <aside className="filters-sidebar">
            <div className="filter-top">
              <h2>Filters</h2>
              <button className="clear-btn" onClick={handleBackToCategories}>Clear filter</button>
            </div>
            
            <div className="filter-group">
              <label className="filter-label">CATEGORY</label>
              <div className="filter-item">
                <input type="checkbox" checked={true} readOnly />
                <span>{selectedCategory}</span>
              </div>
              {subcategories.map(sub => (
                <div key={sub} className="filter-item sub">
                  <input type="checkbox" />
                  <span>{sub}</span>
                </div>
              ))}
            </div>
          </aside>

          <main className="shop-main">
            {/* Purple Search Banner */}
            <div className="search-banner">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  placeholder="Search" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="product-results">
              {loading ? (
                <p>Loading...</p>
              ) : (
                <div className="products-grid">
                  {products.map((product) => (
                    <div key={product.product_id} className="product-card-item">
                      <div className="product-img-box">
                         <img src={product.image || '/default-prod.png'} alt={product.product_name} />
                      </div>
                      <div className="product-info">
                        <span className="category-tag">{selectedCategory.toUpperCase()}</span>
                        <h4>{product.product_name}</h4>
                        <p className="price">₱ {parseFloat(product.product_price).toFixed(2)}</p>
                        <button 
                          className="add-btn"
                          onClick={() => handleAddToCart(product)}
                        >
                          {addingToCart === product.product_id ? '...' : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
};

export default ShopPage;