import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import StarRating from './StarRating';
import { reviewService } from '../services';
import './ReviewForm.css';

const ReviewForm = ({ orderItem, existingReview, onReviewSubmitted, onCancel }) => {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [isAnonymous, setIsAnonymous] = useState(existingReview?.is_anonymous || false);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  
  const isEditMode = !!existingReview;

  // Initialize with existing review data
  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment || '');
      setIsAnonymous(existingReview.is_anonymous);
    }
  }, [existingReview]);

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Limit to 5 images
    const remainingSlots = 5 - images.length;
    const newFiles = files.slice(0, remainingSlots);
    
    if (files.length > remainingSlots) {
      setError(`You can only upload up to 5 images. ${files.length - remainingSlots} file(s) were not added.`);
    }

    // Create previews
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    
    setImages(prev => [...prev, ...newFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index) => {
    // Revoke object URL to prevent memory leak
    URL.revokeObjectURL(imagePreviews[index]);
    
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);

    try {
      let review;
      
      if (isEditMode) {
        // Update existing review
        const reviewData = {
          rating,
          comment: comment.trim() || null,
          is_anonymous: isAnonymous,
        };
        review = await reviewService.updateReview(existingReview.review_id, reviewData);
      } else {
        // Create new review
        const reviewData = {
          order_item_id: orderItem.order_item_id,
          rating,
          comment: comment.trim() || null,
          is_anonymous: isAnonymous,
        };
        review = await reviewService.createReview(reviewData);

        // Upload images if any (only for new reviews)
        if (images.length > 0) {
          for (const file of images) {
            try {
              await reviewService.uploadReviewImage(review.review_id, file);
            } catch (imgErr) {
              console.error('Error uploading image:', imgErr);
            }
          }
        }
      }

      // Cleanup previews
      imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
      
      onReviewSubmitted(review);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-form">
      <div className="review-form__product">
        <img 
          src={orderItem.product_image ? `/images/products/${orderItem.product_image}` : '/images/products/default.png'} 
          alt={orderItem.product_name}
          className="review-form__product-image"
        />
        <div className="review-form__product-info">
          <h4>{orderItem.product_name}</h4>
          <p>Quantity: {orderItem.quantity}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Rating */}
        <div className="review-form__field">
          <label>Your Rating *</label>
          <StarRating
            rating={rating}
            size="large"
            interactive
            onRatingChange={setRating}
          />
        </div>

        {/* Comment */}
        <div className="review-form__field">
          <label htmlFor="comment">Your Review (Optional)</label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this product..."
            rows={4}
            maxLength={1000}
          />
          <span className="review-form__char-count">{comment.length}/1000</span>
        </div>

        {/* Image Upload */}
        <div className="review-form__field">
          <label>Add Photos (Optional)</label>
          <div className="review-form__images">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="review-form__image-preview">
                <img src={preview} alt={`Preview ${index + 1}`} />
                <button
                  type="button"
                  className="review-form__image-remove"
                  onClick={() => removeImage(index)}
                >
                  ×
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <label className="review-form__image-add">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageSelect}
                  multiple
                  hidden
                />
                <span>+</span>
                <span>Add Photo</span>
              </label>
            )}
          </div>
          <p className="review-form__hint">Up to 5 images. JPEG, PNG, WebP, or GIF.</p>
        </div>

        {/* Anonymous Option */}
        <div className="review-form__field review-form__checkbox">
          <label>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            Post as Anonymous
          </label>
          <span className="review-form__hint">Your name won't be displayed with the review.</span>
        </div>

        {error && <div className="review-form__error">{error}</div>}

        {/* Edit mode notice */}
        {isEditMode && (
          <div className="review-form__notice">
            ⚠️ You can only edit your review once. Make sure you're happy with your changes.
          </div>
        )}

        {/* Actions */}
        <div className="review-form__actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || rating === 0}
          >
            {submitting ? 'Submitting...' : (isEditMode ? 'Update Review' : 'Submit Review')}
          </button>
        </div>
      </form>
    </div>
  );
};

ReviewForm.propTypes = {
  orderItem: PropTypes.shape({
    order_item_id: PropTypes.number.isRequired,
    product_id: PropTypes.number.isRequired,
    product_name: PropTypes.string.isRequired,
    product_image: PropTypes.string,
    quantity: PropTypes.number.isRequired,
  }).isRequired,
  existingReview: PropTypes.shape({
    review_id: PropTypes.number.isRequired,
    rating: PropTypes.number.isRequired,
    comment: PropTypes.string,
    is_anonymous: PropTypes.bool,
  }),
  onReviewSubmitted: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default ReviewForm;
