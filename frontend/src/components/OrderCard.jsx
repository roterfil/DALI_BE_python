const OrderCard = ({ order, onViewDetails }) => {
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

  const getStatusClass = (status) => {
    const statusMap = {
      PROCESSING: 'processing',
      SHIPPED: 'shipped',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled',
    };
    return statusMap[status] || 'processing';
  };

  return (
    <div className="admin-order-card">
      <div className="order-card-icon">
        <img src="/images/order-icon.png" alt="Order Icon" />
      </div>
      <div className="order-card-details">
        <h3>Order #{order.order_id}</h3>
        <p className="order-card-meta">
          <span>{formatDate(order.created_at)}</span> •{' '}
          <span>{order.total_item_count || order.order_items?.length} items</span> •{' '}
          <span>{order.payment_method}</span>
          {order.voucher_code && (
            <span className="voucher-indicator"> • 🎫 Voucher Applied</span>
          )}
        </p>
        <p className="order-card-price">{formatPrice(order.total_price)}</p>
      </div>
      <div className="order-card-footer">
        <div className="order-card-status">
          <span className={`status-dot ${getStatusClass(order.shipping_status)}`}></span>
          <span>{order.shipping_status_description || order.shipping_status}</span>
        </div>
        <div className="order-card-actions">
          <button
            onClick={() => onViewDetails(order.order_id)}
            className="btn btn-secondary btn-small"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
