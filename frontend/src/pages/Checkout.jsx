import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { checkoutService, addressService, storeService } from '../services';
import cartService from '../services/cartService';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { AddressForm, ConfirmModal } from '../components';

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, subtotal, clearCart, voucherCode, voucherDiscount, fetchCart } = useCart();
  const { showToast } = useToast();

  const [step, setStep] = useState('address'); // address, shipping, payment
  const [addresses, setAddresses] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [deliveryMethod, setDeliveryMethod] = useState('Standard Delivery');
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Maya');
  const [shipping, setShipping] = useState(0);
  const [shippingDetails, setShippingDetails] = useState(null); // For fee breakdown
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingAddress, setAddingAddress] = useState(false);
  const [storeSearch, setStoreSearch] = useState('');
  const [showOrderConfirm, setShowOrderConfirm] = useState(false);

  // Voucher state
  const [voucherInput, setVoucherInput] = useState('');
  const [applyingVoucher, setApplyingVoucher] = useState(false);

  // Priority fee addition (matches backend)
  const priorityFeeAddition = 100;

  // Load checkout data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [addressesData, storesData] = await Promise.all([
          addressService.getAddresses(),
          storeService.getStores(),
        ]);
        setAddresses(addressesData);
        setStores(storesData);

        // Set default address
        const defaultAddress = addressesData.find((a) => a.is_default);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.address_id);
        } else if (addressesData.length > 0) {
          setSelectedAddressId(addressesData[0].address_id);
        }

        setTotal(subtotal);
      } catch (err) {
        console.error('Error loading checkout data:', err);
        setError('Failed to load checkout data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [subtotal]);

  // Voucher handlers
  const handleApplyVoucher = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const code = voucherInput.trim();
    if (!code) {
      showToast('Please enter a voucher code', 'error');
      return;
    }
    if (applyingVoucher) return;

    setApplyingVoucher(true);
    try {
      const response = await cartService.applyVoucher(code);
      showToast(`Voucher applied! Saved ₱${response.discount_amount.toFixed(2)}`, 'success');
      setVoucherInput('');
      await fetchCart();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Invalid voucher code';
      showToast(errorMessage, 'error');
    } finally {
      setApplyingVoucher(false);
    }
  };

  const handleVoucherKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleApplyVoucher();
    }
  };

  const handleVoucherBlur = () => {
    if (voucherInput.trim()) {
      handleApplyVoucher();
    }
  };

  const handleRemoveVoucher = async () => {
    try {
      await cartService.removeVoucher();
      showToast('Voucher removed', 'success');
      await fetchCart();
    } catch (error) {
      showToast('Failed to remove voucher', 'error');
    }
  };

  // Recalculate total when shipping or voucher changes
  useEffect(() => {
    setTotal(subtotal - (voucherDiscount || 0) + shipping);
  }, [subtotal, shipping, voucherDiscount]);

  const handleAddressSubmit = async () => {
    if (!selectedAddressId) {
      setError('Please select an address');
      return;
    }
    try {
      await checkoutService.setAddress(selectedAddressId);
      setStep('shipping');
      setError('');
      // Calculate initial shipping fee for default delivery method
      calculateShippingFee(deliveryMethod);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to set address');
    }
  };

  const handleShippingSubmit = async () => {
    // Validate store selection for pickup
    if (deliveryMethod === 'Pickup Delivery' && !selectedStoreId) {
      setError('Please select a pickup store');
      return;
    }
    
    try {
      const response = await checkoutService.setShipping(
        deliveryMethod,
        deliveryMethod === 'Pickup Delivery' ? selectedStoreId : null
      );
      setShipping(response.shipping_fee || 0);
      setStep('payment');
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to set shipping');
    }
  };

  // Calculate shipping fee when delivery method changes
  const calculateShippingFee = async (method) => {
    if (method === 'Pickup Delivery') {
      setShipping(0);
      setShippingDetails(null);
      return;
    }
    try {
      // Call backend to calculate fee without finalizing
      const response = await checkoutService.setShipping(method, null);
      setShipping(response.shipping_fee || 0);
      setShippingDetails(response); // Store full details for breakdown display
    } catch (err) {
      console.error('Error calculating shipping:', err);
      // Don't show error, just set a default
      setShipping(0);
      setShippingDetails(null);
    }
  };

  const handleDeliveryMethodChange = (method) => {
    setDeliveryMethod(method);
    // Calculate shipping fee from backend
    calculateShippingFee(method);
  };

  const handlePlaceOrderClick = () => {
    setShowOrderConfirm(true);
  };

  const handlePaymentSubmit = async () => {
    setShowOrderConfirm(false);
    try {
      setLoading(true);
      const response = await checkoutService.placeOrder(paymentMethod);

      // If Maya payment, redirect to payment URL
      if (response.payment_url) {
        window.location.href = response.payment_url;
        return;
      }

      // COD - clear cart and redirect to success
      await clearCart();
      navigate('/order-success', { state: { orderId: response.order_id } });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressCreate = async (addressData) => {
    const newAddress = await addressService.createAddress(addressData);
    // If new address is default, update other addresses
    if (newAddress.is_default) {
      setAddresses([...addresses.map(a => ({ ...a, is_default: false })), newAddress]);
    } else {
      setAddresses([...addresses, newAddress]);
    }
    setSelectedAddressId(newAddress.address_id);
    setAddingAddress(false);
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined || price === '') return '—';
    const n = Number(price);
    if (Number.isNaN(n)) return String(price);
    return `₱${n.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (loading && step === 'address') {
    return (
      <div className="checkout-page-wrapper">
        <div className="checkout-main-panel">
          <p>Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="checkout-page-wrapper">
        <div className="checkout-main-panel">
          <p>Your cart is empty.</p>
          <Link to="/shop" className="btn btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page-wrapper">
      <div className="checkout-main-panel">
        <div className="checkout-header">
          <Link to="/" className="logo">
            <img src="/images/dali-logo.png" alt="DALI Logo" />
          </Link>
          <div className="checkout-steps">
            <span className={step === 'address' ? 'active' : ''}>Address</span> &gt;{' '}
            <span className={step === 'shipping' ? 'active' : ''}>Shipping</span> &gt;{' '}
            <span className={step === 'payment' ? 'active' : ''}>Payment</span>
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {/* Address Step */}
        {step === 'address' && (
          <div className="checkout-content">
            <div className="checkout-section-header">
              <h2>Shipping Information</h2>
              <p className="sub-header">Select Saved Addresses</p>
            </div>

            <div className="address-selection">
              {addresses.length === 0 && !addingAddress && (
                <div className="no-address-notice">
                  <p>You have no saved addresses. Please add one below to continue.</p>
                </div>
              )}

              {addresses.map((addr) => (
                <div key={addr.address_id} className="address-option">
                  <input
                    type="radio"
                    name="addressId"
                    value={addr.address_id}
                    id={`addr-${addr.address_id}`}
                    checked={selectedAddressId === addr.address_id}
                    onChange={() => setSelectedAddressId(addr.address_id)}
                  />
                  <label htmlFor={`addr-${addr.address_id}`}>
                    <div className="address-line-1">
                      <div>
                        <strong>
                          {user?.first_name} {user?.last_name}
                        </strong>
                        <span>{addr.phone_number}</span>
                      </div>
                    </div>
                    <p className="address-line-2">
                      {addr.additional_info}
                      {addr.barangay && `, ${addr.barangay.barangay_name}`}
                      {addr.city && `, ${addr.city.city_name}`}
                      {addr.province && `, ${addr.province.province_name}`}
                    </p>
                    <div className="address-tags">
                      <span className="tag-home">HOME</span>
                      {addr.is_default && <span className="tag-default">Default Address</span>}
                    </div>
                  </label>
                </div>
              ))}
            </div>

            <div id="add-address-target">
              {addingAddress ? (
                <AddressForm
                  onSubmit={handleAddressCreate}
                  onCancel={() => setAddingAddress(false)}
                  submitLabel="Add Address"
                />
              ) : (
                <button
                  onClick={() => setAddingAddress(true)}
                  className="add-new-address-link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  + Add New Address
                </button>
              )}
            </div>

            <button
              onClick={handleAddressSubmit}
              className="btn btn-primary checkout-btn"
              disabled={addresses.length === 0}
            >
              Proceed
            </button>
          </div>
        )}

        {/* Shipping Step */}
        {step === 'shipping' && (
          <div className="checkout-content">
            <button
              onClick={() => setStep('address')}
              className="checkout-back-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              &lt; Back to Address
            </button>
            <h2>Delivery Option</h2>
            <p className="sub-header" style={{ marginBottom: '1.5rem' }}>
              Your shipping fee has been calculated based on your selected address.
              Please choose a delivery type to continue.
            </p>

            {/* Shipping Fee Breakdown */}
            {shippingDetails && shippingDetails.distance_km > 0 && (
              <div className="shipping-fee-breakdown">
                <h4>📍 Shipping Fee Calculation</h4>
                <div className="breakdown-details">
                  <p><span>Distance from warehouse:</span> <strong>{shippingDetails.distance_km.toFixed(1)} km</strong></p>
                  <p><span>Base rate:</span> {formatPrice(shippingDetails.base_rate)}</p>
                  <p><span>Distance charge ({formatPrice(shippingDetails.per_km_rate)}/km):</span> {formatPrice(shippingDetails.distance_km * shippingDetails.per_km_rate)}</p>
                  {shippingDetails.priority_fee > 0 && (
                    <p><span>Priority fee:</span> {formatPrice(shippingDetails.priority_fee)}</p>
                  )}
                  <p className="total-fee"><span>Total shipping:</span> <strong>{formatPrice(shippingDetails.shipping_fee)}</strong></p>
                </div>
              </div>
            )}

            <div className="delivery-selection">
              <div className="delivery-option">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="Standard Delivery"
                  id="del-standard"
                  checked={deliveryMethod === 'Standard Delivery'}
                  onChange={() => handleDeliveryMethodChange('Standard Delivery')}
                />
                <label htmlFor="del-standard">
                  <strong>Standard Delivery</strong>
                  <p>Within 2-3 days</p>
                </label>
              </div>
              <div className="delivery-option">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="Priority Delivery"
                  id="del-priority"
                  checked={deliveryMethod === 'Priority Delivery'}
                  onChange={() => handleDeliveryMethodChange('Priority Delivery')}
                />
                <label htmlFor="del-priority">
                  <strong>Priority Delivery</strong>
                  <p>Within the day (+{formatPrice(priorityFeeAddition)})</p>
                </label>
              </div>
              <div className="delivery-option">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="Pickup Delivery"
                  id="del-pickup"
                  checked={deliveryMethod === 'Pickup Delivery'}
                  onChange={() => handleDeliveryMethodChange('Pickup Delivery')}
                />
                <label htmlFor="del-pickup">
                  <strong>Pickup Delivery</strong>
                  <p>Pickup after 2-3 days</p>
                </label>
              </div>
            </div>

            {/* Store picker for pickup */}
            {deliveryMethod === 'Pickup Delivery' && (
              <div id="store-pickup-selector" style={{ display: 'block' }}>
                <h4>Select Pickup Store</h4>
                <input
                  type="text"
                  className="store-search-input"
                  placeholder="Search for a store (e.g., city or store name)..."
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    marginBottom: '1rem'
                  }}
                />
                <div id="store-list-results" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {stores
                    .filter((store) => {
                      if (!storeSearch) return true;
                      const searchLower = storeSearch.toLowerCase();
                      return (
                        store.store_name?.toLowerCase().includes(searchLower) ||
                        store.store_address?.toLowerCase().includes(searchLower) ||
                        store.location?.toLowerCase().includes(searchLower)
                      );
                    })
                    .map((store) => (
                      <div key={store.store_id} className="delivery-option">
                        <input
                          type="radio"
                          name="storeId"
                          value={store.store_id}
                          id={`store-${store.store_id}`}
                          checked={selectedStoreId === store.store_id}
                          onChange={() => setSelectedStoreId(store.store_id)}
                        />
                        <label htmlFor={`store-${store.store_id}`}>
                          <strong>{store.store_name}</strong>
                          <p>{store.store_address}</p>
                        </label>
                      </div>
                    ))}
                  {stores.filter((store) => {
                    if (!storeSearch) return true;
                    const searchLower = storeSearch.toLowerCase();
                    return (
                      store.store_name?.toLowerCase().includes(searchLower) ||
                      store.store_address?.toLowerCase().includes(searchLower) ||
                      store.location?.toLowerCase().includes(searchLower)
                    );
                  }).length === 0 && (
                    <p style={{ textAlign: 'center', color: '#666', padding: '1rem' }}>
                      No stores found matching "{storeSearch}"
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleShippingSubmit}
              className="btn btn-primary checkout-btn"
              disabled={deliveryMethod === 'Pickup Delivery' && !selectedStoreId}
            >
              Proceed
            </button>
          </div>
        )}

        {/* Payment Step */}
        {step === 'payment' && (
          <div className="checkout-content">
            <button
              onClick={() => setStep('shipping')}
              className="checkout-back-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              &lt; Back to Shipping
            </button>
            <h2>Payment Methods</h2>

            <div className="payment-selection">
              <div className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Cash on delivery (COD)"
                  id="pay-cod"
                  checked={paymentMethod === 'Cash on delivery (COD)'}
                  onChange={() => setPaymentMethod('Cash on delivery (COD)')}
                />
                <label htmlFor="pay-cod">
                  <img src="/images/cod.png" alt="COD" />
                  <div>
                    <strong>Cash on delivery (COD)</strong>
                    <p>Pay upon receiving your order.</p>
                  </div>
                </label>
              </div>
              <div className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Maya"
                  id="pay-maya"
                  checked={paymentMethod === 'Maya'}
                  onChange={() => setPaymentMethod('Maya')}
                />
                <label htmlFor="pay-maya">
                  <img src="/images/maya.png" alt="Maya" />
                  <div>
                    <strong>Maya</strong>
                    <p>Pay with your Maya wallet.</p>
                  </div>
                </label>
              </div>
              <div className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Credit/Debit Card"
                  id="pay-card"
                  checked={paymentMethod === 'Credit/Debit Card'}
                  onChange={() => setPaymentMethod('Credit/Debit Card')}
                />
                <label htmlFor="pay-card">
                  <img src="/images/credit-card.png" alt="Card" />
                  <div>
                    <strong>Credit/Debit Card</strong>
                    <p>Visa, Mastercard, etc. via Maya.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Voucher Section (matches payment option box) */}
            <div className="voucher-payment-section">
              <div className={`voucher-option ${voucherCode ? 'applied' : ''}`}>
                <div className="voucher-icon" style={{ width: '43px', height: '43px', fontSize: '22px', lineHeight: 1 }}>🎫</div>
                <div className="voucher-content">
                  <strong>Have a voucher code?</strong>

                  {!voucherCode ? (
                    <div className="voucher-inline">
                      <input
                        type="text"
                        value={voucherInput}
                        onChange={(e) => setVoucherInput(e.target.value)}
                        placeholder="Enter voucher code"
                        className="voucher-input-field"
                        onKeyDown={handleVoucherKeyDown}
                        onBlur={handleVoucherBlur}
                      />
                      <small className="voucher-hint">Press Enter to apply</small> 
                      <button
                        onClick={handleApplyVoucher}
                        disabled={applyingVoucher || !voucherInput.trim()}
                        className="voucher-apply-btn"
                      >
                        {applyingVoucher ? 'Applying...' : 'Apply'}
                      </button>
                    </div>
                  ) : (
                    <div className="voucher-applied-container">
                      <div className="voucher-success-card">
                        <div className="voucher-success-info">
                          <span className="voucher-code-badge">{voucherCode}</span>
                          <span className="voucher-savings">You saved {formatPrice(voucherDiscount)}</span>
                        </div>
                        <button
                          onClick={handleRemoveVoucher}
                          className="voucher-remove-btn"
                          title="Remove voucher"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handlePlaceOrderClick}
              className="btn btn-primary checkout-btn"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Place Order'}
            </button>
          </div>
        )}
      </div>

      {/* Order Summary Panel */}
      <div className="checkout-summary-panel">
        <h3>Your Cart</h3>
        <div className="cart-items-summary">
          {cartItems.map((item) => (
            <div key={item.product_id} className="cart-item-summary-row">
              <img src={item.image ? `/images/products/${item.image}` : `/images/products/default.png`} alt={item.product_name} />
              <div className="item-details">
                <p className="name">{item.product_name || `Product #${item.product_id}`}</p>
                <p className="qty">Qty: {item.quantity}</p>
              </div>
              <p className="price">{formatPrice(item.subtotal ?? (Number(item.product_price || 0) * Number(item.quantity || 0)))}</p>
            </div>
          ))}
        </div>
        <hr />
        <div className="summary-row">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        {voucherCode && (
          <div className="summary-row voucher-applied">
            <span>Voucher ({voucherCode})</span>
            <span className="discount-amount">-{formatPrice(voucherDiscount)}</span>
          </div>
        )}
        <div className="summary-row">
          <span>Shipping</span>
          <span id="shipping-display">
            {shipping === 0 ? 'FREE' : formatPrice(shipping)}
          </span>
        </div>
        <hr />
        <div className="summary-row total-row">
          <span>Total</span>
          <span id="total-display">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Order Confirmation Modal */}
      <ConfirmModal
        isOpen={showOrderConfirm}
        onClose={() => setShowOrderConfirm(false)}
        onConfirm={handlePaymentSubmit}
        title="Confirm Order"
        message={`You are about to place an order for ${formatPrice(total)}. Do you want to proceed?`}
        confirmText="Confirm Order"
        cancelText="Review Order"
        confirmStyle="primary"
        loading={loading}
      />
    </div>
  );
};

export default Checkout;
