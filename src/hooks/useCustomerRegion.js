import { useEffect, useState } from "react";
import {
  detectCustomerRegion,
  getRegionByCountry,
  saveCustomerRegion,
} from "@/utils/customerRegion";

export function useCustomerRegion() {
  const [customerRegion, setCustomerRegion] = useState(null);

  useEffect(() => {
    async function loadRegion() {
      const region = await detectCustomerRegion();
      setCustomerRegion(region);
    }

    loadRegion();
  }, []);

  const changeRegion = (countryCode) => {
    const region = getRegionByCountry(countryCode);
    saveCustomerRegion(region);
    setCustomerRegion(region);
  };

  return {
    customerRegion,
    displayCurrency: customerRegion?.currency || "INR",
    changeRegion,
  };
}