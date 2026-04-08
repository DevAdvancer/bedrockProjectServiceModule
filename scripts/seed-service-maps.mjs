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
const collectionName = "service_maps";

const rows = rawRows
  .map((row, index) => ({
    sortOrder:
      Number.isFinite(row?.rowNumber) && row.rowNumber > 0
        ? row.rowNumber
        : index + 1,
    isActive: row?.isActive !== false,
    serviceOrderId: normalizeText(row?.serviceOrderId),
    category: normalizeText(row?.category),
    subCategory: normalizeText(row?.subCategory),
    universalPlatform: normalizeText(row?.universalPlatform),
    baseServiceName: normalizeText(row?.baseServiceName),
    flavors: normalizeList(row?.flavors),
    serviceSpecificEnhancements: normalizeList(
      row?.serviceSpecificEnhancements,
    ),
    aui: normalizeList(row?.aui),
    updatedMainMachine: normalizeList(row?.updatedMainMachine),
    updatedMachine2: normalizeList(row?.updatedMachine2),
    updatedMachine3: normalizeList(row?.updatedMachine3),
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

  await collection.updateMany(
    {
      isActive: {
        $exists: false,
      },
    },
    {
      $set: {
        isActive: true,
      },
    },
  );

  const operations = rows.map((row) => ({
    updateOne: {
      filter: {
        category: row.category,
        subCategory: row.subCategory,
        universalPlatform: row.universalPlatform,
        baseServiceName: row.baseServiceName,
      },
      update: {
        $set: {
          sortOrder: row.sortOrder,
          serviceOrderId: row.serviceOrderId,
          category: row.category,
          subCategory: row.subCategory,
          universalPlatform: row.universalPlatform,
          baseServiceName: row.baseServiceName,
          flavors: row.flavors,
          serviceSpecificEnhancements: row.serviceSpecificEnhancements,
          aui: row.aui,
          updatedMainMachine: row.updatedMainMachine,
          updatedMachine2: row.updatedMachine2,
          updatedMachine3: row.updatedMachine3,
          updated_at: now,
        },
        $setOnInsert: {
          created_at: now,
          isActive: row.isActive,
        },
      },
      upsert: true,
    },
  }));

  const result = await collection.bulkWrite(operations, { ordered: false });
  const totalInCollection = await collection.countDocuments();

  console.log(
    JSON.stringify(
      {
        seededRows: rows.length,
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
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
