import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { orderService, reviewService } from '../services';
import { OrderTimeline, StarRating, ReviewForm } from '../components';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [reviewableItems, setReviewableItems] = useState([]);
  const [reviewingItem, setReviewingItem] = useState(null);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        const data = await orderService.getOrder(id);
        setOrder(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };
    loadOrder();
  }, [id]);

  useEffect(() => {
    if (order && (order.shipping_status === 'DELIVERED' || order.shipping_status === 'COLLECTED')) {
      fetchReviewableItems();
    }
  }, [order]);

  const fetchReviewableItems = async () => {
    try {
      setLoadingReviews(true);
      const items = await reviewService.getReviewableItems(id);
      setReviewableItems(items.items || []);
    } catch (err) {
      console.error('Error fetching reviewable items:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const getReviewStatus = (orderItemId) => {
    const item = reviewableItems.find(i => i.order_item_id === orderItemId);
    return item ? { isReviewed: item.is_reviewed, review: item.review } : null;
  };

  const handleReviewSubmitted = () => {
    setReviewingItem(null);
    fetchReviewableItems();
    setSuccessMessage('Review submitted successfully!');
  };

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      await orderService.cancelOrder(id);
      setSuccessMessage('Order cancelled successfully.');
      // Reload order to get updated status
      const data = await orderService.getOrder(id);
      setOrder(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel order');
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
    return `₱${price.toLocaleString('en-PH', {
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

  const getPaymentStatusClass = (status) => {
    const statusMap = {
      PAID: 'text-success',
      PENDING: 'text-warning',
      FAILED: 'text-danger',
      CANCELLED: 'text-danger',
      REFUNDED: 'text-info',
    };
    return statusMap[status] || 'text-warning';
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
          <Link to="/profile" className="btn btn-primary">
            Back to Profile
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
          <Link to="/profile" className="btn btn-primary">
            Back to Profile
          </Link>
        </div>
      </main>
    );
  }

  const subtotal =
    order.order_items?.reduce(
      (sum, item) => sum + parseFloat(item.product.product_price) * item.quantity,
      0
    ) || 0;
  const shippingFee = order.total_price - subtotal;

  return (
    <main className="order-detail-page">
      <div className="container">
        <Link to="/profile" className="order-detail-back-link">
          <span>←</span> Back to My Profile
        </Link>

        {successMessage && <div className="auth-success">{successMessage}</div>}
        {error && <div className="auth-error">{error}</div>}

        <div className="order-detail-card">
          <div className="order-detail-header">
            <h1>Order #{order.order_id}</h1>
            <p className="order-meta">{formatDate(order.created_at)}</p>

            {/* Pickup info */}
            {order.delivery_method === 'Pickup Delivery' && order.order_pickup && (
              <div className="pickup-info-box">
                <h4>Click & Collect Order</h4>
                <p>
                  To be collected from: <strong>{order.order_pickup.store?.store_name}</strong>
                </p>
              </div>
            )}

            {/* Shipping address */}
            {order.delivery_method !== 'Pickup Delivery' && order.address && (
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
                {order.payment_method.includes('Maya') && (
                  <img src="/images/maya.png" alt="Maya Logo" />
                )}
                {order.payment_method.toLowerCase().includes('cod') && (
                  <img src="/images/cod.png" alt="Cash on Delivery Logo" />
                )}
                {order.payment_method.toLowerCase().includes('card') && (
                  <img src="/images/credit-card.png" alt="Credit Card Logo" />
                )}
                <span>{order.payment_method}</span>
              </div>
              <div className={`payment-status-line ${getPaymentStatusClass(order.payment_status)}`}>
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

          {/* Order Status */}
          <div className="order-status-section">
            <h3>Current Status</h3>
            <div className="status-display">
              <span className={`status-dot ${getStatusClass(order.shipping_status)}`}></span>
              <span>{order.shipping_status_description || order.shipping_status}</span>
            </div>
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
              {(order.shipping_status === 'DELIVERED' || order.shipping_status === 'COLLECTED') && (
                <div className="review-col">Review</div>
              )}
            </div>
            {order.order_items?.map((item, index) => {
              const reviewStatus = getReviewStatus(item.order_item_id);
              const canReview = order.shipping_status === 'DELIVERED' || order.shipping_status === 'COLLECTED';
              
              return (
                <div key={index} className="product-list-item">
                  <div className="product-col">
                    <img
                      src={`/images/products/${item.product.image}`}
                      alt={item.product.product_name}
                    />
                    <span>{item.product.product_name}</span>
                  </div>
                  <div>{formatPrice(item.product.product_price)}</div>
                  <div>{item.quantity}</div>
                  <div>{formatPrice(parseFloat(item.product.product_price) * item.quantity)}</div>
                  {canReview && (
                    <div className="review-action">
                      {loadingReviews ? (
                        <span className="loading-text">Loading...</span>
                      ) : reviewStatus?.isReviewed ? (
                        <div className="reviewed-status">
                          <div className="reviewed-badge">
                            <StarRating rating={reviewStatus.review.rating} size="small" />
                            <span>Reviewed{reviewStatus.review.is_edited ? ' (Edited)' : ''}</span>
                          </div>
                          {!reviewStatus.review.is_edited && (
                            <button
                              className="btn btn-sm btn-outline edit-review-btn"
                              onClick={() => setReviewingItem({
                                order_item_id: item.order_item_id,
                                product_id: item.product.product_id,
                                product_name: item.product.product_name,
                                product_image: item.product.image,
                                quantity: item.quantity,
                                existingReview: reviewStatus.review,
                              })}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => setReviewingItem({
                            order_item_id: item.order_item_id,
                            product_id: item.product.product_id,
                            product_name: item.product.product_name,
                            product_image: item.product.image,
                            quantity: item.quantity,
                          })}
                        >
                          Write Review
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Review Form Modal */}
          {reviewingItem && (
            <div className="review-form-section">
              <h3>{reviewingItem.existingReview ? 'Edit Review' : 'Write a Review'}</h3>
              <ReviewForm
                orderItem={reviewingItem}
                existingReview={reviewingItem.existingReview}
                onReviewSubmitted={handleReviewSubmitted}
                onCancel={() => setReviewingItem(null)}
              />
            </div>
          )}

          {/* Customer Actions */}
          {order.shipping_status === 'PROCESSING' && (
            <div className="order-actions-section">
              <h3>Actions</h3>
              <button onClick={handleCancelOrder} className="btn btn-secondary">
                Cancel Order
              </button>
              <p>You can only cancel your order while it is still being processed.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default OrderDetail;
