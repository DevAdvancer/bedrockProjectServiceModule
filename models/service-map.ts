import mongoose, { Model, Schema } from "mongoose";

export type ServiceMapDocument = {
  sortOrder: number;
  isActive: boolean;
  serviceOrderId: string;
  category: string;
  subCategory: string;
  universalPlatform: string;
  baseServiceName: string;
  flavors: string[];
  serviceSpecificEnhancements: string[];
  aui: string[];
  updatedMainMachine: string[];
  updatedMachine2: string[];
  updatedMachine3: string[];
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

const serviceMapSchema = new Schema<ServiceMapDocument>(
  {
    sortOrder: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    serviceOrderId: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subCategory: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    universalPlatform: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    baseServiceName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    flavors: trimmedStringArray,
    serviceSpecificEnhancements: trimmedStringArray,
    aui: trimmedStringArray,
    updatedMainMachine: trimmedStringArray,
    updatedMachine2: trimmedStringArray,
    updatedMachine3: trimmedStringArray,
  },
  {
    collection: "service_maps",
    id: false,
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    versionKey: false,
  },
);

serviceMapSchema.index({
  category: 1,
  subCategory: 1,
  universalPlatform: 1,
  baseServiceName: 1,
});

const ServiceMapModel =
  (mongoose.models.ServiceMap as Model<ServiceMapDocument>) ||
  mongoose.model<ServiceMapDocument>("ServiceMap", serviceMapSchema);

export default ServiceMapModel;
