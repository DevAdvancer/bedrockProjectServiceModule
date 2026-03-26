export const FRESHSALES_SERVICE_ORDER_ENTITY_NAME = "cm_service_order";

export const FRESHSALES_SERVICE_ORDER_FIELDS = {
  serviceOrderId: "cf_service_order_id",
  dealId: "cf_deal_id",
  dealName: "cf_deal_name",
  serviceCategory: "cf_service_category",
  serviceSubCategory: "cf_service_sub_category",
  flavorEnhancements: "cf_flavor__enhancements",
  universalPlatform: "cf_universal_platform",
  aui: "cf_aui",
  updatedMainMachine: "cf_updated_main_machine",
  updatedMachine2: "cf_updated_machine_2",
  updatedMachine3: "cf_updated_machine_3",
  price: "cf_price",
  finalValue: "cf_final_value",
} as const;

export const FRESHSALES_SERVICE_ORDER_FIELD_ALIASES = {
  flavorEnhancements: [
    FRESHSALES_SERVICE_ORDER_FIELDS.flavorEnhancements,
    "cf_flavor_enhancements",
  ],
} as const;
