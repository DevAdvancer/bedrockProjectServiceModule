export const FRESHSALES_SERVICE_ORDER_ENTITY_NAME = "cm_service_order";

export const FRESHSALES_SERVICE_ORDER_FIELDS = {
  serviceOrderId: "cf_service_order_id",
  dealId: "cf_deal_id",
  dealName: "cf_deal_name",
  catalogServiceId: "cf_catalog_service_id",
  status: "cf_services_status",
  type: "cf_type",
  serviceCategory: "cf_service_category",
  serviceSubCategory: "cf_service_sub_category",
  baseServiceName: "cf_base_service_name",
  flavorEnhancements: "cf_flavor__enhancements",
  universalPlatform: "cf_universal_platform",
  aui: "cf_aui",
  updatedMainMachine: "cf_updated_main_machine",
  updatedMachine2: "cf_updated_machine_2",
  updatedMachine3: "cf_updated_machine_3",
  groceryYN: "cf_grocery_y_n",
  groceryNeeds: "cf_grocery_needs",
  kitchenPrepNeededYN: "cf_kitchen_prep_needed_y_n",
  kitchenPrepItems: "cf_kitchen_prep_items",
  carryThroughYN: "cf_carry_through_y_n",
  carryThroughItems: "cf_carry_through_items",
  orderItemsFromCC: "cf_order_items_from_cc",
  ccItems: "cf_cc_items",
  strategicAttributes: "cf_strategic_attributes",
  exclusivityKeys: "cf_exclusivity_keys",
  staff: "cf_staff",
  preSupplyTier: "cf_pre_supply_tier",
  twoDayPrice: "cf_2_day",
  threeDayPrice: "cf_3_day",
  fourDayPrice: "cf_4_day",
  notes: "cf_notes",
  price: "cf_price",
  finalValue: "cf_final_value",
} as const;

export const FRESHSALES_SERVICE_ORDER_FIELD_ALIASES = {
  flavorEnhancements: [
    FRESHSALES_SERVICE_ORDER_FIELDS.flavorEnhancements,
    "cf_flavor_enhancements",
  ],
} as const;
