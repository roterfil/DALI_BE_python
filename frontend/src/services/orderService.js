import api from './api';

const orderService = {
  // Get user's orders
  getOrders: async () => {
    const response = await api.get('/orders');
    return response.data;
  },

  // Get order by ID
  getOrder: async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  // Cancel order
  cancelOrder: async (orderId) => {
    const response = await api.post(`/orders/${orderId}/cancel`);
    return response.data;
  },

  // Mark order as collected (for pickup orders)
  markCollected: async (orderId) => {
    const response = await api.post(`/orders/${orderId}/mark-collected`);
    return response.data;
  },
};

export default orderService;
