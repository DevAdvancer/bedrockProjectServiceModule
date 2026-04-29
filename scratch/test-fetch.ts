import { listServiceMaps } from "../lib/service-map-store";

async function run() {
  const maps = await listServiceMaps();
  const map = maps.find(m => m.baseServiceName.includes("Infused Water"));
  
  const serialized = JSON.parse(JSON.stringify(map));
  console.log("Keys in serialized map:", Object.keys(serialized));
  console.log("Grocery needs:", serialized.groceryNeeds);
  console.log("Status:", serialized.status);
}
run().catch(console.error);
