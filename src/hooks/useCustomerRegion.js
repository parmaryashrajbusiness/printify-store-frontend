import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/api/http";

const STORAGE_KEY = "customerRegionCountry";
const REGION_CHANGED_EVENT = "customer-region-changed";

const FALLBACK_PROVIDER_STATUS = {
  mode: "HYBRID",
  qikinkEnabled: true,
  printifyEnabled: true,
  autoFulfillmentEnabled: false,
};

export function getDefaultCountry(providerStatus) {
  const mode = String(providerStatus?.mode || "").toUpperCase();

  if (mode === "PRINTIFY") return "US";
  if (mode === "QIKINK") return "IN";

  return "IN"; // HYBRID default
}

export function getCountryConfig(country, providerStatus) {
  const mode = String(providerStatus?.mode || "").toUpperCase();
  const selectedCountry = String(country || getDefaultCountry(providerStatus)).toUpperCase();

  if (mode === "QIKINK") {
    return {
      country: "IN",
      provider: "QIKINK",
      currency: "INR",
      countryName: "India",
      label: "India",
      regionLocked: true,
      availableCountries: [
        { code: "IN", label: "India", currency: "INR" },
      ],
    };
  }

  if (mode === "PRINTIFY") {
    const printifyCountry = selectedCountry === "AU" ? "AU" : "US";

    return {
      country: printifyCountry,
      provider: "PRINTIFY",
      currency: printifyCountry === "AU" ? "AUD" : "USD",
      countryName: printifyCountry === "AU" ? "Australia" : "United States",
      label: printifyCountry === "AU" ? "Australia" : "United States",
      regionLocked: false,
      availableCountries: [
        { code: "US", label: "United States", currency: "USD" },
        { code: "AU", label: "Australia", currency: "AUD" },
      ],
    };
  }

  // HYBRID
  const availableCountries = [
    { code: "IN", label: "India", currency: "INR" },
    { code: "US", label: "United States", currency: "USD" },
    { code: "AU", label: "Australia", currency: "AUD" },
  ];

  if (selectedCountry === "IN") {
    return {
      country: "IN",
      provider: "QIKINK",
      currency: "INR",
      countryName: "India",
      label: "India",
      regionLocked: false,
      availableCountries,
    };
  }

  if (selectedCountry === "AU") {
    return {
      country: "AU",
      provider: "PRINTIFY",
      currency: "AUD",
      countryName: "Australia",
      label: "Australia",
      regionLocked: false,
      availableCountries,
    };
  }

  return {
    country: "US",
    provider: "PRINTIFY",
    currency: "USD",
    countryName: "United States",
    label: "United States",
    regionLocked: false,
    availableCountries,
  };
}

export function useCustomerRegion() {
  const [providerStatus, setProviderStatus] = useState(FALLBACK_PROVIDER_STATUS);

  const [country, setCountryState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "";
  });

  useEffect(() => {
    async function loadProviderStatus() {
      try {
        const status = await apiFetch("/providers/status", { auth: false });
        setProviderStatus(status || FALLBACK_PROVIDER_STATUS);
      } catch (err) {
        console.error("Could not load provider status:", err);
        setProviderStatus(FALLBACK_PROVIDER_STATUS);
      }
    }

    loadProviderStatus();
  }, []);

  const setCountry = useCallback((nextCountry) => {
    const cleanCountry = String(nextCountry || "").toUpperCase();

    localStorage.setItem(STORAGE_KEY, cleanCountry);
    setCountryState(cleanCountry);

    window.dispatchEvent(
      new CustomEvent(REGION_CHANGED_EVENT, {
        detail: { country: cleanCountry },
      })
    );
  }, []);

  useEffect(() => {
    const syncCountry = (event) => {
      const eventCountry = event?.detail?.country;

      if (eventCountry) {
        setCountryState(eventCountry);
        return;
      }

      setCountryState(localStorage.getItem(STORAGE_KEY) || "");
    };

    window.addEventListener("storage", syncCountry);
    window.addEventListener(REGION_CHANGED_EVENT, syncCountry);

    return () => {
      window.removeEventListener("storage", syncCountry);
      window.removeEventListener(REGION_CHANGED_EVENT, syncCountry);
    };
  }, []);

  useEffect(() => {
    const defaultCountry = getDefaultCountry(providerStatus);
    const currentCountry = localStorage.getItem(STORAGE_KEY);

    const mode = String(providerStatus?.mode || "").toUpperCase();

    const allowedCountries =
      mode === "QIKINK"
        ? ["IN"]
        : mode === "PRINTIFY"
          ? ["US", "AU"]
          : ["IN", "US", "AU"];

    if (!currentCountry || !allowedCountries.includes(currentCountry)) {
      setCountry(defaultCountry);
    }
  }, [providerStatus, setCountry]);

  const customerRegion = useMemo(() => {
    return getCountryConfig(country || getDefaultCountry(providerStatus), providerStatus);
  }, [country, providerStatus]);

  return {
    country,
    selectedCountry: customerRegion.country,
    setCountry,
    providerStatus,
    customerRegion,
  };
}