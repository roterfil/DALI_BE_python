import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services';

const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getOrders(query);
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timeoutId = setTimeout(fetchOrders, 200);
    // fetch dashboard stats once on mount
    fetchStats();
    return () => clearTimeout(timeoutId);
  }, [fetchOrders]);

  const handleViewOrder = (orderId) => {
    navigate(`/admin/orders/${orderId}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatPrice = (price) => {
    return `₱${Number(price).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const fetchStats = useCallback(async () => {
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  const getStatusClass = (status) => {
    const statusMap = {
      PROCESSING: 'processing',
      SHIPPED: 'shipped',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled',
    };
    return statusMap[status] || 'processing';
  };

  const matchesStatusFilter = (order) => {
    if (!statusFilter) return true;
    const s = order.shipping_status;
    if (statusFilter === 'active') {
      return ['PROCESSING', 'PREPARING_FOR_SHIPMENT', 'IN_TRANSIT'].includes(s);
    }
    if (statusFilter === 'completed') {
      return ['DELIVERED', 'COLLECTED'].includes(s);
    }
    if (statusFilter === 'cancelled') {
      return s === 'CANCELLED' || s === 'DELIVERY_FAILED';
    }
    return true;
  };

  const toggleStatusFilter = (f) => setStatusFilter((prev) => (prev === f ? '' : f));

  return (
    <main className="container admin-orders-page-container">
      <div className="admin-orders-header">
        <h1 className="page-title">Track Orders</h1>
        <div className="search-bar-container">
          <input
            type="search"
            name="query"
            className="admin-order-search"
            placeholder="Search by Order ID or Customer Name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div id="order-grid-results">
        {/* Order stats */}
        {stats && (
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-icon orders-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                </svg>
              </div>
              <div className="stat-info">
                <h3>{stats.total_orders || 0}</h3>
                <p>Total Orders</p>
              </div>
            </div>

            <div
              className="stat-card"
              onClick={() => toggleStatusFilter('active')}
              style={{ cursor: 'pointer', boxShadow: statusFilter === 'active' ? '0 6px 20px rgba(161,18,124,0.12)' : undefined }}
            >
              <div className="stat-icon active-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18"></path>
                  <path d="M12 3v18"></path>
                </svg>
              </div>
              <div className="stat-info">
                <h3>{stats.active_orders || 0}</h3>
                <p>Active Orders</p>
              </div>
            </div>

            <div
              className="stat-card"
              onClick={() => toggleStatusFilter('completed')}
              style={{ cursor: 'pointer', boxShadow: statusFilter === 'completed' ? '0 6px 20px rgba(34,197,94,0.08)' : undefined }}
            >
              <div className="stat-icon completed-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="stat-info">
                <h3>{stats.completed_orders || 0}</h3>
                <p>Completed Orders</p>
              </div>
            </div>

            <div
              className="stat-card"
              onClick={() => toggleStatusFilter('cancelled')}
              style={{ cursor: 'pointer', boxShadow: statusFilter === 'cancelled' ? '0 6px 20px rgba(198,40,40,0.08)' : undefined }}
            >
              <div className="stat-icon cancelled-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
              <div className="stat-info">
                <h3>{stats.cancelled_orders || 0}</h3>
                <p>Cancelled Orders</p>
              </div>
            </div>
          </div>
        )}
        {statusFilter && (
          <div style={{ marginBottom: 12 }}>
            <button className="btn btn-secondary btn-small" onClick={() => setStatusFilter('')}>Clear filter</button>
            <span style={{ marginLeft: 10, color: '#666' }}>Filtering: {statusFilter}</span>
          </div>
        )}
        {loading ? (
          <p>Loading orders...</p>
        ) : orders.length === 0 ? (
          <div className="no-orders-found">No orders found.</div>
        ) : (
          <div className="admin-order-grid">
                {orders.filter(matchesStatusFilter).map((order) => (
              <div key={order.order_id} className="admin-order-card">
                <div className="order-card-icon">
                  <img src="/images/order-icon.png" alt="Order Icon" />
                </div>
                <div className="order-card-details">
                  <h3>Order #{order.order_id}</h3>
                  <p className="order-card-meta">
                    <span>{formatDate(order.created_at)}</span> •{' '}
                    <span>
                      {order.total_item_count || order.order_items?.length} items
                    </span>{' '}
                    • <span>{order.payment_method}</span>
                  </p>
                  {order.customer && (
                    <p className="order-card-meta">
                      Customer: {order.customer.first_name} {order.customer.last_name}
                    </p>
                  )}
                  <p className="order-card-price">{formatPrice(order.total_price)}</p>
                </div>
                <div className="order-card-footer">
                  <div className="order-card-status">
                    <span
                      className={`status-dot ${getStatusClass(order.shipping_status)}`}
                    ></span>
                    <span>
                      {order.shipping_status_description || order.shipping_status}
                    </span>
                  </div>
                  <div className="order-card-actions">
                    <button
                      onClick={() => handleViewOrder(order.order_id)}
                      className="btn btn-secondary btn-small"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default AdminOrders;
