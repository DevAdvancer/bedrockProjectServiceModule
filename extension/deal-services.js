// Ported from lib/deal-services.ts — shared utility functions

function normalizeText(value) {
  return value.trim();
}

export function normalizeStringArray(values) {
  return [...new Set(values.map(v => normalizeText(v)).filter(Boolean))];
}

export function arrayToCsv(values) {
  return normalizeStringArray(values).join(",");
}

export function csvToArray(value) {
  if (!value) return [];
  return normalizeStringArray(value.split(","));
}

export function buildServiceFinalValue(service) {
  const category = normalizeText(service.category);
  const subCategory = normalizeText(service.subCategory);
  const baseServiceName = normalizeText(service.baseServiceName);
  const normalizedFlavors = normalizeStringArray(service.flavors);

  if (!category || !subCategory || !baseServiceName || normalizedFlavors.length === 0) {
    return "";
  }

  return `${category}_${subCategory}_${baseServiceName}|${normalizedFlavors.join(",")}`;
}

export function buildCombinedFinalValue(services) {
  return services
    .map(service =>
      "finalValue" in service
        ? service.finalValue.trim()
        : buildServiceFinalValue(service),
    )
    .filter(Boolean)
    .join(";");
}
