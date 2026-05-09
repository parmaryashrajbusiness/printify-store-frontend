import { convertMoney } from "@/utils/currency";

export function getProductDisplayVariant(product) {
  if (!Array.isArray(product?.variants) || product.variants.length === 0) {
    return null;
  }

  return (
    product.variants.find(
      (variant) =>
        variant.enabled &&
        String(variant.size || "").toUpperCase() === "S"
    ) ||
    product.variants.find((variant) => variant.enabled) ||
    product.variants[0]
  );
}

export function getProductDisplayPricing(product, customerRegion, selectedVariant = null) {
  const displayCurrency = customerRegion?.currency || "INR";
  const variant = selectedVariant || getProductDisplayVariant(product);

  const baseCurrency = variant?.currency || product?.currency || "INR";

  return {
    displayCurrency,
    displayPrice: convertMoney(
      variant?.price ?? product?.price ?? 0,
      baseCurrency,
      displayCurrency
    ),
    displayCompareAt: convertMoney(
      variant?.compareAtPrice ??
        product?.compareAtPrice ??
        product?.compareAt ??
        0,
      baseCurrency,
      displayCurrency
    ),
  };
}

export function getCartDisplayPricing(item, customerRegion) {
  const displayCurrency = customerRegion?.currency || "INR";

  const baseCurrency =
    item.currency ||
    item.unitCurrency ||
    item.productCurrency ||
    "INR";

  const unitPrice = convertMoney(
    Number(item.unitPrice || item.price || 0),
    baseCurrency,
    displayCurrency
  );

  return {
    displayCurrency,
    unitPrice,
    lineTotal: unitPrice * Number(item.quantity || 0),
  };
}