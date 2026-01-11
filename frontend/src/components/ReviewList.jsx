import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import StarRating from './StarRating';
import { reviewService } from '../services';
import './ReviewList.css';

const ReviewList = ({ productId }) => {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const limit = 5;

  useEffect(() => {
    fetchSummary();
    fetchReviews(0, true);
  }, [productId]);

  const fetchSummary = async () => {
    try {
      const data = await reviewService.getProductReviewSummary(productId);
      setSummary(data);
    } catch (err) {
      console.error('Error fetching review summary:', err);
    }
  };

  const fetchReviews = async (pageNum, reset = false) => {
    try {
      setLoading(true);
      const data = await reviewService.getProductReviews(productId, pageNum * limit, limit);
      
      if (reset) {
        setReviews(data);
      } else {
        setReviews(prev => [...prev, ...data]);
      }
      
      setHasMore(data.length === limit);
      setPage(pageNum);
    } catch (err) {
      setError('Failed to load reviews');
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchReviews(page + 1);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRatingPercentage = (ratingValue) => {
    if (!summary || summary.total_reviews === 0) return 0;
    return Math.round((summary.rating_distribution[ratingValue] / summary.total_reviews) * 100);
  };

  if (loading && reviews.length === 0) {
    return <div className="review-list-loading">Loading reviews...</div>;
  }

  return (
    <div className="review-list">
      <h3 className="review-list__title">Customer Reviews</h3>

      {/* Summary Section */}
      {summary && (
        <div className="review-summary">
          <div className="review-summary__overall">
            <div className="review-summary__rating">
              <span className="review-summary__number">{summary.average_rating.toFixed(1)}</span>
              <StarRating rating={summary.average_rating} size="medium" />
            </div>
            <p className="review-summary__count">
              Based on {summary.total_reviews} {summary.total_reviews === 1 ? 'review' : 'reviews'}
            </p>
          </div>
          
          <div className="review-summary__distribution">
            {[5, 4, 3, 2, 1].map(rating => (
              <div key={rating} className="rating-bar">
                <span className="rating-bar__label">{rating} star</span>
                <div className="rating-bar__track">
                  <div 
                    className="rating-bar__fill" 
                    style={{ width: `${getRatingPercentage(rating)}%` }}
                  />
                </div>
                <span className="rating-bar__count">
                  {summary.rating_distribution[rating]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="review-list__empty">
          <p>No reviews yet. Be the first to review this product!</p>
        </div>
      ) : (
        <div className="review-list__items">
          {reviews.map((review) => (
            <div key={review.review_id} className="review-item">
              <div className="review-item__header">
                <div className="review-item__author">
                  <span className="review-item__name">{review.reviewer_name}</span>
                  <span className="review-item__date">{formatDate(review.created_at)}</span>
                </div>
                <StarRating rating={review.rating} size="small" />
              </div>
              
              {review.comment && (
                <p className="review-item__comment">{review.comment}</p>
              )}
              
              {review.images && review.images.length > 0 && (
                <div className="review-item__images">
                  {review.images.map((image) => (
                    <img
                      key={image.image_id}
                      src={image.image_url}
                      alt="Review"
                      className="review-item__image"
                      onClick={() => setSelectedImage(image.image_url)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && reviews.length > 0 && (
        <button 
          className="review-list__load-more btn btn-outline"
          onClick={loadMore}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Load More Reviews'}
        </button>
      )}

      {error && <div className="review-list__error">{error}</div>}

      {/* Image Modal */}
      {selectedImage && (
        <div className="review-image-modal" onClick={() => setSelectedImage(null)}>
          <div className="review-image-modal__content">
            <img src={selectedImage} alt="Review" />
            <button 
              className="review-image-modal__close"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

ReviewList.propTypes = {
  productId: PropTypes.number.isRequired,
};

export default ReviewList;
