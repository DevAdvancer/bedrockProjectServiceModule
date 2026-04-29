import { listServiceMaps } from "../lib/service-map-store";
import { getReadOnlyServiceDetails } from "../lib/service-catalog";

async function run() {
  const maps = await listServiceMaps();
  const details = getReadOnlyServiceDetails(
    maps,
    "A La Carte",
    "Beverage",
    "Add On Beverage Service",
    "ALC: Infused Water",
    [],
    []
  );
  console.log("DETAILS RETURNED BY API DATA:", details.filter(d => d.label === "Status" || d.label === "Grocery Needs" || d.label === "Universal Platform" || d.label === "Main Machine"));
  process.exit(0);
}
run();
