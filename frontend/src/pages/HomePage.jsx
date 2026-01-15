import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { productsAPI } from '../api/api';
import './HomePage.css';

// Import placeholder images - in production these would come from backend/CDN
const heroImage = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop';

const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await productsAPI.getCategories();
        setCategories(response.data.categories || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Category images mapping
  const categoryImages = {
    'Frozen Goods': 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&auto=format&fit=crop',
    'Health & Beauty': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&auto=format&fit=crop',
    'Snacks': 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&auto=format&fit=crop',
    'Beverage': 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=400&auto=format&fit=crop',
    'Food Staples': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop',
    'Home Essentials': 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&auto=format&fit=crop',
  };

  const getDefaultImage = (category) => {
    return categoryImages[category] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop';
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <p className="hero-tagline">Mas mura sa</p>
          <h1 className="hero-title">DALI</h1>
          <p className="hero-description">
            DALI is an online grocery store where convenience meets quality and affordability. 
            Value for money is our passion, and we will never compromise on the freshness of 
            products or their variety. DALI brings happiness to your table, eases your routines, 
            and gives you more time to enjoy what you love.
          </p>
          <div className="hero-buttons">
            <Link to="/shop" className="btn btn-primary">Shop now</Link>
            <Link to="/about" className="btn btn-outline">Learn more</Link>
          </div>
        </div>

        <div className="hero-image">
          <img src={heroImage} alt="Fresh groceries" />
          
          <div className="feature-badge badge-loved">
            <div className="badge-icon">💜</div>
            <div className="badge-text">
              <strong>Loved by All</strong>
              <span>Top Choice by Many</span>
            </div>
          </div>

          <div className="feature-badge badge-convenient">
            <div className="badge-text">
              <strong>Convenient Shopping</strong>
              <span>Shopping at the comfort of your home</span>
            </div>
            <div className="badge-icon">🛒</div>
          </div>

          <div className="feature-badge badge-affordable">
            <div className="badge-icon">✓</div>
            <div className="badge-text">
              <strong>Very Affordable</strong>
              <span>Prices are usually lower</span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories-section">
        <h2 className="section-title">
          Discover DALI's Wide<br />Product Range
        </h2>
        <p className="section-description">
          Find everything you need in one place — from fresh produce to pantry staples, 
          quality meats, and more, all ready for you to shop with ease.
        </p>

        <h3 className="subsection-title">Popular Categories</h3>

        {loading ? (
          <div className="loading">Loading categories...</div>
        ) : (
          <div className="categories-grid">
            {categories.slice(0, 6).map((category) => (
              <div key={category} className="category-card">
                <img 
                  src={getDefaultImage(category)} 
                  alt={category}
                  className="category-image"
                />
                <h4 className="category-name">{category}</h4>
                <Link 
                  to={`/shop?category=${encodeURIComponent(category)}`} 
                  className="btn btn-primary btn-small"
                >
                  Shop now
                </Link>
              </div>
            ))}
          </div>
        )}

        <Link to="/shop" className="btn btn-outline load-more">
          Load more categories
        </Link>
      </section>

      {/* Store Locator Section */}
      <section className="store-locator-section">
        <div className="store-locator-content">
          <h2>Find a DALI Store Near You</h2>
          <p>Visit one of our physical stores for pickup or same-day shopping</p>
          <Link to="/stores" className="btn btn-primary">Find stores</Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
