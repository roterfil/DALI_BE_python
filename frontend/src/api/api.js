import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (email) => api.post(`/auth/forgot-password?email=${email}`),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Products API
export const productsAPI = {
  getProducts: (params) => api.get('/products', { params }),
  getSaleProducts: () => api.get('/products/sale'),
  getCategories: () => api.get('/products/categories'),
  getSubcategories: (category) => api.get(`/products/categories/${category}/subcategories`),
  getProduct: (id) => api.get(`/products/${id}`),
};

// Cart API
export const cartAPI = {
  getCart: () => api.get('/cart'),
  addToCart: (data) => api.post('/cart/items', data),
  updateCartItem: (productId, quantity) => api.put(`/cart/items/${productId}?quantity=${quantity}`),
  removeFromCart: (productId) => api.delete(`/cart/items/${productId}`),
  clearCart: () => api.delete('/cart'),
};

// Checkout API
export const checkoutAPI = {
  getDetails: () => api.get('/checkout/details'),
  setAddress: (addressId) => api.post('/checkout/address', { address_id: addressId }),
  setShipping: (data) => api.post('/checkout/shipping', data),
  calculateShipping: (addressId, deliveryMethod) => 
    api.get(`/checkout/calculate-shipping?address_id=${addressId}&delivery_method=${deliveryMethod}`),
  processPayment: (paymentMethod) => api.post('/checkout/payment', { payment_method: paymentMethod }),
};

// Orders API
export const ordersAPI = {
  getOrders: () => api.get('/orders'),
  getOrder: (id) => api.get(`/orders/${id}`),
  cancelOrder: (id) => api.post(`/orders/${id}/cancel`),
  markCollected: (id) => api.post(`/orders/${id}/mark-collected`),
};

// Addresses API
export const addressesAPI = {
  getAddresses: () => api.get('/addresses'),
  getAddress: (id) => api.get(`/addresses/${id}`),
  createAddress: (data) => api.post('/addresses', data),
  updateAddress: (id, data) => api.put(`/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/addresses/${id}`),
};

// Locations API
export const locationsAPI = {
  getProvinces: () => api.get('/locations/provinces'),
  getCities: (provinceId) => api.get(`/locations/provinces/${provinceId}/cities`),
  getBarangays: (cityId) => api.get(`/locations/cities/${cityId}/barangays`),
};

// Stores API
export const storesAPI = {
  getStores: (search) => api.get('/stores', { params: { search } }),
  getStore: (id) => api.get(`/stores/${id}`),
};

// Admin API
export const adminAPI = {
  login: (data) => api.post('/admin/login', data),
  logout: () => api.post('/admin/logout'),
  getInventory: (params) => api.get('/admin/inventory', { params }),
  getProduct: (id) => api.get(`/admin/products/${id}`),
  addProduct: (data) => api.post('/admin/products', data),
  updatePrice: (id, price) => api.put(`/admin/products/${id}/price`, { price }),
  updateStock: (id, quantity) => api.put(`/admin/products/${id}/stock`, { quantity }),
  updateDiscount: (id, data) => api.put(`/admin/products/${id}/discount`, data),
  updateProduct: (id, data) => api.put(`/admin/products/${id}`, data),
  getOrders: (search) => api.get('/admin/orders', { params: { search } }),
  getOrder: (id) => api.get(`/admin/orders/${id}`),
  updateOrderStatus: (id, status) => api.put(`/admin/orders/${id}/status`, { status }),
  getStats: () => api.get('/admin/stats'),
  getLowStockProducts: () => api.get('/admin/low-stock-products'),
  getAudit: (params = {}) => api.get('/admin/audit', { params }),
  // Chart data endpoints
  getRevenueByMonth: (months = 12) => api.get(`/admin/stats/revenue-by-month?months=${months}`),
  getTopProducts: (period = 'monthly', limit = 10) => api.get(`/admin/stats/top-products?period=${period}&limit=${limit}`),
};

// Reviews API
export const reviewsAPI = {
  getProductReviews: (productId, params) => api.get(`/reviews/product/${productId}`, { params }),
  getProductReviewSummary: (productId) => api.get(`/reviews/product/${productId}/summary`),
  getReviewableItems: (orderId) => api.get(`/reviews/order/${orderId}/reviewable`),
  createReview: (data) => api.post('/reviews', data),
  uploadReviewImage: (reviewId, formData) => api.post(`/reviews/${reviewId}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateReview: (reviewId, data) => api.put(`/reviews/${reviewId}`, data),
  deleteReview: (reviewId) => api.delete(`/reviews/${reviewId}`),
  deleteReviewImage: (reviewId, imageId) => api.delete(`/reviews/${reviewId}/images/${imageId}`),
  getMyReviews: (params) => api.get('/reviews/my-reviews', { params }),
};

export default api;
