import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import ConfirmModal from './ConfirmModal';

const Header = () => {
  const { isAuthenticated, logout } = useAuth();
  const { cartCount } = useCart();
  
  // State to track if we are in the "confirmation" phase
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await logout();
    setShowLogoutConfirm(false);
  };

  return (
    <>
    <header className="header">
      <div className="container">
        <div className="logo">
          <Link to="/">
            <img src="/images/dali-logo.png" alt="DALI Logo" />
          </Link>
        </div>
        
        <nav className="nav">
          <Link to="/shop">Shop</Link>
          <Link to="/sale" className="sale-link">Sale</Link>
          <Link to="/stores">Stores</Link>
        </nav>

        <div className="header-actions">
          <Link to="/cart">Cart ({cartCount})</Link>

          {!isAuthenticated ? (
            <Link to="/login">Login</Link>
          ) : (
            <>
              <Link to="/profile">Profile</Link>
              
              <div className="logout-container" style={{ display: 'inline-block', marginLeft: '10px' }}>
                <button 
                  onClick={() => setShowLogoutConfirm(true)} 
                  className="logout-button-linkstyle"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>

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
    </>
  );
};

export default Header;