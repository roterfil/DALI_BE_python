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

  // Update product discount (super admin only)
  updateDiscount: async (productId, discountData) => {
    const response = await api.put(`/admin/products/${productId}/discount`, discountData);
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

  // Add new product (multipart/form-data with optional image)
  addProduct: async (product) => {
    const form = new FormData();
    form.append('product_name', product.product_name);
    if (product.product_description) form.append('product_description', product.product_description);
    form.append('product_price', String(product.product_price));
    if (product.product_category) form.append('product_category', product.product_category);
    if (product.product_subcategory) form.append('product_subcategory', product.product_subcategory);
    form.append('product_quantity', String(product.product_quantity));
    if (product.imageFile) form.append('image', product.imageFile);

    const response = await api.post('/admin/products', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  
  // Update product details (multipart/form-data with optional image)
  updateProduct: async (productId, product) => {
    const form = new FormData();
    if (product.product_name !== undefined) form.append('product_name', product.product_name);
    if (product.product_description !== undefined) form.append('product_description', product.product_description);
    if (product.product_category !== undefined) form.append('product_category', product.product_category);
    if (product.product_subcategory !== undefined) form.append('product_subcategory', product.product_subcategory);
    if (product.imageFile) form.append('image', product.imageFile);

    const response = await api.put(`/admin/products/${productId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  
  // Delete a product (super admin only)
  deleteProduct: async (productId) => {
    const response = await api.delete(`/admin/products/${productId}`);
    return response.data;
  },
};

export default adminService;
