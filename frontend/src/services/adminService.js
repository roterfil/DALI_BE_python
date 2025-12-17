import api from './api';

const adminService = {
  // Get dashboard stats
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // Get inventory (products)
  getInventory: async (params = {}) => {
    const response = await api.get('/admin/inventory', { params });
    return response.data;
  },

  // Get product detail
  getProduct: async (productId) => {
    const response = await api.get(`/admin/products/${productId}`);
    return response.data;
  },

  // Update product stock
  updateStock: async (productId, quantity) => {
    const response = await api.put(`/admin/products/${productId}/stock`, {
      quantity,
    });
    return response.data;
  },

  // Update product price (super admin only)
  updatePrice: async (productId, price) => {
    const response = await api.put(`/admin/products/${productId}/price`, {
      price,
    });
    return response.data;
  },

  // Get all orders
  getOrders: async (search = '') => {
    const response = await api.get('/admin/orders', {
      params: search ? { search } : {},
    });
    return response.data;
  },

  // Get order detail
  getOrder: async (orderId) => {
    const response = await api.get(`/admin/orders/${orderId}`);
    return response.data;
  },

  // Update order status
  updateOrderStatus: async (orderId, status, notes = '') => {
    const response = await api.put(`/admin/orders/${orderId}/status`, {
      status,
      notes,
    });
    return response.data;
  },
};

export default adminService;
