import {
  getAuiOptions,
  ServiceCatalogRow,
  getUpdatedMachine2Options,
  getUpdatedMachine3Options,
  getUpdatedMainMachineOptions,
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

function normalizeText(value: string) {
  return value.trim();
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
  const sections: string[] = [];

  if (normalizedFlavors.length > 0) {
    sections.push("Flavors:");
    sections.push(...normalizedFlavors.map((value) => `- ${value}`));
  }

  if (normalizedEnhancements.length > 0) {
    if (sections.length > 0) {
      sections.push("");
    }

    sections.push("Enhancements:");
    sections.push(...normalizedEnhancements.map((value) => `- ${value}`));
  }

  return sections.join("\n").trim();
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
    "category" | "subCategory" | "baseServiceName" | "flavors"
  >,
) {
  const category = normalizeText(service.category);
  const subCategory = normalizeText(service.subCategory);
  const baseServiceName = normalizeText(service.baseServiceName);
  const normalizedFlavors = normalizeStringArray(service.flavors);

  if (!category || !subCategory || !baseServiceName || normalizedFlavors.length === 0) {
    return "";
  }

  return `${category}_${subCategory}_${baseServiceName}|${normalizedFlavors.join(",")}`;
}

export function buildCombinedFinalValue(
  services: Array<
    | { finalValue: string }
    | Pick<
        ServiceFormValues,
        "category" | "subCategory" | "baseServiceName" | "flavors"
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
  const auiValue = typeof data.aui === "string" ? data.aui.trim() : "";
  const updatedMainMachine =
    typeof data.updatedMainMachine === "string"
      ? data.updatedMainMachine.trim()
      : "";
  const updatedMachine2 =
    typeof data.updatedMachine2 === "string" ? data.updatedMachine2.trim() : "";
  const updatedMachine3 =
    typeof data.updatedMachine3 === "string" ? data.updatedMachine3.trim() : "";
  const rawPrice = data.price;
  const price =
    typeof rawPrice === "number"
      ? rawPrice
      : typeof rawPrice === "string" && rawPrice.trim()
        ? Number(rawPrice)
        : null;

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

  if (!universalPlatform) {
    return {
      success: false as const,
      error: "Universal Platform is required.",
    };
  }

  if (flavors.length === 0) {
    return {
      success: false as const,
      error: "At least one Flavor is required.",
    };
  }

  if (price === null || Number.isNaN(price) || price < 0) {
    return {
      success: false as const,
      error: "Price is required and must be zero or greater.",
    };
  }

  if (
    getAuiOptions(
      serviceMaps,
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      flavors,
    ).some(Boolean) &&
    auiValue === ""
  ) {
    return {
      success: false as const,
      error: "AUI is required for this base service.",
    };
  }

  if (
    getUpdatedMainMachineOptions(
      serviceMaps,
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      flavors,
    ).length > 0 &&
    updatedMainMachine === ""
  ) {
    return {
      success: false as const,
      error: "Updated Main Machine is required for this row.",
    };
  }

  if (
    getUpdatedMachine2Options(
      serviceMaps,
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      flavors,
    ).length > 0 &&
    updatedMachine2 === ""
  ) {
    return {
      success: false as const,
      error: "Updated Machine 2 is required for this row.",
    };
  }

  if (
    getUpdatedMachine3Options(
      serviceMaps,
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      flavors,
    ).length > 0 &&
    updatedMachine3 === ""
  ) {
    return {
      success: false as const,
      error: "Updated Machine 3 is required for this row.",
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
      universalPlatform,
      aui: auiValue,
      updatedMainMachine,
      updatedMachine2,
      updatedMachine3,
      price,
    } satisfies DealServiceInput,
  };
}
