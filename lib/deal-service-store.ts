import { randomUUID } from "crypto";
import { Types } from "mongoose";
import {
  arrayToCsv,
  buildCombinedFinalValue,
  buildServiceFinalValue,
  csvToArray,
  DealServiceInput,
  PersistedDealService,
} from "@/lib/deal-services";
import {
  createFreshsalesProduct,
  deleteFreshsalesProduct,
  syncFreshsalesDealProducts,
  updateFreshsalesProduct,
} from "@/lib/freshsales";
import { HttpError } from "@/lib/http-error";
import { connectToDatabase } from "@/lib/mongodb";
import DealServiceModel, { DealServiceDocument } from "@/models/deal-service";

type MongoDealServiceRecord = DealServiceDocument & {
  _id: Types.ObjectId;
};

function toMongoRecord(
  id: string,
  service: DealServiceInput,
  freshsalesProductId?: number,
): Omit<DealServiceDocument, "created_at" | "updated_at"> {
  return {
    id,
    deal_id: service.dealId,
    freshsales_product_id: freshsalesProductId,
    category: service.category,
    sub_category: service.subCategory,
    base_service_name: service.baseServiceName,
    flavors: arrayToCsv(service.flavors),
    service_specific_enhancements: arrayToCsv(service.serviceSpecificEnhancements),
    universal_platform: service.universalPlatform,
    aui: service.aui,
    updated_main_machine: service.updatedMainMachine,
    updated_machine_2: service.updatedMachine2,
    updated_machine_3: service.updatedMachine3,
    price: service.price ?? 0,
    final_value: buildServiceFinalValue(service),
  };
}

function toServiceInput(record: DealServiceDocument): DealServiceInput {
  return {
    dealId: record.deal_id,
    category: record.category,
    subCategory: record.sub_category,
    baseServiceName: record.base_service_name,
    flavors: csvToArray(record.flavors),
    serviceSpecificEnhancements: csvToArray(record.service_specific_enhancements),
    universalPlatform: record.universal_platform,
    aui: record.aui,
    updatedMainMachine: record.updated_main_machine,
    updatedMachine2: record.updated_machine_2,
    updatedMachine3: record.updated_machine_3,
    price: record.price,
  };
}

function fromMongoRecord(record: DealServiceDocument): PersistedDealService {
  return {
    id: record.id,
    dealId: record.deal_id,
    category: record.category,
    subCategory: record.sub_category,
    baseServiceName: record.base_service_name,
    flavors: csvToArray(record.flavors),
    serviceSpecificEnhancements: csvToArray(record.service_specific_enhancements),
    universalPlatform: record.universal_platform,
    aui: record.aui,
    updatedMainMachine: record.updated_main_machine,
    updatedMachine2: record.updated_machine_2,
    updatedMachine3: record.updated_machine_3,
    price: record.price,
    freshsalesProductId: record.freshsales_product_id,
    finalValue: record.final_value,
    createdAt: record.created_at?.toISOString(),
    updatedAt: record.updated_at?.toISOString(),
  };
}

async function listDealServiceRecords(dealId: string) {
  await connectToDatabase();
  return DealServiceModel.find({ deal_id: dealId })
    .sort({ created_at: 1 })
    .lean<MongoDealServiceRecord[]>();
}

function buildDealProductLineItems(records: DealServiceDocument[]) {
  return records
    .filter((service): service is DealServiceDocument & { freshsales_product_id: number } =>
      typeof service.freshsales_product_id === "number",
    )
    .map((service) => ({
      id: service.freshsales_product_id,
      quantity: 1,
      unitPrice: service.price,
    }));
}

async function syncFreshsalesForDeal(dealId: string) {
  const services = await listDealServiceRecords(dealId);
  const combinedFinalValue = buildCombinedFinalValue(
    services.map((service) => ({
      finalValue: service.final_value,
    })),
  );

  await syncFreshsalesDealProducts(dealId, buildDealProductLineItems(services));
  return combinedFinalValue;
}

export async function listDealServices(dealId: string) {
  if (!dealId.trim()) {
    throw new HttpError(400, "A dealId query parameter is required.");
  }

  const services = await listDealServiceRecords(dealId);

  return {
    services: services.map((service) => fromMongoRecord(service)),
    combinedFinalValue: buildCombinedFinalValue(
      services.map((service) => ({
        finalValue: service.final_value,
      })),
    ),
  };
}

export async function issueDealServiceId() {
  return randomUUID();
}

export async function createDealService(
  service: DealServiceInput,
  preferredId?: string,
) {
  await connectToDatabase();

  const id = preferredId?.trim() || randomUUID();
  const existingRecord = await DealServiceModel.findOne({ id }).lean();

  if (existingRecord) {
    throw new HttpError(409, "That service ID already exists. Please create a new service block.");
  }

  await DealServiceModel.create(toMongoRecord(id, service));
  let freshsalesProductId: number | undefined;

  try {
    freshsalesProductId = await createFreshsalesProduct(id, service);
    await DealServiceModel.updateOne(
      { id },
      { $set: { freshsales_product_id: freshsalesProductId } },
    );

    const combinedFinalValue = await syncFreshsalesForDeal(service.dealId);
    const syncedRecord = await DealServiceModel.findOne({ id }).lean<MongoDealServiceRecord | null>();

    if (!syncedRecord) {
      throw new HttpError(404, "Service record not found after sync.");
    }

    return {
      service: fromMongoRecord(syncedRecord),
      combinedFinalValue,
    };
  } catch (error) {
    if (typeof freshsalesProductId === "number") {
      await deleteFreshsalesProduct(freshsalesProductId).catch(() => undefined);
    }

    await DealServiceModel.deleteOne({ id });
    throw error;
  }
}

export async function updateDealService(id: string, service: DealServiceInput) {
  await connectToDatabase();

  const previousRecord = await DealServiceModel.findOne({ id }).lean<MongoDealServiceRecord | null>();

  if (!previousRecord) {
    throw new HttpError(404, "Service record not found.");
  }

  const previousService = toServiceInput(previousRecord);
  const previousProductId = previousRecord.freshsales_product_id;
  const previousDealId = previousRecord.deal_id;
  let currentProductId = previousProductId;
  let createdProductId: number | undefined;

  try {
    if (typeof previousProductId === "number") {
      currentProductId = await updateFreshsalesProduct(previousProductId, id, service);
    } else {
      createdProductId = await createFreshsalesProduct(id, service);
      currentProductId = createdProductId;
    }

    await DealServiceModel.updateOne(
      { id },
      { $set: toMongoRecord(id, service, currentProductId) },
    );

    if (previousDealId !== service.dealId) {
      await syncFreshsalesForDeal(previousDealId);
    }

    const combinedFinalValue = await syncFreshsalesForDeal(service.dealId);
    const updatedRecord = await DealServiceModel.findOne({ id }).lean<MongoDealServiceRecord | null>();

    if (!updatedRecord) {
      throw new HttpError(404, "Service record not found after update.");
    }

    return {
      service: fromMongoRecord(updatedRecord),
      combinedFinalValue,
    };
  } catch (error) {
    await DealServiceModel.replaceOne({ id }, previousRecord);

    if (typeof createdProductId === "number") {
      await deleteFreshsalesProduct(createdProductId).catch(() => undefined);
    } else if (typeof previousProductId === "number") {
      await updateFreshsalesProduct(previousProductId, id, previousService).catch(
        () => undefined,
      );
    }

    if (previousDealId !== service.dealId) {
      await syncFreshsalesForDeal(previousDealId).catch(() => undefined);
      await syncFreshsalesForDeal(service.dealId).catch(() => undefined);
    } else {
      await syncFreshsalesForDeal(service.dealId).catch(() => undefined);
    }

    throw error;
  }
}

export async function deleteDealService(id: string) {
  await connectToDatabase();

  const existingRecord = await DealServiceModel.findOne({ id }).lean<MongoDealServiceRecord | null>();

  if (!existingRecord) {
    throw new HttpError(404, "Service record not found.");
  }

  await DealServiceModel.deleteOne({ id });

  try {
    const combinedFinalValue = await syncFreshsalesForDeal(existingRecord.deal_id);

    if (typeof existingRecord.freshsales_product_id === "number") {
      await deleteFreshsalesProduct(existingRecord.freshsales_product_id).catch(
        () => undefined,
      );
    }

    return {
      deletedId: id,
      dealId: existingRecord.deal_id,
      combinedFinalValue,
    };
  } catch (error) {
    await DealServiceModel.collection.insertOne(existingRecord);
    await syncFreshsalesForDeal(existingRecord.deal_id).catch(() => undefined);
    throw error;
  }
}
