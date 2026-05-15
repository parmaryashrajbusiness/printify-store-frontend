import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ShieldCheck, Truck, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  validateShippingForm,
  getCountryConfig,
  getStatesForCountry,
} from "@/utils/shippingValidation";
import { convertMoney } from "@/utils/currency";
import SelectField from "@/components/ui/SelectField";

function parseMoney(value) {
  if (value == null) return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    return Number(value.replace(/[^\d.-]/g, "")) || 0;
  }

  if (typeof value === "object") {
    return (
      Number(
        value.amount ??
        value.value ??
        value.price ??
        value.unitPrice ??
        value.originalUnitPrice ??
        0
      ) || 0
    );
  }

  return 0;
}

function getCartItemQuantity(item) {
  return Number(item.quantity ?? item.qty ?? item.count ?? 1);
}

function fieldLabel(key) {
  const labels = {
    firstName: "firstName",
    lastName: "lastName",
    email: "email",
    phone: "phone",
    addressLine1: "Address line 1",
    city: "City",
    state: "State",
    postalCode: "Postal code",
  };

  return labels[key] || key;
}

const SAVED_ADDRESS_PREFIX = "neonStoreSavedAddress";

function savedAddressKey(country) {
  return `${SAVED_ADDRESS_PREFIX}:${String(country || "IN").toUpperCase()}`;
}

function loadSavedAddress(country) {
  try {
    const raw = localStorage.getItem(savedAddressKey(country));
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") return null;

    return parsed;
  } catch {
    return null;
  }
}

function saveAddress(country, address) {
  try {
    localStorage.setItem(
      savedAddressKey(country),
      JSON.stringify({
        firstName: address.firstName || "",
        lastName: address.lastName || "",
        email: address.email || "",
        phone: address.phone || "",
        addressLine1: address.addressLine1 || "",
        addressLine2: address.addressLine2 || "",
        city: address.city || "",
        state: address.state || "",
        postalCode: address.postalCode || "",
        country: String(address.country || country || "IN").toUpperCase(),
        savedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Ignore localStorage errors.
  }
}

function FieldError({ error, children, className = "" }) {
  return (
    <div className={className}>
      {children}
      {error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}

function ErrorBox({ message }) {
  if (!message) return null;

  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      {message}
    </div>
  );
}

export default function CheckoutModal({
  open,
  onClose,
  onSubmit,
  loading,
  customerRegion,
  cartItems = [],
}) {
  const availableCountries = customerRegion?.availableCountries?.length
    ? customerRegion.availableCountries
    : [
      {
        code: customerRegion?.country || "IN",
        label: customerRegion?.label || "India",
        currency: customerRegion?.currency || "INR",
      },
    ];

  const initialCountry = customerRegion?.country || availableCountries[0]?.code || "IN";
  const initialState = getStatesForCountry(initialCountry)[0]?.code || "";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: initialState,
    postalCode: "",
    country: initialCountry,
  });

  const [errors, setErrors] = useState({});
  const [savedAddress, setSavedAddress] = useState(null);
  const [policiesAccepted, setPoliciesAccepted] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState(
    customerRegion?.paymentProvider || "RAZORPAY"
  );

  const selectedCountryConfig = getCountryConfig(form.country);
  const stateOptions = getStatesForCountry(form.country);
  const isIndiaCheckout = form.country === "IN";
  const countryLocked = availableCountries.length <= 1;

  const countrySelectOptions = availableCountries.map((country) => ({
    value: country.code,
    label: `${country.label} · ${country.currency}`,
  }));

  const stateSelectOptions = stateOptions.map((state) => ({
    value: state.code,
    label: state.label,
  }));

  const currency = selectedCountryConfig.currency || customerRegion?.currency || "INR";

  const allowedPaymentProviders = isIndiaCheckout
    ? ["RAZORPAY", "COD"]
    : ["PAYPAL"];

  const shippingFeeByCountry = {
    US: Number(import.meta.env.VITE_SHIPPING_USD ?? 6.99),
    AU: Number(import.meta.env.VITE_SHIPPING_AUD ?? 10.99),
  };

  const prepaidShippingInr = Number(import.meta.env.VITE_PREPAID_SHIPPING_INR ?? 0);
  const codShippingInr = Number(import.meta.env.VITE_COD_SHIPPING_INR ?? 79);

  const getCartItemPrice = (item) => {
    const targetCurrency = currency;

    const originalPrice = parseMoney(
      item.originalUnitPrice ??
      item.original_unit_price ??
      item.product?.originalUnitPrice ??
      item.variant?.originalUnitPrice
    );

    const originalCurrency =
      item.originalCurrency ??
      item.original_currency ??
      item.product?.originalCurrency ??
      item.variant?.originalCurrency;

    if (originalPrice > 0 && originalCurrency) {
      return convertMoney(originalPrice, originalCurrency, targetCurrency);
    }

    const unitPrice = parseMoney(
      item.unitPrice ??
      item.unit_price ??
      item.unitAmount ??
      item.unit_amount ??
      item.price ??
      item.displayPrice ??
      item.display_price ??
      item.productPrice ??
      item.product_price ??
      item.amount ??
      item.product?.price ??
      item.product?.unitPrice ??
      item.variant?.price ??
      item.variant?.unitPrice
    );

    const unitCurrency =
      item.unitCurrency ??
      item.unit_currency ??
      item.currency ??
      item.product?.currency ??
      item.variant?.currency ??
      (isIndiaCheckout ? "INR" : "USD");

    if (unitPrice > 0 && unitCurrency && unitCurrency !== targetCurrency) {
      return convertMoney(unitPrice, unitCurrency, targetCurrency);
    }

    return unitPrice;
  };

  const productSubtotal = cartItems.reduce((sum, item) => {
    return sum + getCartItemPrice(item) * getCartItemQuantity(item);
  }, 0);

  const hasCartItems = cartItems.length > 0;

  const isIndiaQikink =
    form.country === "IN" &&
    String(customerRegion?.provider || "").toUpperCase() === "QIKINK";

  const shippingFee = isIndiaQikink
    ? paymentProvider === "COD"
      ? codShippingInr
      : prepaidShippingInr
    : shippingFeeByCountry[form.country] ?? 0;

  const internationalFeePercent = form.country === "IN" ? 0 : 7;
  const feeBuffer = Number(((productSubtotal + shippingFee) * internationalFeePercent) / 100);
  const totalPayable = productSubtotal + shippingFee + feeBuffer;

  const formatCheckoutMoney = (amount) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "INR" ? 0 : 2,
    }).format(Number(amount || 0));

  useEffect(() => {
    if (!open) return;

    const nextCountry = customerRegion?.country || availableCountries[0]?.code || "IN";
    const nextState = getStatesForCountry(nextCountry)[0]?.code || "";
    const nextProvider = nextCountry === "IN" ? "RAZORPAY" : "PAYPAL";
    const address = loadSavedAddress(nextCountry);

    setSavedAddress(address);

    setForm((prev) => ({
      ...prev,
      country: nextCountry,
      state: address?.state || nextState,
      firstName: address?.firstName || prev.firstName || "",
      lastName: address?.lastName || prev.lastName || "",
      email: address?.email || prev.email || "",
      phone: address?.phone || "",
      addressLine1: address?.addressLine1 || "",
      addressLine2: address?.addressLine2 || "",
      city: address?.city || "",
      postalCode: address?.postalCode || "",
    }));

    setPaymentProvider(nextProvider);
    setErrors({});
    setPoliciesAccepted(false);
  }, [open, customerRegion?.country]);

  const updateField = (key, value) => {
    setForm((prev) => {
      if (key === "country") {
        const nextState = getStatesForCountry(value)[0]?.code || "";

        return {
          ...prev,
          country: value,
          state: nextState,
          city: "",
          phone: "",
          postalCode: "",
        };
      }

      if (key === "state") {
        return {
          ...prev,
          state: value,
          city: "",
        };
      }

      return {
        ...prev,
        [key]: value,
      };
    });

    if (key === "country") {
      setPaymentProvider(value === "IN" ? "RAZORPAY" : "PAYPAL");
    }

    setErrors((prev) => ({
      ...prev,
      [key]: "",
      [fieldLabel(key)]: "",
      payment: "",
    }));
  };

  const submit = (e) => {
    e.preventDefault();

    const validationErrors = validateShippingForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    if (!hasCartItems) {
      setErrors({
        cart: "Your cart is empty or not loaded. Please close checkout and open cart again.",
      });
      return;
    }

    if (!policiesAccepted) {
      setErrors({
        policy:
          "Please accept the made-to-order, refund, return, and shipping policies before payment.",
      });
      return;
    }

    if (!allowedPaymentProviders.includes(paymentProvider)) {
      setErrors({
        payment: isIndiaCheckout
          ? "Indian checkout supports only Razorpay or COD."
          : "International checkout supports only PayPal.",
      });
      return;
    }

    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();

    saveAddress(form.country, form);
    setSavedAddress(form);

    onSubmit(
      {
        ...form,
        fullName,
        country: form.country.toUpperCase(),
        currency,
        policiesAccepted: true,
        policiesAcceptedAt: new Date().toISOString(),
        acceptedPolicyVersion: isIndiaCheckout
          ? "INDIA-QIKINK-2026-05-12"
          : "GLOBAL-PRINTIFY-2026-05-12",
      },
      paymentProvider
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] grid place-items-center bg-black/70 px-4 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[32px] border border-white/10 bg-[#070907] p-5 text-white shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-green-300">
                  Checkout
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Shipping details</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {isIndiaCheckout
                    ? "India checkout uses INR with Razorpay or COD."
                    : "International checkout uses PayPal."}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-white/10 bg-white/5 p-2 text-zinc-300 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_380px]">
              <div className="space-y-4">
                <ErrorBox message={errors.cart} />
                <ErrorBox message={errors.policy} />
                <ErrorBox message={errors.payment} />

                {savedAddress ? (
                  <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-green-100">
                          Saved address available
                        </p>
                        <p className="mt-1 text-xs leading-5 text-zinc-300">
                          {savedAddress.firstName} {savedAddress.lastName} ·{" "}
                          {savedAddress.addressLine1}, {savedAddress.city},{" "}
                          {savedAddress.state} {savedAddress.postalCode}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              ...savedAddress,
                              country: form.country,
                            }));

                            setErrors({});
                          }}
                        >
                          Use saved address
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => {
                            localStorage.removeItem(savedAddressKey(form.country));
                            setSavedAddress(null);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldError error={errors.firstName}>
                    <Input
                      value={form.firstName}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/[^a-zA-Z\s'-]/g, "")
                          .slice(0, 40);
                        updateField("firstName", value);
                      }}
                      placeholder="First name"
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                    />
                  </FieldError>

                  <FieldError error={errors.lastName}>
                    <Input
                      value={form.lastName}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/[^a-zA-Z\s'-]/g, "")
                          .slice(0, 40);
                        updateField("lastName", value);
                      }}
                      placeholder="Last name"
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                    />
                  </FieldError>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldError error={errors.email}>
                    <Input
                      value={form.email}
                      onChange={(e) =>
                        updateField("email", e.target.value.trim().slice(0, 120))
                      }
                      placeholder="Email"
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                    />
                  </FieldError>

                  <FieldError error={errors.phone}>
                    <Input
                      value={form.phone}
                      onChange={(e) => {
                        const onlyNumbers = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, selectedCountryConfig.phoneDigits);
                        updateField("phone", onlyNumbers);
                      }}
                      inputMode="numeric"
                      maxLength={selectedCountryConfig.phoneDigits}
                      placeholder={selectedCountryConfig.phonePlaceholder}
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                    />
                  </FieldError>
                </div>

                {countryLocked ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                    Country: {selectedCountryConfig.label} · {currency}
                  </div>
                ) : (
                  <SelectField
                    value={form.country}
                    onChange={(value) => updateField("country", value)}
                    options={countrySelectOptions}
                    placeholder="Country / Region"
                  />
                )}

                <FieldError error={errors["Address line 1"]}>
                  <Input
                    value={form.addressLine1}
                    onChange={(e) => updateField("addressLine1", e.target.value)}
                    placeholder="Flat, House no., Building, Company, Apartment"
                    className="h-12 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                  />
                </FieldError>

                <Input
                  value={form.addressLine2}
                  onChange={(e) => updateField("addressLine2", e.target.value)}
                  placeholder="Area, Street, Sector, Village, Landmark optional"
                  className="h-12 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldError error={errors.State}>
                    <SelectField
                      value={form.state}
                      onChange={(value) => updateField("state", value)}
                      options={stateSelectOptions}
                      placeholder="State / Region"
                    />
                  </FieldError>

                  <FieldError error={errors.City}>
                    <Input
                      value={form.city}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/[^a-zA-Z\s.'-]/g, "")
                          .slice(0, 60);
                        updateField("city", value);
                      }}
                      placeholder="Town / City"
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                    />
                  </FieldError>
                </div>

                <FieldError error={errors["Postal code"]}>
                  <Input
                    value={form.postalCode}
                    onChange={(e) => {
                      const onlyNumbers = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, selectedCountryConfig.postalLength);
                      updateField("postalCode", onlyNumbers);
                    }}
                    inputMode="numeric"
                    maxLength={selectedCountryConfig.postalLength}
                    placeholder={selectedCountryConfig.postalPlaceholder}
                    className="h-12 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                  />
                </FieldError>
              </div>

              <div className="space-y-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 lg:sticky lg:top-6 lg:self-start">
                <div>
                  <h3 className="text-lg font-semibold">Order Summary</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Backend will calculate the final payable amount securely.
                  </p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Product subtotal</span>
                    <span>{formatCheckoutMoney(productSubtotal)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-zinc-400">Shipping estimate</span>
                    <span>{shippingFee === 0 ? "Free" : formatCheckoutMoney(shippingFee)}</span>
                  </div>

                  {feeBuffer > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">International/payment buffer</span>
                      <span>{formatCheckoutMoney(feeBuffer)}</span>
                    </div>
                  ) : null}

                  <div className="border-t border-white/10 pt-3">
                    <div className="flex justify-between text-base font-semibold">
                      <span>Total estimate</span>
                      <span>{formatCheckoutMoney(totalPayable)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  {isIndiaQikink ? (
                    <div className="mb-4 rounded-2xl border border-green-500/20 bg-green-500/10 p-3 text-xs leading-5 text-green-100">
                      <div className="flex items-start gap-2">
                        <Truck className="mt-0.5 h-4 w-4 shrink-0 text-green-300" />
                        <p>
                          Pay online with Razorpay and get <span className="font-semibold">free delivery</span>.
                          COD includes a small delivery charge.
                        </p>
                      </div>
                    </div>
                  ) : null}
                  <p className="mb-3 text-sm font-medium">Payment Method</p>

                  <div className="grid gap-3">
                    {isIndiaCheckout ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentProvider("RAZORPAY");
                            setErrors((prev) => ({ ...prev, payment: "" }));
                          }}
                          className={`rounded-2xl border p-4 text-left transition ${paymentProvider === "RAZORPAY"
                            ? "border-green-400 bg-green-500/10 text-green-100"
                            : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                            }`}
                        >
                          <p className="font-semibold">Razorpay</p>
                          <p className="mt-1 text-xs text-zinc-400">
                            UPI, cards, net banking
                          </p>
                          <p className="mt-2 inline-flex rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-300">
                            Free delivery on prepaid orders
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPaymentProvider("COD");
                            setErrors((prev) => ({ ...prev, payment: "" }));
                          }}
                          className={`rounded-2xl border p-4 text-left transition ${paymentProvider === "COD"
                            ? "border-green-400 bg-green-500/10 text-green-100"
                            : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                            }`}
                        >
                          <p className="font-semibold">Cash on Delivery</p>
                          <p className="mt-1 text-xs text-zinc-400">
                            Available only for India/Qikink orders
                          </p>
                          <p className="mt-2 text-xs text-yellow-300">
                            COD includes {formatCheckoutMoney(codShippingInr)} delivery charge
                          </p>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentProvider("PAYPAL");
                          setErrors((prev) => ({ ...prev, payment: "" }));
                        }}
                        className="rounded-2xl border border-green-400 bg-green-500/10 p-4 text-left text-green-100"
                      >
                        <p className="font-semibold">PayPal</p>
                        <p className="mt-1 text-xs text-zinc-400">
                          PayPal and international cards
                        </p>
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-xs leading-5 text-yellow-50">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />

                    <div className="min-w-0">
                      <p className="font-semibold">Made-to-order policy</p>
                      <p className="mt-1 text-yellow-100/90">
                        Custom printed after order confirmation. No returns for size, color,
                        address mistakes, delivery refusal, or change of mind.
                      </p>

                      <button
                        type="button"
                        onClick={() => setPolicyOpen((prev) => !prev)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-yellow-300 transition hover:text-yellow-200"
                      >
                        {policyOpen ? "Hide full policy" : "Read full policy"}
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${policyOpen ? "rotate-180" : ""
                            }`}
                        />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {policyOpen ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 space-y-2 border-t border-yellow-500/20 pt-3 text-yellow-100/90">
                          <p>Every product is printed specially after you place the order.</p>

                          <p>
                            Returns or exchanges are not accepted for wrong size selected by the
                            customer, wrong color selected by the customer, change of mind,
                            incorrect address, delivery refusal, or ordering mistakes.
                          </p>

                          <p>
                            If your item arrives damaged, defective, misprinted, or different
                            from what you ordered, contact us within 24 hours of delivery with
                            your order ID and clear photo/video proof. After verification, we
                            will provide a replacement or suitable resolution.
                          </p>

                          <p>
                            For COD orders, delivery/COD charges are non-refundable. Approved
                            COD refunds will be processed manually through UPI or bank transfer
                            after verification.
                          </p>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <label className="flex items-start gap-3 text-xs leading-6 text-zinc-300">
                  <input
                    type="checkbox"
                    checked={policiesAccepted}
                    onChange={(e) => {
                      setPoliciesAccepted(e.target.checked);
                      setErrors((prev) => ({ ...prev, policy: "" }));
                    }}
                    className="mt-1"
                  />
                  <span>
                    I checked product, size, color, quantity, and shipping address. I accept the
                    made-to-order and refund policy.
                  </span>
                </label>

                <Button disabled={loading} className="h-12 w-full rounded-2xl">
                  {loading
                    ? "Processing..."
                    : paymentProvider === "COD"
                      ? "Place COD Order"
                      : `Pay ${formatCheckoutMoney(totalPayable)}`}
                </Button>
              </div>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}