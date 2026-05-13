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

  const images = useMemo(() => getImages(product), [product]);
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
  }, [product, selectedVariantId]);

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

  const refreshCart = async () => {
    if (!isAuthenticated) {
      setCartItems([]);
      return [];
    }

    try {
      setCartLoading(true);

      const cart = await storefrontApi.getCart();
      const safeCart = normalizeCartResponse(cart);

      setCartItems(safeCart);

      return safeCart;
    } catch (err) {
      console.error(err);
      showToast("error", "Could not load cart.");
      return [];
    } finally {
      setCartLoading(false);
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

    try {
      await storefrontApi.updateCartItem(item.id, nextQuantity);
      await refreshCart();
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to update cart.");
    }
  };

  const removeCartItem = async (id) => {
    try {
      await storefrontApi.removeCartItem(id);
      await refreshCart();
      showToast("success", "Item removed from cart.");
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to remove item.");
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
      showToast("error", "Please login to add product to cart.");
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
    <div className="min-h-screen bg-[#050805] text-white">
      <AnimatedBackground />

      <ProductDetailsHeader
        user={user}
        cartCount={cartCount}
        onHome={() => navigate("/")}
        onCartOpen={openCart}
        onLogout={logout}
      />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="grid gap-4 lg:grid-cols-[90px_1fr]">
            <div className="order-2 flex gap-3 overflow-x-auto lg:order-1 lg:flex-col lg:overflow-visible">
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

            <div className="order-1 lg:order-2">
              <div
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setZoom((prev) => ({ ...prev, active: true }))}
                onMouseLeave={() => setZoom((prev) => ({ ...prev, active: false }))}
                className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04]"
              >
                <img
                  src={activeImage}
                  alt={product.name}
                  className="h-[520px] w-full object-cover"
                />

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

                <div className="absolute left-4 top-4 flex gap-2">
                  {product.featured ? (
                    <Badge className="bg-green-500 text-black">Featured</Badge>
                  ) : null}
                  {product.badge ? (
                    <Badge className="bg-white text-black">{product.badge}</Badge>
                  ) : null}
                </div>
              </div>

              <p className="mt-3 text-center text-xs text-zinc-500">
                Hover over image to zoom
              </p>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.22em] text-green-300">
              {product.categoryName || product.sectionName || product.category || "Product"}
              {product.subCategoryName ? ` / ${product.subCategoryName}` : ""}
            </p>

            <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-5xl">
              {product.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-green-500 px-3 py-1 text-sm font-semibold text-black">
                <Star className="h-4 w-4 fill-black" />
                {Number(average || 0).toFixed(1)}
              </div>
              <p className="text-sm text-zinc-400">
                {reviews.length || ratingCountOf(product)} customer reviews
              </p>
            </div>

            <div className="mt-6 flex items-end gap-3">
              <p className="text-4xl font-semibold">
                {formatMoney(displayPrice, displayCurrency)}
              </p>

              {displayCompareAt ? (
                <p className="pb-1 text-lg text-zinc-500 line-through">
                  {formatMoney(displayCompareAt, displayCurrency)}
                </p>
              ) : null}
            </div>

            <p className="mt-5 text-base leading-7 text-zinc-300">
              {product.description}
            </p>

            {product.colorway ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-500">Color / Style</p>
                <p className="mt-1 font-medium">{product.colorway}</p>
              </div>
            ) : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <TrustCard icon={<Truck className="h-5 w-5" />} title="Fast Dispatch" />
              <TrustCard icon={<ShieldCheck className="h-5 w-5" />} title="Secure Checkout" />
              <TrustCard icon={<RotateCcw className="h-5 w-5" />} title="Support Available" />
            </div>

            {product.variants?.length > 0 ? (
              <div className="mt-6 space-y-5">
                {availableColors.length > 0 ? (
                  <div>
                    <p className="mb-3 text-sm text-zinc-400">Color</p>

                    <div className="flex flex-wrap gap-2">
                      {availableColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            setSelectedColor(color);

                            const firstVariantForColor = product.variants.find(
                              (variant) => variant.enabled && variant.color === color
                            );

                            if (firstVariantForColor) {
                              setSelectedVariantId(variantIdForRegion(firstVariantForColor, customerRegion));
                            }
                          }}
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
                        onClick={() => setSelectedVariantId(variantIdForRegion(variant, customerRegion))}
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

            <div className="mt-7 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-zinc-300">Quantity</p>

                <div className="flex h-12 items-center rounded-full border border-white/10 bg-black/30">
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    className="grid h-12 w-12 place-items-center rounded-l-full text-zinc-300 transition hover:bg-white/10 hover:text-white"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <span className="min-w-12 text-center text-base font-semibold text-white">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.min(10, prev + 1))}
                    className="grid h-12 w-12 place-items-center rounded-r-full text-zinc-300 transition hover:bg-white/10 hover:text-white"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <Button
                onClick={addToCart}
                disabled={product.variants?.length > 0 && !selectedVariantId}
                className="h-12 w-full rounded-2xl"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Add to Cart
              </Button>

              <Button
                type="button"
                onClick={toggleWishlist}
                variant="outline"
                className="h-12 w-full rounded-2xl"
              >
                <Heart className="mr-2 h-4 w-4" />
                Add to Wishlist
              </Button>
            </div>

            <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
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
        onIncrease={(item) => updateCartQuantity(item, item.quantity + 1)}
        onDecrease={(item) => updateCartQuantity(item, item.quantity - 1)}
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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <button type="button" onClick={onHome} className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-black shadow-[0_0_35px_rgba(34,197,94,0.45)] ring-1 ring-green-500/20">
            <img
              src={neonLogo}
              alt="NeonStore logo"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="text-left">
            <p className="text-lg font-semibold tracking-wide">NeonStore</p>
            <p className="text-xs text-zinc-400">Premium custom store</p>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCartOpen}
            className="relative rounded-2xl border border-white/10 bg-white/5 p-3 text-zinc-300 transition hover:bg-white/10 hover:text-white"
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

function TrustCard({ icon, title }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="text-green-300">{icon}</div>
      <p className="mt-2 text-sm font-medium">{title}</p>
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
    <section className="mt-10 rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
      <h2 className="text-2xl font-semibold">Product details</h2>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
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
    <section className="mt-10 rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
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
    <section className="mt-10">
      <h2 className="text-2xl font-semibold">Similar products</h2>
      <p className="mt-2 text-sm text-zinc-400">
        More products from similar category or design style.
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.slice(0, 4).map((product) => {
          const { displayCurrency, displayPrice } = getProductDisplayPricing(
            product,
            customerRegion
          );

          return (
            <button
              key={productIdOf(product)}
              type="button"
              onClick={() => onOpen(product)}
              className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] text-left transition hover:border-green-500/30"
            >
              <img
                src={getImages(product)[0]}
                alt={product.name}
                className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"
              />

              <div className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-green-300">
                  {product.categoryName || product.category || "Product"}
                </p>

                <h3 className="mt-2 line-clamp-2 font-semibold">{product.name}</h3>

                <p className="mt-3 text-xl font-semibold">
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
          className={`fixed right-4 top-6 z-[140] flex max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${toast.type === "success"
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