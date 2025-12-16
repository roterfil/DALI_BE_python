import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(formData);
      // Show success screen instead of redirecting
      setRegistrationSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success screen after registration
  if (registrationSuccess) {
    return (
      <div className="auth-page">
        <nav className="auth-nav">
          <Link to="/" className="auth-logo">
            <div className="logo-icon">
              <span className="logo-d">!</span>
              <span className="logo-text">D</span>
            </div>
            <span className="logo-name">DALI</span>
          </Link>
        </nav>

        <div className="auth-container">
          <div className="auth-form-container" style={{ flex: 1, maxWidth: '600px', margin: '0 auto' }}>
            <div className="auth-form-content verification-success-screen">
              <div className="verification-icon">📧</div>
              <h1>Check Your Email!</h1>
              <p className="verification-message">
                We've sent a verification link to <strong>{formData.email}</strong>
              </p>
              <p className="verification-instructions">
                Please check your inbox and click the verification link to activate your account.
                You won't be able to log in until your email is verified.
              </p>
              <div className="verification-note">
                <strong>Didn't receive the email?</strong>
                <p>Check your spam folder, or try logging in to resend the verification email.</p>
              </div>
              <Link to="/login" className="btn btn-primary">
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <nav className="auth-nav">
        <Link to="/" className="auth-logo">
          <div className="logo-icon">
            <span className="logo-d">!</span>
            <span className="logo-text">D</span>
          </div>
          <span className="logo-name">DALI</span>
        </Link>
        <div className="auth-nav-links">
          <Link to="/login" className="active">Login</Link>
        </div>
      </nav>

      <div className="auth-container">
        <div className="auth-image">
          <img 
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop" 
            alt="Grocery cart" 
          />
        </div>
        
        <div className="auth-form-container">
          <Link to="/shop" className="back-to-shop">← Back to shop</Link>
          
          <div className="auth-form-content">
            <h1>Sign up</h1>
            <p className="signup-description">
              Create a DALI account. From your profile, you will find all information.
              Already have account? <Link to="/login">Login here</Link>
            </p>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <h3>Personal Information</h3>
              
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Phone number</label>
                <input
                  type="tel"
                  name="phone_number"
                  placeholder="PH (+63)"
                  value={formData.phone_number}
                  onChange={handleChange}
                />
              </div>
              
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                />
              </div>
              
              <button type="submit" className="btn btn-primary btn-next" disabled={loading}>
                {loading ? 'Creating account...' : 'Next'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
