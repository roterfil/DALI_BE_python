import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../api/api';
import './AdminHome.css';

const AdminHome = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    lowStockCount: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch orders
      const ordersData = await adminAPI.getOrders();
      console.log('Raw orders data:', ordersData);
      const orders = Array.isArray(ordersData) ? ordersData : (ordersData.orders || []);
      console.log('Processed orders:', orders);
      console.log('Total orders count:', orders.length);
      
      // Sort orders by date (most recent first)
      const sortedOrders = orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      // Fetch products
      const productsResponse = await fetch('/api/products');
      const products = await productsResponse.json();
      console.log('Products count:', products.length);
      
      // Calculate stats
      const deliveredOrders = sortedOrders.filter(o => o.order_status?.toLowerCase() === 'delivered');
      const completedOrders = sortedOrders.filter(o => o.order_status?.toLowerCase() === 'completed');
      console.log('Delivered orders:', deliveredOrders.length);
      console.log('Completed orders:', completedOrders.length);
      console.log('Order statuses:', sortedOrders.map(o => o.order_status));
      
      const allCompletedOrders = [...deliveredOrders, ...completedOrders];
      const totalRevenue = allCompletedOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
      console.log('Total revenue:', totalRevenue);
      
      const lowStock = products.filter(p => p.product_quantity > 0 && p.product_quantity <= 10);
      const outOfStock = products.filter(p => p.product_quantity === 0);
      
      setStats({
        totalRevenue: totalRevenue,
        totalOrders: sortedOrders.length,
        totalProducts: products.length,
        lowStockCount: lowStock.length + outOfStock.length
      });
      
      // Get recent 5 orders
      setRecentOrders(sortedOrders.slice(0, 5));
      console.log('Recent orders to display:', sortedOrders.slice(0, 5));
      
      // Get low stock products
      setLowStockProducts([...outOfStock.slice(0, 3), ...lowStock.slice(0, 2)]);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      console.error('Error details:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return `₱${parseFloat(price).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusClass = (status) => {
    const statusMap = {
      'pending': 'pending',
      'processing': 'processing',
      'completed': 'completed',
      'cancelled': 'cancelled'
    };
    return statusMap[status?.toLowerCase()] || 'pending';
  };

  if (loading) {
    return (
      <main className="container admin-dashboard">
        <p>Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="container admin-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's what's happening with your store today.</p>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-title">Total Revenue</div>
            <div className="stat-card-icon" style={{ backgroundColor: '#d1fae5' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" width="28" height="28">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{formatPrice(stats.totalRevenue)}</div>
          <div className="stat-card-change positive">↑ From completed orders</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-title">Total Orders</div>
            <div className="stat-card-icon" style={{ backgroundColor: '#dbeafe' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="28" height="28">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{stats.totalOrders}</div>
          <div className="stat-card-change neutral">All time orders</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-title">Products</div>
            <div className="stat-card-icon" style={{ backgroundColor: '#fef3c7' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" width="28" height="28">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{stats.totalProducts}</div>
          <div className="stat-card-change neutral">In inventory</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-title">Stock Alerts</div>
            <div className="stat-card-icon" style={{ backgroundColor: '#fee2e2' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" width="28" height="28">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{stats.lowStockCount}</div>
          <div className="stat-card-change negative">Need attention</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Quick Actions</h2>
        </div>
        <div className="quick-actions">
          <Link to="/admin/add-product" className="action-button">
            <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add New Product</span>
          </Link>
          <Link to="/admin/inventory" className="action-button">
            <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>Manage Inventory</span>
          </Link>
          <Link to="/admin/orders" className="action-button">
            <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            <span>View Orders</span>
          </Link>
          <Link to="/admin/audit" className="action-button">
            <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span>Audit Log</span>
          </Link>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Recent Orders</h2>
          <Link to="/admin/orders" className="section-link">View all →</Link>
        </div>
        {recentOrders.length > 0 ? (
          <div className="recent-orders-list">
            {recentOrders.map((order) => (
              <Link 
                key={order.order_id} 
                to={`/admin/orders/${order.order_id}`} 
                className="order-item"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="order-info">
                  <div className="order-id">Order #{order.order_id}</div>
                  <div className="order-customer">
                    {order.account?.account_first_name} {order.account?.account_last_name} • {formatDate(order.created_at)}
                  </div>
                </div>
                <div className="order-amount">{formatPrice(order.total_amount)}</div>
                <span className={`order-status ${getStatusClass(order.order_status)}`}>
                  {order.order_status}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" width="48" height="48">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            <div className="empty-state-text">No orders yet</div>
          </div>
        )}
      </div>

      {/* Stock Alerts */}
      {lowStockProducts.length > 0 && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Stock Alerts</h2>
            <Link to="/admin/inventory?stock=low" className="section-link">View all →</Link>
          </div>
          <div className="alerts-list">
            {lowStockProducts.map((product) => (
              <div 
                key={product.product_id} 
                className={`alert-item ${product.product_quantity === 0 ? 'danger' : 'warning'}`}
              >
                {product.product_quantity === 0 ? (
                  <svg className="alert-icon" viewBox="0 0 24 24" fill="#dc2626" width="24" height="24">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                ) : (
                  <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" width="24" height="24">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                )}
                <div className="alert-content">
                  <div className="alert-title">{product.product_name}</div>
                  <div className="alert-description">
                    {product.product_quantity === 0 
                      ? 'Out of stock - Restock immediately' 
                      : `Low stock - Only ${product.product_quantity} items remaining`}
                  </div>
                </div>
                <Link 
                  to={`/admin/inventory/${product.product_id}`}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    backgroundColor: '#a1127c', 
                    color: 'white', 
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}
                >
                  Restock
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
};

export default AdminHome;
