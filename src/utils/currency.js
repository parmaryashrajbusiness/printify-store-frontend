import { convertCurrency } from "@/utils/customerRegion";

export function convertMoney(amount, fromCurrency = "INR", toCurrency = "INR") {
  return convertCurrency(amount, fromCurrency, toCurrency);
}

export function formatMoney(amount, currency = "INR") {
  const safeCurrency = String(currency || "INR").toUpperCase();

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: safeCurrency === "INR" ? 0 : 2,
    }).format(Number(amount || 0));
  } catch {
    return `${safeCurrency} ${Number(amount || 0).toFixed(2)}`;
  }
}