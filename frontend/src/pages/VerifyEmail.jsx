import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services';
import './AuthPages.css';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const hasVerified = useRef(false); // Prevent double-call in React StrictMode
  
  useEffect(() => {
    // Prevent double verification in React StrictMode
    if (hasVerified.current) return;
    
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email for the correct link.');
      return;
    }
    
    const verifyEmail = async () => {
      hasVerified.current = true; // Mark as started
      try {
        const response = await authService.verifyEmail(token);
        setStatus('success');
        setMessage(response.message || 'Your email has been verified successfully!');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.detail || 'Failed to verify email. The link may have expired.');
      }
    };
    
    verifyEmail();
  }, [searchParams]);
  
  // Verify screen
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
        
        </div>
        
        <div className="auth-content">
          {status === 'verifying' && (
            <div className="verification-status verifying">
              <div className="spinner"></div>
              <p>Verifying your email...</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="verification-status success">
              <div className="status-icon success-icon">✓</div>
              <h3>Email Verified!</h3>
              <p>{message}</p>
              <Link to="/login" className="btn btn-primary">
                Continue to Login
              </Link>
            </div>
          )}
          
          {status === 'error' && (
            <div className="verification-status error">
              <div className="status-icon error-icon">✕</div>
              <h3>Verification Failed</h3>
              <p>{message}</p>
              <Link to="/login" className="btn btn-secondary">
                Go to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
