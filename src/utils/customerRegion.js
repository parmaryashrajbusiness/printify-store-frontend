const REGION_STORAGE_KEY = "printify_store_customer_region";

const COUNTRY_TO_REGION = {
  IN: {
    country: "IN",
    countryLabel: "India",
    currency: "INR",
    paymentProvider: "RAZORPAY",
  },
  US: {
    country: "US",
    countryLabel: "United States",
    currency: "USD",
    paymentProvider: "PAYPAL",
  },
  AU: {
    country: "AU",
    countryLabel: "Australia",
    currency: "AUD",
    paymentProvider: "PAYPAL",
  },

  // temporarily disabled
  // DE: {
  //   country: "DE",
  //   countryLabel: "Germany",
  //   currency: "EUR",
  //   paymentProvider: "PAYPAL",
  // },
  // FR: {
  //   country: "FR",
  //   countryLabel: "France",
  //   currency: "EUR",
  //   paymentProvider: "PAYPAL",
  //},
};

const DEFAULT_REGION = COUNTRY_TO_REGION.IN;

export function getRegionByCountry(countryCode) {
  return COUNTRY_TO_REGION[String(countryCode || "").toUpperCase()] || COUNTRY_TO_REGION.US;
}

export function getStoredCustomerRegion() {
  try {
    const raw = localStorage.getItem(REGION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return getRegionByCountry(parsed.country);
  } catch {
    return null;
  }
}

export function saveCustomerRegion(region) {
  localStorage.setItem(REGION_STORAGE_KEY, JSON.stringify(region));
}

export async function detectCustomerRegion() {
  const stored = getStoredCustomerRegion();
  if (stored) return stored;

  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || "";
    const localeCountry = locale.split("-").pop()?.toUpperCase();

    const region = getRegionByCountry(localeCountry || "IN");
    saveCustomerRegion(region);
    return region;
  } catch {
    saveCustomerRegion(DEFAULT_REGION);
    return DEFAULT_REGION;
  }
}