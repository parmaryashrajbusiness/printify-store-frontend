const REGION_STORAGE_KEY = "printify_store_customer_region";

const COUNTRY_TO_REGION = {
  IN: {
    country: "IN",
    countryLabel: "India",
    currency: "INR",
    paymentProvider: "RAZORPAY",
  },

  /*
   Future Printify restore:
   Keep this commented. When you want Printify again for US/AU,
   uncomment US and AU and update allowedCountries in shippingValidation.js.

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
  */
};

const DEFAULT_REGION = COUNTRY_TO_REGION.IN;

export function getRegionByCountry(countryCode) {
  return COUNTRY_TO_REGION[String(countryCode || "").toUpperCase()] || DEFAULT_REGION;
}

export function getStoredCustomerRegion() {
  try {
    const raw = localStorage.getItem(REGION_STORAGE_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // During Qikink India-only local test, force old US/AU storage back to India.
    return getRegionByCountry(parsed.country);
  } catch {
    return null;
  }
}

export function saveCustomerRegion(region) {
  localStorage.setItem(REGION_STORAGE_KEY, JSON.stringify(region || DEFAULT_REGION));
}

export async function detectCustomerRegion() {
  const stored = getStoredCustomerRegion();

  if (stored) {
    saveCustomerRegion(DEFAULT_REGION);
    return DEFAULT_REGION;
  }

  saveCustomerRegion(DEFAULT_REGION);
  return DEFAULT_REGION;
}