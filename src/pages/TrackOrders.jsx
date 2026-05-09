import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  ShoppingBag,
  MapPin,
  Trash2,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/ui/Button";
import { storefrontApi } from "@/api/storefrontApi";
import { formatMoney, convertMoney } from "@/utils/currency";
import { useCustomerRegion } from "@/hooks/useCustomerRegion";

const statusSteps = [
  {
    key: "ORDER_RECEIVED",
    label: "Order placed",
    desc: "We received your order successfully.",
    icon: ShoppingBag,
  },
  {
    key: "CONFIRMED",
    label: "Confirmed",
    desc: "Your order is waiting for production confirmation.",
    icon: Clock,
  },
  {
    key: "IN_PRODUCTION",
    label: "In production",
    desc: "Your product is being prepared by the print provider.",
    icon: Package,
  },
  {
    key: "SHIPPED",
    label: "Shipped",
    desc: "Your order is on the way.",
    icon: Truck,
  },
  {
    key: "DELIVERED",
    label: "Delivered",
    desc: "Your order has been delivered.",
    icon: CheckCircle2,
  },
];

function getStepIndex(order) {
  const status = String(order?.printifyStatus || order?.status || "").toLowerCase();

  if (status.includes("delivered")) return 4;
  if (status.includes("shipped")) return 3;
  if (status.includes("production") || status.includes("fulfilled")) return 2;
  if (status.includes("hold") || status.includes("pending") || status.includes("processing")) return 1;

  return 0;
}

function statusPill(order) {
  const status = String(order?.printifyStatus || order?.status || "").toLowerCase();

  if (status.includes("delivered")) return "Delivered";
  if (status.includes("shipped")) return "Shipped";
  if (status.includes("production")) return "In production";
  if (status.includes("hold")) return "Waiting confirmation";
  if (status.includes("cancel")) return "Cancelled";

  return order?.displayStatus || "Order received";
}

function canCancelOrder(order) {
  const status = String(order?.printifyStatus || order?.status || "").toLowerCase();

  return status === "on-hold" || status === "payment-not-received";
}

function canDeleteOrderRecord(order) {
  const status = String(order?.printifyStatus || order?.status || "").toLowerCase();

  return (
    status.includes("cancel") ||
    status.includes("delivered")
  );
}

function getOrderCurrency(order) {
  return (
    order?.currency ||
    order?.orderCurrency ||
    order?.paymentCurrency ||
    order?.totalCurrency ||
    order?.items?.[0]?.currency ||
    order?.items?.[0]?.unitCurrency ||
    "INR"
  );
}

function getOrderDisplayTotal(order, displayCurrency) {
  const amount = Number(order?.totalAmount || 0);
  const baseCurrency = getOrderCurrency(order);

  return convertMoney(amount, baseCurrency, displayCurrency);
}

export default function TrackOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [tracking, setTracking] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [error, setError] = useState("");

  const { customerRegion } = useCustomerRegion();
  const displayCurrency = customerRegion?.currency || "INR";

  const [actionLoading, setActionLoading] = useState("");

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId),
    [orders, selectedOrderId]
  );

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoadingOrders(true);
        setError("");

        const data = await storefrontApi.getOrders();
        const safeOrders = Array.isArray(data) ? data : [];

        setOrders(safeOrders);

        if (safeOrders.length > 0) {
          setSelectedOrderId(safeOrders[0].id);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Could not load your orders.");
      } finally {
        setLoadingOrders(false);
      }
    }

    loadOrders();
  }, []);

  useEffect(() => {
    if (!selectedOrderId) return;
    loadTracking(selectedOrderId);
  }, [selectedOrderId]);

  const loadTracking = async (orderId = selectedOrderId) => {
    if (!orderId) return;

    try {
      setLoadingTracking(true);
      setError("");

      const data = await storefrontApi.getOrderTracking(orderId);
      setTracking(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not refresh tracking.");
    } finally {
      setLoadingTracking(false);
    }
  };

  const refreshOrders = async (preferredOrderId = selectedOrderId) => {
    const data = await storefrontApi.getOrders();
    const safeOrders = Array.isArray(data) ? data : [];

    setOrders(safeOrders);

    if (safeOrders.length === 0) {
      setSelectedOrderId("");
      setTracking(null);
      return;
    }

    const stillExists = safeOrders.some((order) => order.id === preferredOrderId);
    setSelectedOrderId(stillExists ? preferredOrderId : safeOrders[0].id);
  };

  const handleCancelOrder = async () => {
    if (!activeOrder?.id) return;

    const confirmed = window.confirm(
      "Cancel this order? This is only possible before the order is sent to production."
    );

    if (!confirmed) return;

    try {
      setActionLoading("cancel");
      setError("");

      const updated = await storefrontApi.cancelOrder(activeOrder.id);

      setTracking(updated);

      setOrders((prev) =>
        prev.map((order) =>
          order.id === updated.id
            ? {
              ...order,
              ...updated,
            }
            : order
        )
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not cancel this order.");
    } finally {
      setActionLoading("");
    }
  };

  const handleDeleteOrderRecord = async () => {
    if (!activeOrder?.id) return;

    const confirmed = window.confirm(
      "Remove this order from your tracking page? This will not delete admin/payment records."
    );

    if (!confirmed) return;

    try {
      setActionLoading("delete");
      setError("");

      await storefrontApi.deleteOrderRecord(activeOrder.id);
      await refreshOrders(activeOrder.id);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not remove this order.");
    } finally {
      setActionLoading("");
    }
  };

  const activeOrder = tracking || selectedOrder;
  const activeStep = getStepIndex(activeOrder);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050805] text-white">
      <AnimatedTrackingBackground />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to store
          </button>

          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-green-500 text-black">
              <Truck className="h-5 w-5" />
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">Track Order</p>
              <p className="text-xs text-zinc-500">Live status from Printify</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 max-w-3xl"
        >
          <p className="text-sm uppercase tracking-[0.25em] text-green-300">
            Your Orders
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">
            Track your order in real time
          </h1>
          <p className="mt-4 text-zinc-400">
            Check production, shipping, and delivery updates for your recent orders.
          </p>
        </motion.div>

        {error ? (
          <div className="mb-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-red-100">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          </div>
        ) : null}

        {loadingOrders ? (
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8">
            Loading your orders...
          </div>
        ) : orders.length === 0 ? (
          <EmptyOrders onShop={() => navigate("/#shop")} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-4">
              {orders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`w-full rounded-[28px] border p-5 text-left transition ${selectedOrderId === order.id
                    ? "border-green-500/50 bg-green-500/10 shadow-[0_0_60px_rgba(34,197,94,0.10)]"
                    : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                    }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-green-300">
                        Order
                      </p>
                      <h3 className="mt-2 font-semibold">
                        #{order.id?.slice(-8)?.toUpperCase()}
                      </h3>
                    </div>

                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-200">
                      {statusPill(order)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-zinc-500">
                      {order.items?.length || 0} item{order.items?.length === 1 ? "" : "s"}
                    </span>
                    <span className="font-semibold text-white">
                      {formatMoney(getOrderDisplayTotal(order, displayCurrency), displayCurrency)}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.section
                key={selectedOrderId}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                className="rounded-[34px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl md:p-7"
              >
                <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-green-300">
                      Current Status
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">
                      {activeOrder?.displayStatus || statusPill(activeOrder)}
                    </h2>
                    <p className="mt-2 text-sm text-zinc-500">
                      Order #{activeOrder?.id?.slice(-8)?.toUpperCase()}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      onClick={() => loadTracking()}
                      disabled={loadingTracking || Boolean(actionLoading)}
                      variant="outline"
                      className="rounded-2xl"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${loadingTracking ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>

                    {canCancelOrder(activeOrder) ? (
                      <Button
                        onClick={handleCancelOrder}
                        disabled={Boolean(actionLoading)}
                        variant="outline"
                        className="rounded-2xl border-yellow-500/30 bg-yellow-500/10 text-yellow-100 hover:bg-yellow-500/20"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        {actionLoading === "cancel" ? "Cancelling..." : "Cancel Order"}
                      </Button>
                    ) : null}

                    {canDeleteOrderRecord(activeOrder) ? (
                      <Button
                        onClick={handleDeleteOrderRecord}
                        disabled={Boolean(actionLoading)}
                        variant="outline"
                        className="rounded-2xl border-red-500/30 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {actionLoading === "delete" ? "Removing..." : "Remove"}
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-7">
                  <TrackingTimeline activeStep={activeStep} />
                </div>

                <div className="mt-7 grid gap-4 md:grid-cols-2">
                  <InfoCard
                    icon={<Package className="h-5 w-5" />}
                    title="Printify Status"
                    value={activeOrder?.printifyStatus || "Processing"}
                  />

                  <InfoCard
                    icon={<MapPin className="h-5 w-5" />}
                    title="Delivery To"
                    value={`${activeOrder?.shippingCity || ""}, ${activeOrder?.shippingState || ""}`}
                  />
                </div>

                <div className="mt-7 rounded-3xl border border-white/10 bg-black/30 p-5">
                  <h3 className="text-lg font-semibold">Items in this order</h3>

                  <div className="mt-4 space-y-4">
                    {(activeOrder?.items || []).map((item) => (
                      <div key={`${item.productId}-${item.printifyVariantId}`} className="flex gap-4">
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="h-20 w-20 rounded-2xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 font-medium">{item.productName}</p>
                          <p className="mt-1 text-sm text-zinc-500">{item.colorway}</p>
                          <p className="mt-1 text-sm text-zinc-400">Qty: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  {activeOrder?.trackingUrl ? (
                    <a
                      href={activeOrder.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-green-500 px-5 text-sm font-semibold text-black transition hover:bg-green-400"
                    >
                      Open live tracking
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  ) : (
                    <div className="flex-1 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                      Tracking Not Available
                    </div>
                  )}
                </div>
              </motion.section>
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

function TrackingTimeline({ activeStep }) {
  return (
    <div className="space-y-5">
      {statusSteps.map((step, index) => {
        const Icon = step.icon;
        const completed = index <= activeStep;

        return (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.06 }}
            className="relative flex gap-4"
          >
            {index !== statusSteps.length - 1 ? (
              <div
                className={`absolute left-5 top-11 h-full w-px ${index < activeStep ? "bg-green-500" : "bg-white/10"
                  }`}
              />
            ) : null}

            <div
              className={`relative z-10 grid h-10 w-10 place-items-center rounded-full border ${completed
                ? "border-green-400 bg-green-500 text-black"
                : "border-white/10 bg-black/40 text-zinc-500"
                }`}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div className="pb-5">
              <p className={`font-semibold ${completed ? "text-white" : "text-zinc-500"}`}>
                {step.label}
              </p>
              <p className="mt-1 text-sm text-zinc-500">{step.desc}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function InfoCard({ icon, title, value }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
      <div className="text-green-300">{icon}</div>
      <p className="mt-3 text-sm text-zinc-500">{title}</p>
      <p className="mt-1 font-semibold text-white">{value || "Not available yet"}</p>
    </div>
  );
}

function EmptyOrders({ onShop }) {
  return (
    <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-10 text-center">
      <Package className="mx-auto h-12 w-12 text-green-300" />
      <h2 className="mt-4 text-2xl font-semibold">No orders yet</h2>
      <p className="mt-2 text-zinc-400">
        Once you place an order, tracking updates will appear here.
      </p>
      <Button onClick={onShop} className="mt-6 rounded-2xl">
        Start shopping
      </Button>
    </div>
  );
}

function AnimatedTrackingBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute left-[-10%] top-[-10%] h-80 w-80 rounded-full bg-green-500/10 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.08),transparent_35%)]" />
    </div>
  );
}