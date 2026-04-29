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

function cloneArray(values: string[]) {
  return [...values];
}

function toServiceCatalogRow(
  document: HydratedDocument<LatestServiceDataDocument>,
): ServiceCatalogRow {
  return {
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
  };
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
