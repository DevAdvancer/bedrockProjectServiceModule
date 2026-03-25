import mongoose, { Model, Schema } from "mongoose";

export type DealServiceDocument = {
  id: string;
  deal_id: string;
  deal_name: string;
  freshsales_product_id?: number;
  category: string;
  sub_category: string;
  base_service_name: string;
  flavors: string;
  service_specific_enhancements: string;
  universal_platform: string;
  aui: string;
  updated_main_machine: string;
  updated_machine_2: string;
  updated_machine_3: string;
  price: number;
  final_value: string;
  created_at: Date;
  updated_at: Date;
};

const dealServiceSchema = new Schema<DealServiceDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    deal_id: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    deal_name: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    freshsales_product_id: {
      type: Number,
      required: false,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    sub_category: {
      type: String,
      required: true,
      trim: true,
    },
    base_service_name: {
      type: String,
      required: true,
      trim: true,
    },
    flavors: {
      type: String,
      default: "",
      trim: true,
    },
    service_specific_enhancements: {
      type: String,
      default: "",
      trim: true,
    },
    universal_platform: {
      type: String,
      required: true,
      trim: true,
    },
    aui: {
      type: String,
      default: "",
      trim: true,
    },
    updated_main_machine: {
      type: String,
      default: "",
      trim: true,
    },
    updated_machine_2: {
      type: String,
      default: "",
      trim: true,
    },
    updated_machine_3: {
      type: String,
      default: "",
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    final_value: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    collection: "deal_services",
    id: false,
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    versionKey: false,
  },
);

dealServiceSchema.index({ deal_id: 1, created_at: 1 });
dealServiceSchema.index({ deal_name: 1, created_at: 1 });

const DealServiceModel =
  (mongoose.models.DealService as Model<DealServiceDocument>) ||
  mongoose.model<DealServiceDocument>("DealService", dealServiceSchema);

export default DealServiceModel;
