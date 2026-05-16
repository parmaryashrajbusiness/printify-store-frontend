import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { formatMoney } from "@/utils/currency";
import { getCartDisplayPricing } from "@/utils/displayPricing";

const MAX_QUANTITY_PER_VARIANT = 5;

export default function CartDrawer({
  open,
  onClose,
  items,
  loading,
  onIncrease,
  onDecrease,
  onRemove,
  onCheckout,
  customerRegion,
}) {
  const displayCurrency = customerRegion?.currency || "INR";

  const subtotal = items.reduce((sum, item) => {
    return sum + getCartDisplayPricing(item, customerRegion).lineTotal;
  }, 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
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
          >
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-green-300">Your Cart</p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {items.length} item{items.length === 1 ? "" : "s"}
                </h2>
              </div>

              <button
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 p-2 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-zinc-300">
                  Loading cart...
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
                  <ShoppingBag className="mx-auto h-10 w-10 text-green-300" />
                  <h3 className="mt-4 text-xl font-semibold">Your cart is empty</h3>
                  <p className="mt-2 text-sm text-zinc-400">
                    Add products you like and they will appear here.
                  </p>
                  <Button onClick={onClose} className="mt-6 rounded-2xl">
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => {
                    const pricing = getCartDisplayPricing(item, customerRegion);

                    return (
                      <div
                        key={item.id}
                        className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"
                      >
                        <div className="flex gap-4">
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="h-24 w-24 shrink-0 rounded-2xl object-cover sm:h-28 sm:w-28"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex gap-3">
                              <div className="min-w-0 flex-1">
                                <h3 className="line-clamp-2 text-sm font-semibold">
                                  {item.productName}
                                </h3>
                                <p className="mt-1 text-xs text-zinc-500">{item.colorway}</p>
                              </div>

                              <button
                                onClick={() => onRemove(item.id)}
                                className="grid h-9 w-9 place-items-center rounded-full border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="mt-4 space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center rounded-full border border-white/10 bg-black/30">
                                  <button
                                    type="button"
                                    disabled={Number(item.quantity || 1) <= 1}
                                    onClick={() => onDecrease(item)}
                                    className="grid h-9 w-9 place-items-center text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-zinc-300"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>

                                  <span className="min-w-8 text-center text-sm font-semibold">
                                    {item.quantity}
                                  </span>

                                  <button
                                    type="button"
                                    disabled={Number(item.quantity || 1) >= MAX_QUANTITY_PER_VARIANT}
                                    onClick={() => onIncrease(item)}
                                    className="grid h-9 w-9 place-items-center text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-zinc-300"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>

                                <div className="shrink-0 text-right">
                                  <p className="text-xs text-zinc-500">
                                    {formatMoney(pricing.unitPrice, pricing.displayCurrency)} each
                                  </p>
                                  <p className="text-lg font-semibold leading-tight">
                                    {formatMoney(pricing.lineTotal, pricing.displayCurrency)}
                                  </p>
                                </div>
                              </div>

                              {Number(item.quantity || 1) >= MAX_QUANTITY_PER_VARIANT ? (
                                <div className="inline-flex rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-[11px] font-medium text-yellow-200">
                                  Maximum {MAX_QUANTITY_PER_VARIANT} per size/color
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-zinc-400">Subtotal</span>
                <span className="text-2xl font-semibold">
                  {formatMoney(subtotal, displayCurrency)}
                </span>
              </div>

              <Button
                disabled={items.length === 0}
                onClick={onCheckout}
                className="h-12 w-full rounded-2xl"
              >
                Checkout
              </Button>

              <p className="mt-3 text-center text-xs text-zinc-500">
                Shipping and taxes are calculated during checkout.
              </p>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}