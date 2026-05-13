import { convertMoney } from "@/utils/currency";

function numberValue(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) {
      return number;
    }
  }

  return 0;
}

function getProviderVariantPrice(variant, product, provider) {
  const normalizedProvider = String(provider || "").toUpperCase();

  if (normalizedProvider === "QIKINK") {
    return {
      price: numberValue(
        variant?.qikinkPrice,
        variant?.indiaPrice,
        variant?.inrPrice,
        variant?.price,
        product?.qikinkPrice,
        product?.indiaPrice,
        product?.price
      ),
      compareAt: numberValue(
        variant?.qikinkCompareAtPrice,
        variant?.indiaCompareAtPrice,
        variant?.compareAtPrice,
        product?.qikinkCompareAtPrice,
        product?.compareAtPrice,
        product?.compareAt
      ),
      currency:
        variant?.qikinkCurrency ||
        variant?.indiaCurrency ||
        product?.qikinkCurrency ||
        product?.currency ||
        "INR",
    };
  }

  return {
    price: numberValue(
      variant?.printifyPrice,
      variant?.globalPrice,
      variant?.usdPrice,
      variant?.price,
      product?.printifyPrice,
      product?.globalPrice,
      product?.price
    ),
    compareAt: numberValue(
      variant?.printifyCompareAtPrice,
      variant?.globalCompareAtPrice,
      variant?.compareAtPrice,
      product?.printifyCompareAtPrice,
      product?.compareAtPrice,
      product?.compareAt
    ),
    currency:
      variant?.printifyCurrency ||
      variant?.globalCurrency ||
      product?.printifyCurrency ||
      product?.currency ||
      "USD",
  };
}

export function getProductDisplayVariant(product, customerRegion = null) {
  if (!Array.isArray(product?.variants) || product.variants.length === 0) {
    return null;
  }

  const provider = String(customerRegion?.provider || "").toUpperCase();

  const providerEnabledVariant = product.variants.find((variant) => {
    if (variant.enabled === false) return false;

    if (provider === "QIKINK") {
      return Boolean(
        variant.qikinkEnabled !== false &&
          (variant.qikinkSku || variant.providerSku || variant.sku || variant.printifyVariantId)
      );
    }

    if (provider === "PRINTIFY") {
      return Boolean(
        variant.printifyEnabled !== false &&
          (variant.printifyVariantId || variant.providerVariantId)
      );
    }

    return true;
  });

  return (
    providerEnabledVariant ||
    product.variants.find((variant) => variant.enabled !== false) ||
    product.variants[0]
  );
}

export function getProductDisplayPricing(product, customerRegion, selectedVariant = null) {
  const displayCurrency = customerRegion?.currency || "INR";
  const provider = customerRegion?.provider || product?.fulfillmentProvider || "QIKINK";
  const variant = selectedVariant || getProductDisplayVariant(product, customerRegion);
  const providerPrice = getProviderVariantPrice(variant, product, provider);

  return {
    displayCurrency,
    displayPrice: convertMoney(
      providerPrice.price,
      providerPrice.currency,
      displayCurrency
    ),
    displayCompareAt: providerPrice.compareAt
      ? convertMoney(providerPrice.compareAt, providerPrice.currency, displayCurrency)
      : 0,
  };
}

export function getCartDisplayPricing(item, customerRegion) {
  const displayCurrency = customerRegion?.currency || "INR";
  const provider = customerRegion?.provider || item?.fulfillmentProvider || "";

  const baseCurrency =
    item.currency ||
    item.unitCurrency ||
    item.productCurrency ||
    item.originalCurrency ||
    (provider === "PRINTIFY" ? "USD" : "INR");

  const unitPrice = convertMoney(
    numberValue(
      item.unitPrice,
      item.price,
      item.displayPrice,
      item.productPrice,
      item.originalUnitPrice
    ),
    baseCurrency,
    displayCurrency
  );

  return {
    displayCurrency,
    unitPrice,
    lineTotal: unitPrice * Number(item.quantity || 0),
  };
}