import React, { useState } from 'react'; 
import { Link } from 'react-router-dom';
import './Home.css'; 

const Home = () => {


  // State for Accordion
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleAccordion = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const faqData = [
    {
      question: "What is your policy on refunds?",
      answer: "Your satisfaction is our priority. If you're not happy with an item, please contact our customer service team within 7 days of your delivery. For any damaged or incorrect items, we will gladly offer a full refund to your original payment method or a credit towards your next order. We may ask for a photo of the item to help us improve."
    },
    {
      question: "How much do deliveries cost?",
      answer: "Delivery fees vary based on your location and order size. You can see the exact delivery cost at the checkout page before finalizing your order."
    },
    {
      question: "What are your delivery hours?",
      answer: "We deliver from 8:00 AM to 8:00 PM daily, including weekends. You can choose a preferred delivery window during the checkout process."
    },
    {
      question: "What about the prices?",
      answer: "At DALI, we strive to keep our prices as low as possible without compromising quality. Our prices are competitive with local markets and often lower than traditional supermarkets."
    },
    {
      question: "Do you serve my area?",
      answer: "We currently serve major metropolitan areas. You can enter your zip code or address on our homepage to check if delivery is available in your specific location."
    }
  ];

  const scrollToWhyChooseUs = (e) => {
    e.preventDefault();
    const section = document.getElementById('why-choose-us');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <section className="hero-section">
        <div className="container hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Mas mura sa <br />
              <span className="brand-highlight">DALI</span>
            </h1>
            <p className="hero-description">
              DALI is an online grocery store where convenience meets quality and
              affordability. Value for money is our passion, and we will never
              compromise on the freshness of products or their variety. DALI brings 
              happiness to your table, eases your routines, and gives you more time 
              to enjoy what you love.
            </p>
            <div className="hero-buttons">
              <Link to="/shop" className="btn-primary">
                Shop now
              </Link>
              <a href="#why-choose-us" 
                className="btn-secondary" 
                onClick={scrollToWhyChooseUs}
              >
                Learn more
              </a>
            </div>
          </div>

          <div className="hero-image-wrapper">
            {/* The main background glow */}
            <div className="hero-glow"></div>

            {/* Main Image */}
            <img src="/images/grocery-bag.png" alt="Grocery Bag" className="main-img" />

            {/* Badge 1: Loved by All */}
            <div className="info-badge badge-top">
              <img src="/images/hearts.png" alt="hearts" className="badge-icon"/>
              <div className="badge-text">
                <strong>Loved by All</strong>
                <span>Top Choice by Many</span>
              </div>
            </div>

            {/* Badge 2: Convenient Shopping */}
            <div className="info-badge badge-bottom-left">
              <div className="badge-text">
                <strong>Convenient Shopping</strong>
                <span>Shopping at the comfort of your home</span>
              </div>
              <img src="/images/cart-tick.png" alt="cart" className="badge-icon"/>

            </div>

            {/* Badge 3: Very Affordable */}
            <div className="info-badge badge-bottom-right">
              <img src="/images/check.png" alt="check" className="badge-icon"/>
              <div className="badge-text">
                <strong>Very Affordable</strong>
                <span>Prices are usually lower</span>
              </div>
            </div>

            
          </div>
        </div>
      </section>
<section id="product-range" className="product-range-section">
  <div className="container">
    <h2 className="product-range-title">Discover DALI's Wide Product Range</h2>
    <p className="section-subtitle">
      Find everything you need in one place — from fresh produce to pantry
      staples, quality meats, and more, all ready for you to shop with ease.
    </p>
    
    <div className="category-grid">
      {/* Card 1: Frozen Meat */}
      <div className="category-card">
        <div className="card-content">
          <h3>Frozen Meat</h3>
          <p>Quality cuts, kept fresh and ready to cook.</p>
          <Link to="/shop?category=Frozen Goods" className="see-more-btn">See more</Link>
        </div>
        <div className="card-image-wrapper">
          <img src="/images/meat.png" alt="Frozen Meat" />
        </div>
      </div>

      {/* Card 2: Food Staples */}
      <div className="category-card">
        <div className="card-content">
          <h3>Food Staples</h3>
          <p>Your everyday essentials for home meals.</p>
          <Link to="/shop?category=Canned Goods" className="see-more-btn">See more</Link>
        </div>
        <div className="card-image-wrapper">
          <img src="/images/cans.png" alt="Food Staples" />
        </div>
      </div>

      {/* Card 3: Health and Beauty */}
      <div className="category-card">
        <div className="card-content">
          <h3>Health and Beauty</h3>
          <p>Care for yourself, inside and out.</p>
          <Link to="/shop?category=Hygiene" className="see-more-btn">See more</Link>
        </div>
        <div className="card-image-wrapper">
          <img src="/images/beauty.png" alt="Health and Beauty" />
        </div>
      </div>

      {/* Card 4: Other Grocery Products */}
      <div className="category-card">
        <div className="card-content">
          <h3>Other Grocery Products</h3>
          <p>All the additional essentials you need.</p>
          <Link to="/shop?category=Cooking Essentials" className="see-more-btn">See more</Link>
        </div>
        <div className="card-image-wrapper">
          <img src="/images/other.png" alt="Other Grocery Products" />
        </div>
      </div>
    </div>
  </div>
</section>

<section id="why-choose-us" className="why-choose-us-section">
  <div className="container why-choose-container">
    {/* Left Side: Cards */}
    <div className="features-list">
      <div className="feature-card">
        <div className="feature-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#b11576" />
            <path d="M7 12.5L10 15.5L17 8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="feature-text">
          <h4>Convenience at Your Fingertips</h4>
          <p>
            DALI brings the store closer to you, with flexible delivery or
            convenient in-store pickup so you can save time and avoid long lines.
          </p>
        </div>
      </div>

      <div className="feature-card">
        <div className="feature-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#b11576" />
            <path d="M7 12.5L10 15.5L17 8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="feature-text">
          <h4>Quality You Can Trust</h4>
          <p>
            We select only the best products from trusted suppliers, so you'll
            be assured of getting only the best. And our delivery team guarantees standard.
          </p>
        </div>
      </div>

      <div className="feature-card">
        <div className="feature-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#b11576" />
            <path d="M7 12.5L10 15.5L17 8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="feature-text">
          <h4>Exceptional Customer Support</h4>
          <p>
            At DALI, our customer support team will assist you with your queries, 
            concerns, or anything else to help make your shopping experience a 
            delight from start to finish.
          </p>
        </div>
      </div>
    </div>

    {/* Right Side: Text Content */}
    <div className="why-choose-content">
      <h2 className="section-title-pink">Why Choose Us</h2>
      <h3 className="section-subtitle-pink">Elevate Your Shopping Journey</h3>
      <p>
        DALI is not just another grocery store—it is a shopping experience,
        convenient, trustworthy, and very tailored to make your life easy. We
        have high-quality products available at flexible delivery options, an
        easy-to-use platform, and really great service to offer peace of mind
        and satisfaction in every order with us.
      </p>
      <p>
        Do grocery shopping with DALI, and visit the enjoyment, simplicity, care, 
        and confidence your shopping brings in choosing the best for you and your family.
      </p>
    </div>
  </div>
</section>

{/* New Simplified Shopping Section */}
<section className="cta-simplified-section">
  <div className="container cta-simplified-container">
    <div className="cta-simplified-content">
      <h2 className="cta-simplified-title">
        From Cart to Home, <br />
        Your Simplified Shopping
      </h2>
      <p className="cta-simplified-description">
        Experience the ultimate convenience DALI Online! Place your order now 
        and enjoy fresh, high-quality products delivered right to your 
        doorstep. Say goodbye to the hassle and hello to effortless 
        grocery shopping, giving you more time for what matters most.
      </p>
      <div className="cta-simplified-buttons">
        <Link to="/shop" className="btn-primary">
          Shop now
        </Link>
        <Link to="/register" className="btn-outline-pink">
          Join Us
        </Link>
      </div>
    </div>
    <div className="cta-simplified-image">
      {/* Ensure you have this image in your public/images folder */}
      <img src="/images/delivery.png" alt="Simplified Shopping" />
    </div>
  </div>
</section>

      {/* NEW COMMON QUESTIONS SECTION */}
      <section className="faq-section">
        <div className="container faq-container">
          <h2 className="faq-main-title">Common Questions</h2>
          
          <div className="faq-list">
            {faqData.map((item, index) => (
              <div 
                key={index} 
                className={`faq-item ${activeIndex === index ? 'active' : ''}`}
              >
                <button className="faq-question" onClick={() => toggleAccordion(index)}>
                  <span>Q. {item.question}</span>
                  <span className="faq-icon">
                    {activeIndex === index ? (
                      <svg width="14" height="8" viewBox="0 0 14 8" fill="none"><path d="M1 7L7 1L13 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : (
                      <svg width="14" height="8" viewBox="0 0 14 8" fill="none"><path d="M1 1L7 7L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </span>
                </button>
                <div className="faq-answer">
                  <p>{item.answer}</p>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ Support Box */}
          <div className="faq-support-card">
            <div className="support-text">
              <h3>Still Have Questions?</h3>
              <p>Can't find the answer you're looking for? Please chat to our friendly team.</p>
            </div>
            <a href="mailto:dalionline@gmail.com" className="btn-white-pill">Get in touch</a>
          </div>
        </div>
      </section>




    </>
  );
};

export default Home;
