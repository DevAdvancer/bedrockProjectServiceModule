import { listServiceMaps } from "../lib/service-map-store";

async function run() {
  const maps = await listServiceMaps();
  const alcInfusedWaterRows = maps.filter(m => m.baseServiceName === "ALC: Infused Water");
  console.log("ALC: Infused Water rows count:", alcInfusedWaterRows.length);
  if (alcInfusedWaterRows.length > 0) {
    console.log("First row status:", alcInfusedWaterRows[0].status);
    console.log("First row groceryNeeds:", alcInfusedWaterRows[0].groceryNeeds);
  }
  process.exit(0);
}
run();
