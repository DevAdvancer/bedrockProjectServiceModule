import { randomUUID } from "crypto";
import {
  buildCombinedFinalValue,
  buildServiceFinalValue,
  DealServiceInput,
  EMPTY_READ_ONLY_SERVICE_DETAILS,
  parseFlavorEnhancementsValue,
  PersistedDealService,
} from "@/lib/deal-services";
import {
  createFreshsalesServiceOrder,
  deleteFreshsalesServiceOrder,
  getFreshsalesDeal,
  listFreshsalesServiceOrders,
  searchFreshsalesDeals,
  updateFreshsalesServiceOrder,
} from "@/lib/freshsales";
import {
  FRESHSALES_SERVICE_ORDER_FIELD_ALIASES,
  FRESHSALES_SERVICE_ORDER_FIELDS,
} from "@/lib/freshsales-service-order-fields";
import { HttpError } from "@/lib/http-error";

type FreshsalesServiceOrderRecord = Awaited<
  ReturnType<typeof listFreshsalesServiceOrders>
>[number];

type ServiceOrderRecord = {
  recordId: string | number;
  service: PersistedDealService;
};

function getCustomFieldValue(
  record: FreshsalesServiceOrderRecord,
  fieldName: string,
) {
  return record.custom_field?.[fieldName];
}

function getFirstCustomFieldValue(
  record: FreshsalesServiceOrderRecord,
  fieldNames: readonly string[],
) {
  for (const fieldName of fieldNames) {
    const value = getCustomFieldValue(record, fieldName);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
}

function toStringValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function toNumberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function toIsoString(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

function mapServiceOrderRecord(
  record: FreshsalesServiceOrderRecord,
): ServiceOrderRecord {
  const serviceOrderId =
    toStringValue(
      getCustomFieldValue(record, FRESHSALES_SERVICE_ORDER_FIELDS.serviceOrderId),
    ) || String(record.id);
  const dealId = toStringValue(
    getCustomFieldValue(record, FRESHSALES_SERVICE_ORDER_FIELDS.dealId),
  );
  const category = toStringValue(
    getCustomFieldValue(record, FRESHSALES_SERVICE_ORDER_FIELDS.serviceCategory),
  );
  const subCategory = toStringValue(
    getCustomFieldValue(
      record,
      FRESHSALES_SERVICE_ORDER_FIELDS.serviceSubCategory,
    ),
  );
  const baseServiceName = toStringValue(record.name);
  const flavorEnhancements = parseFlavorEnhancementsValue(
    toStringValue(
      getFirstCustomFieldValue(
        record,
        FRESHSALES_SERVICE_ORDER_FIELD_ALIASES.flavorEnhancements,
      ),
    ),
  );
  const finalValue =
    toStringValue(
      getCustomFieldValue(record, FRESHSALES_SERVICE_ORDER_FIELDS.finalValue),
    ) ||
    buildServiceFinalValue({
      category,
      subCategory,
      baseServiceName,
      flavors: flavorEnhancements.flavors,
      serviceSpecificEnhancements:
        flavorEnhancements.serviceSpecificEnhancements,
    });
  const customField = record.custom_field ?? {};
  const catalogDetails = {
    ...EMPTY_READ_ONLY_SERVICE_DETAILS,
    status: toStringValue(customField[FRESHSALES_SERVICE_ORDER_FIELDS.status]),
    catalogServiceId: toStringValue(
      customField[FRESHSALES_SERVICE_ORDER_FIELDS.catalogServiceId],
    ) || serviceOrderId,
    itemType: toStringValue(customField[FRESHSALES_SERVICE_ORDER_FIELDS.type]),
    universalPlatform: toStringValue(
      customField[FRESHSALES_SERVICE_ORDER_FIELDS.universalPlatform],
    ),
    aui: toStringValue(customField[FRESHSALES_SERVICE_ORDER_FIELDS.aui]),
    updatedMainMachine: toStringValue(
      customField[FRESHSALES_SERVICE_ORDER_FIELDS.updatedMainMachine],
    ),
    updatedMachine2: toStringValue(
      customField[FRESHSALES_SERVICE_ORDER_FIELDS.updatedMachine2],
    ),
    updatedMachine3: toStringValue(
      customField[FRESHSALES_SERVICE_ORDER_FIELDS.updatedMachine3],
    ),
    groceryYN: toStringValue(
      customField[FRESHSALES_SERVICE_ORDER_FIELDS.groceryYN],
    ),
    groceryNeeds: toStringValue(
      customField[FRESHSALES_SERVICE_ORDER_FIELDS.groceryNeeds],
    ),
    kitchenPrepNeededYN: toStringValue(
      customField[FRESHSALES_SERVICE_ORDER_FIELDS.kitchenPrepNeededYN],
    ),
    kitchenPrepItems: toStringValue(
      customField[FRESHSALES_SERVICE_ORDER_FIELDS.kitchenPrepItems],
    ),
    carryThroughYN: toStringValue(
      customField[FRESHSALES_SERVICE_ORDER_FIELDS.carryThroughYN],
    ),
    carryThroughItems: toStringValue(
      customField[FRESHSALES_SERVICE_ORDER_FIELDS.carryThroughItems],
    ),
    orderItemsFromCC: toStringValue(
      customField[FRESHSALES_SERVICE_ORDER_FIELDS.orderItemsFromCC],
    ),
    ccItems: toStringValue(customField[FRESHSALES_SERVICE_ORDER_FIELDS.ccItems]),
    strategicAttributes: toStringValue(
      customField[FRESHSALES_SERVICE_ORDER_FIELDS.strategicAttributes],
    ),
    exclusivityKeys: toStringValue(
      customField[FRESHSALES_SERVICE_ORDER_FIELDS.exclusivityKeys],
    ),
    staff: toStringValue(customField[FRESHSALES_SERVICE_ORDER_FIELDS.staff]),
    preSupplyTier: toStringValue(
      customField[FRESHSALES_SERVICE_ORDER_FIELDS.preSupplyTier],
    ),
    twoDayPrice: toStringValue(
      customField[FRESHSALES_SERVICE_ORDER_FIELDS.twoDayPrice],
    ),
    threeDayPrice: toStringValue(
      customField[FRESHSALES_SERVICE_ORDER_FIELDS.threeDayPrice],
    ),
    fourDayPrice: toStringValue(
      customField[FRESHSALES_SERVICE_ORDER_FIELDS.fourDayPrice],
    ),
    notes: toStringValue(customField[FRESHSALES_SERVICE_ORDER_FIELDS.notes]),
  };

  return {
    recordId: record.id,
    service: {
      id: String(record.id),
      dealId,
      category,
      subCategory,
      baseServiceName,
      flavors: flavorEnhancements.flavors,
      serviceSpecificEnhancements:
        flavorEnhancements.serviceSpecificEnhancements,
      universalPlatform: toStringValue(
        getCustomFieldValue(
          record,
          FRESHSALES_SERVICE_ORDER_FIELDS.universalPlatform,
        ),
      ),
      aui: toStringValue(
        getCustomFieldValue(record, FRESHSALES_SERVICE_ORDER_FIELDS.aui),
      ),
      updatedMainMachine: toStringValue(
        getCustomFieldValue(
          record,
          FRESHSALES_SERVICE_ORDER_FIELDS.updatedMainMachine,
        ),
      ),
      updatedMachine2: toStringValue(
        getCustomFieldValue(
          record,
          FRESHSALES_SERVICE_ORDER_FIELDS.updatedMachine2,
        ),
      ),
      updatedMachine3: toStringValue(
        getCustomFieldValue(
          record,
          FRESHSALES_SERVICE_ORDER_FIELDS.updatedMachine3,
        ),
      ),
      price: toNumberValue(
        getCustomFieldValue(record, FRESHSALES_SERVICE_ORDER_FIELDS.price),
      ),
      catalogDetails,
      finalValue,
      createdAt: toIsoString(record.created_at),
      updatedAt: toIsoString(record.updated_at),
    },
  };
}

async function listServiceOrderRecords() {
  const records = await listFreshsalesServiceOrders();
  return records
    .map((record) => mapServiceOrderRecord(record))
    .sort((left, right) => {
      const leftTimestamp = Date.parse(left.service.createdAt ?? "") || 0;
      const rightTimestamp = Date.parse(right.service.createdAt ?? "") || 0;
      return leftTimestamp - rightTimestamp;
    });
}

async function getCombinedFinalValueForDeal(dealId: string) {
  const records = await listServiceOrderRecords();
  return buildCombinedFinalValue(
    records
      .filter((record) => record.service.dealId === dealId)
      .map((record) => ({
        finalValue: record.service.finalValue,
      })),
  );
}

async function findServiceOrderRecordById(id: string) {
  const records = await listServiceOrderRecords();
  const existingRecord = records.find(
    (record) =>
      String(record.recordId) === id ||
      record.service.id === id ||
      record.service.catalogDetails.catalogServiceId === id,
  );

  if (!existingRecord) {
    throw new HttpError(404, "Service record not found.");
  }

  return existingRecord;
}

async function resolveDealReference(dealReference: string) {
  const normalizedReference = dealReference.trim();

  try {
    const deal = await getFreshsalesDeal(normalizedReference);
    return {
      id: normalizedReference,
      name: deal.name || normalizedReference,
    };
  } catch (error) {
    const matches = await searchFreshsalesDeals(normalizedReference);
    const exactMatch = matches.find(
      (match) =>
        match.name.trim().toLowerCase() === normalizedReference.toLowerCase(),
    );

    if (exactMatch) {
      return {
        id: exactMatch.id,
        name: exactMatch.name,
      };
    }

    throw error;
  }
}

export async function listDealServices(dealId: string) {
  const normalizedDealId = dealId.trim();

  if (!normalizedDealId) {
    throw new HttpError(400, "A dealId query parameter is required.");
  }

  const [deal, records] = await Promise.all([
    resolveDealReference(normalizedDealId),
    listServiceOrderRecords(),
  ]);
  const services = records
    .filter((record) => record.service.dealId === deal.id)
    .map((record) => record.service);

  return {
    services,
    combinedFinalValue: buildCombinedFinalValue(
      services.map((service) => ({
        finalValue: service.finalValue,
      })),
    ),
    deal: {
      id: deal.id,
      name: deal.name,
    },
  };
}

export async function issueDealServiceId() {
  return randomUUID();
}

export async function createDealService(
  service: DealServiceInput,
  preferredId?: string,
) {
  const deal = await getFreshsalesDeal(service.dealId);
  const dealName = deal.name?.trim() || service.dealId;
  const serviceOrderId =
    service.catalogDetails.catalogServiceId.trim() ||
    preferredId?.trim() ||
    randomUUID();

  const createdRecord = await createFreshsalesServiceOrder(
    serviceOrderId,
    service,
    dealName,
  );
  const mappedRecord = mapServiceOrderRecord(createdRecord);

  return {
    service: mappedRecord.service,
    combinedFinalValue: await getCombinedFinalValueForDeal(service.dealId),
  };
}

export async function updateDealService(id: string, service: DealServiceInput) {
  const existingRecord = await findServiceOrderRecordById(id);
  const deal = await getFreshsalesDeal(service.dealId);
  const dealName = deal.name?.trim() || service.dealId;
  const serviceOrderId =
    service.catalogDetails.catalogServiceId.trim() ||
    existingRecord.service.catalogDetails.catalogServiceId ||
    id;

  const updatedRecord = await updateFreshsalesServiceOrder(
    existingRecord.recordId,
    serviceOrderId,
    service,
    dealName,
  );
  const mappedRecord = mapServiceOrderRecord(updatedRecord);

  return {
    service: mappedRecord.service,
    combinedFinalValue: await getCombinedFinalValueForDeal(service.dealId),
  };
}

export async function deleteDealService(id: string) {
  const existingRecord = await findServiceOrderRecordById(id);

  await deleteFreshsalesServiceOrder(existingRecord.recordId);

  return {
    deletedId: id,
    dealId: existingRecord.service.dealId,
    combinedFinalValue: await getCombinedFinalValueForDeal(
      existingRecord.service.dealId,
    ),
  };
}
