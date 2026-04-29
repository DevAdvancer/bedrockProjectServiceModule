import { listServiceMaps } from "../lib/service-map-store";

async function run() {
  const maps = await listServiceMaps();
  const rows = maps.filter(m => 
    m.universalPlatform === "Add On Beverage Service" && 
    m.updatedMainMachine.includes("Beverage Tower")
  );
  
  const results = rows.map(r => ({
    baseServiceName: r.baseServiceName,
    status: r.status,
    groceryNeeds: r.groceryNeeds,
    aui: r.aui,
    updatedMainMachine: r.updatedMainMachine
  }));
  
  console.log(JSON.stringify(results, null, 2));
}
run().catch(console.error);
