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
  updateStock: (id, quantity) => api.put(`/admin/products/${id}/stock`, { quantity }),
  getOrders: (search) => api.get('/admin/orders', { params: { search } }),
  getOrder: (id) => api.get(`/admin/orders/${id}`),
  updateOrderStatus: (id, status) => api.put(`/admin/orders/${id}/status`, { status }),
  getStats: () => api.get('/admin/stats'),
  getAudit: (params = {}) => api.get('/admin/audit', { params }),
};

export default api;
