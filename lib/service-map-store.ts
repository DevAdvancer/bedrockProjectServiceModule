import mongoose, { HydratedDocument } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import {
  getSeedServiceCatalogRows,
  ServiceCatalogRow,
} from "@/lib/service-catalog";
import { HttpError } from "@/lib/http-error";
import { ServiceMapInput } from "@/lib/service-map-payload";
import ServiceMapModel, { ServiceMapDocument } from "@/models/service-map";

function cloneArray(values: string[]) {
  return [...values];
}

function toServiceCatalogRow(
  document: HydratedDocument<ServiceMapDocument>,
): ServiceCatalogRow {
  return {
    id: document._id.toString(),
    sortOrder: document.sortOrder,
    isActive: document.isActive !== false,
    serviceOrderId: document.serviceOrderId,
    category: document.category,
    subCategory: document.subCategory,
    universalPlatform: document.universalPlatform,
    baseServiceName: document.baseServiceName,
    flavors: cloneArray(document.flavors),
    serviceSpecificEnhancements: cloneArray(
      document.serviceSpecificEnhancements,
    ),
    aui: cloneArray(document.aui),
    updatedMainMachine: cloneArray(document.updatedMainMachine),
    updatedMachine2: cloneArray(document.updatedMachine2),
    updatedMachine3: cloneArray(document.updatedMachine3),
    createdAt: document.created_at?.toISOString(),
    updatedAt: document.updated_at?.toISOString(),
  };
}

function toInsertableMap(input: ServiceMapInput) {
  return {
    sortOrder: input.sortOrder,
    isActive: input.isActive,
    serviceOrderId: input.serviceOrderId,
    category: input.category,
    subCategory: input.subCategory,
    universalPlatform: input.universalPlatform,
    baseServiceName: input.baseServiceName,
    flavors: cloneArray(input.flavors),
    serviceSpecificEnhancements: cloneArray(
      input.serviceSpecificEnhancements,
    ),
    aui: cloneArray(input.aui),
    updatedMainMachine: cloneArray(input.updatedMainMachine),
    updatedMachine2: cloneArray(input.updatedMachine2),
    updatedMachine3: cloneArray(input.updatedMachine3),
  };
}

async function ensureSeeded() {
  await connectToDatabase();

  await ServiceMapModel.updateMany(
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

  const documentCount = await ServiceMapModel.estimatedDocumentCount();

  if (documentCount > 0) {
    return;
  }

  const seedRows = getSeedServiceCatalogRows();

  if (seedRows.length === 0) {
    return;
  }

  await ServiceMapModel.insertMany(
    seedRows.map((row) =>
      toInsertableMap({
        sortOrder: row.sortOrder,
        isActive: row.isActive,
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
      }),
    ),
  );
}

async function getNextSortOrder() {
  const lastMap = await ServiceMapModel.findOne().sort({ sortOrder: -1 }).exec();
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
  const documents = await ServiceMapModel.find(
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
  const document = await ServiceMapModel.create(
    toInsertableMap({
      ...input,
      sortOrder,
    }),
  );

  return {
    map: toServiceCatalogRow(document),
  };
}

export async function updateServiceMap(id: string, input: ServiceMapInput) {
  await connectToDatabase();
  assertValidId(id);

  const document = await ServiceMapModel.findByIdAndUpdate(
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

  const document = await ServiceMapModel.findByIdAndDelete(id).exec();

  if (!document) {
    throw new HttpError(404, "Map row not found.");
  }

  return {
    deletedId: id,
  };
}
