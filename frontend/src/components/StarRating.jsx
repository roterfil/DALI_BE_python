import { useState } from 'react';
import PropTypes from 'prop-types';
import './StarRating.css';

const StarRating = ({ 
  rating = 0, 
  maxRating = 5, 
  size = 'medium', 
  interactive = false, 
  onRatingChange = null,
  showValue = false 
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const handleClick = (value) => {
    if (interactive && onRatingChange) {
      onRatingChange(value);
    }
  };

  const handleMouseEnter = (value) => {
    if (interactive) {
      setHoverRating(value);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className={`star-rating star-rating--${size}`}>
      <div className="star-rating__stars">
        {[...Array(maxRating)].map((_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= displayRating;
          const isHalf = !isFilled && starValue - 0.5 <= displayRating;

          return (
            <span
              key={index}
              className={`star ${isFilled ? 'star--filled' : ''} ${isHalf ? 'star--half' : ''} ${interactive ? 'star--interactive' : ''}`}
              onClick={() => handleClick(starValue)}
              onMouseEnter={() => handleMouseEnter(starValue)}
              onMouseLeave={handleMouseLeave}
              role={interactive ? 'button' : 'presentation'}
              tabIndex={interactive ? 0 : -1}
              onKeyDown={(e) => {
                if (interactive && (e.key === 'Enter' || e.key === ' ')) {
                  handleClick(starValue);
                }
              }}
            >
              {isFilled || isHalf ? '★' : '☆'}
            </span>
          );
        })}
      </div>
      {showValue && (
        <span className="star-rating__value">
          {rating > 0 ? rating.toFixed(1) : 'No rating'}
        </span>
      )}
    </div>
  );
};

StarRating.propTypes = {
  rating: PropTypes.number,
  maxRating: PropTypes.number,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  interactive: PropTypes.bool,
  onRatingChange: PropTypes.func,
  showValue: PropTypes.bool,
};

export default StarRating;
