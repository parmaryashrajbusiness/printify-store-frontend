import { apiFetch } from "./http";

const QIKINK_PROVIDER = "QIKINK";

function isQikinkProduct(product) {
  return String(product?.fulfillmentProvider || "").toUpperCase() === QIKINK_PROVIDER;
}

function onlyQikinkProducts(data) {
  if (!Array.isArray(data)) return [];
  return data.filter(isQikinkProduct);
}

function onlyQikinkHome(data) {
  return {
    ...data,
    featuredProducts: onlyQikinkProducts(data?.featuredProducts),
  };
}

export const storefrontApi = {
  getHomeSections: async () => {
    const data = await apiFetch("/storefront/home");
    return onlyQikinkHome(data);
  },

  getProducts: async (params = {}) => {
    const query = new URLSearchParams({
      ...params,
      provider: QIKINK_PROVIDER,
    }).toString();

    const data = await apiFetch(`/storefront/products${query ? `?${query}` : ""}`);
    return onlyQikinkProducts(data);
  },

  getFeaturedProducts: async () => {
    const data = await apiFetch("/storefront/products/featured?provider=QIKINK");
    return onlyQikinkProducts(data);
  },

  getProductBySlug: async (slug) => {
    const product = await apiFetch(`/storefront/products/${slug}`);
    if (!isQikinkProduct(product)) {
      throw new Error("Product not available");
    }
    return product;
  },

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

  // REVIEWS
  getSimilarProducts: async (productId) => {
    const data = await apiFetch(`/storefront/products/${productId}/similar`);
    return onlyQikinkProducts(data);
  },

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

  cancelOrder: async (orderId) =>
    apiFetch(`/orders/${orderId}/cancel`, {
      method: "POST",
    }),

  deleteOrderRecord: async (orderId) =>
    apiFetch(`/orders/${orderId}`, {
      method: "DELETE",
    }),
};