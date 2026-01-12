import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminService } from '../../services';
import { OrderTimeline } from '../../components';

const AdminOrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        const data = await adminService.getOrder(id);
        setOrder(data);
        setNewStatus(data.shipping_status);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };
    loadOrder();
  }, [id]);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      await adminService.updateOrderStatus(id, newStatus, statusNotes);
      const updatedOrder = await adminService.getOrder(id);
      setOrder(updatedOrder);
      setStatusNotes('');
      setSuccess('Order status updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPrice = (price) => {
    return `₱${Number(price).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusClass = (status) => {
    const statusMap = {
      PROCESSING: 'processing',
      SHIPPED: 'shipped',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled',
    };
    return statusMap[status] || 'processing';
  };

  if (loading) {
    return (
      <main className="order-detail-page">
        <div className="container">
          <p>Loading order...</p>
        </div>
      </main>
    );
  }

  if (error && !order) {
    return (
      <main className="order-detail-page">
        <div className="container">
          <div className="auth-error">{error}</div>
          <Link to="/admin/orders" className="btn btn-primary">
            Back to Orders
          </Link>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="order-detail-page">
        <div className="container">
          <p>Order not found.</p>
          <Link to="/admin/orders" className="btn btn-primary">
            Back to Orders
          </Link>
        </div>
      </main>
    );
  }

  const subtotal =
    order.order_items?.reduce(
      (sum, item) => {
        const price = item.unit_price ?? item.product.product_price;
        return sum + parseFloat(price) * item.quantity;
      },
      0
    ) || 0;
  const shippingFee = order.total_price - subtotal;

  const isPickup = order.delivery_method === 'Pickup Delivery';

  return (
    <main className="order-detail-page">
      <div className="container">
        <Link to="/admin/orders" className="order-detail-back-link">
          <span>←</span> Back to Orders
        </Link>

        {success && <div className="auth-success">{success}</div>}
        {error && <div className="auth-error">{error}</div>}

        <div className="order-detail-card">
          <div className="order-detail-header">
            <h1>Order #{order.order_id}</h1>
            <p className="order-meta">{formatDate(order.created_at)}</p>

            {/* Customer Info */}
            {order.customer && (
              <div style={{ marginTop: '15px' }}>
                <strong>Customer:</strong> {order.customer.first_name}{' '}
                {order.customer.last_name}
                <br />
                <strong>Email:</strong> {order.customer.email}
              </div>
            )}

            {/* Pickup info */}
            {isPickup && order.order_pickup && (
              <div className="pickup-info-box">
                <h4>Click & Collect Order</h4>
                <p>
                  To be collected from: <strong>{order.order_pickup.store?.store_name}</strong>
                </p>
              </div>
            )}

            {/* Shipping address */}
            {!isPickup && order.address && (
              <div className="shipping-address-info">
                <strong>Shipping to:</strong>{' '}
                <span>{order.address.full_address || order.address.street_address}</span>
              </div>
            )}
          </div>

          <div className="order-detail-grid">
            {/* Payment Information */}
            <div className="payment-method-section">
              <h3>Payment</h3>
              <div className="payment-box">
                <span>{order.payment_method}</span>
              </div>
              <div className="payment-status-line">
                Payment Status: <span>{order.payment_status_display || order.payment_status}</span>
              </div>
            </div>

            {/* Order Summary */}
            <div className="order-summary-section">
              <h3>Order Summary</h3>
              <div className="summary-details">
                <div className="summary-line">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="summary-line">
                  <span>Shipping</span>
                  <span>{formatPrice(shippingFee)}</span>
                </div>
                <div className="summary-line total">
                  <span>Total</span>
                  <span>{formatPrice(order.total_price)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Status & Update Form */}
          <div className="order-status-section">
            <h3>Current Status</h3>
            <div className="status-display">
              <span className={`status-dot ${getStatusClass(order.shipping_status)}`}></span>
              <span>{order.shipping_status_description || order.shipping_status}</span>
            </div>

            {/* Status Update Form */}
            {order.shipping_status !== 'CANCELLED' &&
              order.shipping_status !== 'DELIVERED' && (
                <form
                  onSubmit={handleStatusUpdate}
                  className="status-update-form"
                  style={{ marginTop: '20px' }}
                >
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="form-control"
                    style={{ maxWidth: '200px' }}
                  >
                    <option value="PROCESSING">Processing</option>
                    <option value="PREPARING_FOR_SHIPMENT">Preparing for Shipment</option>
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="COLLECTED">Collected (Pickup)</option>
                    <option value="DELIVERY_FAILED">Delivery Failed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <input
                    type="text"
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    className="form-control"
                    style={{ maxWidth: '300px', marginLeft: '10px' }}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={updating}
                    style={{ marginLeft: '10px' }}
                  >
                    {updating ? 'Updating...' : 'Update Status'}
                  </button>
                </form>
              )}
          </div>

          {/* Order History Timeline */}
          {order.order_history && order.order_history.length > 0 && (
            <OrderTimeline history={order.order_history} />
          )}

          {/* Products List */}
          <div className="order-products-section">
            <h3>Products in this Order</h3>
            <div className="product-list-header">
              <div className="product-col">Product</div>
              <div>Price</div>
              <div>Quantity</div>
              <div>Total</div>
            </div>
            {order.order_items?.map((item, index) => (
              <div key={index} className="product-list-item">
                <div className="product-col">
                  <img
                    src={`/images/products/${item.product.image}`}
                    alt={item.product.product_name}
                  />
                  <span>{item.product.product_name}</span>
                </div>
                <div>
                  {item.unit_price && parseFloat(item.unit_price) < parseFloat(item.product.product_price) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ textDecoration: 'line-through', color: '#999', fontSize: '0.85em' }}>
                        {formatPrice(item.product.product_price)}
                      </span>
                      <span style={{ color: '#a1127c', fontWeight: '600' }}>
                        {formatPrice(item.unit_price)}
                      </span>
                    </div>
                  ) : (
                    formatPrice(item.unit_price ?? item.product.product_price)
                  )}
                </div>
                <div>{item.quantity}</div>
                <div>{formatPrice(parseFloat(item.unit_price ?? item.product.product_price) * item.quantity)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default AdminOrderDetail;
