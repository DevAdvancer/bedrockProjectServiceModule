import mongoose from "mongoose";
import LatestServiceDataModel from "../models/latest-service-data";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const rows = await LatestServiceDataModel.find({
    universalPlatform: "Add On Beverage Service"
  });
  console.log(rows.map(r => ({
    base: r.baseServiceName,
    status: r.status,
    flavor: r.flavorEnhancementItem,
    grocery: r.groceryNeeds
  })));
  process.exit(0);
}
run();
