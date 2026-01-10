import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount } = useCart();

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
  };

  return (
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
              <form onSubmit={handleLogout} style={{ display: 'inline' }}>
                <button type="submit" className="logout-button-linkstyle">
                  Logout
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
