import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    number: false,
    special: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Update password validation
    if (name === 'password') {
      setPasswordValidation({
        length: value.length >= 8,
        number: /\d/.test(value),
        special: /[!@#$%^&*]/.test(value),
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate password
    if (!passwordValidation.length || !passwordValidation.number || !passwordValidation.special) {
      setError('Please ensure your password meets all requirements.');
      return;
    }

    setLoading(true);

    try {
      // Convert to snake_case for backend API
      const apiData = {
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone_number: formData.phoneNumber,
      };
      await register(apiData);
      // Show success screen instead of redirecting to home
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
    <div className="auth-page-wrapper">
      <div className="auth-card">
        {/* Image Panel */}
        <div className="auth-image-panel">
          <Link to="/shop" className="back-to-shop-btn">
            <span>&lt;</span>&nbsp;Back to shop
          </Link>
          <img src="/images/login.png" alt="Shopping cart with groceries" />
        </div>

        {/* Form Panel */}
        <div className="auth-form-panel">
          <h2>Sign up</h2>
          <p className="sub-heading">
            Already have account? <Link to="/login">Login here</Link>
          </p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <span className="form-section-label">Personal Information</span>
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="phoneNumber">Phone number</label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="PH (+63)"
                pattern="^(\+63|0)9\d{9}$"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div id="password-rules" className="password-rules-container">
              <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0' }}>
                <li
                  style={{
                    color: passwordValidation.length ? '#28a745' : '#dc3545',
                    fontSize: '0.85rem',
                    marginBottom: '5px',
                  }}
                >
                  {passwordValidation.length ? '✓' : '✗'} At least 8 characters
                </li>
                <li
                  style={{
                    color: passwordValidation.number ? '#28a745' : '#dc3545',
                    fontSize: '0.85rem',
                    marginBottom: '5px',
                  }}
                >
                  {passwordValidation.number ? '✓' : '✗'} At least one number (0-9)
                </li>
                <li
                  style={{
                    color: passwordValidation.special ? '#28a745' : '#dc3545',
                    fontSize: '0.85rem',
                    marginBottom: '5px',
                  }}
                >
                  {passwordValidation.special ? '✓' : '✗'} At least one special character
                  (!@#$%^&*)
                </li>
              </ul>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', borderRadius: '8px' }}
              disabled={loading}
            >
              {loading ? 'Signing up...' : 'Next'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
