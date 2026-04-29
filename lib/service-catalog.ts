import serviceCatalogRows from "@/data/service-catalog.json";

type RawServiceCatalogRow = {
  rowNumber?: number;
  isActive?: boolean;
  status?: string;
  serviceOrderId?: string;
  category?: string;
  subCategory?: string;
  universalPlatform?: string;
  baseServiceName?: string;
  itemType?: string;
  flavorEnhancementItem?: string;
  flavors?: string[];
  serviceSpecificEnhancements?: string[];
  aui?: string | string[];
  groceryYN?: string;
  groceryNeeds?: string;
  kitchenPrepNeededYN?: string;
  kitchenPrepItems?: string;
  carryThroughYN?: string;
  carryThroughItems?: string;
  orderItemsFromCC?: string;
  ccItems?: string;
  updatedMainMachine?: string | string[];
  updatedMachine2?: string | string[];
  updatedMachine3?: string | string[];
  strategicAttributes?: string;
  exclusivityKeys?: string;
  staff?: string;
  preSupplyTier?: string;
  twoDayPrice?: string;
  threeDayPrice?: string;
  fourDayPrice?: string;
  notes?: string;
  sourceRowNumber?: number;
};

export type ServiceCatalogRow = {
  id?: string;
  sortOrder: number;
  isActive: boolean;
  status: string;
  serviceOrderId: string;
  category: string;
  subCategory: string;
  universalPlatform: string;
  baseServiceName: string;
  itemType: string;
  flavorEnhancementItem: string;
  flavors: string[];
  serviceSpecificEnhancements: string[];
  aui: string[];
  groceryYN: string;
  groceryNeeds: string;
  kitchenPrepNeededYN: string;
  kitchenPrepItems: string;
  carryThroughYN: string;
  carryThroughItems: string;
  orderItemsFromCC: string;
  ccItems: string;
  updatedMainMachine: string[];
  updatedMachine2: string[];
  updatedMachine3: string[];
  strategicAttributes: string;
  exclusivityKeys: string;
  staff: string;
  preSupplyTier: string;
  twoDayPrice: string;
  threeDayPrice: string;
  fourDayPrice: string;
  notes: string;
  sourceRowNumber: number;
  createdAt?: string;
  updatedAt?: string;
};

export type NamedOption = {
  name: string;
};

export type BaseServiceSelectionOption = {
  key: string;
  label: string;
  category: string;
  subCategory: string;
  universalPlatform: string;
  baseServiceName: string;
};

export type ReadOnlyServiceDetailValues = {
  status: string;
  catalogServiceId: string;
  universalPlatform: string;
  aui: string;
  updatedMainMachine: string;
  updatedMachine2: string;
  updatedMachine3: string;
  groceryYN: string;
  groceryNeeds: string;
  kitchenPrepNeededYN: string;
  kitchenPrepItems: string;
  carryThroughYN: string;
  carryThroughItems: string;
  orderItemsFromCC: string;
  ccItems: string;
  strategicAttributes: string;
  exclusivityKeys: string;
  staff: string;
  preSupplyTier: string;
  twoDayPrice: string;
  threeDayPrice: string;
  fourDayPrice: string;
  notes: string;
};

function normalizeText(value: string) {
  return value.trim();
}

function normalizeStringArray(values: string[]) {
  return Array.from(
    new Set(values.map((value) => normalizeText(value)).filter(Boolean)),
  );
}

export function parseCommaSeparatedValues(value: string) {
  return normalizeStringArray(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function parseCatalogValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return normalizeStringArray(value);
  }

  if (typeof value === "string") {
    return parseCommaSeparatedValues(value);
  }

  return [];
}

function cloneCatalogRow(row: ServiceCatalogRow): ServiceCatalogRow {
  return {
    ...row,
    isActive: row.isActive,
    flavors: [...row.flavors],
    serviceSpecificEnhancements: [...row.serviceSpecificEnhancements],
    aui: [...row.aui],
    updatedMainMachine: [...row.updatedMainMachine],
    updatedMachine2: [...row.updatedMachine2],
    updatedMachine3: [...row.updatedMachine3],
  };
}

function normalizeCatalogRow(
  row: RawServiceCatalogRow,
  index: number,
): ServiceCatalogRow {
  return {
    sortOrder:
      typeof row.rowNumber === "number" && Number.isFinite(row.rowNumber)
        ? row.rowNumber
        : index + 1,
    isActive: row.isActive !== false,
    status: normalizeText(row.status ?? ""),
    serviceOrderId: normalizeText(row.serviceOrderId ?? ""),
    category: normalizeText(row.category ?? ""),
    subCategory: normalizeText(row.subCategory ?? ""),
    universalPlatform: normalizeText(row.universalPlatform ?? ""),
    baseServiceName: normalizeText(row.baseServiceName ?? ""),
    itemType: normalizeText(row.itemType ?? ""),
    flavorEnhancementItem: normalizeText(row.flavorEnhancementItem ?? ""),
    flavors: parseCatalogValue(row.flavors),
    serviceSpecificEnhancements: parseCatalogValue(
      row.serviceSpecificEnhancements,
    ),
    aui: parseCatalogValue(row.aui),
    groceryYN: normalizeText(row.groceryYN ?? ""),
    groceryNeeds: normalizeText(row.groceryNeeds ?? ""),
    kitchenPrepNeededYN: normalizeText(row.kitchenPrepNeededYN ?? ""),
    kitchenPrepItems: normalizeText(row.kitchenPrepItems ?? ""),
    carryThroughYN: normalizeText(row.carryThroughYN ?? ""),
    carryThroughItems: normalizeText(row.carryThroughItems ?? ""),
    orderItemsFromCC: normalizeText(row.orderItemsFromCC ?? ""),
    ccItems: normalizeText(row.ccItems ?? ""),
    updatedMainMachine: parseCatalogValue(row.updatedMainMachine),
    updatedMachine2: parseCatalogValue(row.updatedMachine2),
    updatedMachine3: parseCatalogValue(row.updatedMachine3),
    strategicAttributes: normalizeText(row.strategicAttributes ?? ""),
    exclusivityKeys: normalizeText(row.exclusivityKeys ?? ""),
    staff: normalizeText(row.staff ?? ""),
    preSupplyTier: normalizeText(row.preSupplyTier ?? ""),
    twoDayPrice: normalizeText(row.twoDayPrice ?? ""),
    threeDayPrice: normalizeText(row.threeDayPrice ?? ""),
    fourDayPrice: normalizeText(row.fourDayPrice ?? ""),
    notes: normalizeText(row.notes ?? ""),
    sourceRowNumber:
      typeof row.sourceRowNumber === "number" &&
      Number.isFinite(row.sourceRowNumber)
        ? row.sourceRowNumber
        : typeof row.rowNumber === "number" && Number.isFinite(row.rowNumber)
          ? row.rowNumber
          : index + 1,
  };
}

const defaultRows = (serviceCatalogRows as RawServiceCatalogRow[]).map(
  normalizeCatalogRow,
);

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function uniqueStringsWithNone(values: string[]) {
  const normalizedValues = values.map((value) => value.trim());
  const nonEmptyValues = Array.from(
    new Set(normalizedValues.filter(Boolean)),
  );
  const hasEmptyValue = normalizedValues.some((value) => value === "");

  if (hasEmptyValue) {
    return [...nonEmptyValues, "None"];
  }

  return nonEmptyValues;
}

function toNamedOptions(values: string[]) {
  return uniqueStrings(values).map((name) => ({ name }));
}

function getRows(rows: ServiceCatalogRow[] = defaultRows) {
  return rows.filter((row) => row.isActive !== false);
}

function getRowsForPath(
  rows: ServiceCatalogRow[],
  category: string,
  subCategory = "",
  universalPlatform = "",
  baseServiceName = "",
) {
  return rows.filter((row) => {
    if (category && row.category !== category) {
      return false;
    }

    if (subCategory && row.subCategory !== subCategory) {
      return false;
    }

    if (universalPlatform && row.universalPlatform !== universalPlatform) {
      return false;
    }

    if (baseServiceName && row.baseServiceName !== baseServiceName) {
      return false;
    }

    return true;
  });
}

function resolveUniversalPlatformForBaseService(
  rows: ServiceCatalogRow[],
  category: string,
  subCategory: string,
  baseServiceName: string,
) {
  const platforms = uniqueStrings(
    getRowsForPath(
      getRows(rows),
      category,
      subCategory,
      "",
      baseServiceName,
    ).map((row) => row.universalPlatform),
  );

  return platforms[0] ?? "";
}

export const SERVICE_CATALOG = toNamedOptions(
  defaultRows.map((row) => row.category),
);

export function getSeedServiceCatalogRows() {
  return defaultRows.map(cloneCatalogRow);
}

export function getServiceCatalogRows(rows: ServiceCatalogRow[] = defaultRows) {
  return rows.map(cloneCatalogRow);
}

export function getCategoryOptions(rows: ServiceCatalogRow[] = defaultRows) {
  return toNamedOptions(getRows(rows).map((row) => row.category));
}

export function buildBaseServiceSelectionKey(
  category: string,
  subCategory: string,
  universalPlatformOrBaseServiceName: string,
  maybeBaseServiceName?: string,
) {
  const baseServiceName =
    typeof maybeBaseServiceName === "string"
      ? maybeBaseServiceName
      : universalPlatformOrBaseServiceName;

  return JSON.stringify([category, subCategory, baseServiceName]);
}

export function parseBaseServiceSelectionKey(
  key: string,
  rows: ServiceCatalogRow[] = defaultRows,
) {
  try {
    const parsed = JSON.parse(key) as
      | [string, string, string]
      | [string, string, string, string];

    if (
      !Array.isArray(parsed) ||
      ![3, 4].includes(parsed.length) ||
      parsed.some((value) => typeof value !== "string")
    ) {
      return null;
    }

    const category = parsed[0];
    const subCategory = parsed[1];
    const baseServiceName = parsed.length === 4 ? parsed[3] : parsed[2];
    const universalPlatform =
      (parsed.length === 4 ? parsed[2] : "") ||
      resolveUniversalPlatformForBaseService(
        rows,
        category,
        subCategory,
        baseServiceName,
      );

    return {
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
    };
  } catch {
    return null;
  }
}

export function getBaseServiceSelectionOptions(
  rows: ServiceCatalogRow[] = defaultRows,
  category = "",
  subCategory = "",
  universalPlatform = "",
) {
  const uniqueOptions = new Map<string, BaseServiceSelectionOption>();

  for (const row of getRowsForPath(
    getRows(rows),
    category,
    subCategory,
    universalPlatform,
  )) {
    const key = buildBaseServiceSelectionKey(
      row.category,
      row.subCategory,
      row.baseServiceName,
    );

    if (!uniqueOptions.has(key)) {
      uniqueOptions.set(key, {
        key,
        label: row.baseServiceName,
        category: row.category,
        subCategory: row.subCategory,
        universalPlatform: resolveUniversalPlatformForBaseService(
          rows,
          row.category,
          row.subCategory,
          row.baseServiceName,
        ),
        baseServiceName: row.baseServiceName,
      });
    }
  }

  return Array.from(uniqueOptions.values()).sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

export function getMatchingRows(
  rows: ServiceCatalogRow[] = defaultRows,
  category: string,
  subCategory: string,
  universalPlatform: string,
  baseServiceName: string,
  selectedFlavors: string[] = [],
) {
  const pathRows = getRowsForPath(
    getRows(rows),
    category,
    subCategory,
    universalPlatform,
    baseServiceName,
  );

  if (selectedFlavors.length === 0) {
    return pathRows;
  }

  return pathRows.filter((row) =>
    row.flavors.length === 0 ||
    selectedFlavors.some((selectedFlavor) => row.flavors.includes(selectedFlavor)),
  );
}

export function getSubCategoryOptions(
  rows: ServiceCatalogRow[] = defaultRows,
  category: string,
) {
  return toNamedOptions(getRowsForPath(getRows(rows), category).map((row) => row.subCategory));
}

export function getUniversalPlatformOptions(
  rows: ServiceCatalogRow[] = defaultRows,
  category: string,
  subCategory: string,
) {
  return toNamedOptions(
    getRowsForPath(getRows(rows), category, subCategory).map(
      (row) => row.universalPlatform,
    ),
  );
}

export function getBaseServiceOptions(
  rows: ServiceCatalogRow[] = defaultRows,
  category: string,
  subCategory: string,
  universalPlatform: string,
) {
  return toNamedOptions(
    getRowsForPath(
      getRows(rows),
      category,
      subCategory,
      universalPlatform,
    ).map((row) => row.baseServiceName),
  );
}

export function getFlavorOptions(
  rows: ServiceCatalogRow[] = defaultRows,
  category: string,
  subCategory: string,
  universalPlatform: string,
  baseServiceName: string,
) {
  return uniqueStrings(
    getRowsForPath(
      getRows(rows),
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
    ).flatMap((row) => row.flavors),
  );
}

export function getEnhancementOptions(
  rows: ServiceCatalogRow[] = defaultRows,
  category: string,
  subCategory: string,
  universalPlatform: string,
  baseServiceName: string,
  selectedFlavors: string[] = [],
) {
  return uniqueStringsWithNone(
    getMatchingRows(
      rows,
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      selectedFlavors,
    ).flatMap((row) => row.serviceSpecificEnhancements),
  );
}

export function getAuiOptions(
  rows: ServiceCatalogRow[] = defaultRows,
  category: string,
  subCategory: string,
  universalPlatform: string,
  baseServiceName: string,
  selectedFlavors: string[] = [],
) {
  return uniqueStringsWithNone(
    getMatchingRows(
      rows,
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      selectedFlavors,
    ).flatMap((row) => row.aui),
  );
}

export function getUpdatedMainMachineOptions(
  rows: ServiceCatalogRow[] = defaultRows,
  category: string,
  subCategory: string,
  universalPlatform: string,
  baseServiceName: string,
  selectedFlavors: string[] = [],
) {
  return uniqueStringsWithNone(
    getMatchingRows(
      rows,
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      selectedFlavors,
    ).flatMap((row) => row.updatedMainMachine),
  );
}

export function getUpdatedMachine2Options(
  rows: ServiceCatalogRow[] = defaultRows,
  category: string,
  subCategory: string,
  universalPlatform: string,
  baseServiceName: string,
  selectedFlavors: string[] = [],
) {
  return uniqueStringsWithNone(
    getMatchingRows(
      rows,
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      selectedFlavors,
    ).flatMap((row) => row.updatedMachine2),
  );
}

export function getUpdatedMachine3Options(
  rows: ServiceCatalogRow[] = defaultRows,
  category: string,
  subCategory: string,
  universalPlatform: string,
  baseServiceName: string,
  selectedFlavors: string[] = [],
) {
  return uniqueStringsWithNone(
    getMatchingRows(
      rows,
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      selectedFlavors,
    ).flatMap((row) => row.updatedMachine3),
  );
}

export function getReadOnlyServiceDetailValues(
  rows: ServiceCatalogRow[] = defaultRows,
  category: string,
  subCategory: string,
  universalPlatform: string,
  baseServiceName: string,
  selectedFlavors: string[] = [],
  selectedEnhancements: string[] = [],
) {
  const selectedItems = new Set(
    normalizeStringArray([...selectedFlavors, ...selectedEnhancements]),
  );
  const pathRows = getRowsForPath(
    getRows(rows),
    category,
    subCategory,
    universalPlatform,
    baseServiceName,
  );
  const detailRows =
    selectedItems.size > 0
      ? pathRows.filter(
          (row) =>
            !row.flavorEnhancementItem ||
            selectedItems.has(row.flavorEnhancementItem) ||
            row.flavors.some((item) => selectedItems.has(item)) ||
            row.serviceSpecificEnhancements.some((item) =>
              selectedItems.has(item),
            ),
        )
      : pathRows;

  function uniqueJoined(
    selector: (row: ServiceCatalogRow) => string | string[],
  ) {
    return uniqueStrings(
      detailRows.flatMap((row) => {
        const value = selector(row);
        return Array.isArray(value) ? value : [value];
      }),
    ).join(", ");
  }

  return {
    status: uniqueJoined((row) => row.status),
    catalogServiceId: uniqueJoined((row) => row.serviceOrderId),
    universalPlatform: uniqueJoined((row) => row.universalPlatform),
    aui: uniqueJoined((row) => row.aui),
    updatedMainMachine: uniqueJoined((row) => row.updatedMainMachine),
    updatedMachine2: uniqueJoined((row) => row.updatedMachine2),
    updatedMachine3: uniqueJoined((row) => row.updatedMachine3),
    groceryYN: uniqueJoined((row) => row.groceryYN),
    groceryNeeds: uniqueJoined((row) => row.groceryNeeds),
    kitchenPrepNeededYN: uniqueJoined((row) => row.kitchenPrepNeededYN),
    kitchenPrepItems: uniqueJoined((row) => row.kitchenPrepItems),
    carryThroughYN: uniqueJoined((row) => row.carryThroughYN),
    carryThroughItems: uniqueJoined((row) => row.carryThroughItems),
    orderItemsFromCC: uniqueJoined((row) => row.orderItemsFromCC),
    ccItems: uniqueJoined((row) => row.ccItems),
    strategicAttributes: uniqueJoined((row) => row.strategicAttributes),
    exclusivityKeys: uniqueJoined((row) => row.exclusivityKeys),
    staff: uniqueJoined((row) => row.staff),
    preSupplyTier: uniqueJoined((row) => row.preSupplyTier),
    twoDayPrice: uniqueJoined((row) => row.twoDayPrice),
    threeDayPrice: uniqueJoined((row) => row.threeDayPrice),
    fourDayPrice: uniqueJoined((row) => row.fourDayPrice),
    notes: uniqueJoined((row) => row.notes),
  };
}

export function getReadOnlyServiceDetails(
  rows: ServiceCatalogRow[] = defaultRows,
  category: string,
  subCategory: string,
  universalPlatform: string,
  baseServiceName: string,
  selectedFlavors: string[] = [],
  selectedEnhancements: string[] = [],
) {
  if (!baseServiceName) {
    return [];
  }

  const details = getReadOnlyServiceDetailValues(
    rows,
    category,
    subCategory,
    universalPlatform,
    baseServiceName,
    selectedFlavors,
    selectedEnhancements,
  );

  return [
    { label: "Status", value: details.status },
    { label: "Service ID", value: details.catalogServiceId },
    { label: "Universal Platform", value: details.universalPlatform },
    { label: "AUI", value: details.aui },
    { label: "Main Machine", value: details.updatedMainMachine },
    { label: "Machine 2", value: details.updatedMachine2 },
    { label: "Machine 3", value: details.updatedMachine3 },
    { label: "Grocery", value: details.groceryYN },
    { label: "Grocery Needs", value: details.groceryNeeds },
    { label: "Kitchen Prep", value: details.kitchenPrepNeededYN },
    { label: "Kitchen Prep Items", value: details.kitchenPrepItems },
    { label: "Carry Through", value: details.carryThroughYN },
    { label: "Carry Through Items", value: details.carryThroughItems },
    { label: "Order from CC", value: details.orderItemsFromCC },
    { label: "CC Items", value: details.ccItems },
    { label: "Strategic Attributes", value: details.strategicAttributes },
    { label: "Exclusivity Keys", value: details.exclusivityKeys },
    { label: "Staff", value: details.staff },
    { label: "Pre-Supply Tier", value: details.preSupplyTier },
    { label: "2-Day ($)", value: details.twoDayPrice },
    { label: "3-Day ($)", value: details.threeDayPrice },
    { label: "4-Day ($)", value: details.fourDayPrice },
    { label: "Notes", value: details.notes },
  ].map((detail) => ({
    ...detail,
    value: detail.value || "None",
  }));
}
