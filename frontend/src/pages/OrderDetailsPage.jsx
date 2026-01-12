import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import './OrderDetailsPage.css';

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchOrder();
  }, [orderId, user, navigate]);

  const fetchOrder = async () => {
    try {
      const response = await ordersAPI.getOrder(orderId);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    
    setCancelling(true);
    try {
      await ordersAPI.cancelOrder(orderId);
      fetchOrder();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DELIVERED':
      case 'COLLECTED':
        return 'success';
      case 'CANCELLED':
      case 'DELIVERY_FAILED':
        return 'error';
      case 'IN_TRANSIT':
        return 'info';
      default:
        return 'warning';
    }
  };

  if (loading) {
    return (
      <div className="order-details-page">
        <div className="loading">Loading order details...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-details-page">
        <div className="error-state">
          <h2>Order not found</h2>
          <Link to="/account" className="btn btn-primary">Back to Account</Link>
        </div>
      </div>
    );
  }

  // Compute totals using available order fields so voucher discounts are reflected
  const computedSubtotal = Number(order.subtotal || 0);
  const computedShipping = Number(order.shipping_fee || 0);
  const computedVoucher = Number(order.voucher_discount || 0);
  const computedTotal = (computedSubtotal + computedShipping - computedVoucher).toFixed(2);

  // Show debug JSON when ?debug=1 is present in URL (temporary, dev-only)
  const params = new URLSearchParams(window.location.search);
  const showDebug = params.get('debug') === '1';

  return (
    <div className="order-details-page">
      <div className="order-details-container">
        <Link to="/account" className="back-link">← Back to Orders</Link>

        <div className="order-header">
          <div>
            <h1>Order #{order.order_id}</h1>
            <p className="order-date">
              Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <span className={`order-status ${getStatusColor(order.shipping_status)}`}>
            {order.shipping_status.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Debug JSON (dev only) */}
        {showDebug && (
          <section className="order-section">
            <h2>Debug — Fetched order JSON</h2>
            <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '240px', overflow: 'auto', background: '#f7f7f7', padding: '12px', borderRadius: '8px' }}>
{JSON.stringify(order, null, 2)}
            </pre>
          </section>
        )}

        <div className="order-content">
          <div className="order-main">
            {/* Order Items */}
            <section className="order-section">
              <h2>Order Items</h2>
              <div className="order-items">
                {order.order_items?.map((item) => (
                  <div key={item.order_item_id} className="order-item">
                    <img 
                      src={item.product?.image || 'https://via.placeholder.com/80x80?text=Product'} 
                      alt={item.product?.product_name}
                    />
                    <div className="item-details">
                      <h4>{item.product?.product_name}</h4>
                      <p className="item-quantity">Quantity: {item.quantity}</p>
                    </div>
                    <div className="item-price">
                      ₱{(parseFloat(item.product?.product_price) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Order Timeline */}
            {order.order_history?.length > 0 && (
              <section className="order-section">
                <h2>Order Timeline</h2>
                <div className="order-timeline">
                  {order.order_history.map((history, index) => (
                    <div key={history.history_id} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <strong>{history.status.replace(/_/g, ' ')}</strong>
                        <p>{history.notes}</p>
                        <span className="timeline-date">
                          {new Date(history.event_timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="order-sidebar">
            {/* Delivery Info */}
            <section className="sidebar-section">
              <h3>Delivery Information</h3>
              <div className="info-group">
                <label>Method</label>
                <p>{order.delivery_method}</p>
              </div>
              {order.address && (
                <div className="info-group">
                  <label>Address</label>
                  <p>
                    {order.address.additional_info}<br />
                    {order.address.barangay?.barangay_name}, {order.address.city?.city_name}<br />
                    {order.address.province?.province_name}
                  </p>
                </div>
              )}
              {order.order_pickup && (
                <div className="info-group">
                  <label>Pickup Store</label>
                  <p>{order.order_pickup.store?.store_name}</p>
                </div>
              )}
            </section>

            {/* Payment Info */}
            <section className="sidebar-section">
              <h3>Payment Information</h3>
              <div className="info-group">
                <label>Method</label>
                <p>{order.payment_method}</p>
              </div>
              <div className="info-group">
                <label>Status</label>
                <p className={`payment-status ${order.payment_status.toLowerCase()}`}>
                  {order.payment_status}
                </p>
              </div>
            </section>

            {/* Order Summary Section */}
            <section className="sidebar-section">
              <h3>Order Summary</h3>
              
              {/* 1. Subtotal (Original Price) */}
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₱{order.subtotal ? parseFloat(order.subtotal).toFixed(2) : (parseFloat(order.total_price) - parseFloat(order.shipping_fee || 0) + parseFloat(order.voucher_discount || 0)).toFixed(2)}</span>
              </div>

              {/* 2. Voucher (if applied) */}
              {order.voucher_code && parseFloat(order.voucher_discount || 0) > 0 && (
                <div className="summary-row voucher-discount-line voucher-discount-row">
                  <span>Voucher ({order.voucher_code})</span>
                  {/* Show the minus sign and the discount value */}
                  <span className="discount-amount voucher-discount-amount">-₱{parseFloat(order.voucher_discount || 0).toFixed(2)}</span>
                </div>
              )}

              {/* 3. Shipping */}
              <div className="summary-row">
                <span>Shipping</span>
                <span>₱{order.shipping_fee ? parseFloat(order.shipping_fee).toFixed(2) : '0.00'}</span>
              </div>

              <hr className="summary-divider" />

              {/* 4. Final Total */}
              <div className="summary-total">
                <span>Total</span>
                <span className="final-total-amount">₱{computedTotal}</span>
              </div>
            </section>

            {/* Voucher Information Section */}
            {order.voucher_code && (
              <section className="sidebar-section voucher-info-section">
                <h3>💳 Voucher Applied</h3>
                <div className="voucher-info-card">
                  <div className="voucher-code-display">
                    <span className="voucher-code-label">Code:</span>
                    <span className="voucher-code-value">{order.voucher_code}</span>
                  </div>
                  <div className="voucher-savings">
                    <span className="savings-label">You saved:</span>
                    <span className="savings-amount">{order.voucher_discount ? `₱${parseFloat(order.voucher_discount).toFixed(2)}` : '₱0.00'}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Actions */}
            {order.shipping_status === 'PROCESSING' && (
              <button 
                className="btn btn-outline btn-full cancel-btn"
                onClick={handleCancelOrder}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsPage;
