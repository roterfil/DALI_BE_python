import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addressService, orderService, authService } from '../services';
import { OrderCard, AddressForm } from '../components';

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form state for editing details (snake_case for backend)
  const [detailsForm, setDetailsForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [ordersData, addressesData] = await Promise.all([
          orderService.getOrders(),
          addressService.getAddresses(),
        ]);
        // Backend returns arrays directly
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setAddresses(Array.isArray(addressesData) ? addressesData : []);
      } catch (error) {
        console.error('Error loading profile data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (user) {
      setDetailsForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone_number: user.phone_number || '',
      });
    }
  }, [user]);

  const handleViewOrder = (orderId) => {
    navigate(`/order/${orderId}`);
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File too large. Maximum size is 5MB');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    try {
      setUploadingPicture(true);
      const updatedUser = await authService.uploadProfilePicture(file);
      updateUser(updatedUser);
      setSuccessMessage('Profile picture updated!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || 'Failed to upload picture');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setUploadingPicture(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    try {
      const updatedUser = await authService.updateProfile(detailsForm);
      updateUser(updatedUser);
      setEditingDetails(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || 'Failed to update profile');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleAddressSubmit = async (addressData) => {
    try {
      const newAddress = await addressService.createAddress(addressData);
      // If new address is default, update other addresses
      if (newAddress.is_default) {
        setAddresses([...addresses.map(a => ({ ...a, is_default: false })), newAddress]);
      } else {
        setAddresses([...addresses, newAddress]);
      }
      setAddingAddress(false);
      setSuccessMessage('Address added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || 'Failed to add address');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleAddressUpdate = async (addressData) => {
    try {
      const updatedAddress = await addressService.updateAddress(
        editingAddress.address_id,
        addressData
      );
      // If updated address is now default, update other addresses
      if (updatedAddress.is_default) {
        setAddresses(
          addresses.map((a) =>
            a.address_id === editingAddress.address_id 
              ? updatedAddress 
              : { ...a, is_default: false }
          )
        );
      } else {
        setAddresses(
          addresses.map((a) =>
            a.address_id === editingAddress.address_id ? updatedAddress : a
          )
        );
      }
      setEditingAddress(null);
      setSuccessMessage('Address updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || 'Failed to update address');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      await addressService.deleteAddress(addressId);
      setAddresses(addresses.filter((a) => a.address_id !== addressId));
      setSuccessMessage('Address deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || 'Failed to delete address');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      await addressService.setDefaultAddress(addressId);
      // Update local state to reflect default change
      setAddresses(addresses.map((a) => ({
        ...a,
        is_default: a.address_id === addressId
      })));
      setSuccessMessage('Default address updated!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || 'Failed to set default address');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  if (loading) {
    return (
      <main className="profile-page">
        <div className="container">
          <p>Loading profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <div className="container">
        <div className="profile-header">
          <div className="profile-header-content">
            <div 
              className="profile-picture-container"
              onClick={() => fileInputRef.current?.click()}
            >
              {user?.profile_picture ? (
                <img 
                  src={user.profile_picture} 
                  alt="Profile" 
                  className="profile-picture"
                />
              ) : (
                <div className="profile-picture-placeholder">
                  {user?.first_name?.[0] || user?.email?.[0] || '?'}
                </div>
              )}
              <div className="profile-picture-overlay">
                <span>{uploadingPicture ? '...' : '📷'}</span>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleProfilePictureUpload}
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
              />
            </div>
            <div>
              <p>Hello,</p>
              <h1>
                {user?.first_name} {user?.last_name}
              </h1>
            </div>
          </div>
          <Link to="/change-password" className="edit-link">
            Change Password
          </Link>
        </div>

        {successMessage && <div className="auth-success">{successMessage}</div>}
        {errorMessage && <div className="auth-error">{errorMessage}</div>}

        <div className="profile-content">
          <aside className="profile-sidebar">
            <h3>My Account</h3>
            <ul>
              <li>
                <a href="#orders">My Orders</a>
              </li>
              <li>
                <a href="#addresses">My Addresses</a>
              </li>
              <li>
                <a href="#details">Personal Details</a>
              </li>
            </ul>
          </aside>

          <div className="profile-main">
            {/* Orders Section */}
            <section id="orders">
              <div className="section-header">
                <h2>My Orders</h2>
                {orders.length > 5 && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowAllOrders(!showAllOrders)}
                  >
                    {showAllOrders ? 'Show Less' : `View All (${orders.length})`}
                  </button>
                )}
              </div>
              {orders.length === 0 ? (
                <div className="no-content-notice">
                  You have not placed any orders yet.
                </div>
              ) : (
                <div
                  className="admin-order-grid"
                  style={{ gridTemplateColumns: '1fr' }}
                >
                  {(showAllOrders ? orders : orders.slice(0, 5)).map((order) => (
                    <OrderCard
                      key={order.order_id}
                      order={order}
                      onViewDetails={handleViewOrder}
                    />
                  ))}
                </div>
              )}
              {!showAllOrders && orders.length > 5 && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowAllOrders(true)}
                  >
                    View All Orders ({orders.length})
                  </button>
                </div>
              )}
            </section>

            {/* Addresses Section */}
            <section id="addresses" style={{ marginTop: '40px' }}>
              <div className="section-header">
                <h2>My Addresses</h2>
              </div>
              {addresses.length === 0 && !addingAddress && (
                <div className="no-content-notice">You have no saved addresses.</div>
              )}
              <div id="address-list-container">
                {addresses.map((addr) =>
                  editingAddress?.address_id === addr.address_id ? (
                    <AddressForm
                      key={addr.address_id}
                      address={addr}
                      onSubmit={handleAddressUpdate}
                      onCancel={() => setEditingAddress(null)}
                      submitLabel="Update Address"
                    />
                  ) : (
                    <div key={addr.address_id} className="address-box">
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'start',
                        }}
                      >
                        <div>
                          <p>
                            <strong>
                              {user?.first_name} {user?.last_name}
                            </strong>{' '}
                            | <span>{addr.phone_number}</span>
                          </p>
                          <p style={{ margin: '4px 0' }}>
                            {addr.additional_info && <span>{addr.additional_info}, </span>}
                            {addr.barangay?.barangay_name && <span>{addr.barangay.barangay_name}, </span>}
                            {addr.city?.city_name && <span>{addr.city.city_name}, </span>}
                            {addr.province?.province_name && <span>{addr.province.province_name}</span>}
                          </p>
                          <div className="address-tags">
                            {addr.is_default && (
                              <span className="tag-default">Default Address</span>
                            )}
                          </div>
                        </div>
                        <div
                        style={{ 
                            display: 'flex', 
                            gap: '15px',
                            alignSelf: 'start',  
                            // Add align-items: 'center' if you want the buttons centered vertically with text
                          }}
>
                          
                          <button
                            onClick={() => setEditingAddress(addr)}
                            className="edit-link"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap', 
                              
                            }}
                          >
                            Edit
                          </button>
                          {!addr.is_default && (
                            <button
                              onClick={() => handleSetDefaultAddress(addr.address_id)}
                              className="edit-link"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap', 
                            
                                color: '#28a745',
                              }}
                            >
                              Set as Default
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAddress(addr.address_id)}
                            className="edit-link"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#dc3545',
                              whiteSpace: 'nowrap', 
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
              <div id="add-address-target">
                {addingAddress ? (
                  <AddressForm
                    onSubmit={handleAddressSubmit}
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
            </section>

            {/* Personal Details Section */}
            <section id="details" style={{ marginTop: '40px' }}>
              <div className="section-header">
                <h2>Personal Details</h2>
                {!editingDetails && (
                  <button
                    onClick={() => setEditingDetails(true)}
                    className="edit-link"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                )}
              </div>
              <div id="profile-details-container">
                {editingDetails ? (
                  <form onSubmit={handleDetailsSubmit}>
                    <div className="form-group">
                      <label htmlFor="first_name">First Name</label>
                      <input
                        type="text"
                        id="first_name"
                        name="first_name"
                        value={detailsForm.first_name}
                        onChange={(e) =>
                          setDetailsForm({ ...detailsForm, first_name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="last_name">Last Name</label>
                      <input
                        type="text"
                        id="last_name"
                        name="last_name"
                        value={detailsForm.last_name}
                        onChange={(e) =>
                          setDetailsForm({ ...detailsForm, last_name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="phone_number">Phone Number</label>
                      <input
                        type="tel"
                        id="phone_number"
                        name="phone_number"
                        value={detailsForm.phone_number}
                        onChange={(e) =>
                          setDetailsForm({ ...detailsForm, phone_number: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingDetails(false)}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <dl className="details-grid">
                    <dt>First Name</dt>
                    <dd>{user?.first_name}</dd>
                    <dt>Last Name</dt>
                    <dd>{user?.last_name}</dd>
                    <dt>Email</dt>
                    <dd>{user?.email}</dd>
                    <dt>Phone</dt>
                    <dd>{user?.phone_number}</dd>
                  </dl>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Profile;
