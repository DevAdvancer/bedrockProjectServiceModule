import { listServiceMaps } from "../lib/service-map-store";
import { getReadOnlyServiceDetailValues } from "../lib/service-catalog";

async function run() {
  const serviceMaps = await listServiceMaps();
  const details = getReadOnlyServiceDetailValues(
    serviceMaps,
    "A La Carte",
    "Beverage",
    "Add On Beverage Service",
    "ALC: Infused Water",
    ["Cantaloupe"],
    []
  );
  console.log(JSON.stringify(details, null, 2));
}
run().catch(console.error);
