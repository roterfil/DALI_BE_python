import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { productsAPI } from '../api/api';
import './SalePage.css';

const SalePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('discount-high');

  useEffect(() => {
    const fetchSaleProducts = async () => {
      setLoading(true);
      try {
        const response = await productsAPI.getSaleProducts();
        let productList = response.data || [];

        // Sort products
        if (sortBy === 'discount-high') {
          productList.sort((a, b) => {
            const discountA = ((parseFloat(a.product_price) - parseFloat(a.product_discount_price)) / parseFloat(a.product_price)) * 100;
            const discountB = ((parseFloat(b.product_price) - parseFloat(b.product_discount_price)) / parseFloat(b.product_price)) * 100;
            return discountB - discountA;
          });
        } else if (sortBy === 'discount-low') {
          productList.sort((a, b) => {
            const discountA = ((parseFloat(a.product_price) - parseFloat(a.product_discount_price)) / parseFloat(a.product_price)) * 100;
            const discountB = ((parseFloat(b.product_price) - parseFloat(b.product_discount_price)) / parseFloat(b.product_price)) * 100;
            return discountA - discountB;
          });
        } else if (sortBy === 'price-low') {
          productList.sort((a, b) => parseFloat(a.product_discount_price) - parseFloat(b.product_discount_price));
        } else if (sortBy === 'price-high') {
          productList.sort((a, b) => parseFloat(b.product_discount_price) - parseFloat(a.product_discount_price));
        } else if (sortBy === 'name') {
          productList.sort((a, b) => a.product_name.localeCompare(b.product_name));
        }

        setProducts(productList);
      } catch (error) {
        console.error('Error fetching sale products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSaleProducts();
  }, [sortBy]);

  return (
    <div className="sale-page">
      <div className="sale-header">
        <Link to="/" className="back-link">← Back</Link>
        <div className="sale-header-content">
          <h1>Sale Items</h1>
          <p>Don't miss out on these amazing deals! Limited time offers on your favorite products.</p>
        </div>
      </div>

      <div className="sale-content">
        <div className="sale-controls">
          <div className="sort-select">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="discount-high">Biggest Discount</option>
              <option value="discount-low">Smallest Discount</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name</option>
            </select>
          </div>
          <span className="product-count">
            {products.length} {products.length === 1 ? 'item' : 'items'} on sale
          </span>
        </div>

        {loading ? (
          <div className="loading">Loading sale items...</div>
        ) : products.length === 0 ? (
          <div className="no-sales">
            <h3>No Items on Sale</h3>
            <p>Check back later for amazing deals!</p>
            <Link to="/shop" className="btn btn-primary">Browse All Products</Link>
          </div>
        ) : (
          <div className="sale-products-grid">
            {products.map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalePage;
