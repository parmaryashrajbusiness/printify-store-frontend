import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/api/http";
import {
  FALLBACK_PROVIDER_STATUS,
  getAvailableCountries,
  getCountryConfig,
  getDefaultCountry,
  isCountryAllowed,
  isRegionLocked,
  normalizeProviderStatus,
} from "@/utils/customerRegion";

const STORAGE_KEY = "customerRegionCountry";

async function fetchProviderStatus() {
  try {
    return await apiFetch("/providers/status", { auth: false });
  } catch {
    return FALLBACK_PROVIDER_STATUS;
  }
}

export function useCustomerRegion() {
  const [providerStatus, setProviderStatus] = useState(FALLBACK_PROVIDER_STATUS);
  const [country, setCountry] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "IN";
  });
  const [loadingRegion, setLoadingRegion] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadStatus() {
      const status = normalizeProviderStatus(await fetchProviderStatus());

      if (!mounted) return;

      const savedCountry = localStorage.getItem(STORAGE_KEY);
      const nextCountry = isCountryAllowed(savedCountry, status)
        ? savedCountry
        : getDefaultCountry(status);

      setProviderStatus(status);
      setCountry(nextCountry);
      localStorage.setItem(STORAGE_KEY, nextCountry);
      setLoadingRegion(false);
    }

    loadStatus();

    return () => {
      mounted = false;
    };
  }, []);

  const availableCountries = useMemo(() => {
    return getAvailableCountries(providerStatus);
  }, [providerStatus]);

  const regionConfig = useMemo(() => {
    return getCountryConfig(country, providerStatus);
  }, [country, providerStatus]);

  const changeRegion = useCallback(
    (nextCountry) => {
      const normalizedCountry = String(nextCountry || "").toUpperCase();

      if (!isCountryAllowed(normalizedCountry, providerStatus)) {
        return false;
      }

      setCountry(normalizedCountry);
      localStorage.setItem(STORAGE_KEY, normalizedCountry);
      window.dispatchEvent(
        new CustomEvent("customer-region-changed", {
          detail: { country: normalizedCountry },
        })
      );

      return true;
    },
    [providerStatus]
  );

  return {
    loadingRegion,
    providerStatus,
    availableCountries,
    regionLocked: isRegionLocked(providerStatus),

    customerRegion: {
      ...regionConfig,
      country: regionConfig.code,
      provider: regionConfig.provider,
      currency: regionConfig.currency,
      paymentProvider: regionConfig.paymentProvider,
      paymentProviders: regionConfig.paymentProviders,
      availableCountries,
      regionLocked: isRegionLocked(providerStatus),
      providerStatus,
    },

    changeRegion,
    refreshProviderStatus: async () => {
      const status = normalizeProviderStatus(await fetchProviderStatus());
      const nextCountry = isCountryAllowed(country, status)
        ? country
        : getDefaultCountry(status);

      setProviderStatus(status);
      setCountry(nextCountry);
      localStorage.setItem(STORAGE_KEY, nextCountry);

      return status;
    },
  };
}