// Ported from lib/service-catalog.ts — catalog lookup functions
// SERVICE_CATALOG_ROWS is loaded via <script> tag in popup.html (non-module)

const rows = SERVICE_CATALOG_ROWS;

function uniqueStrings(values) {
  return [...new Set(values.map(v => v.trim()).filter(Boolean))];
}

function uniqueStringsWithNone(values) {
  const normalized = values.map(v => v.trim());
  const nonEmpty = [...new Set(normalized.filter(Boolean))];
  const hasEmpty = normalized.some(v => v === "");
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

function parseBaseServiceSelectionKey(key) {
  try {
    const parsed = JSON.parse(key);
    if (!Array.isArray(parsed) || ![3, 4].includes(parsed.length) || parsed.some(v => typeof v !== "string")) return null;
    const category = parsed[0];
    const subCategory = parsed[1];
    const baseServiceName = parsed.length === 4 ? parsed[3] : parsed[2];
    const universalPlatform = resolveUniversalPlatformForBaseService(category, subCategory, baseServiceName);
    return { category, subCategory, universalPlatform, baseServiceName };
  } catch {
    return null;
  }
}

function getRowsForPath(category, subCategory = "", universalPlatform = "", baseServiceName = "") {
  return rows.filter(row => {
    if (category && row.category !== category) return false;
    if (subCategory && row.subCategory !== subCategory) return false;
    if (universalPlatform && row.universalPlatform !== universalPlatform) return false;
    if (baseServiceName && row.baseServiceName !== baseServiceName) return false;
    return true;
  });
}

const SERVICE_CATALOG = toNamedOptions(rows.map(r => r.category));

function resolveUniversalPlatformForBaseService(category, subCategory, baseServiceName) {
  const platforms = uniqueStrings(getRowsForPath(category, subCategory, "", baseServiceName).map(r => r.universalPlatform));
  return platforms[0] || "";
}

function getBaseServiceSelectionOptions(category = "", subCategory = "", universalPlatform = "") {
  const uniqueOptions = new Map();
  for (const row of getRowsForPath(category, subCategory)) {
    const key = buildBaseServiceSelectionKey(row.category, row.subCategory, row.baseServiceName);
    if (!uniqueOptions.has(key)) {
      uniqueOptions.set(key, {
        key,
        label: row.baseServiceName,
        category: row.category,
        subCategory: row.subCategory,
        universalPlatform: resolveUniversalPlatformForBaseService(row.category, row.subCategory, row.baseServiceName),
        baseServiceName: row.baseServiceName,
      });
    }
  }
  return [...uniqueOptions.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function getMatchingRows(category, subCategory, universalPlatform, baseServiceName, selectedFlavors = []) {
  const pathRows = getRowsForPath(category, subCategory, universalPlatform, baseServiceName);
  if (selectedFlavors.length === 0) return pathRows;
  return pathRows.filter(row => selectedFlavors.some(f => row.flavors.includes(f)));
}

function getSubCategoryOptions(category) {
  return toNamedOptions(getRowsForPath(category).map(r => r.subCategory));
}

function getUniversalPlatformOptions(category, subCategory) {
  return toNamedOptions(getRowsForPath(category, subCategory).map(r => r.universalPlatform));
}

function getFlavorOptions(category, subCategory, universalPlatform, baseServiceName) {
  return uniqueStrings(getRowsForPath(category, subCategory, universalPlatform, baseServiceName).flatMap(r => r.flavors));
}

function getEnhancementOptions(category, subCategory, universalPlatform, baseServiceName, selectedFlavors = []) {
  return uniqueStringsWithNone(getMatchingRows(category, subCategory, universalPlatform, baseServiceName, selectedFlavors).flatMap(r => r.serviceSpecificEnhancements));
}

function getAuiOptions(category, subCategory, universalPlatform, baseServiceName, selectedFlavors = []) {
  return uniqueStringsWithNone(getMatchingRows(category, subCategory, universalPlatform, baseServiceName, selectedFlavors).map(r => r.aui));
}

function getUpdatedMainMachineOptions(category, subCategory, universalPlatform, baseServiceName, selectedFlavors = []) {
  return uniqueStringsWithNone(getMatchingRows(category, subCategory, universalPlatform, baseServiceName, selectedFlavors).map(r => r.updatedMainMachine));
}

function getUpdatedMachine2Options(category, subCategory, universalPlatform, baseServiceName, selectedFlavors = []) {
  return uniqueStringsWithNone(getMatchingRows(category, subCategory, universalPlatform, baseServiceName, selectedFlavors).map(r => r.updatedMachine2));
}

function getUpdatedMachine3Options(category, subCategory, universalPlatform, baseServiceName, selectedFlavors = []) {
  return uniqueStringsWithNone(getMatchingRows(category, subCategory, universalPlatform, baseServiceName, selectedFlavors).map(r => r.updatedMachine3));
}

// Expose globally for popup.js
window.ServiceCatalog = {
  SERVICE_CATALOG,
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
