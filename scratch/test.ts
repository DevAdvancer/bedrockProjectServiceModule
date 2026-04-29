import { listServiceMaps } from "../lib/service-map-store";

async function run() {
  const maps = await listServiceMaps();
  console.log(JSON.stringify(maps.find(m => m.baseServiceName.includes("Infused Water")), null, 2));
}
run().catch(console.error);
