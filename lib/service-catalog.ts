import serviceCatalogRows from "@/data/service-catalog.json";

export type ServiceCatalogRow = {
  rowNumber: number;
  serviceOrderId: string;
  category: string;
  subCategory: string;
  universalPlatform: string;
  baseServiceName: string;
  flavors: string[];
  serviceSpecificEnhancements: string[];
  aui: string;
  updatedMainMachine: string;
  updatedMachine2: string;
  updatedMachine3: string;
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

const rows = serviceCatalogRows as ServiceCatalogRow[];

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

export function parseBaseServiceSelectionKey(key: string) {
  try {
    const parsed = JSON.parse(key) as [string, string, string] | [string, string, string, string];

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
    const universalPlatform = resolveUniversalPlatformForBaseService(
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

function getRowsForPath(
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
  category: string,
  subCategory: string,
  baseServiceName: string,
) {
  const platforms = uniqueStrings(
    getRowsForPath(category, subCategory, "", baseServiceName).map(
      (row) => row.universalPlatform,
    ),
  );

  return platforms[0] ?? "";
}

export const SERVICE_CATALOG = toNamedOptions(rows.map((row) => row.category));

export function getServiceCatalogRows() {
  return rows;
}

export function getBaseServiceSelectionOptions(
  category = "",
  subCategory = "",
  _universalPlatform = "",
) {
  const uniqueOptions = new Map<string, BaseServiceSelectionOption>();

  for (const row of getRowsForPath(category, subCategory)) {
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
  category: string,
  subCategory: string,
  universalPlatform: string,
  baseServiceName: string,
  selectedFlavors: string[] = [],
) {
  const pathRows = getRowsForPath(
    category,
    subCategory,
    universalPlatform,
    baseServiceName,
  );

  if (selectedFlavors.length === 0) {
    return pathRows;
  }

  return pathRows.filter((row) =>
    selectedFlavors.some((selectedFlavor) => row.flavors.includes(selectedFlavor)),
  );
}

export function getSubCategoryOptions(category: string) {
  return toNamedOptions(getRowsForPath(category).map((row) => row.subCategory));
}

export function getUniversalPlatformOptions(category: string, subCategory: string) {
  return toNamedOptions(
    getRowsForPath(category, subCategory).map((row) => row.universalPlatform),
  );
}

export function getBaseServiceOptions(
  category: string,
  subCategory: string,
  _universalPlatform: string,
) {
  return toNamedOptions(
    getRowsForPath(category, subCategory).map(
      (row) => row.baseServiceName,
    ),
  );
}

export function getFlavorOptions(
  category: string,
  subCategory: string,
  universalPlatform: string,
  baseServiceName: string,
) {
  return uniqueStrings(
    getRowsForPath(category, subCategory, universalPlatform, baseServiceName).flatMap(
      (row) => row.flavors,
    ),
  );
}

export function getEnhancementOptions(
  category: string,
  subCategory: string,
  universalPlatform: string,
  baseServiceName: string,
  selectedFlavors: string[] = [],
) {
  return uniqueStringsWithNone(
    getMatchingRows(
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      selectedFlavors,
    ).flatMap((row) => row.serviceSpecificEnhancements),
  );
}

export function getAuiOptions(
  category: string,
  subCategory: string,
  universalPlatform: string,
  baseServiceName: string,
  selectedFlavors: string[] = [],
) {
  return uniqueStringsWithNone(
    getMatchingRows(
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      selectedFlavors,
    ).map((row) => row.aui),
  );
}

export function getUpdatedMainMachineOptions(
  category: string,
  subCategory: string,
  universalPlatform: string,
  baseServiceName: string,
  selectedFlavors: string[] = [],
) {
  return uniqueStringsWithNone(
    getMatchingRows(
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      selectedFlavors,
    ).map((row) => row.updatedMainMachine),
  );
}

export function getUpdatedMachine2Options(
  category: string,
  subCategory: string,
  universalPlatform: string,
  baseServiceName: string,
  selectedFlavors: string[] = [],
) {
  return uniqueStringsWithNone(
    getMatchingRows(
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      selectedFlavors,
    ).map((row) => row.updatedMachine2),
  );
}

export function getUpdatedMachine3Options(
  category: string,
  subCategory: string,
  universalPlatform: string,
  baseServiceName: string,
  selectedFlavors: string[] = [],
) {
  return uniqueStringsWithNone(
    getMatchingRows(
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      selectedFlavors,
    ).map((row) => row.updatedMachine3),
  );
}
