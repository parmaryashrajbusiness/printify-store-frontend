import { apiFetch } from "./http";

export const storefrontApi = {
  getHomeSections: async () => apiFetch("/storefront/home"),

  getProducts: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/storefront/products${query ? `?${query}` : ""}`);
  },

  getFeaturedProducts: async () => apiFetch("/storefront/products/featured"),

  getProductBySlug: async (slug) =>
    apiFetch(`/storefront/products/${slug}`),

  // CART
  getCart: async () => apiFetch("/cart"),

  addToCart: async (payload) =>
    apiFetch("/cart", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateCartItem: async (itemId, quantity) =>
    apiFetch(`/cart/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    }),

  removeCartItem: async (itemId) =>
    apiFetch(`/cart/${itemId}`, {
      method: "DELETE",
    }),

  // CHECKOUT
  checkout: async (payload) =>
    apiFetch("/orders/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // WISHLIST
  toggleWishlist: async (productId) =>
    apiFetch(`/wishlist/${productId}`, {
      method: "POST",
    }),

  getWishlist: async () => apiFetch("/wishlist"),

  // =======================
  // REVIEWS
  // =======================

  getSimilarProducts: async (productId) =>
    apiFetch(`/storefront/products/${productId}/similar`),

  getProductReviews: async (productId) =>
    apiFetch(`/storefront/products/${productId}/reviews`),

  createReview: async (productId, payload) =>
    apiFetch(`/storefront/products/${productId}/reviews`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateReview: async (reviewId, payload) =>
    apiFetch(`/storefront/reviews/${reviewId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteReview: async (reviewId) =>
    apiFetch(`/storefront/reviews/${reviewId}`, {
      method: "DELETE",
    }),

  sendContactMessage: async (payload) =>
    apiFetch("/storefront/contact", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getOrders: async () => apiFetch("/orders"),

  getOrderTracking: async (orderId) =>
    apiFetch(`/orders/${orderId}/tracking`),

  createRazorpayOrder: async (checkout) =>
    apiFetch("/payments/razorpay/order", {
      method: "POST",
      body: JSON.stringify({ checkout }),
    }),

  verifyRazorpayPayment: async (payload) =>
    apiFetch("/payments/razorpay/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createPayPalOrder: async (checkoutData) =>
    apiFetch("/payments/paypal/create-order", {
      method: "POST",
      body: JSON.stringify(checkoutData),
    }),

  capturePayPalOrder: async ({ paypalOrderId }) =>
    apiFetch("/payments/paypal/capture", {
      method: "POST",
      body: JSON.stringify({ paypalOrderId }),
    }),

  cancelOrder: async (orderId) => {
    return await apiFetch(`/orders/${orderId}/cancel`, {
      method: "POST",
    });
  },

  deleteOrderRecord: async (orderId) => {
    return await apiFetch(`/orders/${orderId}`, {
      method: "DELETE",
    });
  },

};