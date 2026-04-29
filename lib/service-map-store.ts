import mongoose, { HydratedDocument } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import {
  getSeedServiceCatalogRows,
  ServiceCatalogRow,
} from "@/lib/service-catalog";
import { HttpError } from "@/lib/http-error";
import { ServiceMapInput } from "@/lib/service-map-payload";
import LatestServiceDataModel, {
  LatestServiceDataDocument,
} from "@/models/latest-service-data";

const seedCatalogRows = getSeedServiceCatalogRows();

function cloneArray(values?: string[]) {
  return Array.isArray(values) ? [...values] : [];
}

function hasValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

function findSeedCatalogRow(row: ServiceCatalogRow) {
  return seedCatalogRows.find((seedRow) => {
    if (seedRow.category !== row.category) return false;
    if (seedRow.subCategory !== row.subCategory) return false;
    if (row.universalPlatform && seedRow.universalPlatform !== row.universalPlatform) {
      return false;
    }
    if (seedRow.baseServiceName !== row.baseServiceName) return false;

    const selectedItems = new Set([
      ...row.flavors,
      ...row.serviceSpecificEnhancements,
      row.flavorEnhancementItem,
    ].filter(Boolean));

    if (selectedItems.size === 0) {
      return true;
    }

    return (
      selectedItems.has(seedRow.flavorEnhancementItem) ||
      seedRow.flavors.some((item) => selectedItems.has(item)) ||
      seedRow.serviceSpecificEnhancements.some((item) => selectedItems.has(item))
    );
  });
}

function withSeedFallback(row: ServiceCatalogRow) {
  const seedRow = findSeedCatalogRow(row);
  if (!seedRow) return row;

  return {
    ...row,
    status: hasValue(row.status) ? row.status : seedRow.status,
    serviceOrderId: hasValue(row.serviceOrderId)
      ? row.serviceOrderId
      : seedRow.serviceOrderId,
    universalPlatform: hasValue(row.universalPlatform)
      ? row.universalPlatform
      : seedRow.universalPlatform,
    itemType: hasValue(row.itemType) ? row.itemType : seedRow.itemType,
    flavorEnhancementItem: hasValue(row.flavorEnhancementItem)
      ? row.flavorEnhancementItem
      : seedRow.flavorEnhancementItem,
    flavors: hasValue(row.flavors) ? row.flavors : seedRow.flavors,
    serviceSpecificEnhancements: hasValue(row.serviceSpecificEnhancements)
      ? row.serviceSpecificEnhancements
      : seedRow.serviceSpecificEnhancements,
    aui: hasValue(row.aui) ? row.aui : seedRow.aui,
    groceryYN: hasValue(row.groceryYN) ? row.groceryYN : seedRow.groceryYN,
    groceryNeeds: hasValue(row.groceryNeeds)
      ? row.groceryNeeds
      : seedRow.groceryNeeds,
    kitchenPrepNeededYN: hasValue(row.kitchenPrepNeededYN)
      ? row.kitchenPrepNeededYN
      : seedRow.kitchenPrepNeededYN,
    kitchenPrepItems: hasValue(row.kitchenPrepItems)
      ? row.kitchenPrepItems
      : seedRow.kitchenPrepItems,
    carryThroughYN: hasValue(row.carryThroughYN)
      ? row.carryThroughYN
      : seedRow.carryThroughYN,
    carryThroughItems: hasValue(row.carryThroughItems)
      ? row.carryThroughItems
      : seedRow.carryThroughItems,
    orderItemsFromCC: hasValue(row.orderItemsFromCC)
      ? row.orderItemsFromCC
      : seedRow.orderItemsFromCC,
    ccItems: hasValue(row.ccItems) ? row.ccItems : seedRow.ccItems,
    updatedMainMachine: hasValue(row.updatedMainMachine)
      ? row.updatedMainMachine
      : seedRow.updatedMainMachine,
    updatedMachine2: hasValue(row.updatedMachine2)
      ? row.updatedMachine2
      : seedRow.updatedMachine2,
    updatedMachine3: hasValue(row.updatedMachine3)
      ? row.updatedMachine3
      : seedRow.updatedMachine3,
    strategicAttributes: hasValue(row.strategicAttributes)
      ? row.strategicAttributes
      : seedRow.strategicAttributes,
    exclusivityKeys: hasValue(row.exclusivityKeys)
      ? row.exclusivityKeys
      : seedRow.exclusivityKeys,
    staff: hasValue(row.staff) ? row.staff : seedRow.staff,
    preSupplyTier: hasValue(row.preSupplyTier)
      ? row.preSupplyTier
      : seedRow.preSupplyTier,
    twoDayPrice: hasValue(row.twoDayPrice) ? row.twoDayPrice : seedRow.twoDayPrice,
    threeDayPrice: hasValue(row.threeDayPrice)
      ? row.threeDayPrice
      : seedRow.threeDayPrice,
    fourDayPrice: hasValue(row.fourDayPrice)
      ? row.fourDayPrice
      : seedRow.fourDayPrice,
    notes: hasValue(row.notes) ? row.notes : seedRow.notes,
    sourceRowNumber: row.sourceRowNumber || seedRow.sourceRowNumber,
  };
}

function toServiceCatalogRow(
  document: HydratedDocument<LatestServiceDataDocument>,
): ServiceCatalogRow {
  return withSeedFallback({
    id: document._id.toString(),
    sortOrder: document.sortOrder,
    isActive: document.isActive !== false,
    status: document.status,
    serviceOrderId: document.serviceOrderId,
    category: document.category,
    subCategory: document.subCategory,
    universalPlatform: document.universalPlatform,
    baseServiceName: document.baseServiceName,
    itemType: document.itemType,
    flavorEnhancementItem: document.flavorEnhancementItem,
    flavors: cloneArray(document.flavors),
    serviceSpecificEnhancements: cloneArray(
      document.serviceSpecificEnhancements,
    ),
    aui: cloneArray(document.aui),
    groceryYN: document.groceryYN,
    groceryNeeds: document.groceryNeeds,
    kitchenPrepNeededYN: document.kitchenPrepNeededYN,
    kitchenPrepItems: document.kitchenPrepItems,
    carryThroughYN: document.carryThroughYN,
    carryThroughItems: document.carryThroughItems,
    orderItemsFromCC: document.orderItemsFromCC,
    ccItems: document.ccItems,
    updatedMainMachine: cloneArray(document.updatedMainMachine),
    updatedMachine2: cloneArray(document.updatedMachine2),
    updatedMachine3: cloneArray(document.updatedMachine3),
    strategicAttributes: document.strategicAttributes,
    exclusivityKeys: document.exclusivityKeys,
    staff: document.staff,
    preSupplyTier: document.preSupplyTier,
    twoDayPrice: document.twoDayPrice,
    threeDayPrice: document.threeDayPrice,
    fourDayPrice: document.fourDayPrice,
    notes: document.notes,
    sourceRowNumber: document.sourceRowNumber,
    createdAt: document.created_at?.toISOString(),
    updatedAt: document.updated_at?.toISOString(),
  });
}

function toInsertableMap(input: ServiceMapInput) {
  return {
    sortOrder: input.sortOrder,
    isActive: input.isActive,
    status: input.status ?? "",
    serviceOrderId: input.serviceOrderId,
    category: input.category,
    subCategory: input.subCategory,
    universalPlatform: input.universalPlatform,
    baseServiceName: input.baseServiceName,
    itemType: input.itemType ?? "",
    flavorEnhancementItem: input.flavorEnhancementItem ?? "",
    flavors: cloneArray(input.flavors),
    serviceSpecificEnhancements: cloneArray(
      input.serviceSpecificEnhancements,
    ),
    aui: cloneArray(input.aui),
    groceryYN: input.groceryYN ?? "",
    groceryNeeds: input.groceryNeeds ?? "",
    kitchenPrepNeededYN: input.kitchenPrepNeededYN ?? "",
    kitchenPrepItems: input.kitchenPrepItems ?? "",
    carryThroughYN: input.carryThroughYN ?? "",
    carryThroughItems: input.carryThroughItems ?? "",
    orderItemsFromCC: input.orderItemsFromCC ?? "",
    ccItems: input.ccItems ?? "",
    updatedMainMachine: cloneArray(input.updatedMainMachine),
    updatedMachine2: cloneArray(input.updatedMachine2),
    updatedMachine3: cloneArray(input.updatedMachine3),
    strategicAttributes: input.strategicAttributes ?? "",
    exclusivityKeys: input.exclusivityKeys ?? "",
    staff: input.staff ?? "",
    preSupplyTier: input.preSupplyTier ?? "",
    twoDayPrice: input.twoDayPrice ?? "",
    threeDayPrice: input.threeDayPrice ?? "",
    fourDayPrice: input.fourDayPrice ?? "",
    notes: input.notes ?? "",
    sourceRowNumber: input.sourceRowNumber ?? input.sortOrder,
  };
}

async function ensureSeeded() {
  await connectToDatabase();

  await LatestServiceDataModel.updateMany(
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
  ).exec();

  const documentCount = await LatestServiceDataModel.estimatedDocumentCount();

  if (documentCount > 0) {
    const validStatusCount = await LatestServiceDataModel.countDocuments({
      status: { $ne: "" },
    });

    // If documents exist but none have a status, perform a one-time migration
    // to populate the newly added fields from the seed data.
    if (validStatusCount === 0) {
      const seedRows = getSeedServiceCatalogRows();
      const bulkOps = seedRows.map((row) => ({
        updateOne: {
          filter: {
            category: row.category,
            subCategory: row.subCategory,
            universalPlatform: row.universalPlatform,
            baseServiceName: row.baseServiceName,
            flavorEnhancementItem: row.flavorEnhancementItem,
          },
          update: {
            $set: {
              status: row.status,
              groceryYN: row.groceryYN,
              groceryNeeds: row.groceryNeeds,
              kitchenPrepNeededYN: row.kitchenPrepNeededYN,
              kitchenPrepItems: row.kitchenPrepItems,
              carryThroughYN: row.carryThroughYN,
              carryThroughItems: row.carryThroughItems,
              orderItemsFromCC: row.orderItemsFromCC,
              ccItems: row.ccItems,
              strategicAttributes: row.strategicAttributes,
              exclusivityKeys: row.exclusivityKeys,
              staff: row.staff,
              preSupplyTier: row.preSupplyTier,
              twoDayPrice: row.twoDayPrice,
              threeDayPrice: row.threeDayPrice,
              fourDayPrice: row.fourDayPrice,
              notes: row.notes,
            },
          },
        },
      }));

      if (bulkOps.length > 0) {
        await LatestServiceDataModel.bulkWrite(bulkOps);
      }
    }
    return;
  }

  const seedRows = getSeedServiceCatalogRows();

  if (seedRows.length === 0) {
    return;
  }

  await LatestServiceDataModel.insertMany(
    seedRows.map((row) =>
      ({
        ...row,
        ...toInsertableMap(row),
      }),
    ),
  );
}

async function getNextSortOrder() {
  const lastMap = await LatestServiceDataModel.findOne()
    .sort({ sortOrder: -1 })
    .exec();
  return lastMap ? lastMap.sortOrder + 1 : 1;
}

function assertValidId(id: string) {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(404, "Map row not found.");
  }
}

export async function listServiceMaps(options?: {
  includeInactive?: boolean;
}) {
  await ensureSeeded();

  const includeInactive = options?.includeInactive === true;
  const documents = await LatestServiceDataModel.find(
    includeInactive
      ? {}
      : {
          isActive: true,
        },
  )
    .sort({ sortOrder: 1, created_at: 1, _id: 1 })
    .exec();

  return documents.map((document) => toServiceCatalogRow(document));
}

export async function createServiceMap(input: ServiceMapInput) {
  await ensureSeeded();

  const sortOrder =
    input.sortOrder > 0 ? input.sortOrder : await getNextSortOrder();
  const document = await LatestServiceDataModel.create(
    toInsertableMap({
      ...input,
      sortOrder,
    }) as Partial<LatestServiceDataDocument>,
  );

  return {
    map: toServiceCatalogRow(document),
  };
}

export async function updateServiceMap(id: string, input: ServiceMapInput) {
  await connectToDatabase();
  assertValidId(id);

  const document = await LatestServiceDataModel.findByIdAndUpdate(
    id,
    toInsertableMap(input),
    {
      new: true,
      runValidators: true,
    },
  ).exec();

  if (!document) {
    throw new HttpError(404, "Map row not found.");
  }

  return {
    map: toServiceCatalogRow(document),
  };
}

export async function deleteServiceMap(id: string) {
  await connectToDatabase();
  assertValidId(id);

  const document = await LatestServiceDataModel.findByIdAndDelete(id).exec();

  if (!document) {
    throw new HttpError(404, "Map row not found.");
  }

  return {
    deletedId: id,
  };
}
