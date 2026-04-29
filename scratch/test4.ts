import { listServiceMaps } from "../lib/service-map-store";

async function run() {
  const maps = await listServiceMaps();
  const rows = maps.filter(m => 
    m.universalPlatform === "Add On Beverage Service" && 
    m.updatedMainMachine.includes("Beverage Tower") &&
    !m.status &&
    !m.groceryNeeds
  );
  console.log("Matching rows:", rows.length);
  if (rows.length > 0) {
    console.log(rows.map(r => r.baseServiceName));
  }
}
run().catch(console.error);
