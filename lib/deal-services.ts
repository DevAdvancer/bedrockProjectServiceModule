import {
  getReadOnlyServiceDetailValues,
  ReadOnlyServiceDetailValues,
  ServiceCatalogRow,
} from "@/lib/service-catalog";

export type YesNo = "Yes" | "No";
export type AuiValue = string;

export type DealSearchResult = {
  id: string;
  name: string;
  type?: string;
};

export type ServiceFormValues = {
  category: string;
  subCategory: string;
  baseServiceName: string;
  flavors: string[];
  serviceSpecificEnhancements: string[];
  universalPlatform: string;
  aui: AuiValue;
  updatedMainMachine: string;
  updatedMachine2: string;
  updatedMachine3: string;
  price: number | null;
  catalogDetails: ReadOnlyServiceDetailValues;
};

export type DealServiceInput = ServiceFormValues & {
  dealId: string;
};

export type PersistedDealService = DealServiceInput & {
  id: string;
  finalValue: string;
  freshsalesProductId?: number;
  createdAt?: string;
  updatedAt?: string;
};

type FlavorEnhancementSections = {
  flavors: string[];
  serviceSpecificEnhancements: string[];
};

export const EMPTY_READ_ONLY_SERVICE_DETAILS: ReadOnlyServiceDetailValues = {
  status: "",
  catalogServiceId: "",
  itemType: "",
  universalPlatform: "",
  aui: "",
  updatedMainMachine: "",
  updatedMachine2: "",
  updatedMachine3: "",
  groceryYN: "",
  groceryNeeds: "",
  kitchenPrepNeededYN: "",
  kitchenPrepItems: "",
  carryThroughYN: "",
  carryThroughItems: "",
  orderItemsFromCC: "",
  ccItems: "",
  strategicAttributes: "",
  exclusivityKeys: "",
  staff: "",
  preSupplyTier: "",
  twoDayPrice: "",
  threeDayPrice: "",
  fourDayPrice: "",
  notes: "",
};

function normalizeText(value: string) {
  return value.trim();
}

function parseCatalogPrice(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "n/a") {
    return null;
  }

  const parsed = Number(normalized.replace(/[$,]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function normalizeStringArray(values: string[]) {
  return Array.from(
    new Set(values.map((value) => normalizeText(value)).filter(Boolean)),
  );
}

export function arrayToCsv(values: string[]) {
  return normalizeStringArray(values).join(",");
}

export function csvToArray(value?: string | null) {
  if (!value) {
    return [];
  }

  return normalizeStringArray(value.split(","));
}

export function buildFlavorEnhancementsValue(
  flavors: string[],
  serviceSpecificEnhancements: string[],
) {
  const normalizedFlavors = normalizeStringArray(flavors);
  const normalizedEnhancements = normalizeStringArray(serviceSpecificEnhancements);
  return arrayToCsv([...normalizedFlavors, ...normalizedEnhancements]);
}

export function parseFlavorEnhancementsValue(
  value?: string | null,
): FlavorEnhancementSections {
  const rawValue = typeof value === "string" ? value.trim() : "";

  if (!rawValue) {
    return {
      flavors: [],
      serviceSpecificEnhancements: [],
    };
  }

  const result: FlavorEnhancementSections = {
    flavors: [],
    serviceSpecificEnhancements: [],
  };
  let currentSection: keyof FlavorEnhancementSections | null = null;
  const lines = rawValue
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (/^flavors:?$/i.test(line)) {
      currentSection = "flavors";
      continue;
    }

    if (/^enhancements:?$/i.test(line)) {
      currentSection = "serviceSpecificEnhancements";
      continue;
    }

    const listItemMatch = line.match(/^-\s+(.+)$/);
    if (listItemMatch && currentSection) {
      result[currentSection].push(listItemMatch[1]);
      continue;
    }
  }

  if (
    result.flavors.length > 0 ||
    result.serviceSpecificEnhancements.length > 0
  ) {
    return {
      flavors: normalizeStringArray(result.flavors),
      serviceSpecificEnhancements: normalizeStringArray(
        result.serviceSpecificEnhancements,
      ),
    };
  }

  const legacySections = rawValue.split("|").map((section) => section.trim());

  for (const section of legacySections) {
    const [label, ...rest] = section.split(":");
    const parsedValue = rest.join(":").trim();

    if (!parsedValue) {
      continue;
    }

    if (/^flavor(s)?$/i.test(label.trim())) {
      result.flavors.push(
        ...parsedValue.split(",").map((item) => item.trim()).filter(Boolean),
      );
      continue;
    }

    if (/^enhancement(s)?$/i.test(label.trim())) {
      result.serviceSpecificEnhancements.push(
        ...parsedValue.split(",").map((item) => item.trim()).filter(Boolean),
      );
    }
  }

  if (
    result.flavors.length > 0 ||
    result.serviceSpecificEnhancements.length > 0
  ) {
    return {
      flavors: normalizeStringArray(result.flavors),
      serviceSpecificEnhancements: normalizeStringArray(
        result.serviceSpecificEnhancements,
      ),
    };
  }

  return {
    flavors: [rawValue],
    serviceSpecificEnhancements: [],
  };
}

export function buildServiceFinalValue(
  service: Pick<
    ServiceFormValues,
    | "category"
    | "subCategory"
    | "baseServiceName"
    | "flavors"
    | "serviceSpecificEnhancements"
  >,
) {
  const category = normalizeText(service.category);
  const subCategory = normalizeText(service.subCategory);
  const baseServiceName = normalizeText(service.baseServiceName);
  const normalizedFlavors = normalizeStringArray(service.flavors);
  const normalizedEnhancements = normalizeStringArray(
    service.serviceSpecificEnhancements,
  );
  const selectedItems =
    normalizedFlavors.length > 0 ? normalizedFlavors : normalizedEnhancements;

  if (!category || !subCategory || !baseServiceName || selectedItems.length === 0) {
    return "";
  }

  return `${category}_${subCategory}_${baseServiceName}|${selectedItems.join(",")}`;
}

export function buildCombinedFinalValue(
  services: Array<
    | { finalValue: string }
    | Pick<
        ServiceFormValues,
        | "category"
        | "subCategory"
        | "baseServiceName"
        | "flavors"
        | "serviceSpecificEnhancements"
      >
  >,
) {
  return services
    .map((service) =>
      "finalValue" in service ? service.finalValue.trim() : buildServiceFinalValue(service),
    )
    .filter(Boolean)
    .join(";");
}

export function parseDealServicePayload(
  payload: unknown,
  serviceMaps: ServiceCatalogRow[],
) {
  if (!payload || typeof payload !== "object") {
    return {
      success: false as const,
      error: "A service payload is required.",
    };
  }

  const data = payload as Record<string, unknown>;
  const dealId = typeof data.dealId === "string" ? data.dealId.trim() : "";
  const category = typeof data.category === "string" ? data.category.trim() : "";
  const subCategory =
    typeof data.subCategory === "string" ? data.subCategory.trim() : "";
  const baseServiceName =
    typeof data.baseServiceName === "string" ? data.baseServiceName.trim() : "";
  const flavors = Array.isArray(data.flavors)
    ? normalizeStringArray(data.flavors.filter((item): item is string => typeof item === "string"))
    : [];
  const serviceSpecificEnhancements = Array.isArray(data.serviceSpecificEnhancements)
    ? normalizeStringArray(
        data.serviceSpecificEnhancements.filter(
          (item): item is string => typeof item === "string",
        ),
      )
    : [];
  const universalPlatform =
    typeof data.universalPlatform === "string" ? data.universalPlatform.trim() : "";
  const submittedAuiValue = typeof data.aui === "string" ? data.aui.trim() : "";
  const submittedUpdatedMainMachine =
    typeof data.updatedMainMachine === "string"
      ? data.updatedMainMachine.trim()
      : "";
  const submittedUpdatedMachine2 =
    typeof data.updatedMachine2 === "string" ? data.updatedMachine2.trim() : "";
  const submittedUpdatedMachine3 =
    typeof data.updatedMachine3 === "string" ? data.updatedMachine3.trim() : "";
  const rawPrice = data.price;
  const submittedPrice =
    typeof rawPrice === "number"
      ? rawPrice
      : typeof rawPrice === "string" && rawPrice.trim()
        ? Number(rawPrice)
        : null;
  const catalogDetails = getReadOnlyServiceDetailValues(
    serviceMaps,
    category,
    subCategory,
    universalPlatform,
    baseServiceName,
    flavors,
    serviceSpecificEnhancements,
  );
  const derivedPrice =
    parseCatalogPrice(catalogDetails.twoDayPrice) ??
    parseCatalogPrice(catalogDetails.threeDayPrice) ??
    parseCatalogPrice(catalogDetails.fourDayPrice) ??
    0;
  const price =
    submittedPrice !== null && !Number.isNaN(submittedPrice)
      ? submittedPrice
      : derivedPrice;
  const effectiveUniversalPlatform =
    catalogDetails.universalPlatform || universalPlatform;
  const auiValue = catalogDetails.aui || submittedAuiValue;
  const updatedMainMachine =
    catalogDetails.updatedMainMachine || submittedUpdatedMainMachine;
  const updatedMachine2 = catalogDetails.updatedMachine2 || submittedUpdatedMachine2;
  const updatedMachine3 = catalogDetails.updatedMachine3 || submittedUpdatedMachine3;

  if (!dealId) {
    return {
      success: false as const,
      error: "A Freshsales deal must be selected before saving services.",
    };
  }

  if (!category || !subCategory || !baseServiceName) {
    return {
      success: false as const,
      error: "Category, Sub Category, and Base Service Name are required.",
    };
  }

  if (!effectiveUniversalPlatform) {
    return {
      success: false as const,
      error: "Universal Platform could not be resolved for this catalog row.",
    };
  }

  if (flavors.length === 0 && serviceSpecificEnhancements.length === 0) {
    return {
      success: false as const,
      error: "At least one Flavor or Enhancement is required.",
    };
  }

  if (Number.isNaN(price) || price < 0) {
    return {
      success: false as const,
      error: "Price is required and must be zero or greater.",
    };
  }

  return {
    success: true as const,
    data: {
      dealId,
      category,
      subCategory,
      baseServiceName,
      flavors,
      serviceSpecificEnhancements,
      universalPlatform: effectiveUniversalPlatform,
      aui: auiValue,
      updatedMainMachine,
      updatedMachine2,
      updatedMachine3,
      price,
      catalogDetails,
    } satisfies DealServiceInput,
  };
}
