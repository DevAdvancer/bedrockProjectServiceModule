import {
  arrayToCsv,
  DealSearchResult,
  DealServiceInput,
  buildServiceFinalValue,
} from "@/lib/deal-services";
import { FRESHSALES_PRODUCT_CUSTOM_FIELDS } from "@/lib/freshsales-product-fields";
import { HttpError } from "@/lib/http-error";

type FreshsalesErrorPayload = {
  errors?: Array<{ message?: string }> | { code?: number; message?: string[] | string };
  message?: string;
  description?: string;
};

type FreshsalesProductResponse = {
  product: {
    id: number;
  };
};

type FreshsalesProductPricing = {
  id?: number;
  currency_code: string;
  unit_price: number;
  billing_cycle?: number | null;
  billing_type?: number | null;
  setup_fee?: number | null;
  is_locked?: boolean;
};

type FreshsalesProductDetailsResponse = {
  product: {
    id: number;
    pricing_type?: number | null;
    product_pricings?: FreshsalesProductPricing[];
  };
};

type FreshsalesDealDetailsResponse = {
  deal: {
    name?: string;
    currency?: {
      id?: number;
      name?: string | null;
    } | null;
  };
};

export type FreshsalesDealProductLineItem = {
  id: number;
  quantity: number;
  unitPrice: number;
};

const FRESHSALES_CURRENCY_CODE = "USD";

function getFreshsalesConfig() {
  const rawBaseUrl = process.env.FRESHSALES_BASE_URL?.trim();
  const apiKey = process.env.FRESHSALES_API_KEY?.trim();

  if (!rawBaseUrl || !apiKey) {
    throw new HttpError(
      500,
      "FRESHSALES_BASE_URL and FRESHSALES_API_KEY must be configured.",
    );
  }

  let baseUrl: string;

  try {
    baseUrl = new URL(rawBaseUrl).origin;
  } catch {
    throw new HttpError(500, "FRESHSALES_BASE_URL must be a valid URL.");
  }

  return { baseUrl, apiKey };
}

async function parseResponse<T>(response: Response) {
  const text = await response.text();
  let parsed: T | FreshsalesErrorPayload | null = null;

  if (text) {
    try {
      parsed = JSON.parse(text) as T | FreshsalesErrorPayload;
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const errorPayload = parsed as FreshsalesErrorPayload | null;
    let extractedMessage: string | undefined;

    if (errorPayload?.errors) {
      if (Array.isArray(errorPayload.errors)) {
        extractedMessage = errorPayload.errors[0]?.message;
      } else if (typeof errorPayload.errors === "object") {
        const errObj = errorPayload.errors as { message?: string | string[] };
        const msg = errObj.message;
        if (Array.isArray(msg) && msg.length > 0) {
          extractedMessage = msg[0];
        } else if (typeof msg === "string") {
          extractedMessage = msg;
        }
      }
    }

    const message =
      extractedMessage ??
      errorPayload?.message ??
      errorPayload?.description ??
      (text || undefined) ??
      `Freshsales request failed with status ${response.status}.`;

    throw new HttpError(response.status === 401 ? 401 : 502, message);
  }

  return parsed as T;
}

async function freshsalesFetch<T>(path: string, init: RequestInit = {}) {
  const { baseUrl, apiKey } = getFreshsalesConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Token token=${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  return parseResponse<T>(response);
}

function buildFreshsalesProductName(service: DealServiceInput) {
  return service.baseServiceName;
}

function buildFreshsalesProductDescription(service: DealServiceInput) {
  const details = [
    `Category: ${service.category}`,
    `Sub Category: ${service.subCategory}`,
    `Universal Platform: ${service.universalPlatform}`,
    `Base Service Name: ${service.baseServiceName}`,
    `Flavors: ${arrayToCsv(service.flavors) || "None"}`,
    `Service-Specific Enhancements: ${
      arrayToCsv(service.serviceSpecificEnhancements) || "None"
    }`,
    `AUI: ${service.aui || "None"}`,
    `Updated Main Machine: ${service.updatedMainMachine || "None"}`,
    `Updated Machine 2: ${service.updatedMachine2 || "None"}`,
    `Updated Machine 3: ${service.updatedMachine3 || "None"}`,
    `Price (${FRESHSALES_CURRENCY_CODE}): ${service.price ?? 0}`,
  ];

  return details.join(" | ");
}

function buildFreshsalesProductPayload(serviceId: string, service: DealServiceInput) {
  const finalValue = buildServiceFinalValue(service);

  return {
    product: {
      name: buildFreshsalesProductName(service),
      category: service.category,
      description: buildFreshsalesProductDescription(service),
      product_code: serviceId,
      sku_number: serviceId,
      is_active: true,
      custom_field: {
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.serviceCategory]: service.category,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.serviceSubCategory]: service.subCategory,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.universalPlatform]:
          service.universalPlatform,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.baseServiceName]:
          service.baseServiceName,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.flavors]: arrayToCsv(service.flavors),
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.serviceSpecificEnhancements]:
          arrayToCsv(service.serviceSpecificEnhancements),
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.aui]: service.aui,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.updatedMainMachine]:
          service.updatedMainMachine,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.updatedMachine2]: service.updatedMachine2,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.updatedMachine3]: service.updatedMachine3,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.finalValue]: finalValue,
      },
    },
  };
}

function isUsdCurrencyName(currencyName?: string | null) {
  if (!currencyName) {
    return true;
  }

  const normalizedCurrencyName = currencyName.trim().toUpperCase();
  return (
    normalizedCurrencyName === FRESHSALES_CURRENCY_CODE ||
    normalizedCurrencyName.includes("USD") ||
    normalizedCurrencyName.includes("US DOLLAR")
  );
}

function toProductPricingPayload(pricing: FreshsalesProductPricing) {
  return {
    ...(typeof pricing.id === "number" ? { id: pricing.id } : {}),
    currency_code: pricing.currency_code,
    unit_price: pricing.unit_price,
    billing_cycle: pricing.billing_cycle ?? null,
    billing_type: pricing.billing_type ?? null,
    setup_fee: pricing.setup_fee ?? null,
  };
}

async function getFreshsalesProduct(productId: number) {
  return freshsalesFetch<FreshsalesProductDetailsResponse>(
    `/crm-sandbox/sales/api/cpq/products/${encodeURIComponent(
      String(productId),
    )}?include=product_pricings`,
    {
      method: "GET",
    },
  );
}

async function syncFreshsalesProductUsdPricing(productId: number, unitPrice: number) {
  const productDetails = await getFreshsalesProduct(productId);
  const pricingType = productDetails.product.pricing_type ?? 1;
  const existingPricings = productDetails.product.product_pricings ?? [];
  const usdPricingIndex = existingPricings.findIndex(
    (pricing) => pricing.currency_code === FRESHSALES_CURRENCY_CODE,
  );

  const nextPricings =
    usdPricingIndex >= 0
      ? existingPricings.map((pricing, index) =>
          index === usdPricingIndex
            ? {
                ...pricing,
                currency_code: FRESHSALES_CURRENCY_CODE,
                unit_price: unitPrice,
              }
            : pricing,
        )
      : [
          ...existingPricings,
          {
            currency_code: FRESHSALES_CURRENCY_CODE,
            unit_price: unitPrice,
            billing_cycle: null,
            billing_type: null,
            setup_fee: null,
          },
        ];

  return freshsalesFetch(
    `/crm-sandbox/sales/api/cpq/products/${encodeURIComponent(
      String(productId),
    )}?include=product_pricings`,
    {
      method: "PUT",
      body: JSON.stringify({
        product: {
          ...(existingPricings.length === 0 ? { pricing_type: pricingType } : {}),
          product_pricings: nextPricings.map(toProductPricingPayload),
        },
      }),
    },
  );
}

export async function getFreshsalesDealAndAssertUsd(dealId: string) {
  const dealDetails = await freshsalesFetch<FreshsalesDealDetailsResponse>(
    `/crm-sandbox/sales/api/deals/${encodeURIComponent(dealId)}?include=currency`,
    {
      method: "GET",
    },
  );
  const currencyName = dealDetails.deal.currency?.name;

  if (!isUsdCurrencyName(currencyName)) {
    throw new HttpError(
      400,
      `This deal uses ${currencyName}. The current service sync is configured for USD products only.`,
    );
  }
  
  return dealDetails.deal;
}

export async function searchFreshsalesDeals(query: string) {
  const params = new URLSearchParams({
    q: query,
    include: "deal",
    per_page: "10",
  });

  const results = await freshsalesFetch<DealSearchResult[]>(
    `/crm-sandbox/sales/api/search?${params.toString()}`,
    { method: "GET" },
  );

  return results.filter((item) => item.type === "deal" || !item.type);
}

export async function createFreshsalesProduct(
  serviceId: string,
  service: DealServiceInput,
) {
  const response = await freshsalesFetch<FreshsalesProductResponse>(
    "/crm-sandbox/sales/api/cpq/products",
    {
      method: "POST",
      body: JSON.stringify(buildFreshsalesProductPayload(serviceId, service)),
    },
  );

  await syncFreshsalesProductUsdPricing(response.product.id, service.price ?? 0);
  return response.product.id;
}

export async function updateFreshsalesProduct(
  productId: number,
  serviceId: string,
  service: DealServiceInput,
) {
  const response = await freshsalesFetch<FreshsalesProductResponse>(
    `/crm-sandbox/sales/api/cpq/products/${encodeURIComponent(String(productId))}`,
    {
      method: "PUT",
      body: JSON.stringify(buildFreshsalesProductPayload(serviceId, service)),
    },
  );

  await syncFreshsalesProductUsdPricing(response.product.id, service.price ?? 0);
  return response.product.id;
}

export async function deleteFreshsalesProduct(productId: number) {
  return freshsalesFetch<boolean>(
    `/crm-sandbox/sales/api/cpq/products/${encodeURIComponent(String(productId))}`,
    {
      method: "DELETE",
    },
  );
}

export async function syncFreshsalesDealProducts(
  dealId: string,
  products: FreshsalesDealProductLineItem[],
) {
  await getFreshsalesDealAndAssertUsd(dealId);

  return freshsalesFetch(
    `/crm-sandbox/sales/api/deals/${encodeURIComponent(dealId)}?include=products`,
    {
      method: "PUT",
      body: JSON.stringify({
        deal: {
          products: products.map((product) => ({
            id: product.id,
            quantity: product.quantity,
            unit_price: product.unitPrice,
          })),
        },
      }),
    },
  );
}
