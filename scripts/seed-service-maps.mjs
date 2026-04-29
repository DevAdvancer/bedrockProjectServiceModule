import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import mongoose from "mongoose";

const envPath = path.resolve(".env.local");
const dataPath = path.resolve("data/service-catalog.json");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const source = fs.readFileSync(filePath, "utf8");

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

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

  if (!normalized) {
    return [];
  }

  return Array.from(
    new Set(
      normalized
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

loadEnvFile(envPath);

const mongoUri = process.env.MONGODB_URI?.trim();

if (!mongoUri) {
  console.error("MONGODB_URI is not configured.");
  process.exit(1);
}

if (!fs.existsSync(dataPath)) {
  console.error(`Catalog file not found: ${dataPath}`);
  process.exit(1);
}

const rawRows = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const collectionName = "latestdata";

const rows = rawRows
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
    flavors: normalizeList(row?.flavors),
    serviceSpecificEnhancements: normalizeList(
      row?.serviceSpecificEnhancements,
    ),
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
  }))
  .filter(
    (row) =>
      row.category &&
      row.subCategory &&
      row.universalPlatform &&
      row.baseServiceName,
  );

async function run() {
  await mongoose.connect(mongoUri, {
    bufferCommands: false,
    family: 4,
  });

  const collection = mongoose.connection.collection(collectionName);
  const now = new Date();

  await collection.deleteMany({});

  const documents = rows.map((row) => ({
          sortOrder: row.sortOrder,
          isActive: row.isActive,
          status: row.status,
          serviceOrderId: row.serviceOrderId,
          category: row.category,
          subCategory: row.subCategory,
          universalPlatform: row.universalPlatform,
          baseServiceName: row.baseServiceName,
          itemType: row.itemType,
          flavorEnhancementItem: row.flavorEnhancementItem,
          flavors: row.flavors,
          serviceSpecificEnhancements: row.serviceSpecificEnhancements,
          aui: row.aui,
          groceryYN: row.groceryYN,
          groceryNeeds: row.groceryNeeds,
          kitchenPrepNeededYN: row.kitchenPrepNeededYN,
          kitchenPrepItems: row.kitchenPrepItems,
          carryThroughYN: row.carryThroughYN,
          carryThroughItems: row.carryThroughItems,
          orderItemsFromCC: row.orderItemsFromCC,
          ccItems: row.ccItems,
          updatedMainMachine: row.updatedMainMachine,
          updatedMachine2: row.updatedMachine2,
          updatedMachine3: row.updatedMachine3,
          strategicAttributes: row.strategicAttributes,
          exclusivityKeys: row.exclusivityKeys,
          staff: row.staff,
          preSupplyTier: row.preSupplyTier,
          twoDayPrice: row.twoDayPrice,
          threeDayPrice: row.threeDayPrice,
          fourDayPrice: row.fourDayPrice,
          notes: row.notes,
          sourceRowNumber: row.sourceRowNumber,
          created_at: now,
          updated_at: now,
  }));

  const result = rows.length
    ? await collection.insertMany(documents, { ordered: false })
    : { insertedCount: 0 };
  const totalInCollection = await collection.countDocuments();

  console.log(
    JSON.stringify(
      {
        seededRows: rows.length,
        inserted: result.insertedCount,
        totalInCollection,
      },
      null,
      2,
    ),
  );
}

run()
  .catch((error) => {
    console.error("Failed to seed service maps:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
