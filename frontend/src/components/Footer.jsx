import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-left">
          <img src="/images/dali-logo.png" alt="DALI Logo" className="footer-logo" />
          <p className="copyright-text">
            Copyright 2025. DALI Online Everyday Grocery. All rights reserved.
          </p>
        </div>
        <div className="footer-right">
          <div className="social-contact">
            <p className="social-cta-text">Follow Us</p>
            <p className="social-subtext">on Our Socials</p>
            <div className="social-icons">
              <a
                href="https://www.facebook.com/DALIEverydayGrocery/"
                aria-label="Facebook"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="bx bxl-facebook-square"></i>
              </a>
              <a href="#" aria-label="Twitter" target="_blank" rel="noopener noreferrer">
                <i className="bx bxl-twitter"></i>
              </a>
              <a
                href="https://www.instagram.com/dalieverydaygrocery/?hl=en"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="bx bxl-instagram-alt"></i>
              </a>
              <a href="#" aria-label="YouTube" target="_blank" rel="noopener noreferrer">
                <i className="bx bxl-youtube"></i>
              </a>
            </div>
          </div>
          <div className="footer-links">
            <a href="#">Terms and Conditions</a>
            <span>|</span>
            <a href="#">Privacy Policy</a>
            <span>|</span>
            <Link to="/admin/login" style={{ color: '#888', fontSize: '0.85em' }}>Staff</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
