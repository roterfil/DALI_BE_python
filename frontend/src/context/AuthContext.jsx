import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check user auth - backend uses session, try to get profile
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = await authService.getProfile();
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        }
      } catch (error) {
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
        setUser(null);
      }

      try {
        // Check admin auth
        const storedAdmin = localStorage.getItem('admin');
        if (storedAdmin) {
                // Admin stored object may include is_super_admin flag
                try {
                  const parsed = JSON.parse(storedAdmin);
                  setAdmin(parsed);
                } catch (e) {
                  setAdmin(null);
                  localStorage.removeItem('admin');
                }
        }
      } catch (error) {
        localStorage.removeItem('admin');
        localStorage.removeItem('adminToken');
        setAdmin(null);
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    // Backend returns the user directly (AccountResponse)
    const userData = await authService.login(email, password);
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  const register = async (userData) => {
    // Backend returns a message (not user) - no auto-login until email verified
    const response = await authService.register(userData);
    // Don't set user - they need to verify email first
    return response;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Admin authentication
  const adminLogin = async (email, password) => {
    // Backend returns { message, admin_email }
    const response = await authService.adminLogin(email, password);
    // response now includes is_super_admin
    const adminData = { email: response.admin_email, is_super_admin: !!response.is_super_admin };
    setAdmin(adminData);
    localStorage.setItem('admin', JSON.stringify(adminData));
    return response;
  };

  const adminLogout = async () => {
    try {
      await authService.adminLogout();
    } catch (error) {
      console.error('Admin logout error:', error);
    }
    setAdmin(null);
    localStorage.removeItem('admin');
    localStorage.removeItem('adminToken');
  };

  const value = {
    user,
    admin,
    loading,
    isAuthenticated: !!user,
    isAdmin: !!admin,
    isSuperAdmin: !!(admin && admin.is_super_admin),
    login,
    register,
    logout,
    updateUser,
    adminLogin,
    adminLogout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
