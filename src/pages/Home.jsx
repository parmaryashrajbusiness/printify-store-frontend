import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  ShieldCheck,
  X,
  Filter,
  SlidersHorizontal,
  User,
  LogOut,
  Trash2,
  CheckCircle2,
  MessageCircle,
  Pencil,
  Mail,
  Phone,
  Send,
  ClipboardList,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import AuthModal from "@/components/auth/AuthModal";
import { storefrontApi } from "@/api/storefrontApi";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  formatMoney,
} from "@/utils/currency";
import { useCustomerRegion } from "@/hooks/useCustomerRegion";
import { getProductDisplayPricing } from "@/utils/displayPricing";
import CartDrawer from "@/components/store/CartDrawer";
import CheckoutModal from "@/components/store/CheckoutModal";
import neonLogo from "@/assets/neon-logo.png";
import SelectField from "@/components/ui/SelectField";

const navLinks = [
  { id: "home", label: "Home" },
  { id: "featured", label: "Featured" },
  { id: "shop", label: "Shop" },
  { id: "contact", label: "Contact" },
  { id: "about", label: "Why Us" },
];

const categoryMeta = {
  tshirts: { label: "T-Shirts", icon: "✦" },
  hoodie: { label: "Hoodies", icon: "⬢" },
  hoodies: { label: "Hoodies", icon: "⬢" },
  mugs: { label: "Mugs", icon: "◉" },
  posters: { label: "Posters", icon: "▣" },
  "phone-cases": { label: "Phone Cases", icon: "⌁" },
};

const SECTION_PRODUCT_LIMIT = 8;

const defaultCategoryMeta = {
  label: "Products",
  icon: "✦",
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

function productIdOf(product) {
  return product?.id || product?._id;
}

function ratingOf(product) {
  return Number(product?.ratingAverage ?? product?.averageRating ?? product?.rating ?? 0);
}

function ratingCountOf(product) {
  return Number(product?.ratingCount ?? product?.reviewCount ?? product?.reviews ?? 0);
}

function categorySlugOf(product) {
  return product?.categorySlug || product?.sectionSlug || product?.category || "";
}

function categoryNameOf(product) {
  const slug = categorySlugOf(product);
  return (
    product?.categoryName ||
    product?.sectionName ||
    categoryMeta[slug]?.label ||
    product?.category ||
    "Product"
  );
}

function categoryIconOf(product) {
  const slug = categorySlugOf(product);
  return categoryMeta[slug]?.icon || defaultCategoryMeta.icon;
}

function buildSectionKey(product) {
  return categorySlugOf(product) || "other";
}

function buildSectionLabel(product) {
  return categoryNameOf(product) || "Other Products";
}

function matchesSearch(product, query) {
  const q = String(query || "").trim().toLowerCase();

  if (!q) return true;

  const searchable = [
    product?.name,
    product?.title,
    product?.description,
    product?.category,
    product?.categoryName,
    product?.sectionName,
    product?.subCategory,
    product?.subCategoryName,
    product?.subcategoryName,
    product?.colorway,
    product?.badge,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes(q);
}

function subCategorySlugOf(product) {
  return product?.subCategorySlug || product?.subcategorySlug || product?.subCategory || product?.subcategory || "";
}

function subCategoryNameOf(product) {
  return product?.subCategoryName || product?.subcategoryName || product?.subCategory || product?.subcategory || "";
}

function priceOf(product) {
  return Number(product?.price || 0);
}

function getProductImage(product) {
  if (Array.isArray(product?.images) && product.images.length > 0) {
    return product.images[0];
  }

  if (Array.isArray(product?.imageUrls) && product.imageUrls.length > 0) {
    return product.imageUrls[0];
  }

  return product?.imageUrl || product?.image || "";
}

function getWishlistProductId(item) {
  return (
    item?.productId ||
    item?.product?.id ||
    item?.product?._id ||
    item?.id ||
    item?._id
  );
}

function normalizeWishlistItems(wishlist, allProducts) {
  const productMap = new Map();

  allProducts.forEach((product) => {
    const id = String(productIdOf(product) || "");
    if (id) productMap.set(id, product);
  });

  const unique = new Map();

  wishlist.forEach((item) => {
    const productId = String(item?.productId || item?.product?.id || item?.product?._id || "");

    const product = item?.product || productMap.get(productId);

    if (!product) return;

    unique.set(productId, {
      ...product,
      wishlistProductId: productId,
    });
  });

  return Array.from(unique.values());
}

function normalizeCartResponse(cart) {
  if (Array.isArray(cart)) return cart;

  if (Array.isArray(cart?.items)) return cart.items;

  if (Array.isArray(cart?.cartItems)) return cart.cartItems;

  if (Array.isArray(cart?.data)) return cart.data;

  if (Array.isArray(cart?.content)) return cart.content;

  return [];
}

export default function Home() {
  const { user, isAuthenticated, logout, authLoading } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSubCategory, setActiveSubCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [liked, setLiked] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [sortBy, setSortBy] = useState("featured");
  const [showFilters, setShowFilters] = useState(false);

  const [sections, setSections] = useState([]);
  const [products, setProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingStore, setLoadingStore] = useState(true);
  const [storeError, setStoreError] = useState("");

  const [cartItems, setCartItems] = useState([]);
  const [checkoutCartItems, setCheckoutCartItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [wishlistItems, setWishlistItems] = useState([]);

  const [cartLoading, setCartLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [reviewProduct, setReviewProduct] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const navigate = useNavigate();
  const { customerRegion, changeRegion } = useCustomerRegion();

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setReviewProduct(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    async function loadBaseHomeData() {
      try {
        setStoreError("");
        const [homeData, featured] = await Promise.all([
          storefrontApi.getHomeSections(),
          storefrontApi.getFeaturedProducts(),
        ]);

        setSections(homeData?.sections || []);
        setFeaturedProducts(featured || homeData?.featuredProducts || []);
      } catch (err) {
        setStoreError(err.message || "Could not load store.");
      }
    }

    loadBaseHomeData();
  }, []);

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoadingStore(true);
        setStoreError("");

        const data = await storefrontApi.getProducts({
          category: activeCategory,
          subCategory: activeSubCategory,
          search,
          sort: sortBy,
        });

        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        setStoreError(err.message || "Could not load products.");
      } finally {
        setLoadingStore(false);
      }
    }

    const timer = setTimeout(loadProducts, 250);
    return () => clearTimeout(timer);
  }, [activeCategory, activeSubCategory, search, sortBy, refreshToken]);

  useEffect(() => {
    if (!isAuthenticated) {
      setCartCount(0);
      setLiked([]);
      setCartItems([]);
      return;
    }

    async function loadPrivateData() {
      try {
        const [cart, wishlist] = await Promise.all([
          storefrontApi.getCart(),
          storefrontApi.getWishlist(),
        ]);

        const safeCart = normalizeCartResponse(cart);

        setCartItems(safeCart);
        setCartCount(
          safeCart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
        );
        setLiked(Array.isArray(wishlist) ? wishlist.map((item) => item.productId) : []);
      } catch {
        setCartCount(0);
        setCartItems([]);
        setLiked([]);
      }
    }

    loadPrivateData();
  }, [isAuthenticated]);

  const visibleSections = useMemo(() => sections.filter((s) => s.visible !== false), [sections]);

  const categoryChips = useMemo(() => {
    const fromSections = visibleSections.map((s) => ({
      id: s.slug || s.id,
      label: s.name,
    }));

    const fromProducts = products
      .map((p) => ({
        id: categorySlugOf(p),
        label: categoryNameOf(p),
      }))
      .filter((c) => c.id);

    const merged = [...fromSections, ...fromProducts];
    const unique = new Map();

    merged.forEach((item) => {
      if (!unique.has(item.id)) unique.set(item.id, item);
    });

    return [{ id: "all", label: "All" }, ...Array.from(unique.values())];
  }, [visibleSections, products]);

  const subCategoryChips = useMemo(() => {
    const data = products
      .filter((p) => activeCategory === "all" || categorySlugOf(p) === activeCategory)
      .map((p) => ({
        id: subCategorySlugOf(p),
        label: subCategoryNameOf(p),
      }))
      .filter((item) => item.id && item.label);

    const unique = new Map();
    data.forEach((item) => {
      if (!unique.has(item.id)) unique.set(item.id, item);
    });

    return [{ id: "all", label: "All Designs" }, ...Array.from(unique.values())];
  }, [products, activeCategory]);

  const visibleProducts = useMemo(() => {
    let data = [...products];

    data = data.filter((product) => {
      const categoryMatch =
        activeCategory === "all" || categorySlugOf(product) === activeCategory;

      const subCategoryMatch =
        activeSubCategory === "all" || subCategorySlugOf(product) === activeSubCategory;

      const searchMatch = matchesSearch(product, search);

      return categoryMatch && subCategoryMatch && searchMatch;
    });

    if (sortBy === "lowToHigh") {
      data.sort((a, b) => priceOf(a) - priceOf(b));
    } else if (sortBy === "highToLow") {
      data.sort((a, b) => priceOf(b) - priceOf(a));
    } else if (sortBy === "rating") {
      data.sort((a, b) => ratingOf(b) - ratingOf(a));
    } else {
      data.sort((a, b) => {
        const featuredDiff = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
        if (featuredDiff !== 0) return featuredDiff;

        const ratingDiff = ratingOf(b) - ratingOf(a);
        if (ratingDiff !== 0) return ratingDiff;

        return ratingCountOf(b) - ratingCountOf(a);
      });
    }

    return data;
  }, [products, activeCategory, activeSubCategory, search, sortBy]);

  const productSections = useMemo(() => {
    const groups = new Map();

    visibleProducts.forEach((product) => {
      const key = buildSectionKey(product);

      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          label: buildSectionLabel(product),
          icon: categoryIconOf(product),
          products: [],
        });
      }

      groups.get(key).products.push(product);
    });

    return Array.from(groups.values()).sort((a, b) => {
      const aCount = a.products.length;
      const bCount = b.products.length;

      if (bCount !== aCount) return bCount - aCount;

      return a.label.localeCompare(b.label);
    });
  }, [visibleProducts]);

  const sectionQuickLinks = useMemo(() => {
    return productSections.map((section) => ({
      id: section.id,
      label: section.label,
      icon: section.icon,
      count: section.products.length,
    }));
  }, [productSections]);

  const topPickProducts = useMemo(() => {
    const source = featuredProducts.length > 0 ? featuredProducts : products;

    return [...source]
      .filter((product) => product?.status == null || product.status === "ACTIVE")
      .sort((a, b) => {
        const ratingDiff = ratingOf(b) - ratingOf(a);
        if (ratingDiff !== 0) return ratingDiff;

        return ratingCountOf(b) - ratingCountOf(a);
      })
      .slice(0, 4);
  }, [featuredProducts, products]);

  const stats = useMemo(() => {
    const totalReviews = products.reduce((sum, p) => sum + ratingCountOf(p), 0);
    const weightedRatingSum = products.reduce(
      (sum, p) => sum + ratingOf(p) * ratingCountOf(p),
      0
    );

    const avg = totalReviews > 0 ? (weightedRatingSum / totalReviews).toFixed(1) : "0.0";

    return {
      avg,
      totalReviews,
      products: products.length,
      categories: categoryChips.length > 0 ? categoryChips.length - 1 : 0,
    };
  }, [products, categoryChips]);

  const handleRegionChange = (countryCode) => {
    changeRegion(countryCode);
  };

  const openLogin = () => {
    setAuthMode("login");
    setAuthModalOpen(true);
  };

  const openRegister = () => {
    setAuthMode("register");
    setAuthModalOpen(true);
  };

  const showToast = (type, message) => {
    setToast({ id: Date.now(), type, message });
    setTimeout(() => setToast(null), 2500);
  };

  const toggleLike = async (productId) => {
    if (!isAuthenticated) {
      openLogin();
      return;
    }

    try {
      await storefrontApi.toggleWishlist(productId);
      setLiked((prev) =>
        prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
      );
    } catch (err) {
      console.error(err);
      showToast("error", "Could not update wishlist.");
    }
  };

  const addToCart = async (productId) => {
    if (!isAuthenticated) {
      openLogin();
      return;
    }

    try {
      await storefrontApi.addToCart({ productId, quantity: 1 });
      await refreshCart();
      showToast("success", "Product added to cart.");
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to add product.");
    }
  };

  const updateCartQuantity = async (item, nextQuantity) => {
    if (nextQuantity < 1) return;

    try {
      await storefrontApi.updateCartItem(item.id, nextQuantity);
      await refreshCart();
    } catch (err) {
      console.error(err);
      showToast("error", "Could not update quantity.");
    }
  };

  const removeCartItem = async (itemId) => {
    try {
      await storefrontApi.removeCartItem(itemId);
      await refreshCart();
      showToast("success", "Item removed from cart.");
    } catch (err) {
      console.error(err);
      showToast("error", "Could not remove item.");
    }
  };

  const openCart = () => {
    if (!isAuthenticated) {
      openLogin();
      return;
    }

    setCartOpen(true);
    refreshCart();
  };

  const openWishlist = async () => {
    if (!isAuthenticated) {
      openLogin();
      return;
    }

    try {
      const [wishlist, allProducts] = await Promise.all([
        storefrontApi.getWishlist(),
        storefrontApi.getProducts({}),
      ]);

      const normalized = normalizeWishlistItems(
        Array.isArray(wishlist) ? wishlist : [],
        Array.isArray(allProducts) ? allProducts : []
      );

      setWishlistItems(normalized);
      setLiked(normalized.map((p) => p.wishlistProductId));
      setWishlistOpen(true);
    } catch (err) {
      console.error(err);
      showToast("error", "Could not load wishlist.");
    }
  };

  const refreshCart = async () => {
    if (!isAuthenticated) {
      setCartItems([]);
      setCartCount(0);
      return [];
    }

    try {
      setCartLoading(true);

      const cart = await storefrontApi.getCart();

      const safeCart = normalizeCartResponse(cart);

      setCartItems(safeCart);
      setCartCount(
        safeCart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      );

      return safeCart;
    } catch (err) {
      console.error(err);
      showToast("error", "Could not load cart.");
      return [];
    } finally {
      setCartLoading(false);
    }
  };

  const handleCheckoutSubmit = async (form, paymentProvider) => {
    try {
      setCheckoutLoading(true);

      if (paymentProvider === "RAZORPAY") {
        const razorpayOrder = await storefrontApi.createRazorpayOrder(form);

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
            name: form.fullName,
            email: form.email,
            contact: form.phone,
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
        const paypalOrder = await storefrontApi.createPayPalOrder(form);

        if (!paypalOrder.approvalUrl) {
          showToast("error", "Could not start PayPal payment.");
          setCheckoutLoading(false);
          return;
        }

        sessionStorage.setItem(
          "paypalCheckoutShipping",
          JSON.stringify({
            ...form,
            country: form.country.toUpperCase(),
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

  const handleCategoryChange = (id) => {
    setActiveCategory(id);
    setActiveSubCategory("all");
  };

  const handleReviewChanged = async () => {
    setRefreshToken((prev) => prev + 1);

    try {
      const featured = await storefrontApi.getFeaturedProducts();
      setFeaturedProducts(featured || []);
    } catch {
      // keep old featured products if refresh fails
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050607] text-white">
      <AnimatedBackground />

      <SiteHeader
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        cartCount={cartCount}
        wishlistCount={liked.length}
        user={user}
        authLoading={authLoading}
        onLogin={openLogin}
        onRegister={openRegister}
        onLogout={logout}
        onCartOpen={openCart}
        onWishlistOpen={openWishlist}
        onTrackOrders={() => navigate("/orders/track")}
        customerRegion={customerRegion}
        onRegionChange={handleRegionChange}
      />

      <main className="relative z-10 pt-20">
        <HeroSection
          stats={stats}
          onPrimaryAction={() =>
            document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })
          }
          onSecondaryAction={() =>
            document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" })
          }
        />

        <BrandStrip />

        <section id="featured" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Top Picks"
            title="Most popular products right now"
            subtitle="Based on real user activity and ratings."
          />

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {topPickProducts.map((product) => (
              <ProductCard
                key={productIdOf(product)}
                product={product}
                customerRegion={customerRegion}
                onLike={toggleLike}
                liked={liked.includes(productIdOf(product))}
                onAddToCart={() => addToCart(productIdOf(product))}
                onOpenReviews={() => setReviewProduct(product)}
                onOpenProduct={() => navigate(`/products/${product.slug}`)}
              />
            ))}
          </div>
        </section>

        <section id="shop" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Shop by Category"
            title="Browse products made for your style"
            subtitle="Explore products by category, filter by design, and review the final price before secure checkout."
          />

          <div className="mb-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl md:p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search T-shirts, mugs, stickers, coding designs..."
                  className="h-14 rounded-2xl border border-white/10 bg-black/40 pl-12 pr-4 text-base text-white placeholder:text-zinc-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowFilters((prev) => !prev)}
                  className="inline-flex h-14 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm text-zinc-200 transition hover:bg-white/10"
                >
                  <Filter className="h-4 w-4" />
                  Design Filters
                </button>

                <div className="flex h-14 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4">
                  <SlidersHorizontal className="h-4 w-4 text-zinc-400" />

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent text-sm text-zinc-200 outline-none"
                  >
                    <option className="bg-black" value="featured">
                      Featured
                    </option>
                    <option className="bg-black" value="lowToHigh">
                      Price: Low to High
                    </option>
                    <option className="bg-black" value="highToLow">
                      Price: High to Low
                    </option>
                    <option className="bg-black" value="rating">
                      Highest Rated
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("all");
                  setActiveSubCategory("all");
                  document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`shrink-0 rounded-2xl border px-4 py-3 text-sm transition ${activeCategory === "all"
                  ? "border-green-400/70 bg-green-400 text-black"
                  : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                  }`}
              >
                All Products
                <span className="ml-2 text-xs opacity-70">({products.length})</span>
              </button>

              {sectionQuickLinks.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(section.id);
                    setActiveSubCategory("all");
                    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`shrink-0 rounded-2xl border px-4 py-3 text-sm transition ${activeCategory === section.id
                    ? "border-green-400/70 bg-green-400 text-black"
                    : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                    }`}
                >
                  <span className="mr-2">{section.icon}</span>
                  {section.label}
                  <span className="ml-2 text-xs opacity-70">({section.count})</span>
                </button>
              ))}
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 border-t border-white/10 pt-5">

                    <p className="mb-3 text-xs uppercase tracking-[0.2em] text-green-300">
                      Design / Style
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {subCategoryChips.map((chip) => (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => setActiveSubCategory(chip.id)}
                          className={`rounded-full px-4 py-2 text-sm transition ${activeSubCategory === chip.id
                            ? "bg-green-500 text-black"
                            : "bg-white/5 text-zinc-300 hover:bg-white/10"
                            }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-zinc-400">
                Showing {visibleProducts.length} of {products.length} products
              </p>

              <h3 className="mt-1 text-2xl font-semibold text-white">
                {activeCategory === "all"
                  ? "Shop all categories"
                  : categoryChips.find((c) => c.id === activeCategory)?.label || "Products"}
              </h3>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
              {search ? (
                <span className="rounded-full border border-green-400/20 bg-green-400/10 px-3 py-2 text-green-200">
                  Search: {search}
                </span>
              ) : null}

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                Sort: {sortBy}
              </span>
            </div>
          </div>

          {loadingStore ? (
            <LoadingBox />
          ) : storeError ? (
            <ErrorPanel message={storeError} />
          ) : visibleProducts.length === 0 ? (
            <EmptyState
              title="No products found"
              subtitle="Try another keyword, category, or design filter."
            />
          ) : (
            <div className="space-y-14">
              {productSections.map((section) => (
                <ProductSection
                  key={section.id}
                  section={section}
                  customerRegion={customerRegion}
                  liked={liked}
                  onLike={toggleLike}
                  onAddToCart={addToCart}
                  onOpenReviews={(product) => setReviewProduct(product)}
                  onOpenProduct={(product) => navigate(`/products/${product.slug}`)}
                />
              ))}
            </div>
          )}
        </section>

        <ContactSection showToast={showToast} />

        <section id="about" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Why Choose Us"
            title="Built for real orders, genuine reviews, and a seamless shopping experience."
            subtitle="Shop real products with trusted reviews, smart filters, and seamless checkout."
          />
          <WhyUsGrid />
        </section>
      </main>

      <SiteFooter />

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />

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

      <WishlistDrawer
        open={wishlistOpen}
        onClose={() => setWishlistOpen(false)}
        items={wishlistItems}
        customerRegion={customerRegion}
        onOpenProduct={(product) => {
          if (!product?.slug) {
            showToast("error", "Product details are not available.");
            return;
          }

          setWishlistOpen(false);
          navigate(`/products/${product.slug}`);
        }}
        onRemove={async (productId) => {
          await storefrontApi.toggleWishlist(productId);

          const [wishlist, allProducts] = await Promise.all([
            storefrontApi.getWishlist(),
            storefrontApi.getProducts({}),
          ]);

          const normalized = normalizeWishlistItems(
            Array.isArray(wishlist) ? wishlist : [],
            Array.isArray(allProducts) ? allProducts : []
          );

          setWishlistItems(normalized);
          setLiked(normalized.map((p) => p.wishlistProductId));
        }}
      />

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onSubmit={handleCheckoutSubmit}
        loading={checkoutLoading}
        customerRegion={customerRegion}
        cartItems={checkoutCartItems}
      />

      <ReviewModal
        product={reviewProduct}
        open={Boolean(reviewProduct)}
        onClose={() => setReviewProduct(null)}
        isAuthenticated={isAuthenticated}
        currentUser={user}
        onLogin={openLogin}
        showToast={showToast}
        onChanged={handleReviewChanged}
      />

      <ToastViewport toast={toast} />
    </div>
  );
}

function SiteHeader({
  menuOpen,
  setMenuOpen,
  cartCount,
  wishlistCount,
  user,
  authLoading,
  onLogin,
  onRegister,
  onLogout,
  onCartOpen,
  onWishlistOpen,
  onTrackOrders,
  customerRegion,
  onRegionChange,
}) {

  const regionOptions = [
    {
      value: "IN",
      label: "India · INR",
    },
    {
      value: "US",
      label: "United States · USD",
    },
    {
      value: "AU",
      label: "Australia · AUD",
    },

    // Temporarily disabled until GPSR/EU compliance is ready
    // {
    //   value: "DE",
    //   label: "Germany · EUR",
    // },
    // {
    //   value: "FR",
    //   label: "France · EUR",
    // },
  ];

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a href="#home" className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
              <img
                src={neonLogo}
                alt="Neon Store logo"
                className="h-full w-full object-cover"
              />
            </div>

            <div>
              <p className="text-lg font-semibold tracking-wide">NeonStore</p>
              <p className="text-xs text-zinc-400">Wear what stands out</p>
            </div>
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="text-sm text-zinc-300 transition hover:text-green-400"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">

            <button
              onClick={onTrackOrders}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              <ClipboardList className="h-4 w-4" />
              Track Order
            </button>

            <div className="w-[170px]">
              <SelectField
                value={customerRegion?.country || "IN"}
                onChange={(value) => onRegionChange(value)}
                options={regionOptions}
                placeholder="Country"
                size="sm"
              />
            </div>

            <button
              onClick={onWishlistOpen}
              className="relative rounded-2xl border border-white/10 bg-white/5 p-3 text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              <Heart className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-green-500 text-[10px] font-semibold text-black">
                {wishlistCount}
              </span>
            </button>

            <button
              onClick={onCartOpen}
              className="relative rounded-2xl border border-white/10 bg-white/5 p-3 text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-green-500 text-[10px] font-semibold text-black">
                {cartCount}
              </span>
            </button>

            {authLoading ? null : user ? (
              <>
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200">
                  <User className="h-4 w-4 text-green-300" />
                  <span className="max-w-32 truncate">{user.fullName}</span>
                </div>
                <Button variant="outline" className="rounded-2xl px-4" onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="rounded-2xl px-4" onClick={onLogin}>
                  Login
                </Button>
                <Button className="rounded-2xl px-5" onClick={onRegister}>
                  Register
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">

            <button
              onClick={onWishlistOpen}
              className="relative rounded-2xl border border-white/10 bg-white/5 p-3 text-zinc-200"
            >
              <Heart className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-green-500 text-[10px] font-semibold text-black">
                {wishlistCount}
              </span>
            </button>

            <button
              onClick={onCartOpen}
              className="relative rounded-2xl border border-white/10 bg-white/5 p-3 text-zinc-200"
            >
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-green-500 text-[10px] font-semibold text-black">
                {cartCount}
              </span>
            </button>

            <button
              onClick={() => setMenuOpen(true)}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 text-zinc-200"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
              className="ml-auto flex h-full w-[88%] max-w-sm flex-col overflow-y-auto border-l border-white/10 bg-[#060906] p-4"
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">NeonStore</p>
                  <p className="text-xs text-zinc-400">Wear what stands out</p>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="rounded-2xl border border-white/10 bg-white/5 p-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-green-300">
                    Country / Currency
                  </p>

                  <SelectField
                    value={customerRegion?.country || "IN"}
                    onChange={(value) => onRegionChange(value)}
                    options={regionOptions}
                    placeholder="Country"
                    size="sm"
                  />
                </div>

                {user ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-zinc-200">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-green-500/10 text-green-300 ring-1 ring-green-500/20">
                      <User className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {user.fullName || user.email}
                      </p>
                      <p className="truncate text-[11px] text-zinc-500">
                        Signed in
                      </p>
                    </div>
                  </div>
                ) : null}

                {navLinks.map((link) => (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200"
                  >
                    {link.label}
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                  </a>
                ))}

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onTrackOrders();
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200"
                >
                  Track Order
                  <ChevronRight className="h-4 w-4 text-zinc-500" />
                </button>
              </div>

              <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                <Button
                  className="w-full rounded-2xl"
                  onClick={() => {
                    setMenuOpen(false);
                    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Shop Now
                </Button>

                {!user ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full rounded-2xl"
                      onClick={() => {
                        setMenuOpen(false);
                        onLogin();
                      }}
                    >
                      Login
                    </Button>

                    <Button
                      className="w-full rounded-2xl"
                      onClick={() => {
                        setMenuOpen(false);
                        onRegister();
                      }}
                    >
                      Register
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function HeroSection({ onPrimaryAction, onSecondaryAction, stats }) {
  return (
    <section id="home" className="relative mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 lg:px-8 lg:pt-16">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.div
            variants={fadeUp}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm text-green-300"
          >
            <ShieldCheck className="h-4 w-4" />
            Made-to-order products · Secure checkout · Clear order tracking
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl"
          >
            Custom apparel and accessories made for everyday style
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-5 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg"
          >
            Shop made-to-order T-shirts, stickers, mugs, and accessories with clear pricing,
            secure payment, and order tracking from checkout to delivery.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Button className="h-12 rounded-2xl px-6" onClick={onPrimaryAction}>
              Shop Collection <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-12 rounded-2xl px-6" onClick={onSecondaryAction}>
              View Featured
            </Button>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8 grid gap-3 sm:grid-cols-3">
            <MiniStat label="Products" value={stats.products} />
            <MiniStat label="Reviews" value={stats.totalReviews} />
            <MiniStat label="Rating" value={`${stats.avg}/5`} />
          </motion.div>
        </motion.div>

        <HeroVisual />
      </div>
    </section>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-green-300">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative"
    >
      <div className="absolute -left-10 top-10 h-44 w-44 rounded-full bg-green-500/20 blur-3xl" />
      <div className="absolute -right-6 bottom-8 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative grid gap-4 sm:grid-cols-2">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-3 backdrop-blur-xl"
        >
          <img
            src="https://images.unsplash.com/photo-1523398002811-999ca8dec234?q=80&w=1200&auto=format&fit=crop"
            alt="featured outfit"
            className="h-[360px] w-full rounded-[22px] object-cover"
          />
        </motion.div>

        <div className="flex flex-col gap-4">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
            className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-3 backdrop-blur-xl"
          >
            <img
              src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1200&auto=format&fit=crop"
              alt="featured style"
              className="h-[170px] w-full rounded-[22px] object-cover"
            />
          </motion.div>

          <div className="rounded-[28px] border border-green-500/15 bg-[#081109] p-5 shadow-[0_0_80px_rgba(34,197,94,0.08)]">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-sm text-green-300">Customer First</p>
                <h3 className="mt-1 text-xl font-semibold">Trusted by Real Buyers</h3>
              </div>
              <Badge className="bg-green-500 text-black whitespace-nowrap">
                Top Rated
              </Badge>
            </div>

            <p className="text-sm leading-6 text-zinc-400">
              Every product is backed by genuine customer feedback, helping you choose with confidence.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BrandStrip() {
  const items = [
    "Secure Payments",
    "Made-to-Order Quality",
    "Clear Policies",
    "Order Tracking",
    "Customer Support",
    "Real Product Reviews",
  ];

  return (
    <section className="border-y border-white/10 bg-white/[0.03]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 py-5 text-sm text-zinc-400 sm:px-6 lg:px-8">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-300" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55 }}
      className="mb-10 max-w-3xl"
    >
      <p className="mb-3 text-sm font-medium uppercase tracking-[0.22em] text-green-300">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-zinc-400">{subtitle}</p>
    </motion.div>
  );
}

function ContactSection({ showToast }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: name === "mobile" ? value.replace(/\D/g, "").slice(0, 10) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.name.trim().length < 2) {
      showToast("error", "Please enter your name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      showToast("error", "Please enter a valid email.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      showToast("error", "Please enter a valid 10 digit Indian mobile number.");
      return;
    }

    if (form.message.trim().length < 10) {
      showToast("error", "Message must be at least 10 characters.");
      return;
    }

    try {
      setLoading(true);

      await storefrontApi.sendContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        message: form.message.trim(),
      });

      showToast("success", "Message sent successfully.");

      setForm({
        name: "",
        email: "",
        mobile: "",
        message: "",
      });
    } catch (err) {
      console.error(err);
      showToast("error", err.message || "Could not send message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Contact Us"
        title="Need help before or after ordering?"
        subtitle="Send us your question about sizing, shipping, payment, or an existing order. We’ll reply as soon as possible."
      />

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-green-500/10 text-green-300 ring-1 ring-green-500/20">
            <MessageCircle className="h-6 w-6" />
          </div>

          <h3 className="mt-6 text-2xl font-semibold text-white">
            Customer support
          </h3>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Use this form for product questions, payment help, order support, or policy clarification.
          </p>

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
              <Mail className="h-5 w-5 text-green-300" />
              <div>
                <p className="text-sm font-medium text-white">Easy Email Support</p>
                <p className="text-xs text-zinc-500">We’ll reply directly to your email</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
              <Phone className="h-5 w-5 text-green-300" />
              <div>
                <p className="text-sm font-medium text-white">Quick Call Support</p>
                <p className="text-xs text-zinc-500">If needed, we may give you a quick call to help faster.</p>
              </div>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl md:p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-zinc-300">Full Name</label>
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter your name"
                className="h-12 rounded-2xl border border-white/10 bg-black/40 text-white placeholder:text-zinc-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">Email</label>
              <Input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="h-12 rounded-2xl border border-white/10 bg-black/40 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm text-zinc-300">Mobile Number</label>
            <Input
              name="mobile"
              value={form.mobile}
              onChange={handleChange}
              placeholder="10 digit mobile number"
              className="h-12 rounded-2xl border border-white/10 bg-black/40 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm text-zinc-300">Message</label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Write your message..."
              rows={6}
              maxLength={1000}
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white outline-none placeholder:text-zinc-500"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="mt-5 h-12 w-full rounded-2xl"
          >
            {loading ? "Sending..." : "Send Message"}
            <Send className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </div>
    </section>
  );
}

function FeaturedBanner({ onShop }) {
  return (
    <Card className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-green-500/15 via-black to-black text-white">
      <CardContent className="grid h-full gap-8 p-0 lg:grid-cols-[1fr_0.9fr]">
        <div className="p-8 md:p-10">
          <Badge className="bg-green-500 text-black">Featured Collection</Badge>

          <h3 className="mt-5 max-w-xl text-3xl font-semibold leading-tight md:text-4xl">
            Sellable storefront with real rating and review flow
          </h3>

          <p className="mt-4 max-w-xl text-base leading-7 text-zinc-300">
            Customers can browse, filter, add to wishlist, add to cart, and leave reviews after login.
          </p>

          <div className="mt-8">
            <Button className="rounded-2xl" onClick={onShop}>
              Shop Products <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative min-h-[300px]">
          <img
            src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=1200&auto=format&fit=crop"
            alt="featured collection"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatsPanel({ stats }) {
  const items = [
    { label: "Average Rating", value: `${stats.avg}/5` },
    { label: "Reviews", value: String(stats.totalReviews) },
    { label: "Products", value: String(stats.products) },
    { label: "Categories", value: String(stats.categories) },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <Card
          key={item.label}
          className="rounded-[28px] border border-white/10 bg-white/[0.04] text-white backdrop-blur-xl"
        >
          <CardContent className="p-6">
            <p className="text-sm text-zinc-400">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProductCard({ product, customerRegion, onLike, liked, onAddToCart, onOpenReviews, onOpenProduct }) {
  const productId = productIdOf(product);
  const categoryLabel = categoryNameOf(product);
  const subLabel = subCategoryNameOf(product);
  const average = ratingOf(product);
  const count = ratingCountOf(product);

  const { displayCurrency, displayPrice, displayCompareAt } =
    getProductDisplayPricing(product, customerRegion);

  return (
    <motion.div variants={fadeUp} whileHover={{ y: -8 }} className="h-full">
      <Card className="group h-full overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.035] text-white backdrop-blur-xl transition duration-300 hover:border-white/20 hover:bg-white/[0.055]">
        <CardContent className="flex h-full flex-col p-0">
          <div
            className="relative isolate -mb-px h-72 cursor-pointer overflow-hidden bg-black [backface-visibility:hidden] [transform:translate3d(0,0,0)]"
            onClick={() => onOpenProduct?.()}
          >
            <img
              src={getProductImage(product)}
              alt={product.name}
              className="absolute -inset-px h-[calc(100%+2px)] w-[calc(100%+2px)] max-w-none origin-center transform-gpu object-cover transition-transform duration-500 ease-out will-change-transform [backface-visibility:hidden] group-hover:scale-[1.035]"
              draggable="false"
            />

            <div className="pointer-events-none absolute -inset-px bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              {product.badge ? <Badge className="bg-green-500 text-black">{product.badge}</Badge> : null}
              {product.featured ? <Badge className="bg-white text-black">Featured</Badge> : null}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike(productId);
              }}
              className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-md transition hover:scale-105"
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-green-400 text-green-400" : "text-white"}`} />
            </button>
          </div>

          <div className="relative z-10 flex flex-1 flex-col bg-[#090d09] p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-green-300">
                  {categoryLabel}
                </p>
                {subLabel ? <p className="mt-1 text-xs text-zinc-500">{subLabel}</p> : null}
              </div>

              <button
                onClick={onOpenReviews}
                className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-sm text-zinc-300 transition hover:bg-white/10"
              >
                <Star className="h-4 w-4 fill-green-400 text-green-400" />
                {average.toFixed(1)}
                <span className="text-zinc-500">({count})</span>
              </button>
            </div>

            <h3
              onClick={onOpenProduct}
              className="cursor-pointer text-xl font-semibold leading-snug text-white hover:text-green-300"
            >
              {product.name}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">{product.description}</p>
            {product.colorway ? (
              <p className="mt-3 text-xs text-zinc-500">{product.colorway}</p>
            ) : null}

            <p className="mt-3 text-xs text-zinc-500">
              Made to order · Shipping shown at checkout
            </p>

            <div className="mt-auto pt-5">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  {displayCompareAt ? (
                    <p className="text-sm text-zinc-500 line-through">
                      {formatMoney(displayCompareAt, displayCurrency)}
                    </p>
                  ) : null}

                  <p className="text-2xl font-semibold text-white">
                    {formatMoney(displayPrice, displayCurrency)}
                  </p>
                </div>

                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenProduct?.();
                  }}
                  size="sm"
                  className="min-w-[110px] rounded-full"
                >
                  {product?.variants?.length > 0 ? "Select Size" : "View Product"}
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={onOpenReviews}
                size="sm"
                className="w-full rounded-full"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Reviews
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ProductSection({
  section,
  customerRegion,
  liked,
  onLike,
  onAddToCart,
  onOpenReviews,
  onOpenProduct,
}) {
  const [showAll, setShowAll] = useState(false);

  const productsToShow = showAll
    ? section.products
    : section.products.slice(0, SECTION_PRODUCT_LIMIT);

  const hiddenCount = Math.max(section.products.length - SECTION_PRODUCT_LIMIT, 0);

  return (
    <section
      id={`section-${section.id}`}
      className="rounded-[34px] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl sm:p-5 lg:p-6"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-green-500/10 text-xl text-green-300 ring-1 ring-green-500/20">
              {section.icon}
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-green-300">
                Category
              </p>

              <h3 className="text-2xl font-semibold text-white sm:text-3xl">
                {section.label}
              </h3>
            </div>
          </div>

          <p className="mt-3 text-sm text-zinc-400">
            {section.products.length} product{section.products.length === 1 ? "" : "s"} available
          </p>
        </div>

        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-zinc-200 transition hover:bg-white/10 hover:text-white"
          >
            {showAll ? "Show Less" : `View All ${section.label}`}
            <ChevronRight className={`ml-2 h-4 w-4 transition ${showAll ? "rotate-90" : ""}`} />
          </button>
        ) : null}
      </div>

      <motion.div layout className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <AnimatePresence>
          {productsToShow.map((product) => (
            <motion.div
              layout
              key={productIdOf(product)}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.35 }}
            >
              <ProductCard
                product={product}
                customerRegion={customerRegion}
                onLike={onLike}
                liked={liked.includes(productIdOf(product))}
                onAddToCart={() => onAddToCart(productIdOf(product))}
                onOpenReviews={() => onOpenReviews(product)}
                onOpenProduct={() => onOpenProduct(product)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}

function ReviewModal({
  product,
  open,
  onClose,
  isAuthenticated,
  currentUser,
  onLogin,
  showToast,
  onChanged,
}) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingReview, setEditingReview] = useState(null);
  const [form, setForm] = useState({
    rating: 5,
    title: "",
    comment: "",
  });

  const productId = productIdOf(product);

  const myReview = useMemo(() => {
    if (!currentUser) return null;
    return reviews.find((r) => r.userId === currentUser.id || r.userId === currentUser._id);
  }, [reviews, currentUser]);

  useEffect(() => {
    if (!open || !productId) return;

    async function loadReviews() {
      try {
        setLoading(true);
        const data = await storefrontApi.getProductReviews(productId);
        setReviews(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        showToast("error", "Could not load reviews.");
      } finally {
        setLoading(false);
      }
    }

    loadReviews();
  }, [open, productId]);

  const resetForm = () => {
    setEditingReview(null);
    setForm({ rating: 5, title: "", comment: "" });
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
      onLogin();
      return;
    }

    if (!form.comment.trim() || form.comment.trim().length < 5) {
      showToast("error", "Review comment must be at least 5 characters.");
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
          prev.map((r) => ((r.id || r._id) === (updated.id || updated._id) ? updated : r))
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
      onChanged();
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
      setReviews((prev) => prev.filter((r) => (r.id || r._id) !== (review.id || review._id)));
      showToast("success", "Review deleted.");
      resetForm();
      onChanged();
    } catch (err) {
      console.error(err);
      showToast("error", err.message || "Could not delete review.");
    } finally {
      setSaving(false);
    }
  };

  if (!open || !product) return null;

  const average =
    reviews.length > 0
      ? reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length
      : ratingOf(product);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.98 }}
          className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#0a0f0a] p-6 text-white shadow-2xl"
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <img
                src={product.imageUrl || product.image}
                alt={product.name}
                className="h-20 w-20 rounded-2xl object-cover"
              />
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-green-300">
                  Product Reviews
                </p>
                <h2 className="mt-2 text-2xl font-semibold">{product.name}</h2>
                <div className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
                  <Star className="h-4 w-4 fill-green-400 text-green-400" />
                  {Number(average || 0).toFixed(1)} average · {reviews.length} review
                  {reviews.length === 1 ? "" : "s"}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 p-2 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <form
              onSubmit={submitReview}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
            >
              <h3 className="text-lg font-semibold">
                {editingReview ? "Edit your review" : "Write a review"}
              </h3>

              {!isAuthenticated ? (
                <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                  Please login to add a review.
                  <Button type="button" onClick={onLogin} className="mt-3 w-full rounded-2xl">
                    Login to Review
                  </Button>
                </div>
              ) : myReview && !editingReview ? (
                <div className="mt-4 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-100">
                  You already reviewed this product. You can edit or delete your review from the review list.
                </div>
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
                    maxLength={80}
                    className="mt-2 h-12 rounded-2xl border border-white/10 bg-black/40 text-white placeholder:text-zinc-500"
                  />

                  <label className="mt-4 block text-sm text-zinc-300">Comment</label>
                  <textarea
                    value={form.comment}
                    onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))}
                    placeholder="Share your experience with this product..."
                    maxLength={600}
                    rows={5}
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white outline-none placeholder:text-zinc-500"
                  />

                  <div className="mt-5 flex gap-3">
                    <Button type="submit" disabled={saving} className="flex-1 rounded-2xl">
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

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="text-lg font-semibold">Customer reviews</h3>

              {loading ? (
                <p className="mt-4 text-sm text-zinc-400">Loading reviews...</p>
              ) : reviews.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-5 text-center">
                  <MessageCircle className="mx-auto h-8 w-8 text-green-300" />
                  <p className="mt-3 font-medium">No reviews yet</p>
                  <p className="mt-1 text-sm text-zinc-400">Be the first customer to review this product.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {reviews.map((review) => {
                    const reviewId = review.id || review._id;
                    const isMine =
                      currentUser &&
                      (review.userId === currentUser.id || review.userId === currentUser._id);

                    return (
                      <div key={reviewId} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{review.userName || "Customer"}</p>
                              <div className="flex items-center gap-1 text-sm text-green-300">
                                <Star className="h-4 w-4 fill-green-400 text-green-400" />
                                {review.rating}
                              </div>
                            </div>
                            {review.title ? (
                              <p className="mt-2 text-sm font-medium text-white">{review.title}</p>
                            ) : null}
                          </div>

                          {isMine ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEdit(review)}
                                className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300 hover:bg-white/10"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteReview(review)}
                                className="rounded-full border border-red-500/20 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ) : null}
                        </div>

                        <p className="mt-3 text-sm leading-6 text-zinc-400">{review.comment}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function WhyUsGrid() {
  const points = [
    {
      title: "Secure Checkout",
      desc: "Pay safely using supported payment methods. Your order total is shown clearly before payment.",
      icon: <ShieldCheck className="h-5 w-5" />,
    },
    {
      title: "Made-to-Order Products",
      desc: "Each item is printed after purchase, helping reduce waste and keeping every order intentional.",
      icon: <CheckCircle2 className="h-5 w-5" />,
    },
    {
      title: "Clear Order Tracking",
      desc: "Track your order status after payment and contact support if you need help.",
      icon: <ClipboardList className="h-5 w-5" />,
    },
    {
      title: "Real Product Reviews",
      desc: "Customer reviews help shoppers choose products with more confidence.",
      icon: <Star className="h-5 w-5" />,
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {points.map((point) => (
        <motion.div
          key={point.title}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
        >
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-green-500/10 text-green-300 ring-1 ring-green-500/15">
            {point.icon}
          </div>
          <h3 className="text-xl font-semibold text-white">{point.title}</h3>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{point.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="relative z-10 mt-20 border-t border-white/10 bg-black/70 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-green-400 to-green-600 text-black">
              <img
                src={neonLogo}
                alt="Neon Store logo"
                className="h-full w-full object-cover"
              />
            </div>

            <div>
              <p className="text-lg font-semibold text-white">NeonStore</p>
              <p className="text-xs text-zinc-400">Wear what stands out</p>
            </div>
          </div>

          <p className="mt-4 max-w-md text-sm leading-6 text-zinc-400">
            Custom products printed on demand and fulfilled through trusted
            production partners. Secure checkout, clear policies, and support
            when you need help.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-300">
            Shop
          </p>

          <div className="mt-4 space-y-3 text-sm text-zinc-400">
            <a className="block transition hover:text-green-300" href="#featured">
              Featured
            </a>
            <a className="block transition hover:text-green-300" href="#shop">
              All Products
            </a>
            <a className="block transition hover:text-green-300" href="#about">
              Why Us
            </a>
            <a className="block transition hover:text-green-300" href="/orders/track">
              Track Order
            </a>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-300">
            Support & Policies
          </p>

          <div className="mt-4 space-y-3 text-sm text-zinc-400">
            <a className="block transition hover:text-green-300" href="/shipping-policy">
              Shipping Policy
            </a>

            <a className="block transition hover:text-green-300" href="/refund-policy">
              Refund Policy
            </a>

            <a className="block transition hover:text-green-300" href="/privacy-policy">
              Privacy Policy
            </a>

            <a className="block transition hover:text-green-300" href="/terms">
              Terms of Service
            </a>

            <a className="block transition hover:text-green-300" href="#contact">
              Contact Us
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} NeonStore. All rights reserved.
      </div>
    </footer>
  );
}

function WishlistDrawer({ open, onClose, items, onOpenProduct, onRemove, customerRegion }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 230, damping: 28 }}
            className="ml-auto flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#060906] text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-green-300">
                  Wishlist
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {items.length} item{items.length === 1 ? "" : "s"}
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 p-2 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {items.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
                  <Heart className="mx-auto h-10 w-10 text-green-300" />
                  <h3 className="mt-4 text-xl font-semibold">
                    Your wishlist is empty
                  </h3>
                  <p className="mt-2 text-sm text-zinc-400">
                    Tap the heart icon on products you like.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((product) => {
                    const productId = product.wishlistProductId || productIdOf(product);
                    const image = getProductImage(product);
                    const name = product.name || "Product";
                    const { displayCurrency, displayPrice } =
                      getProductDisplayPricing(product, customerRegion);

                    return (
                      <div
                        key={productId}
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpenProduct(product)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") onOpenProduct(product);
                        }}
                        className="cursor-pointer rounded-3xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-green-500/30 hover:bg-white/[0.06]"
                      >
                        <div className="flex gap-4">
                          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                            {image ? (
                              <img
                                src={image}
                                alt={name}
                                className="h-full w-full object-cover transition duration-300 hover:scale-105"
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-xs text-zinc-500">
                                No image
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-2 text-sm font-semibold hover:text-green-300">
                              {name}
                            </h3>

                            <p className="mt-1 text-xs text-zinc-500">
                              {product.categoryName || product.sectionName || product.category || "Product"}
                            </p>

                            <p className="mt-2 text-lg font-semibold">
                              {formatMoney(displayPrice, displayCurrency)}
                            </p>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onRemove(productId);
                              }}
                              className="mt-3 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300 hover:bg-red-500/20"
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
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
          className={`fixed right-4 top-24 z-[140] flex max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${toast.type === "success"
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

function LoadingBox() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-300">
      Loading products...
    </div>
  );
}

function ErrorPanel({ message }) {
  return (
    <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-red-200">
      {message}
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
      <Sparkles className="mx-auto h-10 w-10 text-green-300" />
      <h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
    </div>
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
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:56px_56px] opacity-[0.08]" />
    </div>
  );
}
