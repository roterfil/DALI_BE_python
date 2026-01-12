import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { addressesAPI, checkoutAPI, storesAPI, locationsAPI } from '../api/api';
import { useToast } from '../components/Toast';
import cartService from '../services/cartService';
import './CheckoutPage.css';

const CheckoutPage = () => {
  const { cartItems, subtotal, total: cartTotal, voucherCode, voucherDiscount, fetchCart, loading: cartLoading } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [addresses, setAddresses] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [selectedStore, setSelectedStore] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [shippingFee, setShippingFee] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storeSearch, setStoreSearch] = useState('');
  const [cartDataLoaded, setCartDataLoaded] = useState(false);
  
  // Voucher state
  const [voucherInput, setVoucherInput] = useState('');
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  
  // Address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [addressForm, setAddressForm] = useState({
    province_id: '',
    city_id: '',
    barangay_id: '',
    additional_info: '',
    phone_number: '',
    is_default: false
  });

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
      return;
    }
    
    if (!cartItems || cartItems.length === 0) {
      navigate('/cart');
      return;
    }

    fetchAddresses();
    fetchStores();
    fetchProvinces();
    
    // Ensure cart data including voucher is fresh
    const loadCartData = async () => {
      await fetchCart();
      setCartDataLoaded(true);
    };
    loadCartData();
  }, [user, navigate]);  // Run once on mount
  
  const fetchAddresses = async () => {
    try {
      const response = await addressesAPI.getAddresses();
      setAddresses(response.data || []);
      const defaultAddress = response.data.find(a => a.is_default);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress.address_id);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await storesAPI.getStores();
      setStores(response.data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchProvinces = async () => {
    try {
      const response = await locationsAPI.getProvinces();
      setProvinces(response.data || []);
    } catch (error) {
      console.error('Error fetching provinces:', error);
    }
  };

  const handleProvinceChange = async (provinceId) => {
    setAddressForm({ ...addressForm, province_id: provinceId, city_id: '', barangay_id: '' });
    setCities([]);
    setBarangays([]);
    if (provinceId) {
      try {
        const response = await locationsAPI.getCities(provinceId);
        setCities(response.data || []);
      } catch (error) {
        console.error('Error fetching cities:', error);
      }
    }
  };

  const handleCityChange = async (cityId) => {
    setAddressForm({ ...addressForm, city_id: cityId, barangay_id: '' });
    setBarangays([]);
    if (cityId) {
      try {
        const response = await locationsAPI.getBarangays(cityId);
        setBarangays(response.data || []);
      } catch (error) {
        console.error('Error fetching barangays:', error);
      }
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await addressesAPI.createAddress({
        ...addressForm,
        province_id: parseInt(addressForm.province_id),
        city_id: parseInt(addressForm.city_id),
        barangay_id: parseInt(addressForm.barangay_id),
      });
      setAddresses([...addresses, response.data]);
      setSelectedAddress(response.data.address_id);
      setShowAddressForm(false);
      setAddressForm({
        province_id: '',
        city_id: '',
        barangay_id: '',
        additional_info: '',
        phone_number: '',
        is_default: false
      });
    } catch (error) {
      setError('Failed to create address');
    } finally {
      setLoading(false);
    }
  };

  const handleDeliveryMethodSelect = async (method) => {
    setDeliveryMethod(method);
    if (method !== 'Pickup Delivery') {
      setSelectedStore(null);
      if (selectedAddress) {
        try {
          const response = await checkoutAPI.calculateShipping(selectedAddress, method);
          setShippingFee(response.data.shipping_fee);
        } catch (error) {
          console.error('Error calculating shipping:', error);
        }
      }
    } else {
      setShippingFee(0);
    }
  };

  const handleNextStep = async () => {
    setError('');
    
    if (step === 1) {
      if (!selectedAddress) {
        setError('Please select a delivery address');
        return;
      }
      try {
        await checkoutAPI.setAddress(selectedAddress);
        setStep(2);
      } catch (error) {
        setError('Failed to set address');
      }
    } else if (step === 2) {
      if (!deliveryMethod) {
        setError('Please select a delivery method');
        return;
      }
      if (deliveryMethod === 'Pickup Delivery' && !selectedStore) {
        setError('Please select a pickup store');
        return;
      }
      try {
        await checkoutAPI.setShipping({
          delivery_method: deliveryMethod,
          store_id: selectedStore
        });
        setStep(3);
      } catch (error) {
        setError('Failed to set shipping method');
      }
    } else if (step === 3) {
      if (!paymentMethod) {
        setError('Please select a payment method');
        return;
      }
      setLoading(true);
      try {
        const response = await checkoutAPI.processPayment(paymentMethod);
        if (response.data.success) {
          if (response.data.payment_url) {
            window.location.href = response.data.payment_url;
          } else {
            await fetchCart();
            navigate(`/order-success/${response.data.order_id}`);
          }
        }
      } catch (error) {
        setError(error.response?.data?.detail || 'Failed to process payment');
      } finally {
        setLoading(false);
      }
    }
  const handleApplyVoucher = async (e) => {
    e.preventDefault();
    if (!voucherInput.trim()) {
      showToast('Please enter a voucher code', 'error');
      return;
    }

    setApplyingVoucher(true);
    try {
      const response = await cartService.applyVoucher(voucherInput.trim());
      showToast(`Voucher applied! Saved ₱${response.discount_amount.toFixed(2)}`, 'success');
      setVoucherInput('');
      await fetchCart(); // Refresh cart to show updated totals
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Invalid voucher code';
      showToast(errorMessage, 'error');
    } finally {
      setApplyingVoucher(false);
    }
  };

  const handleRemoveVoucher = async () => {
    try {
      await cartService.removeVoucher();
      showToast('Voucher removed', 'success');
      await fetchCart(); // Refresh cart to show updated totals
    } catch (error) {
      showToast('Failed to remove voucher', 'error');
    }
  };

  };

  // Calculate total with shipping and voucher discount
  const finalTotal = subtotal - (voucherDiscount || 0) + shippingFee;

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <Link to="/cart" className="back-link">← Back to cart</Link>
        
        <h1>Checkout</h1>

        {error && <div className="error-message">{error}</div>}

        <div className="checkout-content">
          <div className="checkout-steps">
            {/* Step 1: Address */}
            <div className={`checkout-step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
              <div className="step-header" onClick={() => step > 1 && setStep(1)}>
                <span className="step-number">1</span>
                <span className="step-title">Delivery Address</span>
                {step > 1 && <span className="step-edit">Edit</span>}
              </div>
              
              {step === 1 && (
                <div className="step-content">
                  {addresses.length === 0 ? (
                    <p>No saved addresses. Please add one.</p>
                  ) : (
                    <div className="address-list">
                      {addresses.map((address) => (
                        <label key={address.address_id} className="address-option">
                          <input
                            type="radio"
                            name="address"
                            checked={selectedAddress === address.address_id}
                            onChange={() => setSelectedAddress(address.address_id)}
                          />
                          <div className="address-details">
                            <p>{address.additional_info}</p>
                            <p className="address-location">
                              {address.barangay?.barangay_name}, {address.city?.city_name}, {address.province?.province_name}
                            </p>
                            {address.phone_number && <p>{address.phone_number}</p>}
                            {address.is_default && <span className="default-badge">Default</span>}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  <button 
                    className="add-address-btn"
                    onClick={() => setShowAddressForm(!showAddressForm)}
                  >
                    + Add new address
                  </button>

                  {showAddressForm && (
                    <form className="address-form" onSubmit={handleAddressSubmit}>
                      <div className="form-row">
                        <select
                          value={addressForm.province_id}
                          onChange={(e) => handleProvinceChange(e.target.value)}
                          required
                        >
                          <option value="">Select Province</option>
                          {provinces.map(p => (
                            <option key={p.province_id} value={p.province_id}>{p.province_name}</option>
                          ))}
                        </select>
                        <select
                          value={addressForm.city_id}
                          onChange={(e) => handleCityChange(e.target.value)}
                          required
                          disabled={!addressForm.province_id}
                        >
                          <option value="">Select City</option>
                          {cities.map(c => (
                            <option key={c.city_id} value={c.city_id}>{c.city_name}</option>
                          ))}
                        </select>
                      </div>
                      <select
                        value={addressForm.barangay_id}
                        onChange={(e) => setAddressForm({ ...addressForm, barangay_id: e.target.value })}
                        required
                        disabled={!addressForm.city_id}
                      >
                        <option value="">Select Barangay</option>
                        {barangays.map(b => (
                          <option key={b.barangay_id} value={b.barangay_id}>{b.barangay_name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Street, Building, Unit (Additional info)"
                        value={addressForm.additional_info}
                        onChange={(e) => setAddressForm({ ...addressForm, additional_info: e.target.value })}
                      />
                      <input
                        type="tel"
                        placeholder="Phone number"
                        value={addressForm.phone_number}
                        onChange={(e) => setAddressForm({ ...addressForm, phone_number: e.target.value })}
                      />
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={addressForm.is_default}
                          onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                        />
                        Set as default address
                      </label>
                      <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Address'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Delivery Method */}
            <div className={`checkout-step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
              <div className="step-header" onClick={() => step > 2 && setStep(2)}>
                <span className="step-number">2</span>
                <span className="step-title">Delivery Method</span>
                {step > 2 && <span className="step-edit">Edit</span>}
              </div>
              
              {step === 2 && (
                <div className="step-content">
                  <div className="delivery-options">
                    <label className="delivery-option">
                      <input
                        type="radio"
                        name="delivery"
                        checked={deliveryMethod === 'Standard Delivery'}
                        onChange={() => handleDeliveryMethodSelect('Standard Delivery')}
                      />
                      <div className="delivery-details">
                        <strong>Standard Delivery</strong>
                        <span>3-5 business days</span>
                      </div>
                    </label>
                    <label className="delivery-option">
                      <input
                        type="radio"
                        name="delivery"
                        checked={deliveryMethod === 'Priority Delivery'}
                        onChange={() => handleDeliveryMethodSelect('Priority Delivery')}
                      />
                      <div className="delivery-details">
                        <strong>Priority Delivery</strong>
                        <span>1-2 business days</span>
                      </div>
                    </label>
                    <label className="delivery-option">
                      <input
                        type="radio"
                        name="delivery"
                        checked={deliveryMethod === 'Pickup Delivery'}
                        onChange={() => handleDeliveryMethodSelect('Pickup Delivery')}
                      />
                      <div className="delivery-details">
                        <strong>Store Pickup</strong>
                        <span>Free - Pick up at store</span>
                      </div>
                    </label>
                  </div>

                  {deliveryMethod === 'Pickup Delivery' && (
                    <div className="store-selection">
                      <h4>Select pickup store:</h4>
                      <input
                        type="text"
                        className="store-search-input"
                        placeholder="Search for a store (e.g., city or store name)..."
                        value={storeSearch}
                        onChange={(e) => setStoreSearch(e.target.value)}
                      />
                      <div className="store-list">
                        {stores
                          .filter((store) => {
                            if (!storeSearch) return true;
                            const searchLower = storeSearch.toLowerCase();
                            return (
                              store.store_name?.toLowerCase().includes(searchLower) ||
                              store.location?.toLowerCase().includes(searchLower) ||
                              store.city?.toLowerCase().includes(searchLower) ||
                              store.province?.toLowerCase().includes(searchLower)
                            );
                          })
                          .map((store) => (
                            <label key={store.store_id} className="store-option">
                              <input
                                type="radio"
                                name="store"
                                checked={selectedStore === store.store_id}
                                onChange={() => setSelectedStore(store.store_id)}
                              />
                              <div className="store-info">
                                <span className="store-name">{store.store_name}</span>
                                {store.location && <span className="store-location">{store.location}</span>}
                              </div>
                            </label>
                          ))}
                        {stores.filter((store) => {
                          if (!storeSearch) return true;
                          const searchLower = storeSearch.toLowerCase();
                          return (
                            store.store_name?.toLowerCase().includes(searchLower) ||
                            store.location?.toLowerCase().includes(searchLower) ||
                            store.city?.toLowerCase().includes(searchLower) ||
                            store.province?.toLowerCase().includes(searchLower)
                          );
                        }).length === 0 && (
                          <p className="no-stores-found">No stores found matching "{storeSearch}"</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 3: Payment */}
            <div className={`checkout-step ${step === 3 ? 'active' : ''}`}>
              <div className="step-header">
                <span className="step-number">3</span>
                <span className="step-title">Payment Method</span>
              </div>
              
              {step === 3 && (
                <div className="step-content">
                  <div className="payment-options">
                    <label className="payment-option">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'Cash on delivery (COD)'}
                        onChange={() => setPaymentMethod('Cash on delivery (COD)')}
                      />
                      <span>Cash on Delivery (COD)</span>
                    </label>
                    <label className="payment-option">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'Maya'}
                        onChange={() => setPaymentMethod('Maya')}
                      />
                      <span>Maya</span>
                    </label>
                    <label className="payment-option">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'Credit/Debit Card'}
                        onChange={() => setPaymentMethod('Credit/Debit Card')}
                      />
                      <span>Credit/Debit Card</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="checkout-summary">
            <h2>Order Summary</h2>
            <div className="summary-items">
              {cartItems.map((item) => (
                <div key={item.product_id} className="summary-item">
                  <span>{item.product_name} x {item.quantity}</span>
                  <span>₱{item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
            
            {voucherCode && (
              <div className="summary-row voucher-applied">
                <span>Voucher ({voucherCode})</span>
                <span className="discount-amount">-₱{(voucherDiscount || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="summary-row">
              <span>Shipping</span>
              <span>{shippingFee > 0 ? `₱${shippingFee.toFixed(2)}` : 'Calculated at checkout'}</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <span>₱{finalTotal.toFixed(2)}</span>
            </div>
            <button 
              className="btn btn-primary btn-full"
              onClick={handleNextStep}
              disabled={loading}
            >
              {loading ? 'Processing...' : step === 3 ? 'Place Order' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
