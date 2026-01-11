import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productService } from '../services';
import { ProductGrid } from '../components';

const categoryImages = {
  "Beverage": "images/beverage-image.png",
  "Hygiene": "images/hygiene-image.png",
  "Canned Goods": "images/canned-goods.png",
  "Snacks": "images/snacks.png",
  "Frozen Goods": "images/frozen-image.png",
  "Beverages": "images/beverages.png",
  "Cooking Essentials": "images/cooking.png",
  "Chiller": "images/chiller.jpg",
  "default": "images/default-image.png"
};
const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [availableQuantities, setAvailableQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  
  // State to control which "page" we are on
  const [showLanding, setShowLanding] = useState(!searchParams.get('category') && !searchParams.get('query'));
  
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || ''
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState(
    searchParams.get('subcategory') || ''
  );

  // Constants for branding colors
  const DALI_PINK = '#b21984';

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
    try {
      const params = {};
      if (query) params.search = query;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedSubcategory) params.subcategory = selectedSubcategory;
      
      const response = await productService.getProducts(params);
      setProducts(Array.isArray(response) ? response : (response.products || []));
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [query, selectedCategory, selectedSubcategory]);

  useEffect(() => {
    const timeoutId = setTimeout(fetchProducts, 200);
    return () => clearTimeout(timeoutId);
  }, [fetchProducts]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedSubcategory) params.set('subcategory', selectedSubcategory);
    setSearchParams(params);
  }, [query, selectedCategory, selectedSubcategory, setSearchParams]);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category === selectedCategory ? '' : category);
    setSelectedSubcategory('');
    setShowLanding(false); 
  };

  const handleReset = () => {
    setQuery('');
    setSelectedCategory('');
    setSelectedSubcategory(''); 
  };

  // --- Sub-component: Categories Landing Page ---
  const CategoriesLanding = () => (
  <div style={{ padding: '40px 5%', textAlign: 'center', backgroundColor: '#fff' }}>
    

    <h1 style={{ fontSize: '64px', fontWeight: 'bold', color: DALI_PINK, margin: '20px 0 10px 0' }}>DALI Online</h1>
    <p style={{ color: '#666', maxWidth: '600px', margin: '0 auto 50px auto', lineHeight: '1.5' }}>
      The same hard-to-beat prices you love, now just a click away. Shop smart and save big on your everyday groceries with DALI Online.
    </p>

    <h2 style={{ textAlign: 'left', fontSize: '24px', fontWeight: 'bold', color: '#444', marginBottom: '30px' }}>Popular Categories</h2>
    
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
      gap: '25px',
      paddingBottom: '40px'
    }}>
      {categories.map((cat) => (
        <div key={cat} style={{ 
          backgroundColor: '#fff', 
          borderRadius: '25px', 
          padding: '30px', 
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)', 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transition: 'transform 0.2s',
          border: '1px solid #f0f0f0'
        }}>
          <div style={{ height: '180px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            
            <img 
              src={categoryImages[cat] || categoryImages["default"]} 
              alt={cat} 
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
            />
          </div>
          
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '25px' }}>{cat}</h3>
          
          <button 
            onClick={() => handleCategoryChange(cat)} 
            style={{ 
              backgroundColor: DALI_PINK, 
              color: 'white', 
              border: 'none', 
              padding: '12px 30px', 
              borderRadius: '25px', 
              fontWeight: 'bold',
              width: '100%',
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(178, 25, 132, 0.3)'
      
            }}>
            Shop now
          </button>
        </div>
      ))}
    </div>
  </div>
);
  // Decide which view to render
  if (showLanding && !query && !selectedCategory) {
    return <CategoriesLanding />;
  }

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

        <div className="filter-group" style={{ marginBottom: '25px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#888', marginBottom: '15px', letterSpacing: '1px' }}>
            CATEGORY
          </h3>
          
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                id="cat-all"
                checked={selectedCategory === ''}
                onChange={() => handleReset()}
                style={{ width: '18px', height: '18px', marginRight: '10px', accentColor: DALI_PINK }}
              />
              <label htmlFor="cat-all" style={{ fontSize: '14px', color: '#444', cursor: 'pointer' }}>
                All Categories
              </label>
            </li>

            {categories.map((cat, index) => (
              <li key={cat} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    id={`cat-${index}`}
                    checked={selectedCategory === cat}
                    onChange={() => handleCategoryChange(cat)}
                    style={{ width: '18px', height: '18px', marginRight: '10px', accentColor: DALI_PINK }}
                  />
                  <label 
                    htmlFor={`cat-${index}`} 
                    style={{ 
                      fontSize: '14px', 
                      color: selectedCategory === cat ? DALI_PINK : '#444', 
                      fontWeight: selectedCategory === cat ? 'bold' : 'normal', 
                      cursor: 'pointer' 
                    }}
                  >
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
                          style={{ width: '16px', height: '16px', marginRight: '10px', accentColor: DALI_PINK }}
                        />
                        <label 
                          htmlFor={`subcat-${subIndex}`} 
                          style={{ fontSize: '13px', color: selectedSubcategory === subcat ? DALI_PINK : '#666', cursor: 'pointer' }}
                        >
                          {subcat}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flexGrow: 1 }}>
        <section style={{ 
          backgroundColor: DALI_PINK, 
          borderRadius: '10px', 
          height: '180px', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          marginBottom: '30px'
        }}>
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
              onFocus={() => setShowLanding(false)} // Switch view if searching
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

        <div id="product-grid-results">
           {loading ? (
            <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>Loading products...</div>
          ) : products.length === 0 ? (
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
          ): (
            <ProductGrid products={products} availableQuantities={availableQuantities} />
          )}
        </div>
      </main>
    </div>
  );
};

export default Shop;