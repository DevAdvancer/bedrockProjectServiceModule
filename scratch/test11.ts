import { getReadOnlyServiceDetails } from "../lib/service-catalog";
import LatestServiceDataModel from "../models/latest-service-data";
import mongoose from "mongoose";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const rows = (await LatestServiceDataModel.find()).map(d => ({
    id: d._id.toString(),
    sortOrder: d.sortOrder,
    isActive: true,
    status: d.status,
    serviceOrderId: d.serviceOrderId,
    category: d.category,
    subCategory: d.subCategory,
    universalPlatform: d.universalPlatform,
    baseServiceName: d.baseServiceName,
    itemType: d.itemType,
    flavorEnhancementItem: d.flavorEnhancementItem,
    flavors: d.flavors,
    serviceSpecificEnhancements: d.serviceSpecificEnhancements,
    aui: d.aui,
    groceryYN: d.groceryYN,
    groceryNeeds: d.groceryNeeds,
    kitchenPrepNeededYN: d.kitchenPrepNeededYN,
    kitchenPrepItems: d.kitchenPrepItems,
    carryThroughYN: d.carryThroughYN,
    carryThroughItems: d.carryThroughItems,
    orderItemsFromCC: d.orderItemsFromCC,
    ccItems: d.ccItems,
    updatedMainMachine: d.updatedMainMachine,
    updatedMachine2: d.updatedMachine2,
    updatedMachine3: d.updatedMachine3,
    strategicAttributes: d.strategicAttributes,
    exclusivityKeys: d.exclusivityKeys,
    staff: d.staff,
    preSupplyTier: d.preSupplyTier,
    twoDayPrice: d.twoDayPrice,
    threeDayPrice: d.threeDayPrice,
    fourDayPrice: d.fourDayPrice,
    notes: d.notes,
    sourceRowNumber: d.sourceRowNumber,
  }));

  const readOnlyDetailsEmpty = getReadOnlyServiceDetails(
    rows,
    "A La Carte",
    "Beverage",
    "Add On Beverage Service",
    "ALC: Infused Water",
    ["Cucumber Lime Orange", "Cucumber Mint"],
    []
  );

  console.log("With Multiple Flavors that have empty status:");
  console.log(readOnlyDetailsEmpty);

  process.exit(0);
}
run();
