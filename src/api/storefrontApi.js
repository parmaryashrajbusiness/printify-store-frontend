import { apiFetch } from "./http";

function normalizeProvider(provider) {
  const value = String(provider || "").toUpperCase();

  if (value === "PRINTIFY") return "PRINTIFY";
  if (value === "QIKINK") return "QIKINK";

  return "";
}

function productProvider(product) {
  return String(
    product?.fulfillmentProvider ||
      product?.provider ||
      product?.supplier ||
      ""
  ).toUpperCase();
}

function productSupportsProvider(product, provider) {
  const normalizedProvider = normalizeProvider(provider);

  if (!normalizedProvider) return true;

  const directProvider = productProvider(product);

  if (directProvider === normalizedProvider) return true;
  if (directProvider === "BOTH" || directProvider === "HYBRID") return true;

  if (normalizedProvider === "QIKINK") {
    return Boolean(
      product?.qikinkEnabled ||
        product?.availableInIndia ||
        product?.qikinkProductId ||
        product?.qikinkSku ||
        product?.supplierMappings?.qikink?.enabled ||
        product?.providerMappings?.qikink?.enabled
    );
  }

  if (normalizedProvider === "PRINTIFY") {
    return Boolean(
      product?.printifyEnabled ||
        product?.availableGlobally ||
        product?.printifyProductId ||
        product?.supplierMappings?.printify?.enabled ||
        product?.providerMappings?.printify?.enabled
    );
  }

  return true;
}

function filterProductsForProvider(data, provider) {
  if (!Array.isArray(data)) return [];

  return data.filter((product) => {
    if (product?.status && String(product.status).toUpperCase() !== "ACTIVE") {
      return false;
    }

    return productSupportsProvider(product, provider);
  });
}

function filterHomeForProvider(data, provider) {
  if (!data || typeof data !== "object") return data;

  return {
    ...data,
    featuredProducts: filterProductsForProvider(data.featuredProducts || [], provider),
    sections: Array.isArray(data.sections)
      ? data.sections.map((section) => ({
          ...section,
          products: Array.isArray(section.products)
            ? filterProductsForProvider(section.products, provider)
            : section.products,
        }))
      : data.sections,
  };
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  return query.toString();
}

function regionParams(regionOrParams = {}) {
  const provider = normalizeProvider(regionOrParams.provider);

  return {
    country: regionOrParams.country,
    provider,
  };
}

export const storefrontApi = {
  getProviderStatus: async () => apiFetch("/providers/status", { auth: false }),

  getHomeSections: async (region = {}) => {
    const params = regionParams(region);
    const query = buildQuery(params);
    const data = await apiFetch(`/storefront/home${query ? `?${query}` : ""}`, {
      auth: false,
    });

    return filterHomeForProvider(data, params.provider);
  },

  getProducts: async (params = {}) => {
    const query = buildQuery(params);
    const data = await apiFetch(`/storefront/products${query ? `?${query}` : ""}`, {
      auth: false,
    });

    return filterProductsForProvider(data, params.provider);
  },

  getFeaturedProducts: async (region = {}) => {
    const params = regionParams(region);
    const query = buildQuery(params);
    const data = await apiFetch(
      `/storefront/products/featured${query ? `?${query}` : ""}`,
      { auth: false }
    );

    return filterProductsForProvider(data, params.provider);
  },

  getProductBySlug: async (slug, region = {}) => {
    const params = regionParams(region);
    const query = buildQuery(params);
    const product = await apiFetch(
      `/storefront/products/${slug}${query ? `?${query}` : ""}`,
      { auth: false }
    );

    if (!productSupportsProvider(product, params.provider)) {
      throw new Error("Product is not available for the selected country.");
    }

    return product;
  },

  getSimilarProducts: async (productId, region = {}) => {
    const params = regionParams(region);
    const query = buildQuery(params);
    const data = await apiFetch(
      `/storefront/products/${productId}/similar${query ? `?${query}` : ""}`,
      { auth: false }
    );

    return filterProductsForProvider(data, params.provider);
  },

  getProductReviews: async (productId) =>
    apiFetch(`/storefront/products/${productId}/reviews`, { auth: false }),

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
      auth: false,
    }),

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

  checkout: async (payload) =>
    apiFetch("/orders/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  checkoutCod: async (payload) =>
    apiFetch("/checkout/cod", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  toggleWishlist: async (productId) =>
    apiFetch(`/wishlist/${productId}`, {
      method: "POST",
    }),

  getWishlist: async () => apiFetch("/wishlist"),

  getOrders: async () => apiFetch("/orders"),

  getOrderTracking: async (orderId) => apiFetch(`/orders/${orderId}/tracking`),

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

  capturePayPalOrder: async ({ paypalOrderId, shipping }) =>
    apiFetch("/payments/paypal/capture", {
      method: "POST",
      body: JSON.stringify({ paypalOrderId, shipping }),
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