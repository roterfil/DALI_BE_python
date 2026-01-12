import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ordersAPI, addressesAPI } from '../api/api';
import { ConfirmModal } from '../components';
import './AccountPage.css';

const AccountPage = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone_number: user?.phone_number || '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    setProfileData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone_number: user.phone_number || '',
    });
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'addresses') {
      fetchAddresses();
    }
  }, [activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await ordersAPI.getOrders();
      setOrders(response.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const response = await addressesAPI.getAddresses();
      setAddresses(response.data || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setShowLogoutConfirm(false);
    navigate('/');
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleProfileSave = async () => {
    // Profile update would be implemented here
    setEditMode(false);
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

  if (!user) return null;

  return (
    <div className="account-page">
      <div className="account-container">
        <div className="account-sidebar">
          <div className="user-info">
            <div className="user-avatar">
              {user.first_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
            </div>
            <h3>{user.first_name} {user.last_name}</h3>
            <p>{user.email}</p>
          </div>

          <nav className="account-nav">
            <button 
              className={activeTab === 'profile' ? 'active' : ''}
              onClick={() => setActiveTab('profile')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Profile
            </button>
            <button 
              className={activeTab === 'orders' ? 'active' : ''}
              onClick={() => setActiveTab('orders')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              Orders
            </button>
            <button 
              className={activeTab === 'addresses' ? 'active' : ''}
              onClick={() => setActiveTab('addresses')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              Addresses
            </button>
            <button onClick={handleLogoutClick} className="logout-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Logout
            </button>
          </nav>
        </div>

        <div className="account-content">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="profile-section">
              <div className="section-header">
                <h2>Profile Information</h2>
                <button 
                  className="edit-btn"
                  onClick={() => editMode ? handleProfileSave() : setEditMode(true)}
                >
                  {editMode ? 'Save' : 'Edit'}
                </button>
              </div>

              <div className="profile-form">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={profileData.first_name}
                    onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={profileData.last_name}
                    onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={profileData.phone_number}
                    onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
              </div>

              <div className="section-header" style={{ marginTop: '2rem' }}>
                <h2>Security</h2>
              </div>
              <Link to="/change-password" className="btn btn-outline">
                Change Password
              </Link>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="orders-section">
              <h2>Order History</h2>
              
              {loading ? (
                <div className="loading">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="empty-state">
                  <p>No orders yet.</p>
                  <Link to="/shop" className="btn btn-primary">Start Shopping</Link>
                </div>
              ) : (
                <div className="orders-list">
                  {orders.map((order) => (
                    <div key={order.order_id} className="order-card">
                      <div className="order-header">
                        <span className="order-id">Order #{order.order_id}</span>
                        <span className={`order-status ${getStatusColor(order.shipping_status)}`}>
                          {order.shipping_status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="order-info">
                        <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
                        <p>Total: ₱{parseFloat(order.total_price).toFixed(2)}</p>
                        <p>Items: {order.order_items?.length || 0}</p>
                      </div>
                      <Link to={`/orders/${order.order_id}`} className="view-order-btn">
                        View Details
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Addresses Tab */}
          {activeTab === 'addresses' && (
            <div className="addresses-section">
              <div className="section-header">
                <h2>Saved Addresses</h2>
                <Link to="/checkout" className="btn btn-primary btn-small">
                  + Add Address
                </Link>
              </div>

              {loading ? (
                <div className="loading">Loading addresses...</div>
              ) : addresses.length === 0 ? (
                <div className="empty-state">
                  <p>No saved addresses.</p>
                </div>
              ) : (
                <div className="addresses-list">
                  {addresses.map((address) => (
                    <div key={address.address_id} className="address-card">
                      <div className="address-content">
                        <p className="address-main">{address.additional_info}</p>
                        <p className="address-location">
                          {address.barangay?.barangay_name}, {address.city?.city_name}, {address.province?.province_name}
                        </p>
                        {address.phone_number && <p>{address.phone_number}</p>}
                      </div>
                      {address.is_default && (
                        <span className="default-badge">Default</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Confirm Logout"
        message="Are you sure you want to log out of your account?"
        confirmText="Logout"
        cancelText="Cancel"
        confirmStyle="danger"
      />
    </div>
  );
};

export default AccountPage;
