import mongoose from "mongoose";
import LatestServiceDataModel from "../models/latest-service-data";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const rows = await LatestServiceDataModel.find({
    universalPlatform: { $regex: /Add On Beverage Service/i }
  });
  console.log("Total rows found:", rows.length);
  const emptyRows = rows.filter(r => !r.status && !r.groceryNeeds);
  console.log("Empty rows:", emptyRows.length);
  if (emptyRows.length > 0) {
    console.log("Empty row example:", {
      base: emptyRows[0].baseServiceName,
      up: emptyRows[0].universalPlatform
    });
  }
  process.exit(0);
}
run();
