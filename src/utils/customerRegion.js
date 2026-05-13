export const COUNTRY_CONFIGS = {
  IN: {
    code: "IN",
    label: "India",
    currency: "INR",
    provider: "QIKINK",
    paymentProvider: "RAZORPAY",
    paymentProviders: ["RAZORPAY", "COD"],
  },
  US: {
    code: "US",
    label: "United States",
    currency: "USD",
    provider: "PRINTIFY",
    paymentProvider: "PAYPAL",
    paymentProviders: ["PAYPAL"],
  },
  AU: {
    code: "AU",
    label: "Australia",
    currency: "AUD",
    provider: "PRINTIFY",
    paymentProvider: "PAYPAL",
    paymentProviders: ["PAYPAL"],
  },
};

export const FALLBACK_PROVIDER_STATUS = {
  mode: "QIKINK",
  qikinkEnabled: true,
  printifyEnabled: false,
  autoFulfillmentEnabled: false,
};

export const EXCHANGE_RATES = {
  INR: 1,
  USD: 83,
  AUD: 55,
};

export function normalizeProviderStatus(status) {
  const safe = status || FALLBACK_PROVIDER_STATUS;

  const mode = String(safe.mode || "QIKINK").toUpperCase();

  return {
    mode: ["QIKINK", "PRINTIFY", "HYBRID"].includes(mode) ? mode : "QIKINK",
    qikinkEnabled: Boolean(safe.qikinkEnabled),
    printifyEnabled: Boolean(safe.printifyEnabled),
    autoFulfillmentEnabled: Boolean(safe.autoFulfillmentEnabled),
  };
}

export function getAvailableCountries(providerStatus) {
  const status = normalizeProviderStatus(providerStatus);

  if (status.mode === "QIKINK" || (status.qikinkEnabled && !status.printifyEnabled)) {
    return [COUNTRY_CONFIGS.IN];
  }

  if (status.mode === "PRINTIFY" || (!status.qikinkEnabled && status.printifyEnabled)) {
    return [COUNTRY_CONFIGS.US, COUNTRY_CONFIGS.AU];
  }

  const countries = [];

  if (status.qikinkEnabled) {
    countries.push(COUNTRY_CONFIGS.IN);
  }

  if (status.printifyEnabled) {
    countries.push(COUNTRY_CONFIGS.US, COUNTRY_CONFIGS.AU);
  }

  return countries.length ? countries : [COUNTRY_CONFIGS.IN];
}

export function getDefaultCountry(providerStatus) {
  return getAvailableCountries(providerStatus)[0]?.code || "IN";
}

export function isCountryAllowed(countryCode, providerStatus) {
  return getAvailableCountries(providerStatus).some(
    (country) => country.code === String(countryCode || "").toUpperCase()
  );
}

export function getCountryConfig(countryCode, providerStatus = null) {
  const code = String(countryCode || "").toUpperCase();

  if (COUNTRY_CONFIGS[code]) {
    return COUNTRY_CONFIGS[code];
  }

  const fallbackCode = getDefaultCountry(providerStatus);

  return COUNTRY_CONFIGS[fallbackCode] || COUNTRY_CONFIGS.IN;
}

export function getProviderForCountry(countryCode) {
  return getCountryConfig(countryCode).provider;
}

export function getCurrencyForCountry(countryCode) {
  return getCountryConfig(countryCode).currency;
}

export function getDefaultPaymentProvider(countryCode) {
  return getCountryConfig(countryCode).paymentProvider;
}

export function isRegionLocked(providerStatus) {
  return getAvailableCountries(providerStatus).length <= 1;
}

export function convertCurrency(amount, fromCurrency = "INR", toCurrency = "INR") {
  const value = Number(amount || 0);

  if (!Number.isFinite(value)) return 0;

  const from = String(fromCurrency || "INR").toUpperCase();
  const to = String(toCurrency || "INR").toUpperCase();

  if (from === to) return value;

  const fromRate = EXCHANGE_RATES[from] || 1;
  const toRate = EXCHANGE_RATES[to] || 1;

  const amountInInr = value * fromRate;

  return amountInInr / toRate;
}