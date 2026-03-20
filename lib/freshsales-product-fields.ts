export const FRESHSALES_PRODUCT_CUSTOM_FIELDS = {
  serviceCategory: "cf_service_category",
  serviceSubCategory: "cf_service_sub_category",
  universalPlatform: "cf_universal_platform",
  baseServiceName: "cf_base_service_name",
  flavors: "cf_flavors",
  serviceSpecificEnhancements: "cf_service_specific_enhancements",
  aui: "cf_aui",
  updatedMainMachine: "cf_updated_main_machine",
  updatedMachine2: "cf_updated_machine_2",
  updatedMachine3: "cf_updated_machine_3",
  finalValue: "cf_final_value",
} as const;

export const FRESHSALES_REQUIRED_PRODUCT_FIELDS = [
  {
    label: "Category",
    apiName: FRESHSALES_PRODUCT_CUSTOM_FIELDS.serviceCategory,
    type: "Text or Dropdown",
  },
  {
    label: "Sub Category",
    apiName: FRESHSALES_PRODUCT_CUSTOM_FIELDS.serviceSubCategory,
    type: "Text or Dropdown",
  },
  {
    label: "Universal Platform",
    apiName: FRESHSALES_PRODUCT_CUSTOM_FIELDS.universalPlatform,
    type: "Text or Dropdown",
  },
  {
    label: "Base Service Name",
    apiName: FRESHSALES_PRODUCT_CUSTOM_FIELDS.baseServiceName,
    type: "Text or Dropdown",
  },
  {
    label: "Flavors",
    apiName: FRESHSALES_PRODUCT_CUSTOM_FIELDS.flavors,
    type: "Text Area",
  },
  {
    label: "Service-Specific Enhancements",
    apiName: FRESHSALES_PRODUCT_CUSTOM_FIELDS.serviceSpecificEnhancements,
    type: "Text Area",
  },
  {
    label: "AUI",
    apiName: FRESHSALES_PRODUCT_CUSTOM_FIELDS.aui,
    type: "Text or Dropdown",
  },
  {
    label: "Updated Main Machine",
    apiName: FRESHSALES_PRODUCT_CUSTOM_FIELDS.updatedMainMachine,
    type: "Text or Dropdown",
  },
  {
    label: "Updated Machine 2",
    apiName: FRESHSALES_PRODUCT_CUSTOM_FIELDS.updatedMachine2,
    type: "Text or Dropdown",
  },
  {
    label: "Updated Machine 3",
    apiName: FRESHSALES_PRODUCT_CUSTOM_FIELDS.updatedMachine3,
    type: "Text or Dropdown",
  },
  {
    label: "Final Value",
    apiName: FRESHSALES_PRODUCT_CUSTOM_FIELDS.finalValue,
    type: "Text Area",
  },
] as const;
