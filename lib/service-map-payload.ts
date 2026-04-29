import {
  parseCommaSeparatedValues,
  ServiceCatalogRow,
} from "@/lib/service-catalog";

export type ServiceMapInput = Omit<
  ServiceCatalogRow,
  "id" | "createdAt" | "updatedAt"
>;

function readTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readPositiveInteger(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function readCsvField(value: unknown) {
  if (Array.isArray(value)) {
    return parseCommaSeparatedValues(
      value.filter((item): item is string => typeof item === "string").join(","),
    );
  }

  return parseCommaSeparatedValues(readTrimmedString(value));
}

function readBoolean(value: unknown, fallbackValue = true) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    if (["true", "1", "yes", "on", "active"].includes(normalizedValue)) {
      return true;
    }

    if (["false", "0", "no", "off", "inactive"].includes(normalizedValue)) {
      return false;
    }
  }

  return fallbackValue;
}

export function parseServiceMapPayload(
  payload: unknown,
  fallbackSortOrder?: number,
) {
  if (!payload || typeof payload !== "object") {
    return {
      success: false as const,
      error: "A map payload is required.",
    };
  }

  const data = payload as Record<string, unknown>;
  const sortOrder =
    readPositiveInteger(data.sortOrder) ??
    (typeof fallbackSortOrder === "number" && fallbackSortOrder > 0
      ? fallbackSortOrder
      : null);
  const isActive = readBoolean(data.isActive, true);
  const status = readTrimmedString(data.status);
  const serviceOrderId = readTrimmedString(data.serviceOrderId);
  const category = readTrimmedString(data.category);
  const subCategory = readTrimmedString(data.subCategory);
  const universalPlatform = readTrimmedString(data.universalPlatform);
  const baseServiceName = readTrimmedString(data.baseServiceName);
  const itemType = readTrimmedString(data.itemType);
  const flavorEnhancementItem = readTrimmedString(data.flavorEnhancementItem);
  const flavors = readCsvField(data.flavors);
  const serviceSpecificEnhancements = readCsvField(
    data.serviceSpecificEnhancements,
  );
  const aui = readCsvField(data.aui);
  const groceryYN = readTrimmedString(data.groceryYN);
  const groceryNeeds = readTrimmedString(data.groceryNeeds);
  const kitchenPrepNeededYN = readTrimmedString(data.kitchenPrepNeededYN);
  const kitchenPrepItems = readTrimmedString(data.kitchenPrepItems);
  const carryThroughYN = readTrimmedString(data.carryThroughYN);
  const carryThroughItems = readTrimmedString(data.carryThroughItems);
  const orderItemsFromCC = readTrimmedString(data.orderItemsFromCC);
  const ccItems = readTrimmedString(data.ccItems);
  const updatedMainMachine = readCsvField(data.updatedMainMachine);
  const updatedMachine2 = readCsvField(data.updatedMachine2);
  const updatedMachine3 = readCsvField(data.updatedMachine3);
  const strategicAttributes = readTrimmedString(data.strategicAttributes);
  const exclusivityKeys = readTrimmedString(data.exclusivityKeys);
  const staff = readTrimmedString(data.staff);
  const preSupplyTier = readTrimmedString(data.preSupplyTier);
  const twoDayPrice = readTrimmedString(data.twoDayPrice);
  const threeDayPrice = readTrimmedString(data.threeDayPrice);
  const fourDayPrice = readTrimmedString(data.fourDayPrice);
  const notes = readTrimmedString(data.notes);
  const sourceRowNumber =
    readPositiveInteger(data.sourceRowNumber) ?? sortOrder ?? 1;

  if (sortOrder === null) {
    return {
      success: false as const,
      error: "Sort Order must be a positive whole number.",
    };
  }

  if (!category || !subCategory || !universalPlatform || !baseServiceName) {
    return {
      success: false as const,
      error:
        "Category, Sub Category, Universal Platform, and Base Service Name are required.",
    };
  }

  if (flavors.length === 0 && serviceSpecificEnhancements.length === 0) {
    return {
      success: false as const,
      error:
        "Flavor / Enhancement must contain at least one value.",
    };
  }

  return {
    success: true as const,
    data: {
      sortOrder,
      isActive,
      status,
      serviceOrderId,
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      itemType,
      flavorEnhancementItem,
      flavors,
      serviceSpecificEnhancements,
      aui,
      groceryYN,
      groceryNeeds,
      kitchenPrepNeededYN,
      kitchenPrepItems,
      carryThroughYN,
      carryThroughItems,
      orderItemsFromCC,
      ccItems,
      updatedMainMachine,
      updatedMachine2,
      updatedMachine3,
      strategicAttributes,
      exclusivityKeys,
      staff,
      preSupplyTier,
      twoDayPrice,
      threeDayPrice,
      fourDayPrice,
      notes,
      sourceRowNumber,
    } satisfies ServiceMapInput,
  };
}
