import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  ShoppingBag,
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  MessageCircle,
  Plus,
  Minus,
  CheckCircle2,
  Sparkles,
  User,
  LogOut,
} from "lucide-react";

import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { storefrontApi } from "@/api/storefrontApi";
import { useAuth } from "@/context/AuthContext";
import { formatMoney } from "@/utils/currency";
import { useCustomerRegion } from "@/hooks/useCustomerRegion";
import { getProductDisplayPricing } from "@/utils/displayPricing";
import CartDrawer from "@/components/store/CartDrawer";
import CheckoutModal from "@/components/store/CheckoutModal";
import neonLogo from "@/assets/neon-logo.png";
import AuthModal from "@/components/auth/AuthModal";

const MAX_QUANTITY_PER_VARIANT = 5;

function productIdOf(product) {
  return product?.id || product?._id;
}

function getImages(product) {
  const images = [];

  if (Array.isArray(product?.images)) images.push(...product.images);
  if (Array.isArray(product?.imageUrls)) images.push(...product.imageUrls);
  if (product?.imageUrl) images.push(product.imageUrl);
  if (product?.image) images.push(product.image);

  return [...new Set(images.filter(Boolean))];
}

function getVariantImages(variant) {
  const images = [];

  // Main/primary mockup first
  if (variant?.qikinkMockupLink) images.push(variant.qikinkMockupLink);
  if (variant?.qikinkMockupUrl) images.push(variant.qikinkMockupUrl);
  if (variant?.mockupLink) images.push(variant.mockupLink);
  if (variant?.mockupUrl) images.push(variant.mockupUrl);
  if (variant?.mockup_url) images.push(variant.mockup_url);
  if (variant?.mockup_link) images.push(variant.mockup_link);

  // Then extra gallery images
  if (Array.isArray(variant?.qikinkMockupLinks)) {
    images.push(...variant.qikinkMockupLinks);
  }

  if (Array.isArray(variant?.images)) images.push(...variant.images);
  if (Array.isArray(variant?.imageUrls)) images.push(...variant.imageUrls);

  if (variant?.imageUrl) images.push(variant.imageUrl);
  if (variant?.image) images.push(variant.image);

  return [...new Set(images.filter(Boolean))];
}

function getDisplayImages(product, selectedVariant) {
  const variantImages = getVariantImages(selectedVariant);

  if (variantImages.length > 0) {
    return variantImages;
  }

  return getImages(product);
}

function ratingOf(product) {
  return Number(product?.ratingAverage ?? product?.averageRating ?? product?.rating ?? 0);
}

function ratingCountOf(product) {
  return Number(product?.ratingCount ?? product?.reviewCount ?? product?.reviews ?? 0);
}

function normalizeCartResponse(cart) {
  if (Array.isArray(cart)) return cart;

  if (Array.isArray(cart?.items)) return cart.items;

  if (Array.isArray(cart?.cartItems)) return cart.cartItems;

  if (Array.isArray(cart?.data)) return cart.data;

  if (Array.isArray(cart?.content)) return cart.content;

  return [];
}

function variantIdForRegion(variant, customerRegion) {
  const provider = String(customerRegion?.provider || "").toUpperCase();

  if (provider === "QIKINK") {
    return (
      variant?.qikinkSku ||
      variant?.providerSku ||
      variant?.sku ||
      variant?.printifyVariantId ||
      variant?.id ||
      ""
    );
  }

  return (
    variant?.printifyVariantId ||
    variant?.providerVariantId ||
    variant?.id ||
    ""
  );
}

export default function ProductDetails() {
  const { user, isAuthenticated, logout } = useAuth();
  const { customerRegion } = useCustomerRegion();

  const { slug } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [activeImage, setActiveImage] = useState("");
  const [touchStartX, setTouchStartX] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [cartItems, setCartItems] = useState([]);
  const [checkoutCartItems, setCheckoutCartItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  const openLogin = () => {
    setAuthMode("login");
    setAuthModalOpen(true);
  };

  const openRegister = () => {
    setAuthMode("register");
    setAuthModalOpen(true);
  };

  const [zoom, setZoom] = useState({
    active: false,
    x: 50,
    y: 50,
  });

  const productId = productIdOf(product);

  const availableColors = useMemo(() => {
    if (!product?.variants?.length) return [];

    return [
      ...new Set(
        product.variants
          .filter((variant) => variant.enabled)
          .map((variant) => variant.color)
          .filter(Boolean)
      ),
    ];
  }, [product]);

  const selectedVariant = useMemo(() => {
    if (!product?.variants?.length) return null;

    return (
      product.variants.find((variant) => variantIdForRegion(variant, customerRegion) === selectedVariantId) ||
      product.variants.find((variant) => variant.enabled) ||
      product.variants[0]
    );
  }, [product, selectedVariantId, customerRegion]);

  const images = useMemo(
    () => getDisplayImages(product, selectedVariant),
    [product, selectedVariant]
  );

  const activeImageIndex = useMemo(() => {
    const index = images.findIndex((img) => img === activeImage);
    return index >= 0 ? index : 0;
  }, [images, activeImage]);

  const selectImageByIndex = (index) => {
    if (!images.length) return;

    const safeIndex = (index + images.length) % images.length;
    setActiveImage(images[safeIndex]);
  };

  const handleImageTouchEnd = (e) => {
    if (touchStartX == null || images.length <= 1) return;

    const touchEndX = e.changedTouches?.[0]?.clientX;
    if (touchEndX == null) return;

    const distance = touchStartX - touchEndX;

    if (Math.abs(distance) > 40) {
      selectImageByIndex(activeImageIndex + (distance > 0 ? 1 : -1));
    }

    setTouchStartX(null);
  };

  useEffect(() => {
    if (!selectedVariant) return;

    const variantImages = getVariantImages(selectedVariant);

    if (variantImages.length > 0) {
      setActiveImage(variantImages[0]);
      return;
    }

    const fallbackImages = getImages(product);

    if (fallbackImages.length > 0) {
      setActiveImage(fallbackImages[0]);
    }
  }, [selectedVariant, product]);

  const sizeVariants = useMemo(() => {
    if (!product?.variants?.length) return [];

    return product.variants.filter((variant) => {
      if (!variant.enabled) return false;
      if (!selectedColor) return true;
      return variant.color === selectedColor;
    });
  }, [product, selectedColor]);

  const { displayCurrency, displayPrice, displayCompareAt } = getProductDisplayPricing(
    product,
    customerRegion,
    selectedVariant
  );

  const cartCount = cartItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const showToast = (type, message) => {
    setToast({ id: Date.now(), type, message });
    setTimeout(() => setToast(null), 2500);
  };

  const refreshCart = async ({ silent = false } = {}) => {
    if (!isAuthenticated) {
      setCartItems([]);
      return [];
    }

    try {
      if (!silent) {
        setCartLoading(true);
      }

      const cart = await storefrontApi.getCart();
      const safeCart = normalizeCartResponse(cart);

      setCartItems(safeCart);

      return safeCart;
    } catch (err) {
      console.error(err);
      showToast("error", "Could not load cart.");
      return [];
    } finally {
      if (!silent) {
        setCartLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshCart();
    } else {
      setCartItems([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);

        const data = await storefrontApi.getProductBySlug(slug, customerRegion);
        setProduct(data);

        const firstVariant =
          data.variants?.find((variant) => variant.enabled) || data.variants?.[0];

        const firstVariantId =
          firstVariant ? variantIdForRegion(firstVariant, customerRegion) : "";

        setSelectedVariantId(firstVariantId);

        const firstColor =
          data.variants?.find((variant) => variant.enabled && variant.color)?.color || "";

        setSelectedColor(firstColor);

        const imgs = getImages(data);
        setActiveImage(imgs[0] || "");

        const id = productIdOf(data);

        const [similar, productReviews] = await Promise.all([
          storefrontApi.getSimilarProducts
            ? storefrontApi.getSimilarProducts(id, customerRegion).catch(() => [])
            : Promise.resolve([]),
          storefrontApi.getProductReviews(id).catch(() => []),
        ]);

        setSimilarProducts(Array.isArray(similar) ? similar : []);
        setReviews(Array.isArray(productReviews) ? productReviews : []);
      } catch (err) {
        console.error(err);
        showToast("error", "This product is not available in the selected country.");
        navigate("/");
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [slug, customerRegion.country, customerRegion.provider]);

  const updateCartQuantity = async (item, nextQuantity) => {
    if (nextQuantity < 1) return;

    if (nextQuantity > MAX_QUANTITY_PER_VARIANT) {
      showToast("error", `Maximum ${MAX_QUANTITY_PER_VARIANT} pieces per size/color.`);
      return;
    }

    const previousCartItems = cartItems;

    setCartItems((items) =>
      items.map((cartItem) =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: nextQuantity }
          : cartItem
      )
    );

    try {
      await storefrontApi.updateCartItem(item.id, nextQuantity);
      await refreshCart({ silent: true });
    } catch (err) {
      console.error(err);
      setCartItems(previousCartItems);
      showToast("error", err.message || "Failed to update cart.");
    }
  };

  const removeCartItem = async (id) => {
    const previousCartItems = cartItems;

    setCartItems((items) => items.filter((item) => item.id !== id));

    try {
      await storefrontApi.removeCartItem(id);
      await refreshCart({ silent: true });
      showToast("success", "Item removed from cart.");
    } catch (err) {
      console.error(err);
      setCartItems(previousCartItems);
      showToast("error", err.message || "Failed to remove item.");
    }
  };

  const openCart = () => {
    if (!isAuthenticated) {
      showToast("error", "Please login to open cart.");
      return;
    }

    setCartOpen(true);
    refreshCart();
  };

  const addToCart = async () => {
    if (!isAuthenticated) {
      setAuthMode("login");
      setAuthModalOpen(true);
      showToast("error", "Login to add items, place orders, and track delivery.");
      return;
    }

    if (product?.variants?.length > 0 && !selectedVariantId) {
      showToast("error", "Please select a product variant.");
      return;
    }

    try {
      await storefrontApi.addToCart({
        productId,
        variantId:
          selectedVariant?.variantId ||
          selectedVariant?.printifyVariantId ||
          selectedVariant?.qikinkCatalogSku ||
          variantIdForRegion(selectedVariant, customerRegion) ||
          product.defaultVariantId,
        country: customerRegion.country,
        provider: customerRegion.provider,
        quantity,
      });

      await refreshCart();
      showToast("success", "Product added to cart.");
    } catch (err) {
      console.error(err);
      showToast("error", err.message || "Could not add product to cart.");
    }
  };

  const toggleWishlist = async () => {
    if (!isAuthenticated) {
      showToast("error", "Please login to use wishlist.");
      return;
    }

    try {
      await storefrontApi.toggleWishlist(productId);
      showToast("success", "Wishlist updated.");
    } catch (err) {
      console.error(err);
      showToast("error", err.message || "Could not update wishlist.");
    }
  };

  const handleCheckoutSubmit = async (form, paymentProvider) => {
    try {
      setCheckoutLoading(true);

      const checkoutForm = {
        ...form,
        country: customerRegion.country || "US",
        provider: customerRegion.provider || "PRINTIFY",
      };

      if (paymentProvider === "COD") {
        await storefrontApi.checkoutCod(checkoutForm);
        await refreshCart();
        setCheckoutOpen(false);
        setCartOpen(false);
        showToast("success", "COD order placed successfully.");
        setCheckoutLoading(false);
        return;
      }

      if (paymentProvider === "RAZORPAY") {
        const razorpayOrder = await storefrontApi.createRazorpayOrder(checkoutForm);

        if (!window.Razorpay) {
          showToast("error", "Payment system is not loaded. Please refresh and try again.");
          setCheckoutLoading(false);
          return;
        }

        const options = {
          key: razorpayOrder.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: "NeonStore",
          description: "Secure order payment",
          order_id: razorpayOrder.razorpayOrderId,

          prefill: {
            name: checkoutForm.fullName,
            email: checkoutForm.email,
            contact: checkoutForm.phone,
          },

          theme: {
            color: "#22c55e",
          },

          handler: async function (response) {
            try {
              await storefrontApi.verifyRazorpayPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });

              await refreshCart();
              setCheckoutOpen(false);
              setCartOpen(false);
              showToast("success", "Payment successful. Order placed.");
            } catch (err) {
              console.error(err);
              showToast("error", err.message || "Payment verification failed.");
            } finally {
              setCheckoutLoading(false);
            }
          },

          modal: {
            ondismiss: function () {
              setCheckoutLoading(false);
              showToast("error", "Payment cancelled.");
            },
          },
        };

        new window.Razorpay(options).open();
        return;
      }

      if (paymentProvider === "PAYPAL") {
        const paypalOrder = await storefrontApi.createPayPalOrder(checkoutForm);

        if (!paypalOrder?.approvalUrl) {
          showToast("error", "Could not start PayPal payment.");
          setCheckoutLoading(false);
          return;
        }

        sessionStorage.setItem(
          "paypalCheckoutShipping",
          JSON.stringify({
            ...checkoutForm,
            country: checkoutForm.country.toUpperCase(),
          })
        );

        window.location.href = paypalOrder.approvalUrl;
        return;
      }

      showToast("error", "Please select a payment method.");
      setCheckoutLoading(false);
    } catch (err) {
      console.error(err);
      showToast("error", err.message || "Could not start payment.");
      setCheckoutLoading(false);
    }
  };

  const handleColorSelect = (color) => {
    setSelectedColor(color);

    const firstVariantForColor = product?.variants?.find(
      (variant) => variant.enabled && variant.color === color
    );

    if (firstVariantForColor) {
      setSelectedVariantId(variantIdForRegion(firstVariantForColor, customerRegion));

      const variantImages = getVariantImages(firstVariantForColor);

      if (variantImages.length > 0) {
        setActiveImage(variantImages[0]);
      }
    }
  };

  const handleVariantSelect = (variant) => {
    setSelectedVariantId(variantIdForRegion(variant, customerRegion));

    const variantImages = getVariantImages(variant);

    if (variantImages.length > 0) {
      setActiveImage(variantImages[0]);
    }
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setZoom({
      active: true,
      x,
      y,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050805] px-4 py-24 text-white">
        <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-white/5 p-8">
          Loading product...
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#050805] px-4 py-24 text-white">
        <div className="mx-auto max-w-7xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-red-200">
          Product not found.
        </div>
      </div>
    );
  }

  const average =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
      : ratingOf(product);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050805] text-white">
      <AnimatedBackground />

      <ProductDetailsHeader
        user={user}
        cartCount={cartCount}
        onHome={() => navigate("/")}
        onCartOpen={openCart}
        onLogout={logout}
      />

      <main className="relative z-10 mx-auto w-full max-w-7xl overflow-x-hidden px-3 pb-4 pt-24 sm:px-6 sm:pb-8 sm:pt-28 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/10 hover:text-white sm:mb-6 sm:px-4 sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <section className="grid w-full min-w-0 max-w-full gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8">
          <div className="grid w-full min-w-0 max-w-full gap-3 lg:grid-cols-[90px_1fr] lg:gap-4">
            <div className="hidden gap-3 overflow-x-auto lg:order-1 lg:flex lg:flex-col lg:overflow-visible">
              {images.map((img) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setActiveImage(img)}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border transition ${activeImage === img
                    ? "border-green-400"
                    : "border-white/10 hover:border-white/30"
                    }`}
                >
                  <img src={img} alt={product.name} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>

            <div className="w-full min-w-0 max-w-full lg:order-2">
              <div
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setZoom((prev) => ({ ...prev, active: true }))}
                onMouseLeave={() => setZoom((prev) => ({ ...prev, active: false }))}
                onTouchStart={(e) => setTouchStartX(e.touches?.[0]?.clientX ?? null)}
                onTouchEnd={handleImageTouchEnd}
                className="relative flex aspect-[4/5] w-full min-w-0 items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-black sm:h-[520px] sm:aspect-auto sm:rounded-[32px] lg:bg-white/[0.04]"              >
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={product.name}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-black text-sm text-zinc-500">
                    Image not available
                  </div>
                )}

                {zoom.active && activeImage ? (
                  <div
                    className="pointer-events-none absolute inset-0 hidden bg-no-repeat lg:block"
                    style={{
                      backgroundImage: `url(${activeImage})`,
                      backgroundSize: "220%",
                      backgroundPosition: `${zoom.x}% ${zoom.y}%`,
                    }}
                  />
                ) : null}

                <div className="absolute left-3 top-3 flex gap-2 sm:left-4 sm:top-4">
                  {product.featured ? (
                    <Badge className="bg-green-500 text-black">Featured</Badge>
                  ) : null}
                </div>
              </div>

              {images.length > 1 ? (
                <div className="mt-3 flex justify-center gap-1.5 lg:hidden">
                  {images.map((img, index) => (
                    <button
                      key={img}
                      type="button"
                      onClick={() => selectImageByIndex(index)}
                      aria-label={`Show image ${index + 1}`}
                      className={`h-1.5 rounded-full transition-all ${index === activeImageIndex
                        ? "w-5 bg-green-400"
                        : "w-1.5 bg-white/30"
                        }`}
                    />
                  ))}
                </div>
              ) : null}

              <p className="mt-3 hidden text-center text-xs text-zinc-500 lg:block">
                Hover over image to zoom
              </p>
            </div>
          </div>

          <MobileVariantPicker
            product={product}
            availableColors={availableColors}
            selectedColor={selectedColor}
            sizeVariants={sizeVariants}
            selectedVariantId={selectedVariantId}
            customerRegion={customerRegion}
            onColorSelect={handleColorSelect}
            onVariantSelect={handleVariantSelect}
          />

          <div className="w-full min-w-0 max-w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl sm:rounded-[32px] sm:p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-green-300 sm:text-sm sm:tracking-[0.22em]">
              {product.categoryName || product.sectionName || product.category || "Product"}
              {product.subCategoryName ? ` / ${product.subCategoryName}` : ""}
            </p>

            <h1 className="mt-2 min-w-0 break-words text-2xl font-semibold leading-tight sm:mt-3 md:text-5xl">
              {product.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4 sm:gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-green-500 px-3 py-1 text-sm font-semibold text-black">
                <Star className="h-4 w-4 fill-black" />
                {Number(average || 0).toFixed(1)}
              </div>
              <p className="text-sm text-zinc-400">
                {reviews.length || ratingCountOf(product)} customer reviews
              </p>
            </div>

            <div className="mt-4 flex min-w-0 flex-wrap items-end gap-2 sm:mt-6 sm:gap-3">
              <p className="text-3xl font-semibold sm:text-4xl">
                {formatMoney(displayPrice, displayCurrency)}
              </p>

              {displayCompareAt ? (
                <p className="pb-1 text-base text-zinc-500 line-through sm:text-lg">
                  {formatMoney(displayCompareAt, displayCurrency)}
                </p>
              ) : null}
            </div>

            <p className="mt-4 min-w-0 break-words text-sm leading-6 text-zinc-300 sm:mt-5 sm:text-base sm:leading-7">
              {product.description}
            </p>

            

            <div className="mt-5 grid min-w-0 grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-3 sm:gap-3">
              <TrustCard icon={<Truck className="h-5 w-5" />} title="Fast Dispatch" />
              <TrustCard icon={<ShieldCheck className="h-5 w-5" />} title="Secure Checkout" />
              <TrustCard icon={<RotateCcw className="h-5 w-5" />} title="Support Available" />
            </div>

            {product.variants?.length > 0 ? (
              <div className="mt-6 hidden space-y-5 lg:block">
                {availableColors.length > 0 ? (
                  <div>
                    <p className="mb-3 text-sm text-zinc-400">Color</p>

                    <div className="flex flex-wrap gap-2">
                      {availableColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleColorSelect(color)}
                          className={`rounded-xl border px-4 py-2 text-sm transition ${selectedColor === color
                            ? "border-green-400 bg-green-500 text-black"
                            : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                            }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <p className="mb-3 text-sm text-zinc-400">Size</p>

                  <div className="flex flex-wrap gap-2">
                    {sizeVariants.map((variant) => (
                      <button
                        key={variantIdForRegion(variant, customerRegion)}
                        type="button"
                        onClick={() => handleVariantSelect(variant)}
                        className={`rounded-xl border px-4 py-2 text-sm transition ${selectedVariantId === variantIdForRegion(variant, customerRegion)
                          ? "border-green-400 bg-green-500 text-black"
                          : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                          }`}
                      >
                        {variant.size || variant.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-5 space-y-3 sm:mt-7 sm:space-y-4">
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <p className="text-sm font-medium text-zinc-300">Quantity</p>

                <div className="flex h-11 items-center rounded-full border border-white/10 bg-black/30 sm:h-12">
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    className="grid h-11 w-11 place-items-center rounded-l-full text-zinc-300 transition hover:bg-white/10 hover:text-white sm:h-12 sm:w-12"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <span className="min-w-12 text-center text-base font-semibold text-white">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    disabled={quantity >= MAX_QUANTITY_PER_VARIANT}
                    onClick={() => setQuantity((prev) => Math.min(MAX_QUANTITY_PER_VARIANT, prev + 1))}
                    className="grid h-11 w-11 place-items-center rounded-r-full text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-300 sm:h-12 sm:w-12"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {quantity >= MAX_QUANTITY_PER_VARIANT ? (
                  <p className="text-right text-xs text-yellow-300">
                    Maximum {MAX_QUANTITY_PER_VARIANT} pieces per size/color
                  </p>
                ) : null}
              </div>

              <Button
                onClick={addToCart}
                disabled={product.variants?.length > 0 && !selectedVariantId}
                className="h-11 w-full min-w-0 overflow-hidden rounded-2xl text-sm sm:h-12"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Add to Cart
              </Button>

              <Button
                type="button"
                onClick={toggleWishlist}
                variant="outline"
                className="h-11 w-full min-w-0 overflow-hidden rounded-2xl text-sm sm:h-12"
              >
                <Heart className="mr-2 h-4 w-4" />
                Add to Wishlist
              </Button>
            </div>

            <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-xs leading-5 text-yellow-100 sm:mt-6 sm:p-4 sm:text-sm">
              Final delivery time and shipping charges are calculated during checkout.
            </div>
          </div>
        </section>

        <ProductInfoTabs product={product} />

        <ReviewsSection
          product={product}
          currentUser={user}
          isAuthenticated={isAuthenticated}
          reviews={reviews}
          setReviews={setReviews}
          showToast={showToast}
        />

        <SimilarProducts
          products={similarProducts}
          customerRegion={customerRegion}
          onOpen={(item) => navigate(`/products/${item.slug}`)}
        />
      </main>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        loading={cartLoading}
        onIncrease={(item) => updateCartQuantity(item, Number(item.quantity || 1) + 1)}
        onDecrease={(item) => updateCartQuantity(item, Number(item.quantity || 1) - 1)}
        onRemove={removeCartItem}
        onCheckout={async () => {
          const latestCart = await refreshCart();

          if (!latestCart.length) {
            showToast("error", "Your cart is empty.");
            return;
          }

          setCheckoutCartItems(latestCart);
          setCheckoutOpen(true);
        }}
        customerRegion={customerRegion}
      />

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        loading={checkoutLoading}
        onSubmit={handleCheckoutSubmit}
        customerRegion={customerRegion}
        cartItems={checkoutCartItems}
      />

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />

      <ToastViewport toast={toast} />
    </div>
  );
}

function ProductDetailsHeader({ user, cartCount, onHome, onCartOpen, onLogout }) {
  return (
    <header className="fixed left-0 right-0 top-0 z-[999] border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
        <button type="button" onClick={onHome} className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-black shadow-[0_0_35px_rgba(34,197,94,0.45)] ring-1 ring-green-500/20 sm:h-12 sm:w-12">
            <img
              src={neonLogo}
              alt="NeonStore logo"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="text-left">
            <p className="text-base font-semibold tracking-wide sm:text-lg">NeonStore</p>
            <p className="text-[11px] text-zinc-400 sm:text-xs">Premium custom store</p>
          </div>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onCartOpen}
            className="relative rounded-2xl border border-white/10 bg-white/5 p-2.5 text-zinc-300 transition hover:bg-white/10 hover:text-white sm:p-3"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-green-500 text-[10px] font-semibold text-black">
              {cartCount}
            </span>
          </button>

          {user ? (
            <>
              <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 sm:flex">
                <User className="h-4 w-4 text-green-300" />
                <span className="max-w-32 truncate">{user.fullName}</span>
              </div>

              <Button variant="outline" className="rounded-2xl px-4" onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}


function MobileVariantPicker({
  product,
  availableColors,
  selectedColor,
  sizeVariants,
  selectedVariantId,
  customerRegion,
  onColorSelect,
  onVariantSelect,
}) {
  if (!product?.variants?.length) return null;

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl lg:hidden">
      {availableColors.length > 0 ? (
        <div className="min-w-0">
          <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
            <p className="shrink-0 text-sm font-semibold text-white">Color</p>
            {selectedColor ? (
              <p className="min-w-0 truncate text-xs text-zinc-400">{selectedColor}</p>
            ) : null}
          </div>

          <div className="-mx-4 flex max-w-[calc(100%+32px)] gap-2 overflow-x-auto px-4 pb-2">
            {availableColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onColorSelect(color)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${selectedColor === color
                  ? "border-green-400 bg-green-500 text-black"
                  : "border-white/10 bg-white/5 text-zinc-300"
                  }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className={availableColors.length > 0 ? "mt-5 min-w-0" : "min-w-0"}>
        <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
          <p className="shrink-0 text-sm font-semibold text-white">Size</p>
          <p className="min-w-0 truncate text-xs text-zinc-500">Select before adding to cart</p>
        </div>

        <div className="-mx-4 flex max-w-[calc(100%+32px)] gap-2 overflow-x-auto px-4 pb-2">
          {sizeVariants.map((variant) => {
            const variantId = variantIdForRegion(variant, customerRegion);

            return (
              <button
                key={variantId}
                type="button"
                onClick={() => onVariantSelect(variant)}
                className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${selectedVariantId === variantId
                    ? "border-green-400 bg-green-500 text-black"
                    : "border-white/10 bg-black/30 text-zinc-200"
                  }`}
              >
                {variant.size || variant.title}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TrustCard({ icon, title }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/30 p-3 sm:p-4">
      <div className="text-green-300">{icon}</div>
      <p className="mt-2 min-w-0 break-words text-[11px] font-medium leading-4 sm:text-sm">
        {title}
      </p>
    </div>
  );
}

function ProductInfoTabs({ product }) {
  const details = [
    ["Material", product.material || "Premium print-on-demand material"],
    ["Fit / Type", product.fit || product.productType || "Standard product fit"],
    ["Print", product.printType || "High quality digital print"],
    ["Category", product.categoryName || product.sectionName || product.category || "Product"],
    ["Subcategory", product.subCategoryName || product.subCategory || "General"],
  ];

  return (
    <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 sm:mt-10 sm:rounded-[32px] sm:p-6">
      <h2 className="text-xl font-semibold sm:text-2xl">Product details</h2>

      {product.longDescription ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 sm:mt-6">
          <p className="text-sm text-zinc-500">Description</p>
          <p className="mt-2 min-w-0 break-words text-sm leading-6 text-zinc-300 sm:text-base sm:leading-7">
            {product.longDescription}
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-1 text-zinc-200">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReviewsSection({
  product,
  currentUser,
  isAuthenticated,
  reviews,
  setReviews,
  showToast,
}) {
  const [form, setForm] = useState({
    rating: 5,
    title: "",
    comment: "",
  });

  const [editingReview, setEditingReview] = useState(null);
  const [saving, setSaving] = useState(false);

  const productId = productIdOf(product);

  const myReview = useMemo(() => {
    if (!currentUser) return null;
    return reviews.find((review) => review.userId === currentUser.id || review.userId === currentUser._id);
  }, [reviews, currentUser]);

  const resetForm = () => {
    setEditingReview(null);
    setForm({
      rating: 5,
      title: "",
      comment: "",
    });
  };

  const startEdit = (review) => {
    setEditingReview(review);
    setForm({
      rating: review.rating || 5,
      title: review.title || "",
      comment: review.comment || "",
    });
  };

  const submitReview = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      showToast("error", "Please login to review this product.");
      return;
    }

    if (form.comment.trim().length < 5) {
      showToast("error", "Review must be at least 5 characters.");
      return;
    }

    try {
      setSaving(true);

      if (editingReview) {
        const updated = await storefrontApi.updateReview(editingReview.id || editingReview._id, {
          rating: Number(form.rating),
          title: form.title.trim(),
          comment: form.comment.trim(),
        });

        setReviews((prev) =>
          prev.map((item) =>
            (item.id || item._id) === (updated.id || updated._id) ? updated : item
          )
        );

        showToast("success", "Review updated.");
      } else {
        const created = await storefrontApi.createReview(productId, {
          rating: Number(form.rating),
          title: form.title.trim(),
          comment: form.comment.trim(),
        });

        setReviews((prev) => [created, ...prev]);
        showToast("success", "Review added.");
      }

      resetForm();
    } catch (err) {
      console.error(err);
      showToast("error", err.message || "Could not save review.");
    } finally {
      setSaving(false);
    }
  };

  const deleteReview = async (review) => {
    try {
      setSaving(true);

      await storefrontApi.deleteReview(review.id || review._id);

      setReviews((prev) =>
        prev.filter((item) => (item.id || item._id) !== (review.id || review._id))
      );

      showToast("success", "Review deleted.");
      resetForm();
    } catch (err) {
      console.error(err);
      showToast("error", err.message || "Could not delete review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 sm:mt-10 sm:rounded-[32px] sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-green-300">Reviews</p>
          <h2 className="mt-2 text-2xl font-semibold">Customer feedback</h2>
        </div>

        <p className="text-sm text-zinc-400">
          {reviews.length} review{reviews.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={submitReview} className="rounded-3xl border border-white/10 bg-black/30 p-5">
          <h3 className="text-lg font-semibold">
            {editingReview ? "Edit your review" : "Write a review"}
          </h3>

          {!isAuthenticated ? (
            <p className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
              Please login to add a review.
            </p>
          ) : myReview && !editingReview ? (
            <p className="mt-4 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-100">
              You already reviewed this product. Edit or delete your existing review below.
            </p>
          ) : (
            <>
              <label className="mt-4 block text-sm text-zinc-300">Rating</label>
              <select
                value={form.rating}
                onChange={(e) => setForm((prev) => ({ ...prev, rating: e.target.value }))}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/40 px-4 text-white outline-none"
              >
                <option className="bg-black" value={5}>5 - Excellent</option>
                <option className="bg-black" value={4}>4 - Good</option>
                <option className="bg-black" value={3}>3 - Average</option>
                <option className="bg-black" value={2}>2 - Poor</option>
                <option className="bg-black" value={1}>1 - Bad</option>
              </select>

              <label className="mt-4 block text-sm text-zinc-300">Title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Short review title"
                className="mt-2 h-12 rounded-2xl border border-white/10 bg-black/40 text-white placeholder:text-zinc-500"
              />

              <label className="mt-4 block text-sm text-zinc-300">Comment</label>
              <textarea
                value={form.comment}
                onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))}
                placeholder="Share your experience..."
                rows={5}
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white outline-none placeholder:text-zinc-500"
              />

              <div className="mt-5 flex gap-3">
                <Button disabled={saving} className="flex-1 rounded-2xl">
                  {saving ? "Saving..." : editingReview ? "Update Review" : "Post Review"}
                </Button>

                {editingReview ? (
                  <Button type="button" variant="outline" onClick={resetForm} className="rounded-2xl">
                    Cancel
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </form>

        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-black/30 p-8 text-center">
              <MessageCircle className="mx-auto h-8 w-8 text-green-300" />
              <p className="mt-3 font-medium">No reviews yet</p>
              <p className="mt-1 text-sm text-zinc-400">Be the first to review this product.</p>
            </div>
          ) : (
            reviews.map((review) => {
              const isMine =
                currentUser &&
                (review.userId === currentUser.id || review.userId === currentUser._id);

              return (
                <div key={review.id || review._id} className="rounded-3xl border border-white/10 bg-black/30 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{review.userName || "Customer"}</p>
                      <div className="mt-1 flex items-center gap-1 text-green-300">
                        <Star className="h-4 w-4 fill-green-400" />
                        {review.rating}
                      </div>
                    </div>

                    {isMine ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(review)}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteReview(review)}
                          className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {review.title ? <p className="mt-3 font-medium">{review.title}</p> : null}
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{review.comment}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

function SimilarProducts({ products, customerRegion, onOpen }) {
  if (!products || products.length === 0) return null;

  return (
    <section className="mt-8 sm:mt-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Similar products</h2>
          <p className="mt-1 text-xs text-zinc-400 sm:mt-2 sm:text-sm">
            More products from similar category or design style.
          </p>
        </div>

        <p className="text-xs text-zinc-500 sm:hidden">Swipe</p>
      </div>

      <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
        {products.slice(0, 8).map((product) => {
          const { displayCurrency, displayPrice } = getProductDisplayPricing(
            product,
            customerRegion
          );

          return (
            <button
              key={productIdOf(product)}
              type="button"
              onClick={() => onOpen(product)}
              className="group flex w-[46vw] max-w-[210px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] text-left transition hover:border-green-500/30 sm:w-auto sm:max-w-none sm:rounded-[28px]"
            >
              <img
                src={getImages(product)[0]}
                alt={product.name}
                className="h-40 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-64"
              />

              <div className="flex flex-1 flex-col p-3 sm:p-5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-green-300 sm:text-xs sm:tracking-[0.2em]">
                  {product.categoryName || product.category || "Product"}
                </p>

                <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug sm:text-base">
                  {product.name}
                </h3>

                <p className="mt-auto pt-3 text-lg font-semibold sm:text-xl">
                  {formatMoney(displayPrice, displayCurrency)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ToastViewport({ toast }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          className={`fixed left-3 right-3 top-20 z-[140] flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl sm:left-auto sm:right-4 sm:top-6 sm:max-w-sm ${toast.type === "success"
            ? "border-green-500/30 bg-green-500/15 text-green-100"
            : "border-red-500/30 bg-red-500/15 text-red-100"
            }`}
        >
          <CheckCircle2 className="h-5 w-5 text-green-300" />
          <p className="text-sm font-medium">{toast.message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.12),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(34,197,94,0.08),_transparent_20%),linear-gradient(to_bottom,_#050805,_#040604_40%,_#020302)]" />

      <motion.div
        animate={{ x: [0, 40, 0], y: [0, -20, 0] }}
        transition={{ repeat: Infinity, duration: 18, ease: "easeInOut" }}
        className="absolute left-[8%] top-[8%] h-72 w-72 rounded-full bg-green-500/10 blur-3xl"
      />

      <motion.div
        animate={{ x: [0, -50, 0], y: [0, 30, 0] }}
        transition={{ repeat: Infinity, duration: 22, ease: "easeInOut" }}
        className="absolute bottom-[10%] right-[8%] h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl"
      />
    </div>
  );
}