// Runtime-backed service catalog used by the extension popup.
// Rows are loaded from the deployed Bedrock API and kept in memory here.

let rows = [];

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeStringArray(values) {
  return [...new Set(values.map(value => normalizeText(value)).filter(Boolean))];
}

function parseCatalogValue(value) {
  if (Array.isArray(value)) {
    return normalizeStringArray(value);
  }

  const normalized = normalizeText(value);

  if (!normalized) {
    return [];
  }

  return normalizeStringArray(normalized.split(","));
}

function normalizeRow(row, index) {
  return {
    id: normalizeText(row?.id),
    sortOrder: Number.isFinite(row?.sortOrder) ? row.sortOrder : index + 1,
    isActive: row?.isActive !== false,
    serviceOrderId: normalizeText(row?.serviceOrderId),
    category: normalizeText(row?.category),
    subCategory: normalizeText(row?.subCategory),
    universalPlatform: normalizeText(row?.universalPlatform),
    baseServiceName: normalizeText(row?.baseServiceName),
    flavors: parseCatalogValue(row?.flavors),
    serviceSpecificEnhancements: parseCatalogValue(
      row?.serviceSpecificEnhancements,
    ),
    aui: parseCatalogValue(row?.aui),
    updatedMainMachine: parseCatalogValue(row?.updatedMainMachine),
    updatedMachine2: parseCatalogValue(row?.updatedMachine2),
    updatedMachine3: parseCatalogValue(row?.updatedMachine3),
  };
}

function setRows(nextRows) {
  rows = Array.isArray(nextRows)
    ? nextRows.map((row, index) => normalizeRow(row, index))
    : [];
}

function getRows() {
  return rows.filter(row => row.isActive !== false);
}

function uniqueStrings(values) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function uniqueStringsWithNone(values) {
  const normalized = values.map(value => value.trim());
  const nonEmpty = [...new Set(normalized.filter(Boolean))];
  const hasEmpty = normalized.some(value => value === "");
  return hasEmpty ? [...nonEmpty, "None"] : nonEmpty;
}

function toNamedOptions(values) {
  return uniqueStrings(values).map(name => ({ name }));
}

function buildBaseServiceSelectionKey(category, subCategory, universalPlatformOrBaseServiceName, maybeBaseServiceName) {
  const baseServiceName = typeof maybeBaseServiceName === "string"
    ? maybeBaseServiceName
    : universalPlatformOrBaseServiceName;
  return JSON.stringify([category, subCategory, baseServiceName]);
}

function getRowsForPath(category, subCategory = "", universalPlatform = "", baseServiceName = "") {
  return getRows().filter(row => {
    if (category && row.category !== category) return false;
    if (subCategory && row.subCategory !== subCategory) return false;
    if (universalPlatform && row.universalPlatform !== universalPlatform) return false;
    if (baseServiceName && row.baseServiceName !== baseServiceName) return false;
    return true;
  });
}

function resolveUniversalPlatformForBaseService(category, subCategory, baseServiceName) {
  const platforms = uniqueStrings(
    getRowsForPath(category, subCategory, "", baseServiceName).map(
      row => row.universalPlatform,
    ),
  );
  return platforms[0] || "";
}

function parseBaseServiceSelectionKey(key) {
  try {
    const parsed = JSON.parse(key);
    if (!Array.isArray(parsed) || ![3, 4].includes(parsed.length) || parsed.some(value => typeof value !== "string")) {
      return null;
    }

    const category = parsed[0];
    const subCategory = parsed[1];
    const baseServiceName = parsed.length === 4 ? parsed[3] : parsed[2];
    const universalPlatform =
      (parsed.length === 4 ? parsed[2] : "") ||
      resolveUniversalPlatformForBaseService(category, subCategory, baseServiceName);

    return { category, subCategory, universalPlatform, baseServiceName };
  } catch {
    return null;
  }
}

function getBaseServiceSelectionOptions(category = "", subCategory = "", universalPlatform = "") {
  const uniqueOptions = new Map();

  for (const row of getRowsForPath(category, subCategory, universalPlatform)) {
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

  return [...uniqueOptions.values()].sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

function getMatchingRows(category, subCategory, universalPlatform, baseServiceName, selectedFlavors = []) {
  const pathRows = getRowsForPath(
    category,
    subCategory,
    universalPlatform,
    baseServiceName,
  );

  if (selectedFlavors.length === 0) {
    return pathRows;
  }

  return pathRows.filter(row =>
    selectedFlavors.some(flavor => row.flavors.includes(flavor)),
  );
}

function getSubCategoryOptions(category) {
  return toNamedOptions(getRowsForPath(category).map(row => row.subCategory));
}

function getUniversalPlatformOptions(category, subCategory) {
  return toNamedOptions(
    getRowsForPath(category, subCategory).map(row => row.universalPlatform),
  );
}

function getFlavorOptions(category, subCategory, universalPlatform, baseServiceName) {
  return uniqueStrings(
    getRowsForPath(
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
    ).flatMap(row => row.flavors),
  );
}

function getEnhancementOptions(category, subCategory, universalPlatform, baseServiceName, selectedFlavors = []) {
  return uniqueStringsWithNone(
    getMatchingRows(
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      selectedFlavors,
    ).flatMap(row => row.serviceSpecificEnhancements),
  );
}

function getAuiOptions(category, subCategory, universalPlatform, baseServiceName, selectedFlavors = []) {
  return uniqueStringsWithNone(
    getMatchingRows(
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      selectedFlavors,
    ).flatMap(row => row.aui),
  );
}

function getUpdatedMainMachineOptions(category, subCategory, universalPlatform, baseServiceName, selectedFlavors = []) {
  return uniqueStringsWithNone(
    getMatchingRows(
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      selectedFlavors,
    ).flatMap(row => row.updatedMainMachine),
  );
}

function getUpdatedMachine2Options(category, subCategory, universalPlatform, baseServiceName, selectedFlavors = []) {
  return uniqueStringsWithNone(
    getMatchingRows(
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      selectedFlavors,
    ).flatMap(row => row.updatedMachine2),
  );
}

function getUpdatedMachine3Options(category, subCategory, universalPlatform, baseServiceName, selectedFlavors = []) {
  return uniqueStringsWithNone(
    getMatchingRows(
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      selectedFlavors,
    ).flatMap(row => row.updatedMachine3),
  );
}

window.ServiceCatalog = {
  setRows,
  getRows,
  get SERVICE_CATALOG() {
    return toNamedOptions(getRows().map(row => row.category));
  },
  buildBaseServiceSelectionKey,
  parseBaseServiceSelectionKey,
  getBaseServiceSelectionOptions,
  getSubCategoryOptions,
  getUniversalPlatformOptions,
  getFlavorOptions,
  getEnhancementOptions,
  getAuiOptions,
  getUpdatedMainMachineOptions,
  getUpdatedMachine2Options,
  getUpdatedMachine3Options,
};
