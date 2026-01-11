import api from './api';

const reviewService = {
  // Get reviews for a product
  getProductReviews: async (productId, skip = 0, limit = 10) => {
    const response = await api.get(`/reviews/product/${productId}`, {
      params: { skip, limit }
    });
    return response.data;
  },

  // Get review summary for a product
  getProductReviewSummary: async (productId) => {
    const response = await api.get(`/reviews/product/${productId}/summary`);
    return response.data;
  },

  // Get reviewable items for an order
  getReviewableItems: async (orderId) => {
    const response = await api.get(`/reviews/order/${orderId}/reviewable`);
    return response.data;
  },

  // Create a new review
  createReview: async (reviewData) => {
    const response = await api.post('/reviews', reviewData);
    return response.data;
  },

  // Upload an image for a review
  uploadReviewImage: async (reviewId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/reviews/${reviewId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update a review
  updateReview: async (reviewId, reviewData) => {
    const response = await api.put(`/reviews/${reviewId}`, reviewData);
    return response.data;
  },

  // Delete a review
  deleteReview: async (reviewId) => {
    const response = await api.delete(`/reviews/${reviewId}`);
    return response.data;
  },

  // Delete a review image
  deleteReviewImage: async (reviewId, imageId) => {
    const response = await api.delete(`/reviews/${reviewId}/images/${imageId}`);
    return response.data;
  },

  // Get current user's reviews
  getMyReviews: async (skip = 0, limit = 20) => {
    const response = await api.get('/reviews/my-reviews', {
      params: { skip, limit }
    });
    return response.data;
  },
};

export default reviewService;
