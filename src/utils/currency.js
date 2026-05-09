export function formatMoney(amount, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(Number(amount || 0));
}

// Display-only conversion. Never use this for real checkout/payment totals.
// Backend payment quote is the source of truth.
export function getExchangeRate(from, to) {
  if (from === to) return 1;

  const ratesFromUSD = {
    USD: 1,
    INR: Number(import.meta.env.VITE_DISPLAY_USD_TO_INR || 83),
    EUR: Number(import.meta.env.VITE_DISPLAY_USD_TO_EUR || 0.92),
    AUD: Number(import.meta.env.VITE_DISPLAY_USD_TO_AUD || 1.52),
  };

  const fromRate = ratesFromUSD[from] || 1;
  const toRate = ratesFromUSD[to] || 1;

  return toRate / fromRate;
}

export function convertMoney(amount, fromCurrency = "USD", toCurrency = "USD") {
  return Number(amount || 0) * getExchangeRate(fromCurrency, toCurrency);
}