import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import RevenueChart from '../../components/RevenueChart';
import TopProductsChart from '../../components/TopProductsChart';
import './AdminHome.css';

const AdminHome = () => {
  const { isSuperAdmin, admin } = useAuth();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    lowStockCount: 0
  });
  const [revenueData, setRevenueData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadChartData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats from backend API
      const statsResponse = await adminAPI.getStats();
      
      // Extract the actual data from axios response
      const statsData = statsResponse.data || statsResponse;
      
      // Fetch recent orders
      const ordersData = await adminAPI.getOrders();
      const orders = Array.isArray(ordersData) ? ordersData : (ordersData.orders || []);
      
      // Sort orders by date (most recent first)
      const sortedOrders = orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      // Fetch store-specific low stock products from backend
      const lowStockData = await adminAPI.getLowStockProducts();
      
      // Use stats from API
      setStats({
        totalRevenue: statsData.total_revenue || 0,
        totalOrders: statsData.total_orders || 0,
        totalProducts: statsData.total_products || 0,
        lowStockCount: statsData.stock_alerts || 0
      });
      
      // Get recent 5 orders
      setRecentOrders(sortedOrders.slice(0, 5));
      
      // Set low stock products from API (already filtered by store)
      setLowStockProducts(lowStockData || []);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    try {
      setChartsLoading(true);
      
      // Fetch revenue by month data
      const revenueResponse = await adminAPI.getRevenueByMonth(12);
      const revenueDataResult = revenueResponse.data || revenueResponse;
      setRevenueData(revenueDataResult);
      
    } catch (error) {
      console.error('Error loading chart data:', error);
      setRevenueData([]);
    } finally {
      setChartsLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined) return '₱0.00';
    return `₱${Number(price).toLocaleString('en-PH', {
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
        <div>
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">
            {isSuperAdmin 
              ? "Welcome back! Here's an overview of all stores." 
              : `Welcome back! Here's what's happening at your store${admin?.store_name ? `: ${admin.store_name}` : ''}.`
            }
          </p>
        </div>
      </div>

      {/* Chart Cards */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              Revenue Trends
            </h3>
            <span className="chart-card-subtitle">Monthly comparison</span>
          </div>
          <RevenueChart data={revenueData} loading={chartsLoading} />
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              Top Selling Products
            </h3>
            <span className="chart-card-subtitle">Best performers</span>
          </div>
          <TopProductsChart />
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="summary-stats-row">
        <div className="summary-stat-card">
          <div className="summary-stat-icon products-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div className="summary-stat-content">
            <div className="summary-stat-value">{stats.totalProducts}</div>
            <div className="summary-stat-label">Products</div>
          </div>
        </div>

        <div className="summary-stat-card">
          <div className="summary-stat-icon alerts-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="summary-stat-content">
            <div className="summary-stat-value">{stats.lowStockCount}</div>
            <div className="summary-stat-label">Stock Alerts</div>
          </div>
        </div>
      </div>

      {/* Modern Stats Cards */}
      <div className="dashboard-grid" style={{ display: 'none' }}>
        <div className="stat-card modern-card revenue-card">
          <div className="stat-card-content">
            <div className="stat-card-header">
              <div className="stat-card-title">Total Revenue</div>
              <div className="stat-card-icon-modern">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="28" height="28">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
            </div>
            <div className="stat-card-value-modern">{formatPrice(stats.totalRevenue)}</div>
            <div className="stat-card-footer">
              <span className="stat-badge success">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                </svg>
                From completed orders
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card modern-card orders-card">
          <div className="stat-card-content">
            <div className="stat-card-header">
              <div className="stat-card-title">Total Orders</div>
              <div className="stat-card-icon-modern">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="28" height="28">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
            </div>
            <div className="stat-card-value-modern">{stats.totalOrders}</div>
            <div className="stat-card-footer">
              <span className="stat-badge neutral">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                {isSuperAdmin ? 'All stores' : 'Your store orders'}
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card modern-card products-card">
          <div className="stat-card-content">
            <div className="stat-card-header">
              <div className="stat-card-title">Products</div>
              <div className="stat-card-icon-modern">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="28" height="28">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
            </div>
            <div className="stat-card-value-modern">{stats.totalProducts}</div>
            <div className="stat-card-footer">
              <span className="stat-badge neutral">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                </svg>
                In inventory
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card modern-card alerts-card">
          <div className="stat-card-content">
            <div className="stat-card-header">
              <div className="stat-card-title">Stock Alerts</div>
              <div className="stat-card-icon-modern">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="28" height="28">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
            </div>
            <div className="stat-card-value-modern">{stats.lowStockCount}</div>
            <div className="stat-card-footer">
              <span className="stat-badge danger">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Need attention
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Quick Actions</h2>
        </div>
        <div className="quick-actions">
          {isSuperAdmin && (
            <Link to="/admin/add-product" className="action-button">
              <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add New Product</span>
            </Link>
          )}
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
          {isSuperAdmin && (
            <Link to="/admin/orders" className="action-button">
              <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              <span>View Orders</span>
            </Link>
          )}
          {isSuperAdmin && (
            <Link to="/admin/audit" className="action-button">
              <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span>Audit Log</span>
            </Link>
          )}
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
            {lowStockProducts.map((item) => (
              <div 
                key={`${item.product_id}-${item.store_id || 'global'}`} 
                className={`alert-item ${item.quantity === 0 ? 'danger' : 'warning'}`}
              >
                {item.quantity === 0 ? (
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
                  <div className="alert-title">{item.product_name}</div>
                  <div className="alert-description">
                    {item.quantity === 0 
                      ? 'Out of stock - Restock immediately' 
                      : `Low stock - Only ${item.quantity} items remaining`}
                  </div>
                </div>
                <Link 
                  to={`/admin/inventory/${item.product_id}`}
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
