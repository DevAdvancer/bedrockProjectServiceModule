import { LatestServiceDataModel } from "../models/latest-service-data";
import { connectToDatabase } from "../lib/mongodb";

async function run() {
  await connectToDatabase();
  const docs = await LatestServiceDataModel.find({ baseServiceName: "ALC: Cold Brew" });
  console.log("DOCUMENT COUNT:", docs.length);
  for (const doc of docs) {
    console.log(`- ${doc._id}: flavorEnhancementItem='${doc.flavorEnhancementItem}', status='${doc.status}', groceryYN='${doc.groceryYN}'`);
  }
  process.exit(0);
}
run();
