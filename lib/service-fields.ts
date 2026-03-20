export const SERVICE_FIELD_KEYS = {
  category: "category",
  subCategory: "sub_category",
  universalPlatform: "universal_platform",
  baseServiceName: "base_service_name",
  flavors: "flavors",
  serviceSpecificEnhancements: "service_specific_enhancements",
  aui: "aui",
  updatedMainMachine: "updated_main_machine",
  updatedMachine2: "updated_machine_2",
  updatedMachine3: "updated_machine_3",
  price: "price",
} as const;

export type ServiceFieldName = keyof typeof SERVICE_FIELD_KEYS;

export const SERVICE_FIELD_ORDER: ServiceFieldName[] = [
  "category",
  "subCategory",
  "universalPlatform",
  "baseServiceName",
  "flavors",
  "serviceSpecificEnhancements",
  "aui",
  "updatedMainMachine",
  "updatedMachine2",
  "updatedMachine3",
  "price",
];

export function getIndexedFieldName(
  field: ServiceFieldName,
  serviceNumber: number,
) {
  return `${SERVICE_FIELD_KEYS[field]}_${serviceNumber}`;
}
