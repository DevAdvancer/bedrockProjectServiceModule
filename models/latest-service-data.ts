import mongoose, { Model, Schema } from "mongoose";

export type LatestServiceDataDocument = {
  sortOrder: number;
  isActive: boolean;
  status: string;
  serviceOrderId: string;
  category: string;
  subCategory: string;
  universalPlatform: string;
  baseServiceName: string;
  itemType: string;
  flavorEnhancementItem: string;
  flavors: string[];
  serviceSpecificEnhancements: string[];
  aui: string[];
  groceryYN: string;
  groceryNeeds: string;
  kitchenPrepNeededYN: string;
  kitchenPrepItems: string;
  carryThroughYN: string;
  carryThroughItems: string;
  orderItemsFromCC: string;
  ccItems: string;
  updatedMainMachine: string[];
  updatedMachine2: string[];
  updatedMachine3: string[];
  strategicAttributes: string;
  exclusivityKeys: string;
  staff: string;
  preSupplyTier: string;
  twoDayPrice: string;
  threeDayPrice: string;
  fourDayPrice: string;
  notes: string;
  sourceRowNumber: number;
  created_at: Date;
  updated_at: Date;
};

const trimmedStringArray = {
  type: [
    {
      type: String,
      trim: true,
    },
  ],
  default: [],
};

const latestServiceDataSchema = new Schema<LatestServiceDataDocument>(
  {
    sortOrder: { type: Number, required: true, min: 1, index: true },
    isActive: { type: Boolean, default: true, index: true },
    status: { type: String, default: "", trim: true },
    serviceOrderId: { type: String, default: "", trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    subCategory: { type: String, required: true, trim: true, index: true },
    universalPlatform: { type: String, required: true, trim: true, index: true },
    baseServiceName: { type: String, required: true, trim: true, index: true },
    itemType: { type: String, default: "", trim: true, index: true },
    flavorEnhancementItem: { type: String, default: "", trim: true, index: true },
    flavors: trimmedStringArray,
    serviceSpecificEnhancements: trimmedStringArray,
    aui: trimmedStringArray,
    groceryYN: { type: String, default: "", trim: true },
    groceryNeeds: { type: String, default: "", trim: true },
    kitchenPrepNeededYN: { type: String, default: "", trim: true },
    kitchenPrepItems: { type: String, default: "", trim: true },
    carryThroughYN: { type: String, default: "", trim: true },
    carryThroughItems: { type: String, default: "", trim: true },
    orderItemsFromCC: { type: String, default: "", trim: true },
    ccItems: { type: String, default: "", trim: true },
    updatedMainMachine: trimmedStringArray,
    updatedMachine2: trimmedStringArray,
    updatedMachine3: trimmedStringArray,
    strategicAttributes: { type: String, default: "", trim: true },
    exclusivityKeys: { type: String, default: "", trim: true },
    staff: { type: String, default: "", trim: true },
    preSupplyTier: { type: String, default: "", trim: true },
    twoDayPrice: { type: String, default: "", trim: true },
    threeDayPrice: { type: String, default: "", trim: true },
    fourDayPrice: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    sourceRowNumber: { type: Number, required: true, min: 1 },
  },
  {
    collection: "latestdata",
    id: false,
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    versionKey: false,
  },
);

latestServiceDataSchema.index({
  category: 1,
  subCategory: 1,
  universalPlatform: 1,
  baseServiceName: 1,
  flavorEnhancementItem: 1,
});

const LatestServiceDataModel =
  (mongoose.models.LatestServiceData as Model<LatestServiceDataDocument>) ||
  mongoose.model<LatestServiceDataDocument>(
    "LatestServiceData",
    latestServiceDataSchema,
  );

export default LatestServiceDataModel;
