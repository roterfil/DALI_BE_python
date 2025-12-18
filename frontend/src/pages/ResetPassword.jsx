import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../services';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    number: false,
    special: false,
  });

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordValidation({
      length: value.length >= 8,
      number: /\d/.test(value),
      special: /[!@#$%^&*]/.test(value),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (
      !passwordValidation.length ||
      !passwordValidation.number ||
      !passwordValidation.special
    ) {
      setError('Please ensure your password meets all requirements.');
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(token, password, confirmPassword);
      setSuccess('Password reset successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login', { state: { success: 'Password reset successful. Please login.' } });
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to reset password. The link may have expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-card">
          <div className="auth-form-panel" style={{ flex: '1' }}>
            <h2>Invalid Link</h2>
            <div className="auth-error">
              This password reset link is invalid or has expired.
            </div>
            <Link to="/forgot-password" className="btn btn-primary" style={{ marginTop: '20px' }}>
              Request a new link
            </Link>
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
          <Link to="/login" className="back-to-shop-btn">
            <span>&lt;</span>&nbsp;Back to login
          </Link>
          <img src="/images/login.png" alt="Shopping cart with groceries" />
        </div>

        {/* Form Panel */}
        <div className="auth-form-panel">
          <h2>Reset Password</h2>
          <p className="sub-heading">Enter your new password below.</p>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={handlePasswordChange}
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

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
