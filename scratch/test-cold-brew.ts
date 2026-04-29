import { getReadOnlyServiceDetails } from "../lib/service-catalog";
import { listServiceMaps } from "../lib/service-map-store";

async function run() {
  const serviceMaps = await listServiceMaps();
  const details = getReadOnlyServiceDetails(
    serviceMaps,
    "A La Carte",
    "Beverage",
    "Add On Beverage Service",
    "ALC: Cold Brew",
    [],
    []
  );
  console.log("DETAILS:", details);
}
run();
