import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  validateShippingForm,
  allowedCountries,
  getCountryConfig,
  getStatesForCountry,
} from "@/utils/shippingValidation";
import { convertMoney } from "@/utils/currency";
import SelectField from "@/components/ui/SelectField";

export default function CheckoutModal({
  open,
  onClose,
  onSubmit,
  loading,
  customerRegion,
  cartItems = [],
}) {
  const initialCountry = customerRegion?.country || "IN";
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
  const [policiesAccepted, setPoliciesAccepted] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState(
    customerRegion?.paymentProvider || "RAZORPAY"
  );

  const isIndiaCheckout = form.country === "IN";

  const selectedCountryConfig = getCountryConfig(form.country);
  const stateOptions = getStatesForCountry(form.country);

  const countrySelectOptions = allowedCountries.map((country) => ({
    value: country.code,
    label: country.label,
  }));

  const stateSelectOptions = stateOptions.map((state) => ({
    value: state.code,
    label: state.label,
  }));

  const checkoutCurrencyByCountry = {
    IN: "INR",
    US: "USD",
    AU: "AUD",

    // Temporarily disabled until GPSR/EU compliance is ready
    // DE: "EUR",
    // FR: "EUR",
  };

  const currency = checkoutCurrencyByCountry[form.country] || "USD";

  const parseMoney = (value) => {
    if (value == null) return 0;

    if (typeof value === "number") return value;

    if (typeof value === "string") {
      return Number(value.replace(/[^\d.-]/g, "")) || 0;
    }

    if (typeof value === "object") {
      return Number(
        value.amount ??
        value.value ??
        value.price ??
        value.unitPrice ??
        value.originalUnitPrice ??
        0
      ) || 0;
    }

    return 0;
  };

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
      item.variant?.currency;

    if (unitPrice > 0 && unitCurrency && unitCurrency !== targetCurrency) {
      return convertMoney(unitPrice, unitCurrency, targetCurrency);
    }

    return unitPrice;
  };

  const getCartItemQuantity = (item) => {
    return Number(item.quantity ?? item.qty ?? item.count ?? 1);
  };

  const productSubtotal = cartItems.reduce((sum, item) => {
    const price = getCartItemPrice(item);
    const quantity = getCartItemQuantity(item);

    return sum + price * quantity;
  }, 0);

  const hasCartItems = cartItems.length > 0;

  const shippingFeeByCountry = {
    IN: 149.0,
    US: 6.99,
    AU: 10.99,

    // Temporarily disabled until GPSR/EU compliance is ready
    // DE: 7.99,
    // FR: 7.99,
  };
  const shippingFee = shippingFeeByCountry[form.country] ?? 6.99;

  // This should match your backend APP_INTERNATIONAL_FEE_BUFFER_PERCENT.
  // If your backend uses 5%, keep 5 here. If it uses 12%, keep 12 here.
  const internationalFeePercent = form.country === "IN" ? 0 : 7;

  const feeBuffer = Number(
    ((productSubtotal + shippingFee) * internationalFeePercent) / 100
  );

  const totalPayable = productSubtotal + shippingFee + feeBuffer;

  const formatCheckoutMoney = (amount) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(Number(amount || 0));

  useEffect(() => {
    if (!open) return;

    const nextCountry = customerRegion?.country || "IN";
    const nextProvider = nextCountry === "IN" ? "RAZORPAY" : "PAYPAL";

    const nextState = getStatesForCountry(nextCountry)[0]?.code || "";

    setForm((prev) => ({
      ...prev,
      country: nextCountry,
      state: nextState,
      city: "",
      phone: "",
      postalCode: "",
    }));

    setPaymentProvider(customerRegion?.paymentProvider || nextProvider);
    setErrors({});
    setPoliciesAccepted(false);
  }, [open, customerRegion]);

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
      setErrors({ cart: "Your cart is empty or not loaded. Please close checkout and open cart again." });
      return;
    }

    if (!policiesAccepted) {
      setErrors({
        policy:
          "Please accept the made-to-order, refund, return, and shipping policies before payment.",
      });
      return;
    }

    if (form.country === "IN" && paymentProvider !== "RAZORPAY") {
      setErrors({ payment: "Indian checkout must use Razorpay." });
      return;
    }

    if (form.country !== "IN" && paymentProvider !== "PAYPAL") {
      setErrors({ payment: "International checkout must use PayPal." });
      return;
    }

    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();

    onSubmit(
      {
        ...form,
        fullName,
        country: form.country.toUpperCase(),
        policiesAccepted: true,
        policiesAcceptedAt: new Date().toISOString(),
        acceptedPolicyVersion: "2026-05-04",
      },
      paymentProvider
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#0a0f0a] p-6 text-white shadow-2xl"
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-green-300">Checkout</p>
                <h2 className="mt-2 text-2xl font-semibold">Shipping details</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Country controls currency and available payment method.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 p-2 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errors.cart ? <ErrorBox message={errors.cart} /> : null}
            {errors.policy ? <ErrorBox message={errors.policy} /> : null}
            {errors.payment ? <ErrorBox message={errors.payment} /> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldError error={errors.firstName}>
                <Input
                  required
                  value={form.firstName}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^a-zA-Z\s'-]/g, "").slice(0, 40);
                    updateField("firstName", value);
                  }}
                  placeholder="First name"
                  className="h-12 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                />
              </FieldError>

              <FieldError error={errors.lastName}>
                <Input
                  required
                  value={form.lastName}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^a-zA-Z\s'-]/g, "").slice(0, 40);
                    updateField("lastName", value);
                  }}
                  placeholder="Last name"
                  className="h-12 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                />
              </FieldError>

              <FieldError error={errors.email}>
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value.trim().slice(0, 120))}
                  placeholder="Email"
                  className="h-12 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                />
              </FieldError>

              <FieldError error={errors.phone}>
                <Input
                  required
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

              <FieldError error={errors.country}>
                <SelectField
                  value={form.country}
                  onChange={(value) => updateField("country", value)}
                  options={countrySelectOptions}
                  placeholder="Country / Region"
                />
              </FieldError>

              <FieldError error={errors["Address line 1"]} className="sm:col-span-2">
                <Input
                  required
                  value={form.addressLine1}
                  onChange={(e) => updateField("addressLine1", e.target.value)}
                  placeholder="Flat, House no., Building, Company, Apartment"
                  className="h-12 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                />
              </FieldError>

              <div className="sm:col-span-2">
                <Input
                  value={form.addressLine2}
                  onChange={(e) => updateField("addressLine2", e.target.value)}
                  placeholder="Area, Street, Sector, Village, Landmark optional"
                  className="h-12 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                />
              </div>

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
                  required
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

              <FieldError error={errors["Postal code"]}>
                <Input
                  required
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

            <div className="mt-6">

              {/* <div className="mb-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3 text-xs text-yellow-100">
                <p>Debug cart items: {cartItems.length}</p>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(cartItems, null, 2)}
                </pre>
              </div> */}

              <div className="mt-6 rounded-2xl border border-green-400/20 bg-green-400/10 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white">
                    Order Summary
                  </h3>

                  <span className="rounded-full bg-green-400/15 px-3 py-1 text-xs font-medium text-green-200">
                    Final bill before payment
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Product subtotal</span>
                    <span>{formatCheckoutMoney(productSubtotal)}</span>
                  </div>

                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Shipping</span>
                    <span>{formatCheckoutMoney(shippingFee)}</span>
                  </div>

                  {feeBuffer > 0 ? (
                    <div className="flex items-center justify-between text-zinc-300">
                      <span>International/payment fee</span>
                      <span>{formatCheckoutMoney(feeBuffer)}</span>
                    </div>
                  ) : null}

                  <div className="mt-3 border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between text-lg font-semibold text-white">
                      <span>Total payable</span>
                      <span>{formatCheckoutMoney(totalPayable)}</span>
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-5 text-zinc-400">
                  This is the amount you will be asked to pay through{" "}
                  {form.country === "IN" ? "Razorpay" : "PayPal"}. It includes product price,
                  shipping, and applicable processing/international charges.
                </p>
              </div>

              <p className="mb-3 mt-6 text-sm font-medium text-zinc-300">Payment Method</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={!isIndiaCheckout}
                  onClick={() => {
                    if (!isIndiaCheckout) return;
                    setPaymentProvider("RAZORPAY");
                    setErrors((prev) => ({ ...prev, payment: "" }));
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${!isIndiaCheckout
                    ? "cursor-not-allowed border-white/10 bg-white/[0.03] text-zinc-600"
                    : paymentProvider === "RAZORPAY"
                      ? "border-green-400 bg-green-500/10 text-green-100"
                      : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                    }`}
                >
                  <p className="font-semibold">Razorpay</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {isIndiaCheckout ? "UPI, cards, net banking" : "Available only for India"}
                  </p>
                </button>

                <button
                  type="button"
                  disabled={isIndiaCheckout}
                  onClick={() => {
                    if (isIndiaCheckout) return;
                    setPaymentProvider("PAYPAL");
                    setErrors((prev) => ({ ...prev, payment: "" }));
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${isIndiaCheckout
                    ? "cursor-not-allowed border-white/10 bg-white/[0.03] text-zinc-600"
                    : paymentProvider === "PAYPAL"
                      ? "border-green-400 bg-green-500/10 text-green-100"
                      : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                    }`}
                >
                  <p className="font-semibold">PayPal</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {isIndiaCheckout
                      ? "Available only for international checkout"
                      : "International cards and PayPal"}
                  </p>
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-50">
              <h4 className="font-semibold text-amber-100">
                Important made-to-order policy
              </h4>

              <p className="mt-2 leading-6 text-amber-50/90">
                Every product is printed specially after you place the order. Because of
                this, we cannot accept returns, exchanges, or cancellations for wrong size,
                wrong color, change of mind, incorrect address, or customer ordering
                mistakes.
              </p>

              <p className="mt-2 leading-6 text-amber-50/90">
                If your product arrives damaged, defective, misprinted, or incorrect, you
                must contact us within 30 days of delivery with your order ID and clear
                photo/video proof.
              </p>

              <label className="mt-4 flex cursor-pointer items-start gap-3">
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
                  I confirm that I have checked the product, size, color, quantity, and
                  shipping address. I understand this is a made-to-order product and cannot
                  be returned, exchanged, or cancelled for wrong size, wrong color, change
                  of mind, or customer ordering mistake. I understand damaged, defective,
                  misprinted, or incorrect items must be reported within 30 days of delivery
                  with clear photo/video proof.
                </span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading || !policiesAccepted || !hasCartItems}
              className="mt-6 h-12 w-full rounded-2xl"
            >
              {loading
                ? "Processing secure payment..."
                : `Pay ${formatCheckoutMoney(totalPayable)}`}
            </Button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
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
  return (
    <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {message}
    </div>
  );
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