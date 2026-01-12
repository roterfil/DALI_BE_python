import { useState } from 'react'; 
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from './ConfirmModal';

const AdminHeader = () => {
  const { admin, adminLogout, isSuperAdmin } = useAuth();
  
  // State to track confirmation
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await adminLogout();
    setShowLogoutConfirm(false);
  };

  return (
    <>
    <header className="header admin-header">
      <div className="container">
        <div className="admin-header-left">
          <div className="logo">
            <Link to="/admin">
              <img src="/images/dali-logo.png" alt="DALI Logo" />
            </Link>
          </div>
          <nav className="nav">
            <Link to="/admin/inventory">Inventory</Link>
            {isSuperAdmin && <Link to="/admin/add-product">Add Product</Link>}
            <Link to="/admin/orders">Orders</Link>
            {isSuperAdmin && <Link to="/admin/vouchers">Vouchers</Link>}
            <Link to="/admin/audit">Audit</Link>
          </nav>
        </div>
        
        <div className="admin-header-right">
          {admin?.store && (
            <div className="store-display">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M2.97 1.35A1 1 0 0 1 3.73 1h8.54a1 1 0 0 1 .76.35l2.609 3.044A1.5 1.5 0 0 1 16 5.37v.255a2.375 2.375 0 0 1-4.25 1.458A2.371 2.371 0 0 1 9.875 8 2.37 2.37 0 0 1 8 7.083 2.37 2.37 0 0 1 6.125 8a2.37 2.37 0 0 1-1.875-.917A2.375 2.375 0 0 1 0 5.625V5.37a1.5 1.5 0 0 1 .361-.976l2.61-3.045zm1.78 4.275a1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0 1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0 1.375 1.375 0 1 0 2.75 0V5.37a.5.5 0 0 0-.12-.325L12.27 2H3.73L1.12 5.045A.5.5 0 0 0 1 5.37v.255a1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0zM1.5 8.5A.5.5 0 0 1 2 9v6h1v-5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5h6V9a.5.5 0 0 1 1 0v6h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1V9a.5.5 0 0 1 .5-.5zM4 15h3v-5H4v5zm5-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3zm3 0h-2v3h2v-3z" />
              </svg>
              {admin.store.store_name}
            </div>
          )}

        
          <div className="logout-container" style={{ display: 'inline-block', marginLeft: '15px' }}>
            <button 
              type="button" 
              onClick={() => setShowLogoutConfirm(true)} 
              className="logout-button-linkstyle"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>

    {/* Logout Confirmation Modal */}
    <ConfirmModal
      isOpen={showLogoutConfirm}
      onClose={() => setShowLogoutConfirm(false)}
      onConfirm={handleLogout}
      title="Confirm Logout"
      message="Are you sure you want to log out of the admin panel?"
      confirmText="Logout"
      cancelText="Cancel"
      confirmStyle="danger"
    />
    </>
  );
};

export default AdminHeader;