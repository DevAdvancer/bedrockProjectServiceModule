import fs from "node:fs";
import path from "node:path";

const dataPath = path.resolve("data/service-catalog.json");
const outputPath = path.resolve("data/latestdata-seed.json");

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map((item) => normalizeText(item)).filter(Boolean)),
    );
  }

  const normalized = normalizeText(value);
  if (!normalized) return [];

  return Array.from(
    new Set(
      normalized
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

if (!fs.existsSync(dataPath)) {
  console.error(`Catalog file not found: ${dataPath}`);
  process.exit(1);
}

const rawRows = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const now = new Date().toISOString();

const documents = rawRows
  .map((row, index) => ({
    sortOrder:
      Number.isFinite(row?.rowNumber) && row.rowNumber > 0
        ? row.rowNumber
        : index + 1,
    isActive: row?.isActive !== false,
    status: normalizeText(row?.status),
    serviceOrderId: normalizeText(row?.serviceOrderId),
    category: normalizeText(row?.category),
    subCategory: normalizeText(row?.subCategory),
    universalPlatform: normalizeText(row?.universalPlatform),
    baseServiceName: normalizeText(row?.baseServiceName),
    itemType: normalizeText(row?.itemType),
    flavorEnhancementItem: normalizeText(row?.flavorEnhancementItem),
    aui: normalizeList(row?.aui),
    groceryYN: normalizeText(row?.groceryYN),
    groceryNeeds: normalizeText(row?.groceryNeeds),
    kitchenPrepNeededYN: normalizeText(row?.kitchenPrepNeededYN),
    kitchenPrepItems: normalizeText(row?.kitchenPrepItems),
    carryThroughYN: normalizeText(row?.carryThroughYN),
    carryThroughItems: normalizeText(row?.carryThroughItems),
    orderItemsFromCC: normalizeText(row?.orderItemsFromCC),
    ccItems: normalizeText(row?.ccItems),
    updatedMainMachine: normalizeList(row?.updatedMainMachine),
    updatedMachine2: normalizeList(row?.updatedMachine2),
    updatedMachine3: normalizeList(row?.updatedMachine3),
    strategicAttributes: normalizeText(row?.strategicAttributes),
    exclusivityKeys: normalizeText(row?.exclusivityKeys),
    staff: normalizeText(row?.staff),
    preSupplyTier: normalizeText(row?.preSupplyTier),
    twoDayPrice: normalizeText(row?.twoDayPrice),
    threeDayPrice: normalizeText(row?.threeDayPrice),
    fourDayPrice: normalizeText(row?.fourDayPrice),
    notes: normalizeText(row?.notes),
    sourceRowNumber:
      Number.isFinite(row?.sourceRowNumber) && row.sourceRowNumber > 0
        ? row.sourceRowNumber
        : index + 2,
    created_at: now,
    updated_at: now,
  }))
  .filter(
    (row) =>
      row.serviceOrderId &&
      row.category &&
      row.subCategory &&
      row.universalPlatform &&
      row.baseServiceName,
  );

fs.writeFileSync(outputPath, `${JSON.stringify(documents, null, 2)}\n`);

console.log(
  `Exported ${documents.length} latestdata seed rows to ${path.relative(
    process.cwd(),
    outputPath,
  )}`,
);
