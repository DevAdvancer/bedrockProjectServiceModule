import {
  buildFlavorEnhancementsValue,
  buildServiceFinalValue,
  DealSearchResult,
  DealServiceInput,
} from "@/lib/deal-services";
import { FRESHSALES_PRODUCT_CUSTOM_FIELDS } from "@/lib/freshsales-product-fields";
import {
  FRESHSALES_SERVICE_ORDER_ENTITY_NAME,
  FRESHSALES_SERVICE_ORDER_FIELDS,
} from "@/lib/freshsales-service-order-fields";
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
    id?: number | string;
    name?: string;
    currency?: {
      id?: number;
      name?: string | null;
    } | null;
  };
};

type FreshsalesCustomModuleRecord = {
  id: number | string;
  name?: string | null;
  custom_field?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type FreshsalesServiceOrderRecordResponse = {
  [FRESHSALES_SERVICE_ORDER_ENTITY_NAME]: FreshsalesCustomModuleRecord;
};

type FreshsalesServiceOrderListResponse = {
  [FRESHSALES_SERVICE_ORDER_ENTITY_NAME]: FreshsalesCustomModuleRecord[];
  meta?: {
    total_pages?: number;
    total?: number;
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

export async function freshsalesFetch<T>(path: string, init: RequestInit = {}) {
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
  const catalog = service.catalogDetails;
  const details = [
    `Category: ${service.category}`,
    `Sub Category: ${service.subCategory}`,
    `Universal Platform: ${catalog.universalPlatform || service.universalPlatform}`,
    `Base Service Name: ${service.baseServiceName}`,
    `Flavor / Enhancement: ${
      buildFlavorEnhancementsValue(
        service.flavors,
        service.serviceSpecificEnhancements,
      ) || "None"
    }`,
    `AUI: ${catalog.aui || service.aui || "None"}`,
    `Updated Main Machine: ${
      catalog.updatedMainMachine || service.updatedMainMachine || "None"
    }`,
    `Updated Machine 2: ${
      catalog.updatedMachine2 || service.updatedMachine2 || "None"
    }`,
    `Updated Machine 3: ${
      catalog.updatedMachine3 || service.updatedMachine3 || "None"
    }`,
    `Price (${FRESHSALES_CURRENCY_CODE}): ${service.price ?? 0}`,
  ];

  return details.join(" | ");
}

function buildFreshsalesProductPayload(serviceId: string, service: DealServiceInput) {
  const finalValue = buildServiceFinalValue(service);
  const catalog = service.catalogDetails;

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
          catalog.universalPlatform || service.universalPlatform,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.baseServiceName]:
          service.baseServiceName,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.catalogServiceId]:
          catalog.catalogServiceId,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.status]: catalog.status,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.type]: catalog.itemType,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.flavorEnhancements]:
          buildFlavorEnhancementsValue(
            service.flavors,
            service.serviceSpecificEnhancements,
          ),
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.aui]: catalog.aui || service.aui,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.updatedMainMachine]:
          catalog.updatedMainMachine || service.updatedMainMachine,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.updatedMachine2]:
          catalog.updatedMachine2 || service.updatedMachine2,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.updatedMachine3]:
          catalog.updatedMachine3 || service.updatedMachine3,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.groceryYN]: catalog.groceryYN,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.groceryNeeds]: catalog.groceryNeeds,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.kitchenPrepNeededYN]:
          catalog.kitchenPrepNeededYN,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.kitchenPrepItems]:
          catalog.kitchenPrepItems,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.carryThroughYN]:
          catalog.carryThroughYN,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.carryThroughItems]:
          catalog.carryThroughItems,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.orderItemsFromCC]:
          catalog.orderItemsFromCC,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.ccItems]: catalog.ccItems,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.strategicAttributes]:
          catalog.strategicAttributes,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.exclusivityKeys]:
          catalog.exclusivityKeys,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.staff]: catalog.staff,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.preSupplyTier]: catalog.preSupplyTier,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.twoDayPrice]: catalog.twoDayPrice,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.threeDayPrice]: catalog.threeDayPrice,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.fourDayPrice]: catalog.fourDayPrice,
        [FRESHSALES_PRODUCT_CUSTOM_FIELDS.notes]: catalog.notes,
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

export async function getFreshsalesDeal(dealId: string) {
  const dealDetails = await freshsalesFetch<FreshsalesDealDetailsResponse>(
    `/crm-sandbox/sales/api/deals/${encodeURIComponent(dealId)}?include=currency`,
    {
      method: "GET",
    },
  );

  return dealDetails.deal;
}

export async function getFreshsalesDealAndAssertUsd(dealId: string) {
  const deal = await getFreshsalesDeal(dealId);
  const currencyName = deal.currency?.name;

  if (!isUsdCurrencyName(currencyName)) {
    throw new HttpError(
      400,
      `This deal uses ${currencyName}. The current service sync is configured for USD products only.`,
    );
  }

  return deal;
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

function getServiceOrderViewId() {
  return process.env.FRESHSALES_SERVICE_ORDER_VIEW_ID?.trim() || "127026452340";
}

function buildServiceOrderPayload(
  serviceId: string,
  service: DealServiceInput,
  dealName: string,
) {
  const catalog = service.catalogDetails;

  return {
    [FRESHSALES_SERVICE_ORDER_ENTITY_NAME]: {
      name: service.baseServiceName,
      custom_field: {
        [FRESHSALES_SERVICE_ORDER_FIELDS.serviceOrderId]: serviceId,
        [FRESHSALES_SERVICE_ORDER_FIELDS.dealId]: service.dealId,
        [FRESHSALES_SERVICE_ORDER_FIELDS.dealName]: dealName,
        [FRESHSALES_SERVICE_ORDER_FIELDS.catalogServiceId]:
          catalog.catalogServiceId,
        [FRESHSALES_SERVICE_ORDER_FIELDS.status]: catalog.status,
        [FRESHSALES_SERVICE_ORDER_FIELDS.type]: catalog.itemType,
        [FRESHSALES_SERVICE_ORDER_FIELDS.serviceCategory]: service.category,
        [FRESHSALES_SERVICE_ORDER_FIELDS.serviceSubCategory]: service.subCategory,
        [FRESHSALES_SERVICE_ORDER_FIELDS.baseServiceName]:
          service.baseServiceName,
        [FRESHSALES_SERVICE_ORDER_FIELDS.flavorEnhancements]:
          buildFlavorEnhancementsValue(
            service.flavors,
            service.serviceSpecificEnhancements,
          ),
        [FRESHSALES_SERVICE_ORDER_FIELDS.universalPlatform]:
          catalog.universalPlatform || service.universalPlatform,
        [FRESHSALES_SERVICE_ORDER_FIELDS.aui]: catalog.aui || service.aui,
        [FRESHSALES_SERVICE_ORDER_FIELDS.updatedMainMachine]:
          catalog.updatedMainMachine || service.updatedMainMachine,
        [FRESHSALES_SERVICE_ORDER_FIELDS.updatedMachine2]:
          catalog.updatedMachine2 || service.updatedMachine2,
        [FRESHSALES_SERVICE_ORDER_FIELDS.updatedMachine3]:
          catalog.updatedMachine3 || service.updatedMachine3,
        [FRESHSALES_SERVICE_ORDER_FIELDS.groceryYN]: catalog.groceryYN,
        [FRESHSALES_SERVICE_ORDER_FIELDS.groceryNeeds]: catalog.groceryNeeds,
        [FRESHSALES_SERVICE_ORDER_FIELDS.kitchenPrepNeededYN]:
          catalog.kitchenPrepNeededYN,
        [FRESHSALES_SERVICE_ORDER_FIELDS.kitchenPrepItems]:
          catalog.kitchenPrepItems,
        [FRESHSALES_SERVICE_ORDER_FIELDS.carryThroughYN]:
          catalog.carryThroughYN,
        [FRESHSALES_SERVICE_ORDER_FIELDS.carryThroughItems]:
          catalog.carryThroughItems,
        [FRESHSALES_SERVICE_ORDER_FIELDS.orderItemsFromCC]:
          catalog.orderItemsFromCC,
        [FRESHSALES_SERVICE_ORDER_FIELDS.ccItems]: catalog.ccItems,
        [FRESHSALES_SERVICE_ORDER_FIELDS.strategicAttributes]:
          catalog.strategicAttributes,
        [FRESHSALES_SERVICE_ORDER_FIELDS.exclusivityKeys]:
          catalog.exclusivityKeys,
        [FRESHSALES_SERVICE_ORDER_FIELDS.staff]: catalog.staff,
        [FRESHSALES_SERVICE_ORDER_FIELDS.preSupplyTier]: catalog.preSupplyTier,
        [FRESHSALES_SERVICE_ORDER_FIELDS.twoDayPrice]: catalog.twoDayPrice,
        [FRESHSALES_SERVICE_ORDER_FIELDS.threeDayPrice]: catalog.threeDayPrice,
        [FRESHSALES_SERVICE_ORDER_FIELDS.fourDayPrice]: catalog.fourDayPrice,
        [FRESHSALES_SERVICE_ORDER_FIELDS.notes]: catalog.notes,
        [FRESHSALES_SERVICE_ORDER_FIELDS.price]: service.price ?? 0,
        [FRESHSALES_SERVICE_ORDER_FIELDS.finalValue]:
          buildServiceFinalValue(service),
      },
    },
  };
}

export async function listFreshsalesServiceOrders() {
  const allRecords: FreshsalesCustomModuleRecord[] = [];
  const viewId = getServiceOrderViewId();
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const params = new URLSearchParams({
      per_page: "100",
      page: String(page),
      sort: FRESHSALES_SERVICE_ORDER_FIELDS.serviceOrderId,
      sort_type: "asc",
    });
    const response = await freshsalesFetch<FreshsalesServiceOrderListResponse>(
      `/crm-sandbox/sales/api/custom_module/${encodeURIComponent(
        FRESHSALES_SERVICE_ORDER_ENTITY_NAME,
      )}/view/${encodeURIComponent(viewId)}?${params.toString()}`,
      {
        method: "GET",
      },
    );

    allRecords.push(
      ...(response[FRESHSALES_SERVICE_ORDER_ENTITY_NAME] ?? []),
    );
    totalPages = Math.max(response.meta?.total_pages ?? 1, 1);
    page += 1;
  }

  return allRecords;
}

export async function createFreshsalesServiceOrder(
  serviceId: string,
  service: DealServiceInput,
  dealName: string,
) {
  const response = await freshsalesFetch<FreshsalesServiceOrderRecordResponse>(
    `/crm-sandbox/sales/api/custom_module/${encodeURIComponent(
      FRESHSALES_SERVICE_ORDER_ENTITY_NAME,
    )}`,
    {
      method: "POST",
      body: JSON.stringify(buildServiceOrderPayload(serviceId, service, dealName)),
    },
  );

  return response[FRESHSALES_SERVICE_ORDER_ENTITY_NAME];
}

export async function updateFreshsalesServiceOrder(
  recordId: string | number,
  serviceId: string,
  service: DealServiceInput,
  dealName: string,
) {
  const response = await freshsalesFetch<FreshsalesServiceOrderRecordResponse>(
    `/crm-sandbox/sales/api/custom_module/${encodeURIComponent(
      FRESHSALES_SERVICE_ORDER_ENTITY_NAME,
    )}/${encodeURIComponent(String(recordId))}`,
    {
      method: "PUT",
      body: JSON.stringify(buildServiceOrderPayload(serviceId, service, dealName)),
    },
  );

  return response[FRESHSALES_SERVICE_ORDER_ENTITY_NAME];
}

export async function deleteFreshsalesServiceOrder(recordId: string | number) {
  return freshsalesFetch<{ message?: string }>(
    `/crm-sandbox/sales/api/custom_module/${encodeURIComponent(
      FRESHSALES_SERVICE_ORDER_ENTITY_NAME,
    )}/${encodeURIComponent(String(recordId))}`,
    {
      method: "DELETE",
    },
  );
}
